using DocumentFormat.OpenXml.Office2010.Excel;
using DocumentFormat.OpenXml.Spreadsheet;
using ITDepartmentSystem.Hubs;
//using ITDepartmentSystem.Migrations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using OfficeOpenXml.Packaging.Ionic.Zlib;
using System.Security.Claims;

namespace ITDepartmentSystem.Services
{
    public class NotificationService(IHttpContextAccessor httpContextAccessor,
                                     UserManager<AppUser> usermanager,
                                     INotEntityGenericRepository<Notification> repo,
                                     IGenericRepository<NewsLetter> NewsLettersRepo,
                                     IGenericRepository<Alert> AlertsRepo,
                                     IHubContext<NotificationHub> _hub
        
        ) : INotificationService
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
        public async Task DeleteNotification(Guid Notification, string? userid = null, CancellationToken token = default)
        {
            var userId = userid ?? GetUserId();
            var user = await usermanager.Users.Include(u => u.Notifications).FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }
            // Get the top message to use as a cursor
            var topMessage = user.Notifications
                .Where(m => m.Id == Notification)

                .FirstOrDefault();
            //.Select(m => new { m.TicketId, m.Date }) // only fetch what we need

            if (topMessage == null)
                throw new BusinessRuleException("Message was not found", StatusCodes.Status404NotFound);

            topMessage.isDeleted = true;
            await repo.UpdateAsync(topMessage);
            await repo.SaveChangesAsync();
        }

        public async Task<ICollection<NotificationResponse>> Get20More(Guid topNotification, string? userid = null, CancellationToken token = default)
        {
            var userId = userid ?? GetUserId();
            var user = await usermanager.Users.Include(u => u.Notifications).FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }
            // Get the top message to use as a cursor
            var topMessage = user.Notifications
                .Where(m => m.Id == topNotification)

                .FirstOrDefault();
                //.Select(m => new { m.TicketId, m.Date }) // only fetch what we need

            if (topMessage == null)
                throw new BusinessRuleException("Message was not found", StatusCodes.Status404NotFound);

            // Fetch the next 20 messages in the project older than the top message
            var nextMessages =  user.Notifications
                .Where(m => m.Date < topMessage.Date && !m.isDeleted)
                .OrderByDescending(m => m.Date)
                .Take(10)
                .OrderByDescending(o => o.Date)

                .ToList();

            return nextMessages.Select(m => NotificationResponse.FromModel(m)).ToList();
        }

        public async Task<ICollection<NotificationResponse>> GetNotifications(string? userId = null, CancellationToken token = default)
        {
            var userid = userId ?? GetUserId();
            var user = await usermanager.Users.Include(u=>u.Notifications).FirstOrDefaultAsync(u => u.Id == userid);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }

            var msgs = user.Notifications
                            .Where(m=> !m.isDeleted)
                        .OrderByDescending(t => t.Date).Take(20)
                .Select(NotificationResponse.FromModel).OrderByDescending(o => o.Date).ToList();
            return msgs;
        }

        public async Task MarkNotificationAsSeenAsync(Guid Notification,string userid, CancellationToken token = default)
        {
            var userId = userid ?? GetUserId();
            var user = await usermanager.Users.Include(u => u.Notifications).FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }
            // Get the top message to use as a cursor
            var topMessage = user.Notifications
                .Where(m => m.Id == Notification)

                .FirstOrDefault();
            //.Select(m => new { m.TicketId, m.Date }) // only fetch what we need

            if (topMessage == null)
                throw new BusinessRuleException("Message was not found", StatusCodes.Status404NotFound);

            topMessage.isSeen = true;
            await repo.UpdateAsync(topMessage);
            await repo.SaveChangesAsync();
        }

        public async Task MarkNotificationsAsSeenAsync(string userid, CancellationToken token = default)
        {
            var userId = userid ?? GetUserId();
            var user = await usermanager.Users.Include(u => u.Notifications).FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }
            foreach(var notification in user.Notifications)
            {
                notification.isSeen = true;
            }
            //topMessage.isSeen = true;
            //await repo.UpdateAsync(topMessage);
            await repo.SaveChangesAsync();
        }

        public async Task SaveNotification(SendNotificationRequest message, CancellationToken token = default)
        {
            var notifications = new List<Notification>();

            foreach (var userId in message.UserId)
            {
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Text = message.Text,
                    Type = message.Type,
                    //Message = request.Message,
                    RedirectLink=message.RedirectLink,
                    Date = DateTime.Now,
                    isSeen = false,
                    isDeleted=false
                };

                notifications.Add(notification);
                await repo.AddAsync(notification);
            }

            await repo.SaveChangesAsync();

            var response = notifications.Select(NotificationResponse.FromModel).ToList();

            // 🔥 Push real-time AFTER saving
            //foreach (var userId in message.UserId)
            //{
            //    await _hub.Clients.User(userId)
            //        .SendAsync("ReceiveNotification", response.Where(r => r.UserId == userId));
            //}
            foreach (var Notification in response)
            {
                await _hub.Clients.User(Notification.UserId)
                    .SendAsync("ReceiveNotification", Notification);
            }

            //return response.First(); // or return list if you prefer
        }

        public async Task<ICollection<AlertResponse>> GetMyAlerts(string? userid = null, CancellationToken token = default)
        {
            var userId = userid ?? GetUserId();
            var user = await usermanager.Users.Include(u => u.Notifications).FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }

            var alerts = await AlertsRepo.Wheree(a => a.EndDate > DateTime.Now && !a.IsDeleted).Include(A => A.Hiders).ToListAsync(token);
            return alerts.Select(a => AlertResponse.FromModel(a, userId)).ToList();
            ////.Select(m => new { m.TicketId, m.Daate }) // only fetch what we need

            //if (topMessage == null)
            //    throw new BusinessRuleException("Message was not found", StatusCodes.Status404NotFound);

            //topMessage.isSeen = true;
            //await repo.UpdateAsync(topMessage);
            //await repo.SaveChangesAsync();
        }

        public async Task<ICollection<NewsLetterResponse>> GetMyNewsLetter(string? userid = null, CancellationToken token = default)
        {
            var userId = userid ?? GetUserId();
            var user = await usermanager.Users.Include(u => u.Notifications).FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }

            var alerts = await NewsLettersRepo.Wheree(a => a.EndDate > DateTime.Now && !a.IsDeleted).ToListAsync(token);
            return alerts.Select(a => NewsLetterResponse.FromModel(a)).ToList();
        }

        public async Task SaveNewAlert(SendAlertRequest message, CancellationToken token = default)
        {
            //var userId = userid ?? GetUserId();
            //var user = await usermanager.Users.Include(u => u.Notifications).FirstOrDefaultAsync(u => u.Id == userId);
            //if (user == null)
            //{
                //throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            //}
            if(message.type.HasFlag(AlertType.Alert))
            {
                var aler = new Alert()
                {
                    Text = message.Text,
                    EndDate = message.EndDate,

                };
                await AlertsRepo.AddAsync(aler, token);
                await AlertsRepo.SaveChangesAsync(token);
                await _hub.Clients.All
                    .SendAsync("ReceiveAnAlert", aler);
            }
            if(message.type.HasFlag(AlertType.Newsletter))
            {
                var newsletter = new NewsLetter()
                {
                    Text = message.Text,
                    EndDate = message.EndDate,
                };
                await NewsLettersRepo.AddAsync(newsletter,token);
                await AlertsRepo.SaveChangesAsync(token);
                await _hub.Clients.All
                    .SendAsync("ReceiveANewsLetter", newsletter);

            }
        }

        public async Task DeleteAnAlert(Guid Id, CancellationToken token = default)
        {
            var alert = await AlertsRepo.FirstOrDefaultWithIncludes(a => a.Id == Id, token);
            if (alert == null)
            {
                throw new BusinessRuleException("Alert does not exist", StatusCodes.Status404NotFound);
            }
            await AlertsRepo.DeleteAsync(alert, token);
            await AlertsRepo.SaveChangesAsync(token);
        }

        public async Task DeleteANewsLetter(Guid Id, CancellationToken token = default)
        {
            var alert = await NewsLettersRepo.FirstOrDefaultWithIncludes(a => a.Id == Id, token);
            if (alert == null)
            {
                throw new BusinessRuleException("Alert does not exist", StatusCodes.Status404NotFound);
            }
            await NewsLettersRepo.DeleteAsync(alert, token);
            await NewsLettersRepo.SaveChangesAsync(token);
        }

        public async Task HideAnAlert(Guid Id,string userid=null, CancellationToken token = default)
        {
            var alert = await AlertsRepo.FirstOrDefaultWithIncludes(a => a.Id == Id,a=>a.Include(a=>a.Hiders).Include(a=>a.Viewers), token);
            if (alert == null)
            {
                throw new BusinessRuleException("Alert does not exist", StatusCodes.Status404NotFound);
            }
            var userId = userid ?? GetUserId();
            var user = await usermanager.Users.Include(u => u.Notifications).FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }
            var existinguser = alert.Hiders.FirstOrDefault(a => a.Id == userId);
            if (existinguser !=null)
            {
                alert.Hiders.Remove(existinguser);
            }
            else
            {
            alert.Hiders.Add(user);

            }
            var existinguser2 = alert.Viewers.FirstOrDefault(a => a.Id == userId);
            if (existinguser2 == null)
            {
                alert.Viewers.Add(user);
            }
            await AlertsRepo.SaveChangesAsync(token);
        }

        public async Task<ICollection<userData>> GetAlertStatistics(Guid Id, CancellationToken token = default)
        {
            var alert = await AlertsRepo.FirstOrDefaultWithIncludes(a => a.Id == Id, a => a.Include(a => a.Hiders).Include(a => a.Viewers), token);
            if (alert == null)
            {
                throw new BusinessRuleException("Alert does not exist", StatusCodes.Status404NotFound);
            }
            var viewers = alert.Viewers
                .Select(a => new userData(a.Id,a.UserName!))
                .ToList();
            return viewers;
        }
        public async Task<ICollection<AlertResponse>> GetAllAlerts(CancellationToken token = default)
        {

            var userId = GetUserId();
            var alerts = await AlertsRepo.Wheree(a => !a.IsDeleted).Include(A => A.Hiders).ToListAsync(token);
            return alerts.Select(a => AlertResponse.FromModel(a, userId)).ToList();
            ////.Select(m => new { m.TicketId, m.Daate }) // only fetch what we need

            //if (topMessage == null)
            //    throw new BusinessRuleException("Message was not found", StatusCodes.Status404NotFound);

            //topMessage.isSeen = true;
            //await repo.UpdateAsync(topMessage);
            //await repo.SaveChangesAsync();
        }
    }
}
