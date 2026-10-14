namespace ITDepartmentSystem.Models
{
    public abstract class ChoiceQuestion : Question
    {
        public List<QuestionOption> Options { get; set; } = new();
    }
}
