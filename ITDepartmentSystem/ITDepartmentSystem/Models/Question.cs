using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public abstract class Question :Entity
    {
        public string QuestionHead { set; get; }
        public bool isRequired { set; get; } = true;

        [ForeignKey("SubModule")]
        public Guid SubModuleId { set; get; }
        public RelatedSubModule SubModule { set; get; }
    }
}
