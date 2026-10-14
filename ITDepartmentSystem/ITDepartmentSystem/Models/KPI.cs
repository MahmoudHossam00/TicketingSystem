using ITDepartmentSystem.Enums;
using Pipelines.Sockets.Unofficial.Arenas;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class KPI:Entity
    {
        [ForeignKey("Ticket")]
        public Guid? TicketId { set; get; }
        public Ticket? Ticket { set; get; }
        [ForeignKey("TicketTask")]
        public Guid? TicketTaskId { set; get; }
        public TicketTask? TicketTask { set; get; }

        //[ForeignKey("Project")]
        //public Guid? ProjectId { set; get; }
        //public Project? Project { set; get; }
        [ForeignKey("MainTask")]
        public Guid? MainTaskId { set; get; }
        public ProjectTask? MainTask { set; get; }
        [ForeignKey("Task")]
        public Guid? TaskId { set; get; }
        public ProjectTaskSubTask? Task { set; get; }
        [ForeignKey("KPI")]
        public Guid? FixedKPIId { set; get; }
        public KPIMasterData? FixedKPI { set; get; }

        public DateTime ConfirmationDate { set; get; }
        [NotMapped]
        public kpiType type => TicketId == null && MainTaskId == null ? kpiType.neither :
            MainTaskId != null && TicketId != null ? kpiType.both :
            MainTaskId != null ? kpiType.project : 
            kpiType.ticket;
    }
    public class Project : Entity
    {
        public string IpAddress { set; get; }
        [ForeignKey("User")]
        public string UserId { set; get; }
        public AppUser User { set; get; }
        public List<ProjectMessage> Messages { set; get; } = new List<ProjectMessage> { };
        public bool isClosed { set; get; } = false;
        public IssuePriority? priority { set; get; }
        public string Description { set; get; }
        public List<string> Attachments { set; get; } = new List<string>();
        public List<ProjectPrivateNote> ProjectPrivateNotes { set; get; } = new List<ProjectPrivateNote>();
        [ForeignKey("CurrentStatus")]
        public Guid? CurrentStatusId { get; set; }
        public IssueStatus? CurrentStatus { get; set; }
        public DateTime CreationDate { set; get; }
        public DateTime StartDate { set; get; }
        public DateTime EndDate { set; get; }
        public DateTime? FinishDate { set; get; }
        [ForeignKey("System")]
        public Guid SystemId { set; get; }
        public ITSystem System { set; get; }
        public List<ProjectTask> Tasks { set; get; } = new List<ProjectTask>();
    }
    public class ProjectTask : Entity
    {
        public string Description { set; get; }
        public Guid ProjectId { set; get; }
        public Project Project { set; get; }
        [ForeignKey("User")]
        public string UserId { set; get; }
        public AppUser User { set; get; }

        [ForeignKey("Responsible")]
        public string ResponsibleId { set; get; }
        public AppUser Responsible { set; get; }

        public DateTime CreationDate { set; get; }
        public DateTime StartDate { set; get; }
        public DateTime EndDate { set; get; }
        public DateTime? FinishDate { set; get; }

        public List<TaskAssignHistory> AssignHistories { set; get; } = new List<TaskAssignHistory>();
        public List<string> Attachments { set; get; } = new List<string>();
        public List<string> AssignedAttachments { set; get; } = new List<string>();
        public List<TaskMessage> Messages { set; get; } = new List<TaskMessage> { };

        public List<TaskStatusDate> TicketStatuses { set; get; } = new List<TaskStatusDate>();
        public List<TaskPrivateNote> TaskPrivateNotes { set; get; } = new List<TaskPrivateNote>();

        [ForeignKey("CurrentStatus")]
        public Guid? CurrentStatusId { get; set; }
        public IssueStatus? CurrentStatus { get; set; }

        public bool isClosed { set; get; } = false;
        public IssuePriority? priority { set; get; }

        public List<ProjectTaskSubTask> AccomplishedTasks { set; get; } = [];
    }


    public class TicketTask : Entity
    {
        public string Description { set; get; }
        public Guid TicketId { set; get; }
        public Ticket Ticket { set; get; }
        [ForeignKey("User")]
        public string UserId { set; get; }
        public AppUser User { set; get; }
        public DateTime Date { set; get; }
        public KPI? KPI { set; get; }
    }


    public class ProjectTaskSubTask : Entity
    {
        public string Description { set; get; }
        public Guid ProjectTaskId { set; get; }
        public ProjectTask ProjectTask { set; get; }
        [ForeignKey("User")]
        public string UserId { set; get; }
        public AppUser User { set; get; }
        public DateTime Date { set; get; }
        public KPI? KPI { set; get; }


    }
    public enum kpiType
    {
        project,
        ticket,
        both,
        neither
    }
}
