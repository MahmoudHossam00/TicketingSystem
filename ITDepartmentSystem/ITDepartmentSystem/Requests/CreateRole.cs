namespace ITDepartmentSystem.Requests
{
    public class CreateRole
    {
        public string RoleName { get; set; }
        public List<Guid> Permissions { set; get; }
    }
}
