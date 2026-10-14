using ITDepartmentSystem.Enums;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class Ticket:Entity
    {
        [ForeignKey("RelatedSubModuleAnswer")]
        public Guid RelatedSubModuleAnswerId { set; get; }
        [InverseProperty("Ticket")]
        public RelatedSubModuleAnswer RelatedSubModuleAnswer { set; get; }

        //[ForeignKey("RelatedSubModuleAnswer")]
        //public Guid RelatedSubModuleAnswerId { set; get; }
        [InverseProperty("TicketHistory")]
        public List<RelatedSubModuleAnswer> AnswerHistory { set; get; } = new List<RelatedSubModuleAnswer>();
        public string IpAddress { set; get; }
        [ForeignKey("User")]
        public string UserId { set; get; }
        [InverseProperty("CreatedTickets")]
        public AppUser User { set; get; }

      



        [ForeignKey("IssueType")]
        public Guid? IssueTypeId { set; get; }
        public IssueType? IssueType { set; get; }
        
        [ForeignKey("Company")]
        public Guid? CompanyId { set; get; }
        public Company? Company { set; get; }

        public IssuePriority? priority { set; get; }


        public string Subject { set; get; }
        public string Description { set; get; }
        public List<string> Attachments { set; get; } = new List<string>();

        public List<TicketStatusDate> TicketStatuses { set; get; } = new List<TicketStatusDate>();

        [ForeignKey("CurrentStatus")]
        public Guid? CurrentStatusId { get; set; }

        public IssueStatus? CurrentStatus { get; set; }

        [InverseProperty("Ticket")]
        public List<Reply> Replies { set; get; } = new List<Reply>();


        [InverseProperty("SplitTicket")]
        public Reply? OriginalReply { set; get; }
        public List<AssignHistory> AssignHistories { set; get; } = new List<AssignHistory>();

        [ForeignKey("CurrentAssigned")]
        public string? CurrentAssignedId { get; set; }
        public AppUser? CurrentAssigned { get; set; }
        public List<PrivateNote> Notes { set; get; } = new List<PrivateNote>();
        [InverseProperty("To")]

        public List<AppUser> To { set; get; } = new List<AppUser> { };
        [InverseProperty("CCs")]
        public List<AppUser> CCs { set; get; } = new List<AppUser> { };
        public List<Message> Messages { set; get; } = new List<Message> { };
        public List<KPI> KPI { set; get; }= new List<KPI>();
        public bool isClosed { set; get; } = false;
        public bool NotifyUser { set; get; } = true;
        public List<TicketTask> AccomplishedTasks { set; get; } = [];

    }
    public class AssignHistory
    {
        public Guid Id { set; get; }
        [ForeignKey("User")]
        public string UserId { set; get; }
        public AppUser User { set; get; }

        [ForeignKey("Ticket")]
        public Guid TicketId { set; get; }
        public Ticket Ticket { set; get; }
        public DateTime AssignDate { set; get; }
    }

    public class TaskAssignHistory:Entity
    {
        public Guid Id { set; get; }
        [ForeignKey("User")]
        public string UserId { set; get; }
        public AppUser User { set; get; }

        [ForeignKey("Task")]
        public Guid TaskId { set; get; }
        public ProjectTask Task { set; get; }
        public DateTime AssignDate { set; get; }
    }

    
    public class Message : Entity
    {
        [ForeignKey("User")]
        public string UserId { set; get; }
        public AppUser User { set; get; }
        public string Text { set; get; }
        public List<string> Pictures { set; get; } = new List<string>();
        public List<string> Attachments { set; get; } = new List<string>();
        public List<string> VoiceRecords { set; get; } = new();
        public bool isSeen { set; get; } = false;
        public DateTime Date { set; get; } 
        public Guid TicketId { set; get; }
        public Ticket Ticket { set; get; }
    }


    public class UserMessage : Entity
    {
        [ForeignKey("User")]
        public string UserId { set; get; }
        public AppUser User { set; get; }
        [ForeignKey("ReceivingUser")]
        public string ReceivingUserId { set; get; }
        public AppUser ReceivingUser { set; get; }
        public string Text { set; get; }
        public List<string> Pictures { set; get; } = new List<string>();
        public List<string> Attachments { set; get; } = new List<string>();
        public List<string> VoiceRecords { set; get; } = new();
        public bool isSeen { set; get; } = false;
        public DateTime Date { set; get; }
        
    }
    public class TaskMessage : Entity
    {
        [ForeignKey("User")]
        public string UserId { set; get; }
        public AppUser User { set; get; }
        public string Text { set; get; }
        public List<string> Pictures { set; get; } = new List<string>();
        public List<string> Attachments { set; get; } = new List<string>();
        public List<string> VoiceRecords { set; get; } = new();
        public bool isSeen { set; get; } = false;
        public DateTime Date { set; get; } 
        public Guid TaskId { set; get; }
        public ProjectTask Task { set; get; }
    }


    public class ProjectMessage : Entity
    {
        [ForeignKey("User")]
        public string UserId { set; get; }
        [InverseProperty("SentProjectMessages")]
        public AppUser User { set; get; }
        public string Text { set; get; }
        public List<string> Pictures { set; get; } = new List<string>();
        public List<string> Attachments { set; get; } = new List<string>();
        public List<string> VoiceRecords { set; get; } = new();
        //public bool isSeen { set; get; } = false;
        [InverseProperty("SeenProjectMessages")]
        public ICollection<AppUser> Seen { get; set; } = new List<AppUser>();
        public DateTime Date { set; get; }
        public Guid ProjectId { set; get; }
        public Project Project { set; get; }
    }
    public class SendNotificationRequest
    {
        public List<string> UserId { get; set; } = default!;
        //public AppUser? User { set; get; }
        //public bool isSeen { set; get; } = false;
        //public bool isDeleted { set; get; } = false;
        //public DateTime Date { set; get; }
        public string Text { set; get; }
        public string? RedirectLink { set; get; }
        public notificationType Type { set; get; }
    }
    public class SendMessageRequest : Entity
    {
        //[ForeignKey("User")]
        //public string UserId { set; get; }
        //public AppUser User { set; get; }
        public string Text { set; get; }
        public List<ChatFileDto> Pictures { set; get; } = new List<ChatFileDto>();
        public List<ChatFileDto> Attachments { set; get; } = new List<ChatFileDto>();
        public List<ChatFileDto> VoiceRecords { set; get; } = new();
        //public bool isSeen { set; get; } = false;
        //public DateTime Date { set; get; }
        public Guid TicketId { set; get; }
        //public Ticket Ticket { set; get; }
    }
    public class ChatFileDto
    {
        public string Name { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty; // base64 string
    }
    public class NotificationResponse
    {
        public Guid id { set; get; }
        public string UserId { get; set; } = default!;
        //public AppUser? User { set; get; }
        public bool isSeen { set; get; } = false;
        //public bool isDeleted { set; get; } = false;
        public DateTime Date { set; get; }
        public string Text { set; get; }
        public string? RedirectLink { set; get; }
        public notificationType Type { set; get; }
        public static NotificationResponse FromModel(Notification msg)
        {
            return new NotificationResponse()
            {
                id = msg.Id,
                RedirectLink = msg.RedirectLink,
                Type = msg.Type,
                Date = msg.Date,
                isSeen = msg.isSeen,
                Text = msg.Text,
                UserId = msg.UserId,
                
            };
        }
    }
    public class MessageResponse
    {
        public Guid id { set; get; }
        public string Text { set; get; }
        public List<string> Pictures { set; get; } = new List<string>();
        public List<string> Attachments { set; get; } = new List<string>();
        public List<string> VoiceRecords { set; get; } = new();
        public bool isSeen { set; get; } = false;
        public DateTime Date { set; get; }
        public string UserId { set; get; }
        public string UserName { set; get; }
        public string? UserPicture { set; get; }
        /// <summary>For direct messages: the receiving user id (always set on <see cref="UserMessage"/>). Used by the client to route outgoing rows to the correct thread.</summary>
        public string? RecipientUserId { get; set; }
        public static MessageResponse FromModel(Message msg)
        {
            return new MessageResponse()
            {
                id=msg.Id,
                Attachments = msg.Attachments,
                VoiceRecords = msg.VoiceRecords,
                Date = msg.Date,
                isSeen = msg.isSeen,
                Pictures = msg.Pictures,
                Text = msg.Text,
                UserId=msg.UserId,
                UserName=msg.User?.UserName ??"Admin",
                UserPicture = msg.User?.Picture,
            };
        }
        public static MessageResponse FromModel(UserMessage msg)
        {
            return new MessageResponse()
            {
                id = msg.Id,
                Attachments = msg.Attachments,
                VoiceRecords = msg.VoiceRecords,
                Date = msg.Date,
                isSeen = msg.isSeen,
                Pictures = msg.Pictures,
                Text = msg.Text,
                UserId = msg.UserId,
                UserName = msg.User?.UserName ?? "Admin",
                UserPicture = msg.User?.Picture,
                RecipientUserId = msg.ReceivingUserId,
            };

        }
        public static MessageResponse FromModel(ProjectMessage msg,string currentappuserid)
        {
            return new MessageResponse()
            {
                id = msg.Id,
                Attachments = msg.Attachments,
                VoiceRecords = msg.VoiceRecords,
                Date = msg.Date,
                isSeen = msg.Seen.Any(a=>a.Id== currentappuserid),
                Pictures = msg.Pictures,
                Text = msg.Text,
                UserId=msg.UserId,
                UserName=msg.User?.UserName ??"Admin",
                UserPicture = msg.User?.Picture ,
            };
        }
        public static MessageResponse FromModel(TaskMessage msg)
        {
            return new MessageResponse()
            {
                id = msg.Id,
                Attachments = msg.Attachments,
                VoiceRecords = msg.VoiceRecords,
                Date = msg.Date,
                isSeen = msg.isSeen,
                Pictures = msg.Pictures,
                Text = msg.Text,
                UserId=msg.UserId,
                UserName=msg.User?.UserName ??"Admin",
                UserPicture = msg.User?.Picture ,
            };
        }
    }



    public class MessangerResponse
    {
        public string Text { set; get; }
        public Guid TicketId { set; get; }
        //public List<string> Pictures { set; get; } = new List<string>();
        //public List<string> Attachments { set; get; } = new List<string>();
        //public List<string> VoiceRecords { set; get; } = new();
        public bool isSeen { set; get; } = false;
        public DateTime Date { set; get; }
        public string UserId { set; get; }
        public string ContactedUserId { set; get; }
        public string ContactedUserName { set; get; }
        public string? ContactedUserPicture { set; get; }
        public static MessangerResponse FromModel(Message msg,AppUser ContactedUser)
        {
            return new MessangerResponse()
            {
                
                Date = msg.Date,
                isSeen = msg.isSeen,
                
                Text = msg.Text,
                UserId = msg.UserId,
                TicketId=msg.TicketId,
                ContactedUserId = ContactedUser.Id,
                ContactedUserName = ContactedUser.UserName,
                ContactedUserPicture = ContactedUser.Picture,

            };
        }
        public static MessangerResponse FromModel(UserMessage msg, AppUser ContactedUser)
        {
            var receiving = Guid.Parse(msg.ReceivingUserId);
            return new MessangerResponse()
            {

                Date = msg.Date,
                isSeen = msg.isSeen,

                Text = msg.Text,
                UserId = msg.UserId,
                TicketId = receiving,
                ContactedUserId = ContactedUser.Id,
                ContactedUserName = ContactedUser.UserName,
                ContactedUserPicture = ContactedUser.Picture,

            };
        }
        public static MessangerResponse FromModel(TaskMessage msg,AppUser ContactedUser)
        {
            return new MessangerResponse()
            {
                
                Date = msg.Date,
                isSeen = msg.isSeen,
                
                Text = msg.Text,
                UserId = msg.UserId,
                TicketId=msg.TaskId,
                ContactedUserId = ContactedUser.Id,
                ContactedUserName = ContactedUser.UserName,
                ContactedUserPicture = ContactedUser.Picture,

            };
        }
        public static MessangerResponse FromModel(ProjectMessage msg, Project pr,string userid)
        {
            return new MessangerResponse()
            {

                Date = msg.Date,
                isSeen = msg.Seen.Any(a=>a.Id==userid),

                Text = msg.Text,
                UserId = msg.UserId,
                TicketId = msg.ProjectId,
                ContactedUserId = pr.Id.ToString(),
                ContactedUserName = pr.Description,
                ContactedUserPicture = null,
            };
        }
    }
    public class Reply:Entity
    {
        [ForeignKey("Ticket")]
        public Guid TicketId { set; get; }
        [InverseProperty("Replies")]

        public Ticket Ticket { set; get; }

        [ForeignKey("SplitTicket")]
        public Guid? SplitTicketId { set; get; }
        [InverseProperty("OriginalReply")]
        public Ticket? SplitTicket { set; get; }

        [ForeignKey("ParentReply")]
        public Guid? ParentReplyId { set; get; }
        public Reply? ParentReply { set; get; }
        [ForeignKey("User")]
        public string UserId { set; get; }
        public AppUser User { set; get; }

        public string? Subject { set; get; }
        public string Description { set; get; }
        public DateTime Date { set; get; }
        public List<string> Attachments { set; get; } = new List<string>();
        public List<string> Pictures { set; get; } = new List<string>();
        public List<AppUser> To { set; get; } = new List<AppUser> { };
        public List<AppUser> CCs { set; get; } = new List<AppUser> { };

    }

    public class PrivateNote
    {
        public Guid Id { set; get; }
        [ForeignKey("AppUser")]
        public string AppUserId { set; get; }
        public AppUser AppUser { set; get; }
        [ForeignKey("Ticket")]
        public Guid TicketId { set; get; }
        public Ticket Ticket { set; get; }
        public string note { set; get; }

    }

    public class TaskPrivateNote
    {
        public Guid Id { set; get; }
        [ForeignKey("AppUser")]
        public string AppUserId { set; get; }
        public AppUser AppUser { set; get; }
        [ForeignKey("Task")]
        public Guid TaskId { set; get; }
        public ProjectTask Task { set; get; }
        public string note { set; get; }
    }

    public class ProjectPrivateNote
    {
        public Guid Id { set; get; }
        [ForeignKey("AppUser")]
        public string AppUserId { set; get; }
        public AppUser AppUser { set; get; }
        [ForeignKey("Project")]
        public Guid ProjectId { set; get; }
        public Project Project { set; get; }
        public string note { set; get; }
    }
    public class TicketStatusDate
    {
        public Guid id { set; get; }
        [ForeignKey("Ticket")]
        public Guid TicketId { set; get; }
        public Ticket Ticket { set; get; }

        public DateTime DateTime { set; get; }
        [ForeignKey("IssueStatus")]
        public Guid IssueStatusId { set; get; }
        public IssueStatus IssueStatus { set; get; }
    }

    public class TaskStatusDate
    {
        public Guid id { set; get; }
        [ForeignKey("Task")]
        public Guid TaskId { set; get; }
        public ProjectTask Task { set; get; }

        public DateTime DateTime { set; get; }
        [ForeignKey("IssueStatus")]
        public Guid IssueStatusId { set; get; }
        public IssueStatus IssueStatus { set; get; }
    }
}
