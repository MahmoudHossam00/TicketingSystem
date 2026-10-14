namespace ZenHrIntegrator.Models
{
    public class ZenHrBranch
    {
        public int Id { get; set; } // نفس id بتاع ZenHR (Primary Key)

        public string? NameAr { get; set; }
        public string? NameEn { get; set; }

        public string? ProbationType { get; set; }
        public string? ProbationPeriod { get; set; }

        public int? WorkingHours { get; set; }
        public int? CutOffDate { get; set; }
        public bool? ShowCutOffDate { get; set; }
        public int? WorkingDays { get; set; }

        public string? DaysOffCsv { get; set; } // "5,6"

        public string? Timezone { get; set; }
        public string? Currency { get; set; }

        public bool? ShowCompanyContributions { get; set; }
        public bool? DeductAbsence { get; set; }

        // Country flattened
        public int? CountryId { get; set; }
        public string? CountryNameAr { get; set; }
        public string? CountryNameEn { get; set; }
        public string? CountryCode { get; set; }
        public bool? SsAvailable { get; set; }
        public string? SsName { get; set; }

        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public string? LogoUrl { get; set; }

        public bool? ClockingWithQrCodeEnabled { get; set; }
        public bool? EditableEmployeeProfilePicture { get; set; }

        public int? Round { get; set; }

        // Tracking local sync
        public DateTime SyncedAtUtc { get; set; } = DateTime.UtcNow;
    }

}
