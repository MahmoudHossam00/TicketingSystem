namespace ITDepartmentSystem.Requests
{
    public class UpdateRole
    {
        public string RoleName { get; set; }
        public string? RoleId { get; set; }
        public List<Guid> Permissions { set; get; }

    }
}
