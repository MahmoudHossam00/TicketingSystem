namespace ITDepartmentSystem.Models
{
    public class SingleChoiceQuestionAnswer : QuestionAnswer
    {
        public Guid? SelectedOptionId { get; set; }
        public QuestionOption? SelectedOption { get; set; }
    }
}
