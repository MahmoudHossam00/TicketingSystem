using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class ExternalUser
    {
        public Guid Id { set; get; }
        [ForeignKey("ExternalSystem")]
        public Guid ExternalSystemId { set; get; }
        public ExternalSystem ExternalSystem { set; get; }
        [ForeignKey("Employee")]
        public Guid EmployeeId { set; get; }
        public EmployeeCache Employee { set; get; }
   
        public string UserName { set; get; }
        public string? Status { set; get; }
        public bool isActive { set; get; }
    }
    public class ExternalSystem
    {
        public Guid Id { set; get; }
        public string Name { set; get; }
        public string? URL { set; get; }
        public string? LoginURL { set; get; }
        public string? GetUsersURL { set; get; }
        public string? AdminUserName { set; get; }
        public string? AdminPassword { set; get; }
        public bool isAnglarSystem { set; get; } = false;
    }
}
