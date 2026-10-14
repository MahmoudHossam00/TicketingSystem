namespace ITDepartmentSystem.Services.IServices
{
    public interface IUserMessageService
    {
        /// <summary>Messages in the DM thread with user <paramref name="Id"/> (the other participant).</summary>
        public Task<ICollection<MessageResponse>> GetMessages(string Id, string userId, CancellationToken token = default);
        /// <summary>All direct messages for the current user (for SignalR initial sync).</summary>
        public Task<ICollection<MessageResponse>> GetAllDirectMessagesForCurrentUser(string userId,CancellationToken token = default);
        public Task<ICollection<MessangerResponse>> MyMessanger(string userId,CancellationToken token = default);
        public Task<int> MyCount(string userId,CancellationToken token = default);
        public Task<ICollection<MessageResponse>> Get20More(Guid topMessage, CancellationToken token = default);
        public Task<MessageResponse> SaveMessage(string Receipent, string userId, SendMessageRequest message, CancellationToken token = default);
        public Task MarkMessagesAsSeenAsync(string Sender, string userId, CancellationToken token = default);
        //public Task<ICollection<MessageResponse>> GetAllDirectMessagesForCurrentUser(CancellationToken token = default);


    }
}
