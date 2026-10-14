using ITDepartmentSystem.Enums;

namespace ITDepartmentSystem.Responses
{
    public class TaskResponse : EntityResponse
    {

        public string Description { set; get; }
        public Guid ProjectId { set; get; }
        //[ForeignKey("User")]
        public string UserId { set; get; }
        public string UserName { set; get; }
        //public AppUser User { set; get; }

        public DateTime CreationDate { set; get; }
        public DateTime StartDate { set; get; }
        public DateTime EndDate { set; get; }
        public DateTime? FinishDate { set; get; }

        public List<TaskAssignHistory> AssignHistories { set; get; } = new List<TaskAssignHistory>();
        public List<string> Attachments { set; get; } = new List<string>();
        public List<string> AssignedAttachments { set; get; } = new List<string>();
        public List<Message> Messages { set; get; } = new List<Message> { };

        public List<TaskStatusDate> TicketStatuses { set; get; } = new List<TaskStatusDate>();
        public List<TaskPrivateNote> TaskPrivateNotes { set; get; } = new List<TaskPrivateNote>();
        public Guid? CurrentStatusId { get; set; }
        public bool isClosed { set; get; } = false;
        public IssuePriority? priority { set; get; }

        public static TaskResponse FromModel(ProjectTask Task)
        {
            var response = new TaskResponse()
            {
                Attachments = Task.Attachments,
                AssignedAttachments = Task.AssignedAttachments,
                Description = Task.Description,
                priority = Task.priority,
                UserId = Task.UserId,
                UserName = Task.User?.UserName ?? "",
                CurrentStatusId = Task.CurrentStatusId,
                CreationDate = Task.CreatedAt,
                EndDate = Task.EndDate,
                FinishDate = Task.FinishDate,
                StartDate = Task.StartDate,
                isClosed = Task.isClosed,
                ProjectId = Task.ProjectId,

            };
            MapBase(Task, response);
            return response;
        }
    }

    public class UpdateTaskRequest
    {

    }
}
