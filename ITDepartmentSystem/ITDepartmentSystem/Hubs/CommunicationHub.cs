using Microsoft.AspNetCore.SignalR;

namespace ITDepartmentSystem.Hubs
{
    public class CommunicationHub : Hub
    {
        // ── Call flow ──────────────────────────────────────────────────────────

        public async Task RequestCall(string targetUserId, string type)
            => await Clients.User(targetUserId)
                .SendAsync("IncomingCall", Context.UserIdentifier, type);

        public async Task RespondCall(string callerId, bool accepted)
            => await Clients.User(callerId)
                .SendAsync("CallResponse", Context.UserIdentifier, accepted);

        public async Task EndCall(string targetUserId)
            => await Clients.User(targetUserId)
                .SendAsync("CallEnded", Context.UserIdentifier);

        // ── WebRTC signaling ───────────────────────────────────────────────────
        // These three methods handle BOTH call negotiation and screen-share
        // renegotiation — no separate methods needed.

        public async Task SendOffer(string targetUserId, string offer)
            => await Clients.User(targetUserId)
                .SendAsync("ReceiveOffer", Context.UserIdentifier, offer);

        public async Task SendAnswer(string targetUserId, string answer)
            => await Clients.User(targetUserId)
                .SendAsync("ReceiveAnswer", Context.UserIdentifier, answer);

        public async Task SendIceCandidate(string targetUserId, string candidate)
            => await Clients.User(targetUserId)
                .SendAsync("ReceiveIceCandidate", Context.UserIdentifier, candidate);

        // ── Screen-share UI notifications ──────────────────────────────────────
        // These do NOT carry WebRTC signaling — they only tell the remote UI
        // whether to show the "screen share" label and style the video element.

        public async Task NotifyScreenShareStarted(string targetUserId)
            => await Clients.User(targetUserId)
                .SendAsync("ScreenShareStarted", Context.UserIdentifier);

        public async Task NotifyScreenShareStopped(string targetUserId)
            => await Clients.User(targetUserId)
                .SendAsync("ScreenShareStopped", Context.UserIdentifier);
    }
}