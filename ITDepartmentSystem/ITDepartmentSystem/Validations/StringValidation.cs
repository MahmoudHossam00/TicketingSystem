using FluentValidation;
//using ITDepartmentSystem.Requests.SurveyS;
//using static ITDepartmentSystem.Validations.AnsweredQuestionRequestValidation;

namespace ITDepartmentSystem.Validations
{
    public class StringValidation:AbstractValidator<string>
    {
        public StringValidation()
        {
            //RuleFor(x => x.Evaluators).NotEmpty();
            RuleFor(x => x).NotEmpty();

            
            //RuleFor(x => x.AssignedUserId).NotEmpty();
        }

    }
}
