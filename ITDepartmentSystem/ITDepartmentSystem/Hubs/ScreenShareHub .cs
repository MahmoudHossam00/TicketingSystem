using DocumentFormat.OpenXml.InkML;
using Microsoft.AspNetCore.SignalR;

namespace ITDepartmentSystem.Hubs
{
    public class ScreenShareHub : Hub
    {
        // Send offer to a specific user
        public async Task SendOffer(string targetUserId, object offer)
            => await Clients.User(targetUserId).SendAsync("ReceiveOffer", Context.UserIdentifier, offer);

        // Send answer back
        public async Task SendAnswer(string targetUserId, object answer)
            => await Clients.User(targetUserId).SendAsync("ReceiveAnswer", Context.UserIdentifier, answer);

        // Send ICE candidate
        public async Task SendIceCandidate(string targetUserId, object candidate)
            => await Clients.User(targetUserId).SendAsync("ReceiveIceCandidate", Context.UserIdentifier, candidate);
    }
}
