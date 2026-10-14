namespace ITDepartmentSystem.Models
{
    public abstract class QuestionAnswer : Entity
    {
        public Guid SubModuleAnswerId { get; set; }
        public RelatedSubModuleAnswer SubModuleAnswer { get; set; }
        public Guid QuestionId { get; set; }
        public Question Question { get; set; }
    }
}
