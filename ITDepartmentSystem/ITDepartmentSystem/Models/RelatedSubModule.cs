using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class RelatedSubModule : Entity
    {
        public string Name { set; get; }
        [ForeignKey("Module")]
        public Guid ModuleId { set; get; }
        public RelatedModule Module { set; get; }

        public List<Question> Questions { set; get; } = new List<Question>();
    }
}
