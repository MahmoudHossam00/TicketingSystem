using ITDepartmentSystem.Enums;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Responses
{
    public class ProjectResponse : EntityResponse
    {
        public string IpAddress { set; get; }
        public string UserId { set; get; }
        public string UserName { set; get; }
        //public List<KPI> KPI { set; get; } = new List<KPI>();
        //public List<Message> Messages { set; get; } = new List<Message> { };
        public bool isClosed { set; get; } = false;
        public IssuePriority? priority { set; get; }
        public string Description { set; get; }
        public List<string> Attachments { set; get; } = new List<string>();

        public Guid? CurrentStatusId { get; set; }
        public DateTime CreationDate { set; get; }
        public DateTime StartDate { set; get; }
        public DateTime EndDate { set; get; }
        public DateTime? FinishDate { set; get; }
        public Guid SystemId { set; get; }

        //public List<ProjectTask> Tasks { set; get; } = new List<ProjectTask>();
        public static ProjectResponse FromModel(Project ticket, bool getkpidata = false)
        {
            var response = new ProjectResponse()
            {
                Attachments = ticket.Attachments,
                Description = ticket.Description,
                IpAddress = ticket.IpAddress,
                priority = ticket.priority,
                UserId = ticket.UserId,
                UserName = ticket.User?.UserName ?? "",
                CurrentStatusId=ticket.CurrentStatusId,
                CreationDate=ticket.CreatedAt,
                EndDate=ticket.EndDate,
                FinishDate=ticket.FinishDate,
                StartDate=ticket.StartDate,
                SystemId=ticket.SystemId,
                isClosed = ticket.isClosed,
                
               
            };
            MapBase(ticket, response);
            return response;
        }
    }
}
