using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Responses
{


    public class RelatedSubModuleResponse : EntityResponse
    {
        public string Name { set; get; }
        //[ForeignKey("System")]
        public Guid ModuleId { set; get; }
        //public ITSystem Syst.em { s.et; get; }

        //public List<RelatedSubModule> SubModules { set; get; } = new List<RelatedSubModule>();
        public static RelatedSubModuleResponse FromModel(RelatedSubModule module)
        {
            var mod = new RelatedSubModuleResponse()
            {
                Name = module.Name,
                ModuleId = module.ModuleId,

            };
            MapBase(module, mod);
            return mod;
        }
    }
    
}
