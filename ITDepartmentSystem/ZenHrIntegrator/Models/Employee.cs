using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ZenHrIntegrator.Models
{





    public sealed class EmployeeFullDto
    {
        public int Id { get; set; }
        public string? EmploymentNumber { get; set; }

        public int? BranchId { get; set; }
        public string? BranchName { get; set; }

        // Names
        public string? NameEn { get; set; }
        public string? NameAr { get; set; }

        public string? Email { get; set; }
        public string? Username { get; set; }
        public bool? Active { get; set; }

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

        // Professional
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public int? PositionId { get; set; }
        public string? PositionName { get; set; }

        public int? WorkLocationId { get; set; }
        public string? WorkLocationName { get; set; }

        public int? BusinessUnitId { get; set; }
        public string? BusinessUnitName { get; set; }

        public int? WorkTypeId { get; set; }
        public string? WorkTypeName { get; set; }
        public required DateTime? UpdatedAt { get; set; }
        public required DateTime? CreatedAt { get; set; }
    }

    public class ZenHrEmployee
    {
        [Key]
        public int Id { get; set; }               // ZenHR employee id

        public int? BranchId { get; set; }        // FK to ZenHrBranch (اللي عندك بالفعل)
        public string? EmploymentNumber { get; set; }

        public string? Email { get; set; }
        public string? Username { get; set; }

        // user info
        public int? UserId { get; set; }
        public string? ShortNameEn { get; set; }
        public string? ShortNameAr { get; set; }

        public string? NameEn { get; set; }       // full name composed
        public string? NameAr { get; set; }
        public string? PictureUrl { get; set; }

        // personal
        public DateTime? Birthdate { get; set; }
        public DateTime? HiringDate { get; set; }
        public DateTime? FixingDate { get; set; }
        public DateTime? TerminationDate { get; set; }
        public bool? Fixed { get; set; }

        public string? Gender { get; set; }
        public string? MaritalStatus { get; set; }
        public string? MobileNumber { get; set; }
        public string? Number { get; set; }
        public string? ExtNumber { get; set; }
        public string? PersonalEmail { get; set; }
        public string? Religion { get; set; }
        public bool? Citizen { get; set; }

        public string? Address { get; set; }
        public string? ContractType { get; set; }
        public DateTime? ContractEndDate { get; set; }

        // keep as JSON to avoid another table now
        public string? NationalitiesJson { get; set; }

        public string? NationalId { get; set; }
        public bool? Active { get; set; }

        public string? Logo { get; set; }

        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // professional_datum (FKs to master data)
        public int? ProfessionalDatumId { get; set; }
        public ZenHrEmployeeProfessionalDatum? ProfessionalDatum { get; set; }
    }

    public class ZenHrEmployeeProfessionalDatum
    {
        [Key]
        public int Id { get; set; } // ZenHR professional_datum id

        public int EmployeeId { get; set; } // FK to ZenHrEmployee
        public ZenHrEmployee Employee { get; set; } = default!;

        public string? EmploymentNumber { get; set; }
        public bool? Outsourced { get; set; }
        public DateTime? EffectiveOn { get; set; }
        public DateTime? ExpiresOn { get; set; }

        // Masters
        public int? ManagerId { get; set; }          // ZenHR manager id (مش employee id عندك بالضرورة)
        public string? ManagerName { get; set; }     // نخزن الاسم كمان

        public int? PositionId { get; set; }
        public ZenHrPosition? Position { get; set; }

        public int? DepartmentId { get; set; }
        public ZenHrDepartment? Department { get; set; }

        public int? WorkLocationId { get; set; }
        public ZenHrWorkLocation? WorkLocation { get; set; }

        public int? BusinessUnitId { get; set; }
        public ZenHrBusinessUnit? BusinessUnit { get; set; }

        public int? WorkTypeId { get; set; }
        public ZenHrWorkType? WorkType { get; set; }

        public int? SectionId { get; set; }
        public ZenHrSection? Section { get; set; }

        public int? DivisionId { get; set; }
        public ZenHrDivision? Division { get; set; }

        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    // ======= Master Tables (Id + Name) =======

    public class ZenHrDepartment { [Key] public int Id { get; set; } public string? Name { get; set; } public string? ExcelHrName { set; get; } }
    public class ZenHrPosition { [Key] public int Id { get; set; } public string? Name { get; set; } }
    public class ZenHrWorkLocation { [Key] public int Id { get; set; } public string? Name { get; set; } }
    public class ZenHrBusinessUnit { [Key] public int Id { get; set; } public string? Name { get; set; } }
    public class ZenHrWorkType { [Key] public int Id { get; set; } public string? Name { get; set; } }
    public class ZenHrSection { [Key] public int Id { get; set; } public string? Name { get; set; } }
    public class ZenHrDivision { [Key] public int Id { get; set; } public string? Name { get; set; } }










    public record BranchEmployeesRawDump(
    int BranchId,
    int Page,
    string Url,
    string Body
    );

    public record EmployeesDumpResult(
        int TotalBranches,
        int TotalPages,
        List<BranchEmployeesRawDump> Pages
    );



















    #region DTOS

    public sealed class ZenHrEmployeesResponse
    {
        [JsonPropertyName("allowed_actions")]
        public List<object> AllowedActions { get; set; } = new();

        [JsonPropertyName("pagination")]
        public ZenHrPagination Pagination { get; set; } = new();

        [JsonPropertyName("data")]
        public List<ZenHrEmployeeDto> Data { get; set; } = new();
    }

    public sealed class ZenHrPagination
    {
        [JsonPropertyName("current_page")] public int CurrentPage { get; set; }
        [JsonPropertyName("per_page")] public int PerPage { get; set; }
        [JsonPropertyName("total_entries")] public int TotalEntries { get; set; }
        [JsonPropertyName("total_pages")] public int TotalPages { get; set; }
    }

    // ============ Employee ============

    public sealed class ZenHrEmployeeDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("branch_id")]
        public int? BranchId { get; set; }

        [JsonPropertyName("employment_number")]
        public string? EmploymentNumber { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("branch")]
        public ZenHrBranchMiniDto? Branch { get; set; }

        [JsonPropertyName("user")]
        public ZenHrUserDto? User { get; set; }

        [JsonPropertyName("birthdate")]
        public DateTime? Birthdate { get; set; }

        [JsonPropertyName("hiring_date")]
        public DateTime? HiringDate { get; set; }

        [JsonPropertyName("fixing_date")]
        public DateTime? FixingDate { get; set; }

        [JsonPropertyName("termination_date")]
        public DateTime? TerminationDate { get; set; }

        [JsonPropertyName("fixed")]
        public bool? Fixed { get; set; }

        [JsonPropertyName("gender")]
        public string? Gender { get; set; } // "Male"/"Female" etc.

        [JsonPropertyName("marital_status")]
        public string? MaritalStatus { get; set; }

        [JsonPropertyName("mobile_number")]
        public string? MobileNumber { get; set; }

        [JsonPropertyName("number")]
        public string? Number { get; set; }

        [JsonPropertyName("ext_number")]
        public string? ExtNumber { get; set; }

        [JsonPropertyName("personal_email")]
        public string? PersonalEmail { get; set; }

        [JsonPropertyName("religion")]
        public string? Religion { get; set; }

        [JsonPropertyName("citizen")]
        public bool? Citizen { get; set; }

        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("contract_type")]
        public string? ContractType { get; set; } // limited/unlimited?

        [JsonPropertyName("contract_end_date")]
        public DateTime? ContractEndDate { get; set; }

        [JsonPropertyName("nationalities")]
        public List<string> Nationalities { get; set; } = new();

        [JsonPropertyName("national_id")]
        public string? NationalId { get; set; }

        [JsonPropertyName("active")]
        public bool? Active { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [JsonPropertyName("logo")]
        public string? Logo { get; set; }

        [JsonPropertyName("professional_datum")]
        public ZenHrProfessionalDatumDto? ProfessionalDatum { get; set; }
    }

    // ============ Nested ============

    public sealed class ZenHrBranchMiniDto
    {
        [JsonPropertyName("id")] public int Id { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
    }

    public sealed class ZenHrUserDto
    {
        [JsonPropertyName("id")] public int Id { get; set; }

        [JsonPropertyName("short_name")]
        public ZenHrLocalizedText? ShortName { get; set; }

        [JsonPropertyName("name")]
        public ZenHrBiLangPersonName? Name { get; set; }

        [JsonPropertyName("picture")]
        public ZenHrPictureDto? Picture { get; set; }
    }

    public sealed class ZenHrPictureDto
    {
        [JsonPropertyName("url")] public string? Url { get; set; }
    }

    public sealed class ZenHrBiLangPersonName
    {
        [JsonPropertyName("en")] public ZenHrPersonName? En { get; set; }
        [JsonPropertyName("ar")] public ZenHrPersonName? Ar { get; set; }
    }

    public sealed class ZenHrPersonName
    {
        [JsonPropertyName("first_name")] public string? FirstName { get; set; }
        [JsonPropertyName("second_name")] public string? SecondName { get; set; }
        [JsonPropertyName("third_name")] public string? ThirdName { get; set; }
        [JsonPropertyName("last_name")] public string? LastName { get; set; }
    }

    public sealed class ZenHrLocalizedText
    {
        [JsonPropertyName("en")] public string? En { get; set; }
        [JsonPropertyName("ar")] public string? Ar { get; set; }
    }

    // professional_datum contains master data objects (position/department/work_location/…)
    public sealed class ZenHrProfessionalDatumDto
    {
        [JsonPropertyName("id")] public int Id { get; set; }

        [JsonPropertyName("employee_id")] public int? EmployeeId { get; set; }

        [JsonPropertyName("employment_number")] public string? EmploymentNumber { get; set; }

        [JsonPropertyName("outsourced")] public bool? Outsourced { get; set; }

        [JsonPropertyName("effective_on")] public DateTime? EffectiveOn { get; set; }
        [JsonPropertyName("expires_on")] public DateTime? ExpiresOn { get; set; }

        [JsonPropertyName("manager")] public ZenHrIdNameDto? Manager { get; set; }
        [JsonPropertyName("position")] public ZenHrIdNameDto? Position { get; set; }
        [JsonPropertyName("work_location")] public ZenHrIdNameDto? WorkLocation { get; set; }
        [JsonPropertyName("department")] public ZenHrIdNameDto? Department { get; set; }
        [JsonPropertyName("section")] public ZenHrIdNameDto? Section { get; set; }
        [JsonPropertyName("division")] public ZenHrIdNameDto? Division { get; set; }
        [JsonPropertyName("business_unit")] public ZenHrIdNameDto? BusinessUnit { get; set; }
        [JsonPropertyName("work_type")] public ZenHrIdNameDto? WorkType { get; set; }

        [JsonPropertyName("created_at")] public DateTime? CreatedAt { get; set; }
        [JsonPropertyName("updated_at")] public DateTime? UpdatedAt { get; set; }
    }

    public sealed class ZenHrIdNameDto
    {
        [JsonPropertyName("id")] public int? Id { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
    }

    #endregion
}
