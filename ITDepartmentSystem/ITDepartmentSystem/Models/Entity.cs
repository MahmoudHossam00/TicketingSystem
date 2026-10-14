namespace ITDepartmentSystem.Models
{
    public abstract class Entity : BaseEntity
    {


        // Track when it was created
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Track when it was last updated
        public DateTime? LastUpdatedAt { get; set; }

        // Soft delete flag
        public bool IsDeleted { get; set; } = false;

        // Optional: track who created/updated
        public string? CreatedBy { get; set; }
        public string? LastUpdateBy { get; set; }
    }
}

