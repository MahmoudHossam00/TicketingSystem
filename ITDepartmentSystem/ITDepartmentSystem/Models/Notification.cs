namespace ITDepartmentSystem.Models
{
    public class Notification: BaseEntity
    {
        public string UserId { get; set; } = default!;
        public AppUser? User { set; get; }
        public bool isSeen { set; get; } = false;
        public bool isDeleted { set; get; } = false;
        public DateTime Date { set; get; }
        public string Text { set; get; }
        public string? RedirectLink { set; get; }
        public notificationType Type { set; get; }


    }
    public enum notificationType
    {
        Ticket,
        Reply,
        Project,
        Task,
        General
    }
}
