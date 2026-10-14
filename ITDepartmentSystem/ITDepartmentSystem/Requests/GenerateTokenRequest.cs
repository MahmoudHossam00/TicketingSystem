namespace ITDepartmentSystem.Requests
{
    public class GenerateTokenRequest
    {
        public string? Id { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public int? EmployeeNumber { get; set; }
        public required Guid EmployeeId { set; get; }
        public required string UserName { set; get; }
        public string? Picture { set; get; }
        //public int? Department { get; set; }


        public List<string> Permissions { get; set; } = [];
        public List<string> Roles { get; set; } = [];
        public required bool firstLogin { set; get; }
    }
}
