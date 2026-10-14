namespace ZenHrIntegrator.Responses
{
    public sealed class MasterDto
    {
        public int Id { get; set; }
        public string? Name { get; set; }
    }
    public sealed class ProfessionalDatumDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }

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

        public int? SectionId { get; set; }
        public string? SectionName { get; set; }

        public int? DivisionId { get; set; }
        public string? DivisionName { get; set; }
    }
}
