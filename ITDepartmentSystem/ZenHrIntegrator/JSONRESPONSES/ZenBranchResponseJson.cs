namespace ZenHrIntegrator.JSONRESPONSES
{
    using System.Text.Json.Serialization;

    public sealed class ZenHrBranchesResponse
    {
        [JsonPropertyName("allowed_actions")]
        public List<object> AllowedActions { get; set; } = new();

        [JsonPropertyName("pagination")]
        public ZenHrPagination Pagination { get; set; } = new();

        [JsonPropertyName("data")]
        public List<ZenHrBranchDto> Data { get; set; } = new();
    }

    public sealed class ZenHrPagination
    {
        [JsonPropertyName("current_page")]
        public int CurrentPage { get; set; }

        [JsonPropertyName("per_page")]
        public int PerPage { get; set; }

        [JsonPropertyName("total_entries")]
        public int TotalEntries { get; set; }

        [JsonPropertyName("total_pages")]
        public int TotalPages { get; set; }
    }

    public sealed class ZenHrBranchDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public ZenHrLocalizedName Name { get; set; } = new();

        [JsonPropertyName("probation_period")]
        public ZenHrProbationPeriod? ProbationPeriod { get; set; }

        [JsonPropertyName("working_hours")]
        [JsonConverter(typeof(FlexibleNullableIntConverter))]
        public int? WorkingHours { get; set; }

        [JsonPropertyName("cut_off_date")]
        [JsonConverter(typeof(FlexibleNullableIntConverter))]
        public int? CutOffDate { get; set; }

        [JsonPropertyName("working_days")]
        [JsonConverter(typeof(FlexibleNullableIntConverter))]
        public int? WorkingDays { get; set; }

        [JsonPropertyName("show_cut_off_date")]
        public bool? ShowCutOffDate { get; set; }


        [JsonPropertyName("days_off")]
        public List<string> DaysOff { get; set; } = new();

        [JsonPropertyName("timezone")]
        public string? Timezone { get; set; }

        [JsonPropertyName("currency_currency")]
        public string? CurrencyCurrency { get; set; }

        [JsonPropertyName("show_company_contributions")]
        public bool? ShowCompanyContributions { get; set; }

        [JsonPropertyName("deduct_absence")]
        public bool? DeductAbsence { get; set; }

        [JsonPropertyName("country")]
        public ZenHrCountry? Country { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime? CreatedAt { get; set; }

        [JsonPropertyName("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [JsonPropertyName("logo_url")]
        public string? LogoUrl { get; set; }

        [JsonPropertyName("clocking_with_qr_code_enabled")]
        public bool? ClockingWithQrCodeEnabled { get; set; }

        [JsonPropertyName("editable_employee_profile_picture")]
        public bool? EditableEmployeeProfilePicture { get; set; }

        [JsonPropertyName("round")]
        public int? Round { get; set; }

        // لو تحب نضيف باقي الخصائص nullables (tax_number, address...etc) لاحقًا
    }

    public sealed class ZenHrLocalizedName
    {
        [JsonPropertyName("ar")]
        public string? Ar { get; set; }

        [JsonPropertyName("en")]
        public string? En { get; set; }
    }

    public sealed class ZenHrProbationPeriod
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("period")]
        public string? Period { get; set; }
    }

    public sealed class ZenHrCountry
    {
        [JsonPropertyName("country_id")]
        public int? CountryId { get; set; }

        [JsonPropertyName("name")]
        public ZenHrLocalizedName Name { get; set; } = new();

        [JsonPropertyName("country_code")]
        public string? CountryCode { get; set; }

        [JsonPropertyName("ss_available")]
        public bool? SsAvailable { get; set; }

        [JsonPropertyName("ss_name")]
        public string? SsName { get; set; }
    }
}
