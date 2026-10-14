namespace ITDepartmentSystem.Models
{
    public class MultipleChoiceAnswerOption : Entity
    {
        public Guid AnswerId { get; set; }
        public MultipleChoiceQuestionAnswer Answer { get; set; }

        public Guid OptionId { get; set; }
        public QuestionOption Option { get; set; }
    }
}
