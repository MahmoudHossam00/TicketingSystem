using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace ITDepartmentSystem.Hubs
{
    public class NotificationHub(INotificationService _notificationService) : Hub
    {
        //private readonly INotificationService _notificationService;
        //C
        ////private readonly IGenericRepository<Project> _ProjectRepo;
        ////private readonly IGenericRepository<SystemAgent> _AgentsRepo;
        //private readonly HybridCache _cache;

        // Cache: ProjectId -> list of allowed user IDs
        //private static ConcurrentDictionary<Guid, List<string>> _ProjectAllowedUsersCache = new();
        //private static string CacheKeyword = "ProjectChat";
        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;

            if (string.IsNullOrEmpty(userId))
                return;

            // 🔥 Get latest notifications (not all)
            var notifications = await _notificationService.GetNotifications(userId);
            var logger = Context.GetHttpContext()?.RequestServices
               .GetRequiredService<ILogger<NotificationHub>>();

            logger?.LogInformation("CONNECTED user={UserId}, connId={ConnId}",
                userId, Context.ConnectionId);
            await Clients.Caller.SendAsync("LoadNotifications", notifications);

            await base.OnConnectedAsync();
        }

        
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<NotificationHub>>();

            logger?.LogWarning(exception,
                "DISCONNECTED connId={ConnId}", Context.ConnectionId);

            await base.OnDisconnectedAsync(exception);
        }
    }
}
