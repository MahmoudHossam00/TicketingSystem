using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITDepartmentSystem.Data.Configurations
{
    public class QuestionOptionConfiguration : IEntityTypeConfiguration<QuestionOption>
    {
        public void Configure(EntityTypeBuilder<QuestionOption> builder)
        {
            builder.Property(o => o.Text)
                   .IsRequired()
                   .HasMaxLength(300);

            //builder.HasIndex(o => new { o.QuestionId, o.Order })
            //       .IsUnique();

            builder.HasOne(o => o.Question)
                   .WithMany(cq => cq.Options)
                   .HasForeignKey(o => o.QuestionId)
                   .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
