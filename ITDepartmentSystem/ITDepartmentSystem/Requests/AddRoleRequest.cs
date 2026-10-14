namespace ITDepartmentSystem.Requests
{
    public class AddRoleRequest
    {
        public Guid UserId { set; get; }
        public string? UserName { set; get; }
        public string RoleName { set; get; } = string.Empty;
        public Guid? RoleId { set; get; }
    }
}
