using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Responses
{
    public class RelatedModuleResponse:EntityResponse
    {
        public string Name { set; get; }
        //[ForeignKey("System")]
        public Guid SystemId { set; get; }
        //public ITSystem Syst.em { s.et; get; }

        public List<RelatedSubModuleResponse> SubModules { set; get; } = new List<RelatedSubModuleResponse>();
        public static RelatedModuleResponse FromModel(RelatedModule module)
        {
            var mod = new RelatedModuleResponse()
            {
                Name = module.Name,
                SystemId = module.SystemId,
                SubModules = module.SubModules.Select(RelatedSubModuleResponse.FromModel).ToList()
            };
            MapBase(module, mod);
            return mod;
        }
    }

    
}
