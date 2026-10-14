using ITDepartmentSystem.Enums;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Requests
{
    public class SplitTicketRequest
    {
        public CreateRelatedSubModuleAnswerRequest RelatedSubModuleAnswer { set; get; }
        //public Guid IssueTypeId { set; get; }
        //public Guid? CompanyId { set; get; }
        public IssuePriority? priority { set; get; }
        public string Subject { set; get; }
        public string Description { set; get; }
        public List<Guid> To { set; get; } = new List<Guid> { };
        public List<Guid> CCs { set; get; } = new List<Guid> { };
        public Guid? IssueTypeId { set; get; }
        public Guid? CompanyId { set; get; }
        public Guid ReplyId { set; get; }
        public List<IFormFile> Attachments { set; get; } = new List<IFormFile>();
        public static async Task<Ticket> ToModel(SplitTicketRequest request)
        {
            Ticket entity = new()
            {
                Subject = request.Subject,
                Description = request.Description,
                priority = request.priority,
                IssueTypeId=request.IssueTypeId,
                CompanyId = request.CompanyId,


                Attachments = (await Task.WhenAll(
                   request.Attachments.Select(a => a.Save(new List<string>
                   {
                       //"Ticket"
                   }))
               )).ToList(),
                RelatedSubModuleAnswer =
                CreateRelatedSubModuleAnswerRequest.ToModel(request.RelatedSubModuleAnswer)
                //priority = request.priority,
                //priority = request.priority,
            };
            //entity.Attachments = (await Task.WhenAll(
            //       request.Attachments.Select(a => a.Save(new List<string> { "Ticket" }))
            //   )).ToList();
            return entity;
        }
    }
}
