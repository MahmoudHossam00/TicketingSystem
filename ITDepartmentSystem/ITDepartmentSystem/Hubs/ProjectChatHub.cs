using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace ITDepartmentSystem.Hubs
{
    public class ProjectChatHub : Hub
    {
        private readonly IProjectService _ProjectService;
        private readonly IGenericRepository<Project> _ProjectRepo;
        private readonly IGenericRepository<SystemAgent> _AgentsRepo;
        private readonly HybridCache _cache;

        // Cache: ProjectId -> list of allowed user IDs
        private static ConcurrentDictionary<Guid, List<string>> _ProjectAllowedUsersCache = new();
        private static string CacheKeyword = "ProjectChat";
        public ProjectChatHub(IProjectService ProjectService, IGenericRepository<Project> ProjectRepo, HybridCache cache, IGenericRepository<SystemAgent> AgentsRepo)
        {
            _ProjectService = ProjectService;
            _ProjectRepo = ProjectRepo;
            _cache = cache;
            _AgentsRepo = AgentsRepo;
        }

        // Join a Project chat group
        public async Task JoinProject(Guid ProjectId)
        {
            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<ProjectChatHub>>();

            var sw = Stopwatch.StartNew();

            logger?.LogInformation(
                "JoinProject [1] START connId={ConnId} projectId={ProjectId} userId={UserId}",
                Context.ConnectionId, ProjectId, Context.UserIdentifier);

            try
            {
                logger?.LogInformation("JoinProject [2] auth-check");

                if (Context.User == null || Context.User.Identity == null || !Context.User.Identity.IsAuthenticated)
                {
                    throw new HubException("User not authenticated");
                }

                var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub);

                logger?.LogInformation("JoinProject [3] user-resolved userId={UserId}", userId);

                if (string.IsNullOrEmpty(userId))
                    throw new HubException("User not authenticated");

                var cacheKey = GetCacheKey(ProjectId);

                logger?.LogInformation("JoinProject [4] cache/db-start cacheKey={CacheKey}", cacheKey);

                var allowedUsers = await _cache.GetOrCreateAsync(cacheKey, async ct =>
                {
                    logger?.LogInformation("JoinProject [4.1] project-query-start projectId={ProjectId}", ProjectId);

                    var project = await (await _ProjectRepo.GetAllAsync())
                        .AsNoTracking()
                        .FirstOrDefaultAsync(t => t.Id == ProjectId, ct);

                    logger?.LogInformation("JoinProject [4.2] project-query-end found={Found}", project != null);

                    if (project == null)
                        throw new BusinessRuleException("Project does not exist", StatusCodes.Status404NotFound);

                    logger?.LogInformation("JoinProject [4.3] agents-query-start systemId={SystemId}", project.SystemId);

                    var agentsId = (await _AgentsRepo.Where(a => a.SystemId == project.SystemId))
                        .Select(a => a.AgentId)
                        .ToList();

                    logger?.LogInformation("JoinProject [4.4] agents-query-end count={Count}", agentsId.Count);

                    var users = new List<string> { project.UserId };
                    users.AddRange(agentsId);

                    logger?.LogInformation("JoinProject [4.5] allowed-users-built count={Count}", users.Count);

                    return users;
                });

                logger?.LogInformation("JoinProject [5] authorization-check");
                if (!allowedUsers.Contains(userId))
                    throw new HubException("Not authorized to join this Project chat");

                logger?.LogInformation("JoinProject [6] add-to-group-start");
                await Groups.AddToGroupAsync(Context.ConnectionId, ProjectId.ToString());
                logger?.LogInformation("JoinProject [7] add-to-group-end");

                logger?.LogInformation("JoinProject [8] get-messages-start");
                var lastMessages = await _ProjectService.GetMessages(ProjectId, userId);
                logger?.LogInformation("JoinProject [9] get-messages-end");

                logger?.LogInformation("JoinProject [10] send-to-caller-start");
                await Clients.Caller.SendAsync("LoadPreviousMessages", ProjectId, lastMessages);
                logger?.LogInformation("JoinProject [11] send-to-caller-end");
            }
            catch (Exception ex)
            {
                logger?.LogError(ex,
                    "JoinProject FAIL connId={ConnId} projectId={ProjectId}",
                    Context.ConnectionId, ProjectId);
                throw;
            }
            finally
            {
                sw.Stop();
                logger?.LogInformation(
                    "JoinProject END connId={ConnId} projectId={ProjectId} took={Elapsed}ms",
                    Context.ConnectionId, ProjectId, sw.ElapsedMilliseconds);
            }
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;

            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<ProjectChatHub>>();

            logger?.LogInformation("CONNECTED user={UserId}, connId={ConnId}",
                userId, Context.ConnectionId);

            await base.OnConnectedAsync();
        }
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<ProjectChatHub>>();

            logger?.LogWarning(exception,
                "DISCONNECTED connId={ConnId}", Context.ConnectionId);

            await base.OnDisconnectedAsync(exception);
        }

        // Leave a Project chat
        public async Task LeaveProject(Guid ProjectId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, ProjectId.ToString());
        }

        // Send a message to a Project group
        public async Task SendMessageToProject(Guid ProjectId, SendMessageRequest message)
        {
            var userId = Context.UserIdentifier;
            var cacheKey = GetCacheKey(ProjectId);

            var allowedUsers = await _cache.GetOrCreateAsync(cacheKey, async ct =>
            {
                var Project = await (await _ProjectRepo.GetAllAsync())
                    .AsNoTracking()
                    //.Include(t => t.AssignHistories)
                    .FirstOrDefaultAsync(t => t.Id == ProjectId, ct);

                if (Project == null)
                    return new List<string> { }; // empty list if Project missing

                var agentsId = (await _AgentsRepo.Where(a => a.SystemId == Project.SystemId)).Select(a => a.AgentId);

                var users = new List<string> { Project.UserId };
                users.AddRange(agentsId);

                return users;
            });

            if (!allowedUsers.Contains(userId))
                throw new HubException("Not authorized");

            var savedMessage = await _ProjectService.SaveMessage(ProjectId, userId, message);

            await Clients.Group(ProjectId.ToString())
                .SendAsync("ReceiveMessage", ProjectId, savedMessage);
        }

        private string GetCacheKey(Guid ProjectId) => $"{CacheKeyword}_{ProjectId}";


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

        public async Task MarkAsSeen(string ProjectId)
        {
            var userId = Context.UserIdentifier;
            var result = Guid.TryParse(ProjectId, out var id);
            if (result == false)
            {
                throw new BusinessRuleException("could not parse", StatusCodes.Status500InternalServerError);
            }
            // 1. Mark all messages in this Project as seen in the database
            await _ProjectService.MarkMessagesAsSeenAsync(id, userId);
            // 2. Notify everyone in the Project room so their UI updates
            await Clients.Group(ProjectId)
                .SendAsync("MessagesSeen", ProjectId, userId);
        }
    }
}
