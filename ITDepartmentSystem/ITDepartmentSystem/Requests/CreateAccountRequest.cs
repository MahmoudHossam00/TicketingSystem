namespace ITDepartmentSystem.Requests
{
    public class CreateAccountRequest
    {
        public string UserName { set; get; }
        public string Password { set; get; }
        public string? Email { set; get; }
        public Guid EmployeeId { set; get; }
        public List<Guid> Permissions { get; set; } = [];
        public List<string> Roles { get; set; } = [];

    }
}
