using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace ITDepartmentSystem.Hubs
{
    public class TaskChatHub : Hub
    {
        private readonly ITaskService _TaskService;
        private readonly IGenericRepository<ProjectTask> _TasksRepo;
        //private readonly IGenericRepository<SystemAgent> _AgentsRepo;
        private readonly HybridCache _cache;

        // Cache: ProjectId -> list of allowed user IDs
        private static ConcurrentDictionary<Guid, List<string>> _TaskAllowedUsersCache = new();
        private static string CacheKeyword = "TaskChat";
        public TaskChatHub(ITaskService TaskService, IGenericRepository<ProjectTask> TaskRepo, HybridCache cache)
        {
            _TaskService = TaskService;
            _TasksRepo = TaskRepo;
            _cache = cache;
            //_AgentsRepo = AgentsRepo;
        }
        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;

            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<TaskChatHub>>();

            logger?.LogInformation("CONNECTED user={UserId}, connId={ConnId}",
                userId, Context.ConnectionId);

            await base.OnConnectedAsync();
        }
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<TaskChatHub>>();

            logger?.LogWarning(exception,
                "DISCONNECTED connId={ConnId}", Context.ConnectionId);

            await base.OnDisconnectedAsync(exception);
        }

        // Join a Project chat group
        public async Task JoinTask(Guid TaskId)
        {
            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<TaskChatHub>>();

            var sw = Stopwatch.StartNew();

            logger?.LogInformation(
                "JoinTask [1] START connId={ConnId} taskId={TaskId} userId={UserId}",
                Context.ConnectionId, TaskId, Context.UserIdentifier);

            try
            {
                logger?.LogInformation("JoinTask [2] auth-check");

                if (Context.User == null || Context.User.Identity == null || !Context.User.Identity.IsAuthenticated)
                {
                    throw new HubException("User not authenticated");
                }

                var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);

                logger?.LogInformation("JoinTask [3] user-resolved userId={UserId}", userId);

                if (string.IsNullOrEmpty(userId))
                    throw new HubException("User not authenticated");

                var cacheKey = GetCacheKey(TaskId);

                logger?.LogInformation("JoinTask [4] cache/db-start cacheKey={CacheKey}", cacheKey);

                var allowedUsers = await _cache.GetOrCreateAsync(cacheKey, async ct =>
                {
                    logger?.LogInformation("JoinTask [4.1] task-query-start taskId={TaskId}", TaskId);

                    var task = await (await _TasksRepo.GetAllAsync())
                        .AsNoTracking()
                        .FirstOrDefaultAsync(t => t.Id == TaskId, ct);

                    logger?.LogInformation("JoinTask [4.2] task-query-end found={Found}", task != null);

                    if (task == null)
                        throw new BusinessRuleException("Task does not exist", StatusCodes.Status404NotFound);

                    var users = new List<string> { task.UserId, task.ResponsibleId };

                    logger?.LogInformation("JoinTask [4.3] allowed-users-built count={Count}", users.Count);

                    return users;
                });

                logger?.LogInformation("JoinTask [5] authorization-check");
                if (!allowedUsers.Contains(userId))
                    throw new HubException("Not authorized to join this Task chat");

                logger?.LogInformation("JoinTask [6] add-to-group-start");
                await Groups.AddToGroupAsync(Context.ConnectionId, TaskId.ToString());
                logger?.LogInformation("JoinTask [7] add-to-group-end");

                logger?.LogInformation("JoinTask [8] get-messages-start");
                var lastMessages = await _TaskService.GetMessages(TaskId, userId);
                logger?.LogInformation("JoinTask [9] get-messages-end");

                logger?.LogInformation("JoinTask [10] send-to-caller-start");
                await Clients.Caller.SendAsync("LoadPreviousMessages", TaskId, lastMessages);
                logger?.LogInformation("JoinTask [11] send-to-caller-end");
            }
            catch (Exception ex)
            {
                logger?.LogError(ex,
                    "JoinTask FAIL connId={ConnId} taskId={TaskId}",
                    Context.ConnectionId, TaskId);
                throw;
            }
            finally
            {
                sw.Stop();
                logger?.LogInformation(
                    "JoinTask END connId={ConnId} taskId={TaskId} took={Elapsed}ms",
                    Context.ConnectionId, TaskId, sw.ElapsedMilliseconds);
            }
        }

        // Leave a Task chat
        public async Task LeaveTask(Guid TaskId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, TaskId.ToString());
        }

        // Send a message to a Task group
        public async Task SendMessageToTask(Guid TaskId, SendMessageRequest message)
        {
            var userId = Context.UserIdentifier;
            var cacheKey = GetCacheKey(TaskId);

            var allowedUsers = await _cache.GetOrCreateAsync(cacheKey, async ct =>
            {
                var Task = await (await _TasksRepo.GetAllAsync())
                    .AsNoTracking()
                    //.Include(t => t.AssignHistories)
                    .FirstOrDefaultAsync(t => t.Id == TaskId, ct);

                if (Task == null)
                    return new List<string> { }; // empty list if Task missing

                //var agentsId = (await _AgentsRepo.Where(a => a.SystemId == Task.SystemId)).Select(a => a.AgentId);

                var users = new List<string> { Task.UserId,Task.ResponsibleId };
                //users.AddRange(agentsId);

                return users;
            });

            if (!allowedUsers.Contains(userId))
                throw new HubException("Not authorized");

            var savedMessage = await _TaskService.SaveMessage(TaskId, userId, message);

            await Clients.Group(TaskId.ToString())
                .SendAsync("ReceiveMessage", TaskId, savedMessage);
        }

        private string GetCacheKey(Guid TaskId) => $"{CacheKeyword}_{TaskId}";


        public async Task SendScreenOffer(string targetUserId, object offer)
            => await Clients.User(targetUserId).SendAsync("ReceiveScreenOffer", Context.UserIdentifier, offer);

        public async Task SendScreenAnswer(string targetUserId, object answer)
            => await Clients.User(targetUserId).SendAsync("ReceiveScreenAnswer", Context.UserIdentifier, answer);

        public async Task SendScreenIceCandidate(string targetUserId, object candidate)
            => await Clients.User(targetUserId).SendAsync("ReceiveScreenIceCandidate", Context.UserIdentifier, candidate);

        // Request to watch screen
        public async Task RequestScreenShare(string targetUserId)
            => await Clients.User(targetUserId)
                .SendAsync("ScreenShareRequest", Context.UserIdentifier);

        // Cancel/stop request
        public async Task CancelScreenShare(string targetUserId)
            => await Clients.User(targetUserId)
                .SendAsync("ScreenShareCancelled", Context.UserIdentifier);


        public async Task RespondScreenShare(string senderUserId, bool accepted)
        {
            await Clients.User(senderUserId)
                .SendAsync("ScreenShareResponse", Context.UserIdentifier, accepted);
        }

        public async Task MarkAsSeen(string TaskId)
        {
            var userId = Context.UserIdentifier;
            var result = Guid.TryParse(TaskId, out var id);
            if (result == false)
            {
                throw new BusinessRuleException("could not parse", StatusCodes.Status500InternalServerError);
            }
            // 1. Mark all messages in this Task as seen in the database
            await _TaskService.MarkMessagesAsSeenAsync(id, userId);
            // 2. Notify everyone in the Task room so their UI updates
            await Clients.Group(TaskId)
                .SendAsync("MessagesSeen", TaskId, userId);
        }
    }
}
