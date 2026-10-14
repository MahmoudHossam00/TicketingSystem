using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Responses
{
    public class ReplyResponse
    {
        public Guid TicketId { set; get; }

        [ForeignKey("User")]
        public string UserId { set; get; }
        public string UserName { set; get; }

        public Guid Id { set; get; }
        public string? Subject { set; get; }
        public string Description { set; get; }
        public DateTime Date { set; get; }
        public List<string> Attachments { set; get; } = new List<string>();
        public List<string> Pictures { set; get; } = new List<string>();
        public List<string> To { set; get; } = new List<string> { };
        public List<string> CCs { set; get; } = new List<string> { };
        public Guid? SplitTicketId { set; get; }

        public static ReplyResponse FromModel(Reply reply)
        {
            return new ReplyResponse()
            {
                Id=reply.Id,
                TicketId = reply.TicketId,
                Subject = reply.Subject,
                UserName = reply.User?.UserName ?? "Undefined",
                UserId = reply.UserId,
                Description = reply.Description,
                Pictures = reply.Pictures,
                Date = reply.Date,
                Attachments = reply.Attachments,
                SplitTicketId=reply.SplitTicketId,
                To = reply.To.Select(r => $"({r.UserName})").ToList(),
                CCs = reply.CCs.Select(r => $"({r.UserName})").ToList(),

            };
        }
    }
}
