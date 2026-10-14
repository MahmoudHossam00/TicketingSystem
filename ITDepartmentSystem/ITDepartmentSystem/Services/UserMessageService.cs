using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Identity;
using Org.BouncyCastle.Cms;
using System.Security.Claims;

namespace ITDepartmentSystem.Services
{
    public class UserMessageService(IHttpContextAccessor httpContextAccessor,
    UserManager<AppUser> usermanager,IGenericRepository<UserMessage> repo) : IUserMessageService
    {
        private ClaimsPrincipal User =>
       httpContextAccessor.HttpContext?.User
       ?? throw new BusinessRuleException("Unauthorized", StatusCodes.Status401Unauthorized);
        private string GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub"); // JWT fallback

            if (id == null)
                throw new BusinessRuleException("User ID not found in token", StatusCodes.Status401Unauthorized);

            return id;
        }
        public async Task<ICollection<MessageResponse>> GetMessages(string Id,string userId, CancellationToken token = default)
        {
            var userid = userId?? GetUserId();
            var user = await usermanager.Users.Include(u=>u.Sent).Include(u=>u.Received).FirstOrDefaultAsync(u=>u.Id==userid);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }
            
            var msgs= user.Sent.Where(u=>u.ReceivingUserId==Id)
                .Union(user.Received.Where(u => u.UserId == Id))
                        //.OrderBy(m => m.Date)
                        .OrderByDescending(t => t.Date).Take(20)
                .Select(MessageResponse.FromModel).OrderBy(o => o.Date).ToList();
            return msgs;
        }

        public async Task<ICollection<MessageResponse>> GetAllDirectMessagesForCurrentUser(string userId, CancellationToken token = default)
        {
            var userid = userId ?? GetUserId();
            var user = await usermanager.Users
                .Include(u => u.Sent)
                //.ThenInclude(u=>u.User)
                .Include(u => u.Received)
                .ThenInclude(u => u.User)
                .FirstOrDefaultAsync(u => u.Id == userid, token);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }

            var msgs = user.Sent
            .Union(user.Received)
            .OrderBy(m => m.Date)
            .GroupBy(m => m.UserId == userid ? m.ReceivingUserId : m.UserId)
            .SelectMany(g => g.OrderByDescending(m => m.Date).Take(20)) // flatten and take latest 20 per conversation
            .OrderBy(m => m.Date) // optional: sort again by date globally
            .Select(m => MessageResponse.FromModel(m))
            .ToList();
            return msgs;
        }

        public async Task MarkMessagesAsSeenAsync(string Sender,string userId, CancellationToken token = default)
        {
            var userid = userId ?? GetUserId();
            var user = await usermanager.Users.Include(u => u.Received).FirstOrDefaultAsync(u => u.Id == userid,token);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }
            var tobechanged = user.Received.Where(T => T.UserId == Sender &&!T.isSeen).ToList();
            foreach (var msg in tobechanged)
            {
                msg.isSeen = true;
            }
            await repo.SaveChangesAsync();
        }

        public async Task<ICollection<MessangerResponse>> MyMessanger(string userId,CancellationToken token = default)
        {
            var currentUserId = userId ?? GetUserId();

            var messages = await (await repo.Where(m => m.UserId == currentUserId || m.ReceivingUserId == currentUserId))
                .Include(m => m.User)
                .Include(m => m.ReceivingUser)
                .ToListAsync(token);

            // Group by the other participant
            var groups = messages
                .GroupBy(m => m.UserId == currentUserId ? m.ReceivingUserId : m.UserId);

            var usersList = await usermanager.Users.ToListAsync(token);

            var lastMessages = groups.Select(g =>
            {
                var lastMsg = g.OrderByDescending(m => m.Date).First();
                var otherUserId = g.Key;
                var otherUser = usersList.FirstOrDefault(u => u.Id == otherUserId);

                return MessangerResponse.FromModel(lastMsg, otherUser);
            }).ToList();

            return lastMessages;
        }
        private async Task<ICollection<MessangerResponse>> getlastmessages(string userId, CancellationToken token = default)
        {
            var currentUserId = userId ?? GetUserId();

            var messages = await (await repo.Where(m => m.UserId == currentUserId || m.ReceivingUserId == currentUserId))
                .Include(m => m.User)
                .Include(m => m.ReceivingUser)
                .ToListAsync(token);

            // Group by the other participant
            var groups = messages
                .GroupBy(m => m.UserId == currentUserId ? m.ReceivingUserId : m.UserId);

            var usersList = await usermanager.Users.ToListAsync(token);

            var lastMessages = groups.Select(g =>
            {
                var lastMsg = g.OrderByDescending(m => m.Date).First();
                var otherUserId = g.Key;
                var otherUser = usersList.FirstOrDefault(u => u.Id == otherUserId);

                return MessangerResponse.FromModel(lastMsg, otherUser);
            }).ToList();

            return lastMessages;
        }
        public async Task<int> MyCount(string userId, CancellationToken token = default)
        {
            var ret = (await getlastmessages(userId, token)).Where(m => !m.isSeen && m.UserId != userId);
            return ret.Count();
        }
        public async Task<MessageResponse> SaveMessage(string Receipent,string userId, SendMessageRequest message, CancellationToken token = default)
        {
            var senderId =userId?? GetUserId();

            var recipientExists = await usermanager.Users.AnyAsync(u => u.Id == Receipent, token);
            if (!recipientExists)
                throw new BusinessRuleException("User was not found", StatusCodes.Status404NotFound);

            var msg = new UserMessage
            {
                Id = Guid.NewGuid(),
                UserId = senderId,
                ReceivingUserId = Receipent,
                Text = message.Text,
                Pictures = message.Pictures?.Select(p => p.Url).ToList() ?? new List<string>(),
                Attachments = message.Attachments?.Select(p => p.Url).ToList() ?? new List<string>(),
                VoiceRecords = message.VoiceRecords?.Select(p => p.Url).ToList() ?? new List<string>(),
                isSeen = false,
                Date = DateTime.UtcNow
            };

            await repo.AddAsync(msg, token);
            await repo.SaveChangesAsync(token);

            var senderUser = await usermanager.FindByIdAsync(senderId);
            msg.User = new AppUser
            {
                UserName = senderUser!.UserName,
                Picture = senderUser!.Picture
            };

            return MessageResponse.FromModel(msg);
        }

        public async Task<ICollection<MessageResponse>> Get20More(Guid topMessageId, CancellationToken token = default)
        {
            var userId = GetUserId();

            // Get the top message to use as a cursor
            var topMessage = await repo
                .Wheree(m => m.Id == topMessageId)

                .Select(m => new { m.ReceivingUserId,m.UserId, m.Date }) // only fetch what we need
                .FirstOrDefaultAsync(token);

            if (topMessage == null)
                throw new BusinessRuleException("Message was not found", StatusCodes.Status404NotFound);

            // Fetch the next 20 messages in the project older than the top message
            var nextMessages = await repo
                .Wheree(m => (
                (m.ReceivingUserId == topMessage.ReceivingUserId && m.UserId == topMessage.UserId)||
                (m.UserId == topMessage.ReceivingUserId && m.ReceivingUserId == topMessage.UserId)
                
                )
                
                &&
                m.Date < topMessage.Date)
                 .Include(m => m.User)

                .OrderByDescending(m => m.Date)
                .Take(20)
                .OrderBy(o => o.Date)

                .ToListAsync(token);

            return nextMessages.Select(m => MessageResponse.FromModel(m)).ToList();
        }
    }
}
