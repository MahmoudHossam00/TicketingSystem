using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class ExternalAppUser:Entity
    {
        [ForeignKey("Employee")]
        public Guid EmployeeId { set; get; }
        public EmployeeCache Employee { set; get; }
        [ForeignKey("ExternalApplicationId")]
        public Guid ExternalApplicationId { set; get; }
        public ExternalApplication ExternalApplication { set; get; }
        public string UserName { set; get; }

        public bool Enabled { set; get; } = true;
    }
}
