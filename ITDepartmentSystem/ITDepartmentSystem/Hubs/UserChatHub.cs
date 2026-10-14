using DocumentFormat.OpenXml.InkML;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using MimeKit;
using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace ITDepartmentSystem.Hubs
{
    public class UserChatHub : Hub
    {
        private readonly IUserMessageService _userMessageService;

        public UserChatHub(IUserMessageService userMessageService)
        {
            _userMessageService = userMessageService;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier;

            if (string.IsNullOrEmpty(userId))
                return;

            // Full inbox for this user (not GetMessages(userId), which means "thread with userId as the other party")
            var messages = await _userMessageService.GetAllDirectMessagesForCurrentUser(userId);


            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<UserChatHub>>();

            logger?.LogInformation("CONNECTED user={UserId}, connId={ConnId}",
                userId, Context.ConnectionId);
            await Clients.Caller.SendAsync("LoadPreviousMessages", messages);

            await base.OnConnectedAsync();
        }
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var logger = Context.GetHttpContext()?.RequestServices
                .GetRequiredService<ILogger<UserChatHub>>();

            logger?.LogWarning(exception,
                "DISCONNECTED connId={ConnId}", Context.ConnectionId);

            await base.OnDisconnectedAsync(exception);
        }
        public async Task SendMessageToUser(string receiverUserId, SendMessageRequest message)
        {
            var senderId = Context.UserIdentifier;

            if (string.IsNullOrEmpty(senderId))
                throw new Exception("Unauthorized");

            var savedMessage = await _userMessageService
                .SaveMessage(receiverUserId,senderId, message);

            // Send to receiver
            await Clients.User(receiverUserId)
                .SendAsync("ReceiveMessage", savedMessage);

            // Send back to sender (sync UI)
            await Clients.User(senderId)
                .SendAsync("ReceiveMessage", savedMessage);
        }

        public async Task MarkAsSeen(string otherUserId)
        {
            var userId = Context.UserIdentifier;

            await _userMessageService.MarkMessagesAsSeenAsync(otherUserId,userId);

            // Notify both users
            await Clients.User(otherUserId)
                .SendAsync("MessagesSeen", userId);

            await Clients.User(userId)
                .SendAsync("MessagesSeen", otherUserId);
        }
    }

}
