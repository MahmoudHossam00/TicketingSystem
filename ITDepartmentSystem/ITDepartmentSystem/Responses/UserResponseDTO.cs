using System.ComponentModel.DataAnnotations.Schema;
using System.Linq.Expressions;

namespace ITDepartmentSystem.Responses
{
    public class UserResponseDTO
    {
        //[ForeignKey("Employee")]
        public string id { set; get; }
        public int EmployeeNumber { get; set; }
        public Guid EmployeeId { get; set; }
        //public Guid EmployeeNumber { get; set; }
        //public virtual EmployeeCache Employee { get; set; }
        public string? Picture { set; get; }
        public bool isDisabled { set; get; } = false;


        //public List<AppPermission> Permissions { set; get; } = new List<AppPermission>();
        //public virtual ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
        //public bool EligibleForAgency { set; get; } = false;
        public Dictionary<Guid,string> Systems { set; get; }
        public string? UserName { set; get; }
        public string? Email { set; get; }
        public string? ManagerName { set; get; }

        public static Expression<Func<AppUser, UserResponseDTO>> FromExpr()
        => user => new UserResponseDTO()
        {
            id=user.Id,
            EmployeeId = user.EmployeeNumber,
            EmployeeNumber = user.Employee.EmployeeNumber,
            isDisabled = user.isDisabled,
            Picture = user.Picture,
            UserName = user.UserName!,
            ManagerName =
            user.Employee != null && user.Employee.Manager != null
            ? user.Employee.Manager.NameEn
            : null  ,
            Email = user.Email ?? user.Employee.ManuallyAddedEmail ?? user.Employee.Email ?? null,
            Systems = user.Systems.ToDictionary(
                    s => s.System.Id,
                    s => s.System.Name
                )
        };
    }

    public class AgentResponseWithTasksNumberDTO
    {
        public BasicUserDataResponse userdataresponse { set; get; }
        public int NumberOfAssignedActiveTicketss { set; get; }
        public int NumberOfAssignedActiveProjectTasks { set; get; }
        //public int NumberOfAssignedActiveTasks { set; get; }
    }
}
