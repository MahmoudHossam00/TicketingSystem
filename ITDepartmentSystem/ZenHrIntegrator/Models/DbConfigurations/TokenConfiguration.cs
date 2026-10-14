using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ZenHrIntegrator.Models.DbConfigurations
{
    public class TokenModelConfiguration : IEntityTypeConfiguration<TokenModel>
    {
        public void Configure(EntityTypeBuilder<TokenModel> builder)
        {
            builder.ToTable("TokenModel");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Token)
                   .IsRequired()
                   .HasMaxLength(500);

            builder.HasIndex(x => x.DateTime);
            builder.Property(x => x.RefreshToken)
              .HasMaxLength(2000); // غالبًا كفاية، أو خليها nvarchar(max) برضه لو تحب
            builder.Property(x => x.Token)
              .HasMaxLength(2000); // غالبًا كفاية، أو خليها nvarchar(max) برضه لو تحب
        }
    }
}
