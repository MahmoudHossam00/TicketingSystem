using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ZenHrIntegrator.Models.DbConfigurations
{
    public class ZenHrBranchConfiguration : IEntityTypeConfiguration<ZenHrBranch>
    {
        public void Configure(EntityTypeBuilder<ZenHrBranch> b)
        {
            b.ToTable("ZenHrBranches");

            b.HasKey(x => x.Id);
            b.Property(x => x.Id).ValueGeneratedNever();

            b.Property(x => x.NameAr).HasMaxLength(300);
            b.Property(x => x.NameEn).HasMaxLength(300);

            b.Property(x => x.ProbationType).HasMaxLength(50);
            b.Property(x => x.ProbationPeriod).HasMaxLength(50);

            b.Property(x => x.DaysOffCsv).HasMaxLength(50);

            b.Property(x => x.Timezone).HasMaxLength(50);
            b.Property(x => x.Currency).HasMaxLength(10);

            b.Property(x => x.CountryNameAr).HasMaxLength(100);
            b.Property(x => x.CountryNameEn).HasMaxLength(100);
            b.Property(x => x.CountryCode).HasMaxLength(10);
            b.Property(x => x.SsName).HasMaxLength(200);

            b.Property(x => x.LogoUrl).HasMaxLength(1000);

            b.Property(x => x.SyncedAtUtc).IsRequired();
        }
    }
}
