using DocumentFormat.OpenXml.ExtendedProperties;
using System.ComponentModel.DataAnnotations.Schema;
using static ITDepartmentSystem.Token.Permission;

namespace ITDepartmentSystem.Responses
{
    public class EmployeeViewDTO : EntityResponse
    {
        public int ZenId { set; get; }

        public int EmployeeNumber { get; set; }

        public string NameEn { get; set; }
        public string? NameAr { get; set; }

        public string? Email { get; set; }
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
        //public DateTime? FixingDate { get; set; }
        public DateTime? TerminationDate { get; set; }

        // Personal
        //public string? Gender { get; set; }
        //public string? MaritalStatus { get; set; }
        public string? MobileNumber { get; set; }
        public string? PersonalEmail { get; set; }
        //public string? Religion { get; set; }
        //public bool? Citizen { get; set; }
        //tracking
        //public DateTime SourceUpdatedAt { get; set; } // جاي من Directory (UpdatedAt/CreatedAt)
        //public DateTime SyncedAt { get; set; }       // آخر مرة system ده عمل sync

        //[ForeignKey("Manager")]
        public Guid? ManagerId { set; get; }
        public EmployeeViewDTO? Manager { set; get; }

        public EmployeeViewDTO()
        {

        }
        public static EmployeeViewDTO FromModel(EmployeeCache emp, bool fulldetails = false)
        {
            var empresp = new EmployeeViewDTO
            {
                Id = emp.Id,
                EmployeeNumber = emp.EmployeeNumber,
                NameEn = emp.NameEn,
                NameAr= emp.NameAr,
                DepartmentId=emp.DepartmentId,
                DepartmentName=emp.DepartmentName,
                PositionId=emp.PositionId,
                PositionName=emp.PositionName,
                Active=emp.Active,
                BranchId=emp.BranchId,
                BusinessUnitId=emp.BusinessUnitId,
                BusinessUnitName=emp.BusinessUnitName,
                Email= emp.ManuallyAddedEmail != null ? emp.ManuallyAddedEmail : 
                string.IsNullOrWhiteSpace(emp.Email)
                        ? ""
                        : (emp.Email.Contains("zenhr", StringComparison.OrdinalIgnoreCase)
                           || emp.Email.Contains("dummy", StringComparison.OrdinalIgnoreCase))
                        ? ""
                        : emp.Email,
                ManagerId=emp.ManagerId,
                WorkLocationName=emp.WorkLocationName,
                WorkTypeId=emp.WorkTypeId,
                ZenId=emp.ZenId,
                WorkTypeName=emp.WorkTypeName,
                WorkLocationId=emp.WorkTypeId,
                Manager=fulldetails? emp.Manager == null ? null : EmployeeViewDTO.FromModel(emp.Manager):null,
                Birthdate=emp.Birthdate,
                MobileNumber=emp.MobileNumber,
                PersonalEmail=emp.PersonalEmail,
                TerminationDate = emp.TerminationDate,
                HiringDate = emp.HiringDate
                
            };
            //if (fulldetails)
            //{
            //    //if (emp.Manager != null)
            //    //{
            //    //    empresp.Manager = EmployeeViewDTO.FromModel(emp.Manager);

            //    //}
            //    //if (emp.Peers != null)
            //    //{
            //    //    empresp.SubOrdinates = emp.Peers.Select(e => EmployeeViewDTO.FromModel(e)).ToList();

            //    //}
            //}
            return empresp;
        }

    }
}