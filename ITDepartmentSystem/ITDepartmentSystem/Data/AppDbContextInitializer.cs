using DocumentFormat.OpenXml.Bibliography;
using Microsoft.AspNetCore.Identity;
using static ITDepartmentSystem.Token.Permission;

namespace ITDepartmentSystem.Data
{
    public class AppDbContextInitializer
    {
        public static async Task InitializeAsync(AppDbContext context)
        {


            //await context.Database.EnsureCreatedAsync();
            await context.Database.MigrateAsync();
            if (!context.IssueStatuses.Any())
            {
                context.IssueStatuses.AddRange(
                   new IssueStatus
                   {
                       Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                       StatusName = "Not Assigned Yet",
                   },
                    new IssueStatus
                    {
                        Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                        StatusName = "In Progress",
                    },
                    new IssueStatus
                    {
                        Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                        StatusName = "Closed",
                    }
                //new IdentityRole { Id = "2", Name = "MODERATOR", NormalizedName = "MODERATOR", ConcurrencyStamp = "2" },
                //new IdentityRole { Id = "3", Name = "USER", NormalizedName = "USER", ConcurrencyStamp = "3" },
                //new IdentityRole { Id = "4", Name = "MASTER", NormalizedName = "MASTER", ConcurrencyStamp = "4" }
                );
            }



            //if (context.Users.Any()) return;

            if (!context.Roles.Any())
            {
                context.Roles.AddRange(
                    new IdentityRoleWithPermission { Id = "1", Name = "ADMIN", NormalizedName = "ADMIN", ConcurrencyStamp = "1" },
                    new IdentityRoleWithPermission { Id = "2", Name = "MODERATOR", NormalizedName = "MODERATOR", ConcurrencyStamp = "2" },
                    new IdentityRoleWithPermission { Id = "3", Name = "USER", NormalizedName = "USER", ConcurrencyStamp = "3" },
                    new IdentityRoleWithPermission { Id = "4", Name = "MASTER", NormalizedName = "MASTER", ConcurrencyStamp = "4" },
                    new IdentityRoleWithPermission { Id = "5", Name = "HR", NormalizedName = "HR", ConcurrencyStamp = "5" },
                    new IdentityRoleWithPermission { Id = "6", Name = "AM", NormalizedName = "AM", ConcurrencyStamp = "6" },
                    new IdentityRoleWithPermission { Id = "7", Name = "DM", NormalizedName = "DM", ConcurrencyStamp = "7" },
                    new IdentityRoleWithPermission { Id = "8", Name = "Sales", NormalizedName = "Sales", ConcurrencyStamp = "8" }
                );
            }



            //if (!context.Departments.Any())
            //{
            //    context.Departments.AddRange(
            //        new Department { Id = Guid.Parse("11111111-1111-1111-1111-111111111111"), DepartmentCode = 0, Name = "TEMP" }
            //       );
            //}
            if (!context.Employees.Any())
            {
                var now = DateTime.UtcNow;

                // Helper: GUID ثابت (deterministic) عشان السِّيد يبقى ثابت كل مرة
                static Guid GuidFromInt(int i)
                {
                    // 00000000-0000-0000-0000-0000000000XX
                    // مثال i=1 => ...0001
                    var hex = i.ToString("D12"); // 12 digits
                    return Guid.Parse($"00000000-0000-0000-0000-{hex}");
                }

                

                context.Employees.Add(new EmployeeCache
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    ZenId=0,
                    EmployeeNumber = 0,
                    NameEn = "System User",
                    //ManagerId = null,
                    //CreatedAt = now,
                    //CreatedBy = "Seed",
                    //Peers = new List<Employee>(),
                    Email = "test@gmail.com"

                });
            }


            //var hasher = new PasswordHasher<AppUser>();
            var adminUser = new AppUser()
            {
                Id = "ae5c42c2-456f-4a1f-90a9-6e1abf92cf59",
                UserName = "ADMIN",
                NormalizedUserName = "ADMIN",
                Email = "ADMIN@FPI.com",
                NormalizedEmail = "ADMIN@FPI.COM",
                EmailConfirmed = true,
                EmployeeNumber = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                PasswordHash = "AQAAAAIAAYagAAAAEHj5bMeEE9XzYNo9TWsac2gtVaCqLHxLyrDUK7ewDMHj1YAYp84WjnJkSIKzBqnb1w==",

                // REQUIRED STATIC VALUES
                ConcurrencyStamp = "CONCURRENCY-STATIC-0001",
                SecurityStamp = "SECURITY-STATIC-0001"
            };
            var hasher = new PasswordHasher<AppUser>();
            adminUser.PasswordHash = hasher.HashPassword(adminUser, "Admin@1");
            if (!context.Users.Any())
            {
                context.Users.AddRange(
                    adminUser
                //new IdentityRole { Id = "2", Name = "MODERATOR", NormalizedName = "MODERATOR", ConcurrencyStamp = "2" },
                //new IdentityRole { Id = "3", Name = "USER", NormalizedName = "USER", ConcurrencyStamp = "3" },
                //new IdentityRole { Id = "4", Name = "MASTER", NormalizedName = "MASTER", ConcurrencyStamp = "4" }
                );
            }
            if (!context.UserRoles.Any())
            {
                context.UserRoles.AddRange(
                    new IdentityUserRole<string>
                    {
                        UserId = "ae5c42c2-456f-4a1f-90a9-6e1abf92cf59", // adminUser.Id
                        RoleId = "1"  // adminRole.Id
                    },
                new IdentityUserRole<string>
                {
                    UserId = "ae5c42c2-456f-4a1f-90a9-6e1abf92cf59", // adminUser.Id
                    RoleId = "4"  // adminRole.Id
                }
                //new IdentityRole { Id = "2", Name = "MODERATOR", NormalizedName = "MODERATOR", ConcurrencyStamp = "2" },
                //new IdentityRole { Id = "3", Name = "USER", NormalizedName = "USER", ConcurrencyStamp = "3" },
                //new IdentityRole { Id = "4", Name = "MASTER", NormalizedName = "MASTER", ConcurrencyStamp = "4" }
                );
            }

           foreach (var perm in PermissionCatalog.GetAll())
            {
                if(!(await context.permissions.AnyAsync(p=>p.Key==perm.Key)))
                {
                    await context.permissions.AddAsync(new()
                    {
                        Key = perm.Key,
                        IsActive = true,
                        Name = perm.Name,
                        Group = perm.Group,
                        CreatedBy="system",
                        CreatedAt = DateTime.Now
                    });

                }
            }
            await context.SaveChangesAsync();
        }
    }
}
