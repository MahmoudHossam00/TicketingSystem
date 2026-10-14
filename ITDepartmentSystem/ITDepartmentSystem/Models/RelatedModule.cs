using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class RelatedModule:Entity
    {
        public string Name { set; get; }
        [ForeignKey("System")]
        public Guid SystemId { set; get; }
        public ITSystem System { set; get; }

        public List<RelatedSubModule> SubModules { set; get; } = new List<RelatedSubModule>();
    }
}
