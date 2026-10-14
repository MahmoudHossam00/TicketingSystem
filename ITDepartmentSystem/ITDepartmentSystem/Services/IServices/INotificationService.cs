using static ITDepartmentSystem.Models.MessageResponse;

namespace ITDepartmentSystem.Services.IServices
{
    public interface INotificationService
    {
        public Task<ICollection<NotificationResponse>> GetNotifications(string? userId=null, CancellationToken token = default);
        /// <summary>All direct messages for the current user (for SignalR initial sync).</summary>
        //public Task<ICollection<NotificationResponse>> GetAllDirectNotificationsForCurrentUser(string userId, CancellationToken token = default);
        //public Task<ICollection<MessangerResponse>> MyMessanger(string userId, CancellationToken token = default);
        public Task<ICollection<NotificationResponse>> Get20More(Guid topNotification, string? userId = null, CancellationToken token = default);
        public Task SaveNotification(SendNotificationRequest message, CancellationToken token = default);
        public Task MarkNotificationsAsSeenAsync( string userId, CancellationToken token = default);
        public Task MarkNotificationAsSeenAsync(Guid Notification, string userId, CancellationToken token = default);
        public Task DeleteNotification(Guid Notification, string? userId = null, CancellationToken token = default);


        public Task<ICollection<AlertResponse>> GetMyAlerts(string? userId = null, CancellationToken token = default);
        public Task<ICollection<NewsLetterResponse>> GetMyNewsLetter(string? userId = null, CancellationToken token = default);
        public Task SaveNewAlert(SendAlertRequest message, CancellationToken token = default);
        public Task DeleteAnAlert(Guid Id, CancellationToken token = default);
        public Task DeleteANewsLetter(Guid Id, CancellationToken token = default);
        public Task HideAnAlert(Guid Id, string userid = null, CancellationToken token = default);
        public Task<ICollection<userData>> GetAlertStatistics(Guid Id, CancellationToken token = default);

        public Task<ICollection<AlertResponse>> GetAllAlerts(CancellationToken token = default);

    }

    public sealed record userData(string userId, string userName);
    
}
