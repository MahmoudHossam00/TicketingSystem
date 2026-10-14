using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Requests
{
    public class CreateReplyRequest
    {
       
            public Guid TicketId { set; get; }
            //public Guid? ParentReplyId { set; get; }
            //public string? Subject { set; get; }
            public string Description { set; get; }
            public List<IFormFile> Attachments { set; get; } = new List<IFormFile>();
            public List<IFormFile> Pictures { set; get; } = new List<IFormFile>();

            public List<Guid> To { set; get; } = new List<Guid> { };
            public List<Guid> CCs { set; get; } = new List<Guid> { };

        
    }
}
