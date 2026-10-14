namespace ITDepartmentSystem.Models
{
    public class AppSetting
    {
        [Key]
        public string Key { get; set; } = default!;
        public string Value { get; set; } = default!;
    }
}
