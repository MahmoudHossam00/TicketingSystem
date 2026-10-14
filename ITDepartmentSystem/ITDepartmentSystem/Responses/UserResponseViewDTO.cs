namespace ITDepartmentSystem.Responses
{
    public class UserResponseViewDTO
    {
        public string UserId { set; get; }
        public string UserName { set; get; }
        public Guid EmployeeId { set; get; }
        public int? EmployeeNumber { set; get; }
        public string EmployeeName { set; get; }
        public string Email { set; get; }
        public static UserResponseViewDTO FromModel(AppUser User)
        {
            return new UserResponseViewDTO()
            {
                EmployeeNumber = User.Employee?.EmployeeNumber,
                EmployeeId = User.EmployeeNumber,
                Email = User.Email?? User.Employee?.Email??"",
                EmployeeName = User.Employee?.NameEn ?? "",
                UserName = User.UserName?? "",
                UserId = User.Id
            };
        }
    }
}
