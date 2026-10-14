using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure.Internal;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ZenHrIntegrator.Models.DbConfigurations;

namespace ZenHrIntegrator.Models
{
    public class AppDbContext:DbContext
    {
        public DbSet<TokenModel> Tokens { set; get; }
        public DbSet<ZenHrBranch> ZenHrBranches => Set<ZenHrBranch>();

        public DbSet<ZenHrEmployee> ZenHrEmployees => Set<ZenHrEmployee>();
        public DbSet<deptTempTable> deptTempTable => Set<deptTempTable>();
        public DbSet<ZenHrEmployeeProfessionalDatum> ZenHrEmployeeProfessionalData => Set<ZenHrEmployeeProfessionalDatum>();


        public DbSet<ZenHrDepartment> ZenHrDepartments => Set<ZenHrDepartment>();
        public DbSet<ZenHrPosition> ZenHrPositions => Set<ZenHrPosition>();
        public DbSet<ZenHrWorkLocation> ZenHrWorkLocations => Set<ZenHrWorkLocation>();
        public DbSet<ZenHrBusinessUnit> ZenHrBusinessUnits => Set<ZenHrBusinessUnit>();
        public DbSet<ZenHrWorkType> ZenHrWorkTypes => Set<ZenHrWorkType>();
        public DbSet<ZenHrSection> ZenHrSections => Set<ZenHrSection>();
        public DbSet<ZenHrDivision> ZenHrDivisions => Set<ZenHrDivision>();
 
        public AppDbContext(DbContextOptions<AppDbContext> op ):base(op)
        {
            
        }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {

            modelBuilder.Entity<ZenHrEmployee>(e =>
            {
                e.HasKey(x => x.Id);
                e.Property(x => x.Id)
                .ValueGeneratedNever();   // ✅ مهم جدًا

                e.Property(x => x.Email).HasMaxLength(256);
                e.Property(x => x.Username).HasMaxLength(256);
                e.Property(x => x.EmploymentNumber).HasMaxLength(50);
                e.Property(x => x.NationalId).HasMaxLength(50);

                e.HasIndex(x => x.BranchId);
                e.HasIndex(x => x.EmploymentNumber);

                e.HasOne(x => x.ProfessionalDatum)
                 .WithOne(x => x.Employee)
                 .HasForeignKey<ZenHrEmployeeProfessionalDatum>(x => x.EmployeeId)
                 .OnDelete(DeleteBehavior.Cascade);
            });
            modelBuilder.Entity<ZenHrEmployeeProfessionalDatum>(p =>
            {
                p.HasKey(x => x.Id);

                p.Property(x => x.Id)
                .ValueGeneratedNever();   // ✅ مهم جدًا

                p.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.NoAction);
                p.HasOne(x => x.Position).WithMany().HasForeignKey(x => x.PositionId).OnDelete(DeleteBehavior.NoAction);
                p.HasOne(x => x.WorkLocation).WithMany().HasForeignKey(x => x.WorkLocationId).OnDelete(DeleteBehavior.NoAction);
                p.HasOne(x => x.BusinessUnit).WithMany().HasForeignKey(x => x.BusinessUnitId).OnDelete(DeleteBehavior.NoAction);
                p.HasOne(x => x.WorkType).WithMany().HasForeignKey(x => x.WorkTypeId).OnDelete(DeleteBehavior.NoAction);
                p.HasOne(x => x.Section).WithMany().HasForeignKey(x => x.SectionId).OnDelete(DeleteBehavior.NoAction);
                p.HasOne(x => x.Division).WithMany().HasForeignKey(x => x.DivisionId).OnDelete(DeleteBehavior.NoAction);
            });

            // Master tables: ensure Name length
            modelBuilder.Entity<ZenHrDepartment>().Property(x => x.Id).ValueGeneratedNever();
            modelBuilder.Entity<ZenHrDepartment>().Property(x => x.Name).HasMaxLength(256);
            modelBuilder.Entity<ZenHrPosition>().Property(x => x.Name).HasMaxLength(256);
            modelBuilder.Entity<ZenHrWorkLocation>().Property(x => x.Name).HasMaxLength(256);
            modelBuilder.Entity<ZenHrBusinessUnit>().Property(x => x.Name).HasMaxLength(256);
            modelBuilder.Entity<ZenHrWorkType>().Property(x => x.Name).HasMaxLength(256);
            modelBuilder.Entity<ZenHrSection>().Property(x => x.Name).HasMaxLength(256);
            modelBuilder.Entity<ZenHrDivision>().Property(x => x.Name).HasMaxLength(256);

            modelBuilder.Entity<ZenHrDepartment>().Property(x => x.Id).ValueGeneratedNever();
            modelBuilder.Entity<ZenHrPosition>().Property(x => x.Id).ValueGeneratedNever();
            modelBuilder.Entity<ZenHrWorkLocation>().Property(x => x.Id).ValueGeneratedNever();
            modelBuilder.Entity<ZenHrBusinessUnit>().Property(x => x.Id).ValueGeneratedNever();
            modelBuilder.Entity<ZenHrWorkType>().Property(x => x.Id).ValueGeneratedNever();
            modelBuilder.Entity<ZenHrSection>().Property(x => x.Id).ValueGeneratedNever();
            modelBuilder.Entity<ZenHrDivision>().Property(x => x.Id).ValueGeneratedNever();
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(TokenModelConfiguration).Assembly);

            base.OnModelCreating(modelBuilder);
        }
    }

    
}
