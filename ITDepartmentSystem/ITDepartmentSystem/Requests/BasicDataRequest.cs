using ITDepartmentSystem.Enums;

namespace ITDepartmentSystem.Requests
{
    public class BasicDataRequest
    {
        public Guid? IssueTypeId { set; get; }
        public Guid? CompanyId { set; get; }
        public IssuePriority? priority { set; get; }
    }
}
