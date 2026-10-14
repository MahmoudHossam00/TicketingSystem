using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITDepartmentSystem.Data.Configurations
{
    public class ExternalAppConfiguration : IEntityTypeConfiguration<ExternalApplication>
    {
        public void Configure(EntityTypeBuilder<ExternalApplication> builder)
        {
            builder.HasIndex(x => x.Name).IsUnique();
        }
    }
}
