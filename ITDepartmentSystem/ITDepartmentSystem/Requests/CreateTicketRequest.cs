using ITDepartmentSystem.Enums;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Requests
{
    public abstract class QuestionAnswerRequest
    {
        //public Guid SubModuleAnswerId { get; set; }
        //public RelatedSubModuleAnswer SubModuleAnswer { get; set; }
        public Guid QuestionId { get; set; }
        //public Question Question { get; set; }
        protected static void mapbase(QuestionAnswer ans,QuestionAnswerRequest request, RelatedSubModuleAnswer SubModuleAnswer)
        {
            ans.QuestionId = request.QuestionId;
            ans.SubModuleAnswer= SubModuleAnswer;
        }
    }
    public class TextQuestionAnswerRequest : QuestionAnswerRequest
    {
        public string? Value { get; set; }
        public static QuestionAnswer ToModel(TextQuestionAnswerRequest request, RelatedSubModuleAnswer SubModuleAnswer)
        {
            var ans = new TextQuestionAnswer()
            {
                Id = Guid.Empty,

                Value = request.Value
            };
           mapbase(ans, request,SubModuleAnswer);
           return ans;
        }
    }
    public class DateQuestionAnswerRequest : QuestionAnswerRequest
    {
        public DateTime? Value { get; set; }
        public static QuestionAnswer ToModel(DateQuestionAnswerRequest request, RelatedSubModuleAnswer SubModuleAnswer)
        {
            var ans = new DateTimeQuestionAnswer()
            {
                Id = Guid.Empty,

                Value = request.Value
            };
            mapbase(ans, request,SubModuleAnswer);
            return ans;
        }
    }
    public class SingleChoiceQuestionAnswerRequest : QuestionAnswerRequest
    {
        public Guid? SelectedOptionId { get; set; }
        public static QuestionAnswer ToModel(SingleChoiceQuestionAnswerRequest request,RelatedSubModuleAnswer SubModuleAnswer)
        {
            var ans = new SingleChoiceQuestionAnswer()
            {
                Id = Guid.Empty,

                SelectedOptionId = request.SelectedOptionId,

            };
            mapbase(ans, request,SubModuleAnswer);
            ans.Id = Guid.Empty;
            return ans;
        }
    }
    public class MultipleChoiceQuestionAnswerRequest : QuestionAnswerRequest
    {
        public List<Guid> SelectedOptions { get; set; } = new();

        public static QuestionAnswer ToModel(MultipleChoiceQuestionAnswerRequest request, RelatedSubModuleAnswer SubModuleAnswer)
        {
            var ans = new MultipleChoiceQuestionAnswer()
            {
                Id = Guid.Empty,

            };
            ans.SelectedOptions = request.SelectedOptions.Select(o => new MultipleChoiceAnswerOption()
            {
                Answer = ans,
                OptionId = o,
                Id = Guid.Empty
            }).ToList();
            mapbase(ans, request,SubModuleAnswer);
            return ans;
        }
    }
    public class MultipleChoiceAnswerOptionRequest 
    {
        public Guid AnswerId { get; set; }
        public MultipleChoiceQuestionAnswer Answer { get; set; }

        public Guid OptionId { get; set; }
        public QuestionOption Option { get; set; }



    }

    public class CreateRelatedSubModuleAnswerRequest
    {
        public Guid RelatedSubModuleId { set; get; }
        //public RelatedSubModule RelatedSubModule { set; get; }
        //public List<TextAnswers> Answers { get; set; } = new();
        public List<TextQuestionAnswerRequest> textAnswers { get; set; } = new();
        public List<DateQuestionAnswerRequest> dateAnswers { get; set; } = new();
        public List<MultipleChoiceQuestionAnswerRequest> multipleChoiceAnswers { get; set; } = new();
        public List<SingleChoiceQuestionAnswerRequest> singleChoiceAnswers { get; set; } = new();

        public static RelatedSubModuleAnswer ToModel(CreateRelatedSubModuleAnswerRequest request)
        {
            RelatedSubModuleAnswer ans = new()
            {
                RelatedSubModuleId = request.RelatedSubModuleId,
                //Answers = request.Answers.Select(CreateQuestionAnswerRequest.ToModel).ToList()
                Id=Guid.Empty
            };
            ans.Answers = (request.textAnswers.Select(a=>TextQuestionAnswerRequest.ToModel(a, ans)).ToList()
                .Concat(request.dateAnswers.Select(a => DateQuestionAnswerRequest.ToModel(a, ans)).ToList())
                .Concat(request.multipleChoiceAnswers.Select(a=>MultipleChoiceQuestionAnswerRequest.ToModel(a, ans)).ToList())
                .Concat(request.singleChoiceAnswers.Select(a=>SingleChoiceQuestionAnswerRequest.ToModel(a, ans)).ToList())).ToList();

            return ans;
        }
        
    }
    public class CreateTicketRequest
    {
        public CreateRelatedSubModuleAnswerRequest RelatedSubModuleAnswer { set; get; }
        //public Guid IssueTypeId { set; get; }
        //public Guid? CompanyId { set; get; }
        public IssuePriority? priority { set; get; }
        public string Subject { set; get; }
        public string Description { set; get; }
        public List<IFormFile> Attachments { set; get; } = new List<IFormFile>();
        public List<Guid> To { set; get; } = new List<Guid> { };
        public List<Guid> CCs { set; get; } = new List<Guid> { };

        public string? userId { set; get; }
        public Guid? EmployeeId { set; get; }
        public bool? NotifyUser { set; get; }

        public static async Task<Ticket> ToModel(CreateTicketRequest request)
        {
            Ticket entity = new()
            {
                Subject=request.Subject,
                Description = request.Description,
                priority = request.priority,


                Attachments = (await Task.WhenAll(
                   request.Attachments.Select(a => a.Save(new List<string> { 
                       //"Ticket"
                   }))
               )).ToList(),
                RelatedSubModuleAnswer = 
                CreateRelatedSubModuleAnswerRequest.ToModel(request.RelatedSubModuleAnswer)
                //priority = request.priority,
                //priority = request.priority,
            };
            //entity.Attachments = (await Task.WhenAll(
            //       request.Attachments.Select(a => a.Save(new List<string> { "Ticket" }))
            //   )).ToList();
            return entity;
        }
    }
    public class UpdateTicketRequest
    {
    }
}
