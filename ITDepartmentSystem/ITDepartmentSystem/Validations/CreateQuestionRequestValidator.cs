using FluentValidation;

namespace ITDepartmentSystem.Validations
{
    public class CreateQuestionRequestValidator : AbstractValidator<CreateQuestionRequest>
    {
        public CreateQuestionRequestValidator()
        {
            RuleFor(x => x.QuestionHead)
                .NotEmpty()
                .MaximumLength(500);

            RuleFor(x => x.SubModuleId)
                .NotEmpty();

            // If NOT a choice question => Options must be null
            When(x => !IsChoice(x.type), () =>
            {
                RuleFor(x => x.Options)
                    .Null()
                    .WithMessage("Options must be null for non-choice questions.");
            });

            // If a choice question => Options required and at least 1
            When(x => IsChoice(x.type), () =>
            {
                RuleFor(x => x.Options)
                    .NotNull().WithMessage("Options are required for choice questions.")
                    .Must(o => o!.Count > 0).WithMessage("At least one option is required.");

                RuleForEach(x => x.Options!)
                    .SetValidator(new CreateQuestionOptionRequestValidator());

                // Optional but recommended: no empty texts, unique by text, order, etc.
                RuleFor(x => x.Options!)
                    .Must(opts => opts.Select(o => (o.Text ?? "").Trim())
                                      .All(t => !string.IsNullOrWhiteSpace(t)))
                    .WithMessage("Option text cannot be empty.");

                RuleFor(x => x.Options!)
                    .Must(opts => opts.Select(o => (o.Text ?? "").Trim().ToLower())
                                      .Distinct().Count() == opts.Count)
                    .WithMessage("Option texts must be unique.");
            });
        }

        private static bool IsChoice(TypeOfQuestion t) =>
            t == TypeOfQuestion.MultipleChoice || t == TypeOfQuestion.SingleChoice;
    }

    public class CreateQuestionOptionRequestValidator : AbstractValidator<CreateQuestionOptionRequest>
    {
        public CreateQuestionOptionRequestValidator()
        {
            RuleFor(x => x.Text)
                .NotEmpty()
                .MaximumLength(200);

            // In create requests, QuestionId should typically be null (server sets it)
            //RuleFor(x => x.QuestionId)
            //    .Null()
            //    .WithMessage("QuestionId must be null in create option request.");
        }
    }
}
