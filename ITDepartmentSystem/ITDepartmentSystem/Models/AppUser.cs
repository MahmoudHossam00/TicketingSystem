using ITDepartmentSystem.Models;
using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class AppUser:IdentityUser
    {
        [ForeignKey("Employee")]
        public Guid EmployeeNumber { get; set; }
        public virtual EmployeeCache Employee { get; set; }
        public string? Picture { set; get; }
        public bool isDisabled { set; get; } = false;


        public List<AppPermission> Permissions { set; get; } = new List<AppPermission>();
        public virtual ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();

        public bool EligibleForAgency { set; get; } = false;
        public List<SystemAgent> Systems { set; get; }

        [InverseProperty("CCs")]
        public List<Ticket> CCs { set; get; }
        [InverseProperty("To")]
        public List<Ticket> To { set; get; }
        [InverseProperty("User")]
        public List<Ticket> CreatedTickets { set; get; }

        [InverseProperty("CurrentAssigned")]
        public List<Ticket> AssignedTickets { set; get; }


        public bool ChangedHisOwnPassword { set; get; } = false;

        [InverseProperty("User")]
        public List<UserMessage> Sent { set; get; } = new List<UserMessage>();
        [InverseProperty("ReceivingUser")]
        public List<UserMessage> Received { set; get; } = new List<UserMessage>();
        [InverseProperty("Seen")]
        public ICollection<ProjectMessage> SeenProjectMessages { get; set; } = new List<ProjectMessage>();
        [InverseProperty("User")]
        public ICollection<ProjectMessage> SentProjectMessages { get; set; } = new List<ProjectMessage>();
        public ICollection<Notification> Notifications { get; set; } = [];

        public DateTime LastLogin { set; get; } = default;

    }
    //public class RolePermissions
    //{
    //    [ForeignKey("Role")]
    //    public Guid RoleId { set; get; }
    //    public IdentityRole Role { set; get; }

    //    public List<string> Permissions { set; get; }
    //}
    public class IdentityRoleWithPermission:IdentityRole
    {
        public List<AppPermission> Permissions { set; get; } = new List<AppPermission>();
    }
}
