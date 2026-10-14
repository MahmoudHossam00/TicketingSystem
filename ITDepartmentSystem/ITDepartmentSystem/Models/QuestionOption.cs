namespace ITDepartmentSystem.Models
{
    public class QuestionOption : Entity
    {
        public Guid QuestionId { get; set; }          // FK column
        public ChoiceQuestion Question { get; set; }  // nav
        public string Text { get; set; }
        //public int Order { get; set; }
    }
}
