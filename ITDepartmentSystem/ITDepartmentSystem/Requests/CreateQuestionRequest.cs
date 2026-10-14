using DocumentFormat.OpenXml.Office2013.Excel;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Requests
{
    public class UpdateQuestionRequest
    {
        public bool isRequired { set; get; } = true;
        public string QuestionHead { set; get; }
        //public Guid SubModuleId { set; get; }
        //public List<CreateQuestionOptionRequest>? Options { set; get; }
        //public TypeOfQuestion type { set; get; }
    }
        public class CreateQuestionRequest
    {
        public bool isRequired { set; get; } = true;
        public string QuestionHead { set; get; }
        public Guid SubModuleId { set; get; }
        public List<CreateQuestionOptionRequest>? Options { set; get; }
        public TypeOfQuestion type { set; get; }
        public static Question ToModel(CreateQuestionRequest req)
        {
            Question que;
            switch (req.type)
            {
                case TypeOfQuestion.Text:
                    que = new TextQuestion() { };
                    break;
                case TypeOfQuestion.DateTime:
                    que = new DateTimeQuestion() { };
                    break;
                case TypeOfQuestion.SingleChoice:
                    que = new SingleChoiceQuestion() { };
                    break;
                case TypeOfQuestion.MultipleChoice:
                    que = new MultipleChoiceQuestion() { };
                    break;
                default:
                    que = new TextQuestion() { };
                    break;

                     
                
            }
            if(que is ChoiceQuestion questionn )
            {
                var opts = req.Options ?? new();

                foreach (var option in opts)
                {
                    questionn.Options.Add(new QuestionOption()
                    {
                        Id = Guid.Empty,
                        Text = option.Text,
                    });
                }
            }
            que.SubModuleId = req.SubModuleId;
            que.QuestionHead = req.QuestionHead;
            que.isRequired = req.isRequired;
            return que;

        }
    }
    public class CreateQuestionOptionRequest
    {
        public Guid? QuestionId { get; set; }          // FK column
        public string Text { get; set; }
    }

    public enum TypeOfQuestion
    {
        Text,
        DateTime,
        MultipleChoice,
        SingleChoice
    }
}
