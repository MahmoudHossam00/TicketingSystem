using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITDepartmentSystem.Data.Configurations
{
    public class QuestionConfiguration : IEntityTypeConfiguration<Question>
    {
        public void Configure(EntityTypeBuilder<Question> builder)
        {
            builder.Property(q => q.QuestionHead)
                   .IsRequired()
                   .HasMaxLength(500);

            builder.HasOne(q => q.SubModule)
                   .WithMany(sm => sm.Questions)
                   .HasForeignKey(q => q.SubModuleId)
                   .OnDelete(DeleteBehavior.Cascade);

            builder.HasDiscriminator<string>("QuestionType")
                   .HasValue<TextQuestion>("Text")
                   .HasValue<DateTimeQuestion>("DateTime")
                   .HasValue<SingleChoiceQuestion>("SingleChoice")
                   .HasValue<MultipleChoiceQuestion>("MultipleChoice");
        }
    }
    public class QuestionAnswerConfiguration : IEntityTypeConfiguration<QuestionAnswer>
    {
        public void Configure(EntityTypeBuilder<QuestionAnswer> builder)
        {
            builder
            .HasIndex(a => new { a.SubModuleAnswerId, a.QuestionId })
            .IsUnique();

            builder
            .HasDiscriminator<string>("AnswerType")
            .HasValue<TextQuestionAnswer>("Text")
            .HasValue<DateTimeQuestionAnswer>("DateTime")
            .HasValue<SingleChoiceQuestionAnswer>("SingleChoice")
            .HasValue<MultipleChoiceQuestionAnswer>("MultipleChoice");
        }
    }
}
