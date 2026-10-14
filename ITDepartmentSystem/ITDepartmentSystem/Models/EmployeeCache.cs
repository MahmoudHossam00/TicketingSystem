using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class EmployeeCache : BaseEntity
    {
        //[Key]
        //[DatabaseGenerated(databaseGeneratedOption:DatabaseGeneratedOption.None)]
        //public int Id { get; set; }  // ZenHR Employee Id (Primary Key)
        public int ZenId { set; get; }

        public int EmployeeNumber { get; set; }

        public string NameEn { get; set; }
        public string? NameAr { get; set; }

        public string? Email { get; set; }
        public string? ManuallyAddedEmail { get; set; }
        public bool? Active { get; set; }

        public int? BranchId { get; set; }

        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public int? PositionId { get; set; }
        public string? PositionName { get; set; }

        public int? BusinessUnitId { get; set; }
        public string? BusinessUnitName { get; set; }

        public int? WorkLocationId { get; set; }
        public string? WorkLocationName { get; set; }

        public int? WorkTypeId { get; set; }
        public string? WorkTypeName { get; set; }


        // Dates
        public DateTime? Birthdate { get; set; }
        public DateTime? HiringDate { get; set; }
        public DateTime? FixingDate { get; set; }
        public DateTime? TerminationDate { get; set; }

        // Personal
        public string? Gender { get; set; }
        public string? MaritalStatus { get; set; }
        public string? MobileNumber { get; set; }
        public string? PersonalEmail { get; set; }
        public string? Religion { get; set; }
        public bool? Citizen { get; set; }

        // tracking
        public DateTime SourceUpdatedAt { get; set; } // جاي من Directory (UpdatedAt/CreatedAt)
        public DateTime SyncedAt { get; set; }       // آخر مرة system ده عمل sync

        [ForeignKey("Manager")]
        public Guid? ManagerId { set; get; }
        public EmployeeCache? Manager { set; get; }
    }

    public class Department
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int DepartmentId { get; set; }
        public string DepartmentName { get; set; } = default!;
    }
    public class EmployeeCacheDTO : BaseEntity
    {
        public int ZenId { set; get; }

        public int EmployeeNumber { get; set; }

        public string NameEn { get; set; }
        public string? NameAr { get; set; }

        public string? Email { get; set; }
        public string? ManuallyAddedEmail { get; set; }
        public bool? Active { get; set; }

        public int? BranchId { get; set; }

        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public int? PositionId { get; set; }
        public string? PositionName { get; set; }

        public int? BusinessUnitId { get; set; }
        public string? BusinessUnitName { get; set; }

        public int? WorkLocationId { get; set; }
        public string? WorkLocationName { get; set; }

        public int? WorkTypeId { get; set; }
        public string? WorkTypeName { get; set; }


        // Dates
        public DateTime? Birthdate { get; set; }
        public DateTime? HiringDate { get; set; }
        public DateTime? FixingDate { get; set; }
        public DateTime? TerminationDate { get; set; }

        // Personal
        public string? Gender { get; set; }
        public string? MaritalStatus { get; set; }
        public string? MobileNumber { get; set; }
        public string? PersonalEmail { get; set; }
        public string? Religion { get; set; }
        public bool? Citizen { get; set; }

        // tracking
        public DateTime SourceUpdatedAt { get; set; } // جاي من Directory (UpdatedAt/CreatedAt)
        public DateTime SyncedAt { get; set; }       // آخر مرة system ده عمل sync

        [ForeignKey("Manager")]
        public Guid? ManagerId { set; get; }
        public string? ManagerName { set; get; }

        

    }
}
