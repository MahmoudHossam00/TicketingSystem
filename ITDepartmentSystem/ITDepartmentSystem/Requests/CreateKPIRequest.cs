using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Requests
{
    public class CreateKPIRequest
    {
        public Guid? TicketTaskId { set; get; }
        public Guid? TaskId { set; get; }
        public Guid? FixedKPIId { set; get; }
    }
}
