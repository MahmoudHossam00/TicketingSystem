using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITDepartmentSystem.Data.Configurations
{
    public class ExternalAppUserConfiguration : IEntityTypeConfiguration<ExternalAppUser>
    {
        public void Configure(EntityTypeBuilder<ExternalAppUser> builder)
        {
            builder.HasIndex(x => new { x.UserName,x.ExternalApplicationId}).IsUnique();
        }
    }
}
