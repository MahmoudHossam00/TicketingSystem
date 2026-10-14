namespace ITDepartmentSystem.Models
{
    public class MultipleChoiceQuestionAnswer : QuestionAnswer
    {
        public List<MultipleChoiceAnswerOption> SelectedOptions { get; set; } = new();
    }
}
