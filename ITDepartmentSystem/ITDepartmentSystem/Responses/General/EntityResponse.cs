namespace ITDepartmentSystem.Responses.General
{
    public class EntityResponse
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastUpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public string? CreatedBy { get; set; }
        public string? LastUpdateBy { get; set; }

        // reusable mapper for derived DTOs
        protected static void MapBase(Entity entity, EntityResponse dto)
        {
            dto.Id = entity.Id;
            dto.CreatedAt = entity.CreatedAt;
            dto.CreatedBy = entity.CreatedBy;
            dto.LastUpdatedAt = entity.LastUpdatedAt;
            dto.IsDeleted = entity.IsDeleted;
            dto.LastUpdateBy = entity.LastUpdateBy;
        }
    }
}
