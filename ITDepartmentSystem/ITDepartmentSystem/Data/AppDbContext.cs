using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using System.Reflection.Emit;

namespace ITDepartmentSystem.Data
{
    public class AppDbContext : IdentityDbContext<AppUser, IdentityRoleWithPermission, string>

    {
        public DbSet<AppPermission> permissions { get; set; }
        public DbSet<EmployeeCache> Employees { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<AppSetting> AppSettings => Set<AppSetting>();
        public DbSet<Question> Questions => Set<Question>();
        public DbSet<Company> Companies => Set<Company>();
        public DbSet <ExternalApplication> ExternalApplications => Set<ExternalApplication>();
        public DbSet <IssueStatus> IssueStatuses => Set<IssueStatus>();
        public DbSet <IssueType> IssueTypes => Set<IssueType>();
        public DbSet <ITSystem> ITSystems => Set<ITSystem>();
        public DbSet <RelatedModule> RelatedModules => Set<RelatedModule>();
        public DbSet <RelatedSubModule> RelatedSubModules => Set<RelatedSubModule>();
        public DbSet <SystemAgent> SystemAgents => Set<SystemAgent>();
        public DbSet <Ticket> Tickets => Set<Ticket>();
        public DbSet <UserSession> UserSessions => Set<UserSession>();
        public DbSet <RelatedSubModuleAnswer> RelatedSubModuleAnswers => Set<RelatedSubModuleAnswer>();
        public DbSet<ExternalUser> ExternalUsers => Set<ExternalUser>();
        public DbSet<ExternalSystem> ExternalSystems => Set<ExternalSystem>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<Alert> Alerts => Set<Alert>();
        public DbSet<NewsLetter> NewsLetters => Set<NewsLetter>();

        public DbSet<Project> Projects => Set<Project>();
        public DbSet<Article> Articles => Set<Article>();
        public DbSet<ArticleBlock> ArticleBlocks => Set<ArticleBlock>();
        public AppDbContext(DbContextOptions<AppDbContext> op):base(op)
        {
            
        }
        protected override void OnModelCreating(ModelBuilder builder)
        {
            builder.ApplyConfigurationsFromAssembly(typeof(AppPermissionConfiguration).Assembly);
            builder.Entity<ExternalUser>().HasIndex(p => new { p.EmployeeId, p.ExternalSystemId }).IsUnique();
            builder.Entity<Reply>().HasOne(a => a.User).WithMany();
            builder.Entity<Reply>().HasMany(a => a.To).WithMany();
            builder.Entity<Reply>().HasMany(a => a.CCs).WithMany();
            builder.Entity<Notification>().HasIndex(n=>n.UserId);
            builder.Entity<UserSession>()
            .HasIndex(s => new { s.UserId, s.RevokedAt });
            builder.Entity<UserSession>().HasIndex(s => s.RefreshTokenHash).IsUnique();
            builder.Entity<ProjectMessage>()
            .HasMany(m => m.Seen)
            .WithMany(u => u.SeenProjectMessages)
            .UsingEntity<Dictionary<string, object>>(
            "ProjectMessageSeenUsers", // Join table name
            j => j.HasOne<AppUser>().WithMany().HasForeignKey("UserId").OnDelete(DeleteBehavior.Cascade),
            j => j.HasOne<ProjectMessage>().WithMany().HasForeignKey("MessageId").OnDelete(DeleteBehavior.Cascade)
        );
            
            builder.Entity<Message>().HasIndex(m => new { m.TicketId, m.Date });
            builder.Entity<TaskMessage>().HasIndex(m => new { m.TaskId, m.Date});
            builder.Entity<ProjectMessage>().HasIndex(m => new { m.ProjectId, m.Date});
            builder.Entity<UserMessage>()
            .HasIndex(m => new { m.UserId, m.ReceivingUserId, m.Date });

            builder.Entity<UserMessage>()
                .HasIndex(m => new { m.ReceivingUserId, m.UserId, m.Date });

            builder.Entity<Alert>().HasIndex(a => a.EndDate);
            builder.Entity<NewsLetter>().HasIndex(a => a.EndDate);
            builder.Entity<Alert>()
            .HasMany(a => a.Hiders)
            .WithMany();
            builder.Entity<Alert>()
            .HasMany(a => a.Viewers)
            .WithMany();

            builder.Entity<EmployeeCache>().HasIndex(e => e.ZenId).IsUnique();
            builder.Entity<EmployeeCache>().HasIndex(e => new { e.EmployeeNumber, e.BranchId }).IsUnique();
            base.OnModelCreating(builder);
        }
    }
}
