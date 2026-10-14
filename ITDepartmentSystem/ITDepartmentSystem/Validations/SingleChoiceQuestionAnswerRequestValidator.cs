using FluentValidation;

namespace ITDepartmentSystem.Validations
{
    public class SingleChoiceQuestionAnswerRequestValidator
     : AbstractValidator<SingleChoiceQuestionAnswerRequest>
    {
        public SingleChoiceQuestionAnswerRequestValidator()
        {
            RuleFor(x => x.QuestionId)
                .NotEmpty();

            RuleFor(x => x.SelectedOptionId)
                .NotNull()
                .WithMessage("You must select one option.")
                .Must(id => id != Guid.Empty)
                .WithMessage("Selected option is invalid.");
        }
    }
    public class MultipleChoiceQuestionAnswerRequestValidator
    : AbstractValidator<MultipleChoiceQuestionAnswerRequest>
    {
        public MultipleChoiceQuestionAnswerRequestValidator()
        {
            RuleFor(x => x.QuestionId)
                .NotEmpty();

            RuleFor(x => x.SelectedOptions)
                .NotNull()
                .WithMessage("You must select at least one option.")
                .Must(opts => opts.Count > 0)
                .WithMessage("You must select at least one option.");

            RuleFor(x => x.SelectedOptions)
                .Must(opts => opts.All(o => o != Guid.Empty))
                .WithMessage("One or more selected options are invalid.");

            RuleFor(x => x.SelectedOptions)
                .Must(opts => opts.Distinct().Count() == opts.Count)
                .WithMessage("Duplicate options are not allowed.");
        }
    }
    public class CreateRelatedSubModuleAnswerRequestValidator
    : AbstractValidator<CreateRelatedSubModuleAnswerRequest>
    {
        public CreateRelatedSubModuleAnswerRequestValidator()
        {
            RuleFor(x => x.RelatedSubModuleId).NotEmpty();

            RuleForEach(x => x.singleChoiceAnswers)
                .SetValidator(new SingleChoiceQuestionAnswerRequestValidator());

            RuleForEach(x => x.multipleChoiceAnswers)
                .SetValidator(new MultipleChoiceQuestionAnswerRequestValidator());
        }
    }

    public class CreateTicketRequestValidator : AbstractValidator<CreateTicketRequest>
    {
        public CreateTicketRequestValidator()
        {
            RuleFor(x => x.Subject).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Description).NotEmpty();

            RuleFor(x => x.RelatedSubModuleAnswer)
                .NotNull()
                .SetValidator(new CreateRelatedSubModuleAnswerRequestValidator());
        }
    }
}
