using ITDepartmentSystem.Enums;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Requests
{
    public class CreateTaskRequest
    {
        //public Guid ProjectId { set; get; }
        //public Project Project { set; get; }
        //[ForeignKey("User")]
        public string UserId { set; get; }
        //public AppUser User { set; get; }
        public string Description { set; get; }

        //public DateTime CreationDate { set; get; }
        public DateTime StartDate { set; get; }
        public DateTime EndDate { set; get; }
        //public DateTime? FinishDate { set; get; }

        //public List<TaskAssignHistory> AssignHistories { set; get; } = new List<TaskAssignHistory>();
        public List<IFormFile> Attachments { set; get; } = new List<IFormFile>();
        //public List<Message> Messages { set; get; } = new List<Message> { };

        //public List<TaskStatusDate> TicketStatuses { set; get; } = new List<TaskStatusDate>();
        //public List<TaskPrivateNote> TaskPrivateNotes { set; get; } = new List<TaskPrivateNote>();

        //[ForeignKey("CurrentStatus")]
        public Guid? CurrentStatusId { get; set; }
        //public IssueStatus? CurrentStatus { get; set; }
        //public bool isClosed { set; get; } = false;
        public IssuePriority? priority { set; get; }
        public static async Task<ProjectTask> ToModel(CreateTaskRequest request)
        {
            ProjectTask entity = new()
            {
                Description = request.Description,
                priority = request.priority,


                Attachments = (await Task.WhenAll(
                   request.Attachments.Select(a => a.Save(new List<string>
                   {
                       //"Project"
                   }))
               )).ToList(),

                isClosed = false,
                StartDate = request.StartDate,
                FinishDate = null,
                CreationDate = DateTime.Now,

                EndDate = request.EndDate,
                CurrentStatusId = request.CurrentStatusId,
                //ProjectId = request.ProjectId,
                UserId = request.UserId,

                //priority = request.priority,
                //priority = request.priority,
            };
            return entity;
        }
    }
    public class CreateTicketTaskRequest
    {
        public string Description { set; get; }
        public DateTime Date { set; get; }
        public static async Task<TicketTask> ToModel(CreateTicketTaskRequest request)
        {
            TicketTask entity = new()
            {
                Date=request.Date,
            };
            return entity;
        }
    }
    public class ProjectTaskSubTaskRespone
    {
        public Guid Id { set; get; }
        public string Description { set; get; }
        public Guid ProjectTaskId { set; get; }
        public string UserId { set; get; }
        public string? UserName { set; get; }
        public DateTime Date { set; get; }
        public KPIViewDTO? KPI { set; get; } = default;
        public static ProjectTaskSubTaskRespone ToModel(ProjectTaskSubTask request,bool withkpi=false)
        {
            ProjectTaskSubTaskRespone entity = new()
            {
                Id=request.Id,
                Date = request.Date,
                Description = request.Description,
                ProjectTaskId = request.ProjectTaskId,
                UserId = request.UserId,
                UserName = request.User?.UserName ?? null,

            };
            if(withkpi)
            {
                entity.KPI = request.KPI == null ? null : new KPIViewDTO()
                {
                    ConfirmationDate = request.KPI == null ?
                    throw new BusinessRuleException("Send KPI", StatusCodes.Status404NotFound)
                    : request.KPI.ConfirmationDate,
                    KPIId = request.KPI.FixedKPI?.Id,
                    KPIName = request.KPI.FixedKPI?.Name
                };
            }
            return entity;
        }
    }
    public class TicketTaskRespone
    {
        public Guid Id { set; get; }
        public string Description { set; get; }
        public Guid TicketId { set; get; }
        public string UserId { set; get; }
        public string? UserName { set; get; }
        public DateTime Date { set; get; }
        public KPIViewDTO? KPI { set; get; } = default;
        public static TicketTaskRespone ToModel(TicketTask request, bool withkpi = false)
        {
            TicketTaskRespone entity = new()
            {
                Id=request.Id,
                Date = request.Date,
                Description=request.Description,
                TicketId=request.TicketId,
                UserId=request.UserId,
                UserName=request.User?.UserName??null,
            };
            if (withkpi)
            {
                entity.KPI = request.KPI==null ? null : new KPIViewDTO()
                {
                    ConfirmationDate = request.KPI == null ?
                    throw new BusinessRuleException("Send KPI", StatusCodes.Status404NotFound)
                    : request.KPI.ConfirmationDate,
                    KPIId = request.KPI.FixedKPI?.Id,
                    KPIName = request.KPI.FixedKPI?.Name
                };
            }
            return entity;
        }
    }
}
