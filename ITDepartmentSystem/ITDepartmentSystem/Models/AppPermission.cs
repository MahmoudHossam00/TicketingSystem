namespace ITDepartmentSystem.Models
{
    public class AppPermission:Entity
    {
        public string Key { get; set; } = default!;      // "survey:create"
        public string Group { get; set; } = default!;    // "Survey"
        public string Name { get; set; } = default!;     // "Create"
        public bool IsActive { get; set; } = true;

        
    }
}
