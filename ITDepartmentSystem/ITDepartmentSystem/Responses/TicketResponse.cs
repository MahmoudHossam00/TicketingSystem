using ITDepartmentSystem.Enums;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Responses
{
    public class TicketResponse:EntityResponse
    {
        //[ForeignKey("RelatedSubModuleAnswer")]
        public Guid RelatedSubModuleAnswerId { set; get; }
        //public RelatedSubModuleAnswer RelatedSubModuleAnswer { set; get; }
        public string IpAddress { set; get; }
        //[ForeignKey("User")]
        public string UserId { set; get; }
        public string UserName { set; get; }
        //[InverseProperty("CreatedTickets")]
        //public AppUser User { set; get; }

        public Guid? SubModuleId { set; get; }


        //will be used later
        //public List<TicketStatusDate> TicketStatuses { set; get; } = new List<TicketStatusDate>();
        //public List<AssignHistory> AssignHistories { set; get; } = new List<AssignHistory>();

        //[ForeignKey("IssueType")]
        public Guid? IssueTypeId { set; get; }
        //public IssueType? IssueType { set; get; }

        //[ForeignKey("Company")]
        public Guid? CompanyId { set; get; }
        //public Company? Company { set; get; }

        public IssuePriority? priority { set; get; }

        public Guid? issueStatusId { set; get; }
        public string Subject { set; get; }
        public string Description { set; get; }
        public List<string> Attachments { set; get; } = new List<string>();
        public List<KPIViewDTO> KPIs { set; get; } = new List<KPIViewDTO>();
        public Guid? OriginalTicketId { set; get; } 
      
        //public List<PrivateNote> Notes { set; get; } = new List<PrivateNote>();
        //[InverseProperty("To")]

        //public List<AppUser> To { set; get; } = new List<AppUser> { };
        //[InverseProperty("CCs")]
        //public List<AppUser> CCs { set; get; } = new List<AppUser> { };

        public static TicketResponse FromModel(Ticket ticket,bool getkpidata=false)
        {
            var response = new TicketResponse()
            {
                Attachments = ticket.Attachments,
                CompanyId = ticket.CompanyId,
                Description = ticket.Description,
                IssueTypeId = ticket.IssueTypeId,
                IpAddress = ticket.IpAddress,
                priority = ticket.priority,
                UserId = ticket.UserId,
                UserName = ticket.User?.UserName ?? "",
                Subject = ticket.Subject,
                //CompanyId = ticket.CompanyId,
                SubModuleId = ticket.RelatedSubModuleAnswer?.RelatedSubModuleId,
                RelatedSubModuleAnswerId = ticket.RelatedSubModuleAnswerId,
                //issueStatusId = ticket.TicketStatuses?.OrderByDescending(s => s.DateTime).First()?.IssueStatus?.Id,
                issueStatusId = ticket.CurrentStatusId,
                OriginalTicketId=ticket.OriginalReply?.TicketId
                //KPIs = getkpidata ? ticket.KPI.Select(k => new KPIViewDTO() { 
                //KPIId = k.Id,
                //KPIName=k.FixedKPI.Name,
                //type=k.type.ToString(),
                //}).ToList() : new(),
                //KPIId = getkpidata ? ticket.KPI?.Id : null,
                //KPIName = getkpidata ? ticket.KPI?.FixedKPI?.Name : null,
                //Type = getkpidata ? ticket.KPI?.type.ToString() : null
            };
            MapBase(ticket, response);
            return response;
        }
    }

    public class KPIViewDTO
    {
        public Guid? KPIId { set; get; }
        public string? KPIName { set; get; }
        public DateTime ConfirmationDate { set; get; }

    }
    public class ProjectTaskSubTaskViewDTO
    {
        public Guid? KPIId { set; get; }
        public string? KPIName { set; get; }
        public string type { set; get; }
    }
}
