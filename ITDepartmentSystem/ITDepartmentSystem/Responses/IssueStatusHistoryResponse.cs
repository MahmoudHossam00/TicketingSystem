using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Responses
{
    public class IssueStatusHistoryResponse
    {
        public IssueStatusResponse response { set; get; }
        public DateTime Date { set; get; }
        public static IssueStatusHistoryResponse FromModel(TicketStatusDate ticketstatus)
        {
            return new IssueStatusHistoryResponse()
            {
                Date = ticketstatus.DateTime,
                response = IssueStatusResponse.FromModel(ticketstatus.IssueStatus)

            };
        }
        public static IssueStatusHistoryResponse FromModel(TaskStatusDate ticketstatus)
        {
            return new IssueStatusHistoryResponse()
            {
                Date = ticketstatus.DateTime,
                response = IssueStatusResponse.FromModel(ticketstatus.IssueStatus)

            };
        }
    }
    public class AssignHistoryResponse
    {
        public Guid Id { set; get; }
        public string UserId { set; get; }
        public string UserName { set; get; }
        public Guid TicketId { set; get; }
        public DateTime AssignDate { set; get; }
        public static AssignHistoryResponse FromModel(AssignHistory assignhistory)
        {
            return new AssignHistoryResponse()
            {
                Id= assignhistory.Id,
                TicketId= assignhistory.TicketId,
                UserId= assignhistory.UserId,
                UserName= assignhistory.User.UserName,
                AssignDate = assignhistory.AssignDate

            };
        }
        public static AssignHistoryResponse FromModel(TaskAssignHistory assignhistory)
        {
            return new AssignHistoryResponse()
            {
                Id= assignhistory.Id,
                TicketId= assignhistory.TaskId,
                UserId= assignhistory.UserId,
                UserName= assignhistory.User.UserName,
                AssignDate = assignhistory.AssignDate

            };
        }
    }
}
