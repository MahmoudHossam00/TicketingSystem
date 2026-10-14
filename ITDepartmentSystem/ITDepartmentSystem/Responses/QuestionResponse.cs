using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Responses
{
    public class QuestionResponse:EntityResponse
    {
        public string QuestionHead { set; get; }
        public bool isRequired { set; get; } = true;

        //[ForeignKey("SubModule")]
        public Guid SubModuleId { set; get; }
        public List<OptionResponse>? Options { set; get; }
        public TypeOfQuestion QuestionType { set; get; }
        public static QuestionResponse FromModel(Question question)
        {
            QuestionResponse response = new QuestionResponse()
            {
                isRequired = question.isRequired,
                QuestionHead = question.QuestionHead,
                SubModuleId = question.SubModuleId,

            };
            MapBase(question, response);
            if (question is TextQuestion textquestion)
            {
                response.QuestionType = TypeOfQuestion.Text;
            }
            else if(question is DateTimeQuestion datequestion)
            {
                response.QuestionType = TypeOfQuestion.DateTime;
            }
            else if (question is ChoiceQuestion choice)
            {
                if(choice is MultipleChoiceQuestion multichoice)
                {
                    response.QuestionType = TypeOfQuestion.MultipleChoice;
                }
                else if (choice is SingleChoiceQuestion singlechoice)
                {
                    response.QuestionType = TypeOfQuestion.SingleChoice;
                }
                response.Options = choice.Options.Where(o=>!o.IsDeleted).Select(OptionResponse.FromModel).ToList();
            }
            return response;
        }
        //public RelatedSubModule SubModule { set; get; }

    }

    public class AnswerResponse : EntityResponse
    {
        public string QuestionHead { set; get; }
        public bool isRequired { set; get; } = true;

        //[ForeignKey("SubModule")]
        //public Guid SubModuleId { set; get; }
        public List<string>? AnsweredOptions { set; get; }
        public DateTime? DateAnswer { set; get; }
        public string? textAnswer { set; get; }
        public TypeOfQuestion QuestionType { set; get; }
        public static AnswerResponse FromModel(QuestionAnswer question)
        {
            AnswerResponse response = new AnswerResponse()
            {
                isRequired = question.Question.isRequired,
                QuestionHead = question.Question.QuestionHead
                //SubModuleId = question.Q.SubModuleId,

            };
            MapBase(question, response);
            if (question is TextQuestionAnswer textquestion)
            {
                response.QuestionType = TypeOfQuestion.Text;
                response.textAnswer = textquestion.Value;
            }
            else if (question is DateTimeQuestionAnswer datequestion)
            {
                response.QuestionType = TypeOfQuestion.DateTime;
                response.DateAnswer = datequestion.Value;

            }
            else if (question is SingleChoiceQuestionAnswer || question is MultipleChoiceQuestionAnswer )
            {
                response.AnsweredOptions ??= new List<string>();
                if (question is MultipleChoiceQuestionAnswer multichoice)
                {
                    response.QuestionType = TypeOfQuestion.MultipleChoice;
                    response.AnsweredOptions = multichoice.SelectedOptions.Select(c => c.Option.Text).ToList();
                }
                else if (question is SingleChoiceQuestionAnswer singlechoice)
                {
                    response.QuestionType = TypeOfQuestion.SingleChoice;
                    response.AnsweredOptions.Add(singlechoice.SelectedOption?.Text??"");
                }
            }
            return response;
        }
        //public RelatedSubModule SubModule { set; get; }

    }
    public class OptionResponse:EntityResponse
    {
        public Guid QuestionId { get; set; }          // FK column
        public string Text { get; set; }
        //public int Order { get; set; }
        public static OptionResponse FromModel(QuestionOption option)
        {
            OptionResponse response = new OptionResponse()
            {
                QuestionId = option.QuestionId,
                Text = option.Text,
                //Order = option.Order,

            };
            MapBase(option, response);
            return response;
        }
    }

    public class OptionAnswerResponse : EntityResponse
    {
        public Guid QuestionId { get; set; }          // FK column
        public string Text { get; set; }
        public bool isSelected { get; set; }
        //public int Order { get; set; }
        public static OptionResponse FromModel(QuestionOption option)
        {
            OptionResponse response = new OptionResponse()
            {
                QuestionId = option.QuestionId,
                Text = option.Text,
                //Order = option.Order,

            };
            MapBase(option, response);
            return response;
        }
    }
}