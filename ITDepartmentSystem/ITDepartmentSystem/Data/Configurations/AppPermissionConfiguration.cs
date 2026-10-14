using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ITDepartmentSystem.Data.Configurations
{
    public class AppPermissionConfiguration : IEntityTypeConfiguration<AppPermission>
    {
        public void Configure(EntityTypeBuilder<AppPermission> builder)
        {
            builder.HasIndex(x => x.Key).IsUnique();
        }
    }


    public class EmployeeCacheConfiguration : IEntityTypeConfiguration<EmployeeCache>
    {
        public void Configure(EntityTypeBuilder<EmployeeCache> builder)
        {
            builder.HasIndex(x => x.DepartmentId);
            builder.HasIndex(x => x.BranchId);
            builder.HasIndex(x => x.BusinessUnitId);
            builder.HasIndex(x => x.DepartmentId);
            builder.HasIndex(x => x.ManagerId);
            builder.HasIndex(x => x.WorkLocationId);
        }
    }
}
