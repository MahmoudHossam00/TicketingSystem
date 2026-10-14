namespace ITDepartmentSystem.OtherSystems.HeadCount
{
    public sealed class EmployeeFullDto
    {
        public int Id { get; set; }
        public int? EmploymentNumber { get; set; }
        public int? BranchId { get; set; }
        public string? NameEn { get; set; }
        public string? NameAr { get; set; }
        public string? Email { get; set; }
        public bool? Active { get; set; }

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
    }
}
