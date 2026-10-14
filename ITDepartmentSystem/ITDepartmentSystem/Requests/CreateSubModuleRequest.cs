namespace ITDepartmentSystem.Requests
{
    public class CreateSubModuleRequest
    {
        public Guid ModuleId { get;  set; }
        public string Name { get;  set; }

        public static RelatedSubModule ToModel(CreateSubModuleRequest create)
        {
            RelatedSubModule module = new()
            {
                ModuleId = create.ModuleId,
                Name = create.Name,
            };
            return module;
        }
    }
}
