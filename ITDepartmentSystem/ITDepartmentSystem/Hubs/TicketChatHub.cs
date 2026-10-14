using Microsoft.AspNetCore.SignalR;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace ITDepartmentSystem.Hubs
{
    public class TicketChatHub : Hub
    {
        private readonly ITicketService _ticketService;
        private readonly IGenericRepository<Ticket> _ticketRepo;
        private readonly HybridCache _cache;

        private static string CacheKeyword = "TicketChat";

        public TicketChatHub(
            ITicketService ticketService,
            IGenericRepository<Ticket> ticketRepo,
            HybridCache cache)
        {
            _ticketService = ticketService;
            _ticketRepo = ticketRepo;
            _cache = cache;
        }

        public override async Task OnConnectedAsync()
        {
            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<TicketChatHub>>();

            logger?.LogInformation("CONNECTED user={UserId}, connId={ConnId}",
                Context.UserIdentifier, Context.ConnectionId);

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<TicketChatHub>>();

            logger?.LogWarning(exception, "DISCONNECTED connId={ConnId}", Context.ConnectionId);

            await base.OnDisconnectedAsync(exception);
        }

        public async Task JoinTicket(Guid ticketId)
        {
            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<TicketChatHub>>();

            var sw = Stopwatch.StartNew();

            try
            {
                if (Context.User?.Identity?.IsAuthenticated != true)
                    throw new HubException("User not authenticated");

                var userId = Context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? Context.User.FindFirstValue(JwtRegisteredClaimNames.Sub);

                if (string.IsNullOrWhiteSpace(userId))
                    throw new HubException("User not authenticated");

                var allowedUsers = await GetAllowedUsers(ticketId, logger);

                if (!allowedUsers.Contains(userId))
                    throw new HubException("Not authorized to join this ticket chat");

                await Groups.AddToGroupAsync(Context.ConnectionId, ticketId.ToString());

                logger?.LogInformation("JoinTicket SUCCESS connId={ConnId} ticketId={TicketId}",
                    Context.ConnectionId, ticketId);
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "JoinTicket FAIL connId={ConnId} ticketId={TicketId}",
                    Context.ConnectionId, ticketId);
                throw;
            }
            finally
            {
                sw.Stop();
                logger?.LogInformation("JoinTicket END connId={ConnId} ticketId={TicketId} took={Elapsed}ms",
                    Context.ConnectionId, ticketId, sw.ElapsedMilliseconds);
            }
        }

        public async Task LeaveTicket(Guid ticketId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, ticketId.ToString());
        }

        public async Task SendMessageToTicket(Guid ticketId, SendMessageRequest message)
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);

            if (string.IsNullOrWhiteSpace(userId))
                throw new HubException("User not authenticated");

            var allowedUsers = await GetAllowedUsers(ticketId);

            if (!allowedUsers.Contains(userId))
                throw new HubException("Not authorized");

            var savedMessage = await _ticketService.SaveMessage(ticketId, userId, message);

            await Clients.Group(ticketId.ToString())
                .SendAsync("ReceiveMessage", ticketId, savedMessage);

            foreach (var allowedUserId in allowedUsers.Distinct())
            {
                var unreadCount = await _ticketService.MyCount(allowedUserId);
                await Clients.User(allowedUserId)
                    .SendAsync("UpdateUnreadCount", unreadCount);
            }
        }

        public async Task MarkAsSeen(string ticketId)
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);

            if (string.IsNullOrWhiteSpace(userId))
                throw new HubException("User not authenticated");

            if (!Guid.TryParse(ticketId, out var id))
                throw new BusinessRuleException("could not parse", StatusCodes.Status500InternalServerError);

            await _ticketService.MarkMessagesAsSeenAsync(id, userId);

            await Clients.Group(ticketId)
                .SendAsync("MessagesSeen", ticketId, userId);

            var unreadCount = await _ticketService.MyCount(userId);
            await Clients.User(userId)
                .SendAsync("UpdateUnreadCount", unreadCount);
        }

        private async Task<List<string>> GetAllowedUsers(Guid ticketId, ILogger<TicketChatHub>? logger = null)
        {
            var cacheKey = GetCacheKey(ticketId);

            return await _cache.GetOrCreateAsync(cacheKey, async ct =>
            {
                var ticket = await (await _ticketRepo.GetAllAsync())
                    .AsNoTracking()
                    .Include(t => t.AssignHistories)
                    .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

                logger?.LogInformation("Ticket auth query ticketId={TicketId} found={Found}",
                    ticketId, ticket != null);

                if (ticket == null)
                    throw new BusinessRuleException("Ticket does not exist", StatusCodes.Status404NotFound);

                var users = new List<string> { ticket.UserId };

                if (!string.IsNullOrWhiteSpace(ticket.CurrentAssignedId) && !users.Contains(ticket.CurrentAssignedId))
                    users.Add(ticket.CurrentAssignedId);

                return users;
            });
        }

        private string GetCacheKey(Guid ticketId) => $"{CacheKeyword}_{ticketId}";

        public async Task SendScreenOffer(string targetUserId, object offer)
            => await Clients.User(targetUserId).SendAsync("ReceiveScreenOffer", Context.UserIdentifier, offer);

        public async Task SendScreenAnswer(string targetUserId, object answer)
            => await Clients.User(targetUserId).SendAsync("ReceiveScreenAnswer", Context.UserIdentifier, answer);

        public async Task SendScreenIceCandidate(string targetUserId, object candidate)
            => await Clients.User(targetUserId).SendAsync("ReceiveScreenIceCandidate", Context.UserIdentifier, candidate);

        public async Task RequestScreenShare(string targetUserId)
            => await Clients.User(targetUserId).SendAsync("ScreenShareRequest", Context.UserIdentifier);

        public async Task CancelScreenShare(string targetUserId)
            => await Clients.User(targetUserId).SendAsync("ScreenShareCancelled", Context.UserIdentifier);

        public async Task RespondScreenShare(string senderUserId, bool accepted)
            => await Clients.User(senderUserId).SendAsync("ScreenShareResponse", Context.UserIdentifier, accepted);

        public async Task RequestCall(string targetUserId, string type)
            => await Clients.User(targetUserId).SendAsync("IncomingCall", Context.UserIdentifier, type);

        public async Task RespondCall(string callerId, bool accepted)
            => await Clients.User(callerId).SendAsync("CallResponse", Context.UserIdentifier, accepted);
    }
}