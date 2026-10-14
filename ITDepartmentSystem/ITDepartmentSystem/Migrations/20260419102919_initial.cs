using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ITDepartmentSystem.Migrations
{
    /// <inheritdoc />
    public partial class initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Alerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppSettings", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Departments",
                columns: table => new
                {
                    DepartmentId = table.Column<int>(type: "int", nullable: false),
                    DepartmentName = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.DepartmentId);
                });

            migrationBuilder.CreateTable(
                name: "Employees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ZenId = table.Column<int>(type: "int", nullable: false),
                    EmployeeNumber = table.Column<int>(type: "int", nullable: false),
                    NameEn = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ManuallyAddedEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Active = table.Column<bool>(type: "bit", nullable: true),
                    BranchId = table.Column<int>(type: "int", nullable: true),
                    DepartmentId = table.Column<int>(type: "int", nullable: true),
                    DepartmentName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PositionId = table.Column<int>(type: "int", nullable: true),
                    PositionName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BusinessUnitId = table.Column<int>(type: "int", nullable: true),
                    BusinessUnitName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WorkLocationId = table.Column<int>(type: "int", nullable: true),
                    WorkLocationName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WorkTypeId = table.Column<int>(type: "int", nullable: true),
                    WorkTypeName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Birthdate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HiringDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FixingDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TerminationDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MaritalStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MobileNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PersonalEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Religion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Citizen = table.Column<bool>(type: "bit", nullable: true),
                    SourceUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ManagerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Employees_Employees_ManagerId",
                        column: x => x.ManagerId,
                        principalTable: "Employees",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ExternalApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalApplications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExternalSystems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    URL = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LoginURL = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GetUsersURL = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AdminUserName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AdminPassword = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    isAnglarSystem = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalSystems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IssueStatuses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StatusName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    isFinished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IssueStatuses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IssueTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IssueTypeName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IssueTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ITSystems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ITSystems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "KPIMasterData",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KPIMasterData", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NewsLetters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NewsLetters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    EmployeeNumber = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Picture = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    isDisabled = table.Column<bool>(type: "bit", nullable: false),
                    EligibleForAgency = table.Column<bool>(type: "bit", nullable: false),
                    ChangedHisOwnPassword = table.Column<bool>(type: "bit", nullable: false),
                    LastLogin = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_Employees_EmployeeNumber",
                        column: x => x.EmployeeNumber,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ExternalAppUser",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExternalApplicationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Enabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalAppUser", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExternalAppUser_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ExternalAppUser_ExternalApplications_ExternalApplicationId",
                        column: x => x.ExternalApplicationId,
                        principalTable: "ExternalApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ExternalUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExternalSystemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    isActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExternalUsers_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ExternalUsers_ExternalSystems_ExternalSystemId",
                        column: x => x.ExternalSystemId,
                        principalTable: "ExternalSystems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "RelatedModules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SystemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RelatedModules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RelatedModules_ITSystems_SystemId",
                        column: x => x.SystemId,
                        principalTable: "ITSystems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AlertAppUser",
                columns: table => new
                {
                    AlertId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HidersId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertAppUser", x => new { x.AlertId, x.HidersId });
                    table.ForeignKey(
                        name: "FK_AlertAppUser_Alerts_AlertId",
                        column: x => x.AlertId,
                        principalTable: "Alerts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_AlertAppUser_AspNetUsers_HidersId",
                        column: x => x.HidersId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AlertAppUser1",
                columns: table => new
                {
                    Alert1Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ViewersId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertAppUser1", x => new { x.Alert1Id, x.ViewersId });
                    table.ForeignKey(
                        name: "FK_AlertAppUser1_Alerts_Alert1Id",
                        column: x => x.Alert1Id,
                        principalTable: "Alerts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_AlertAppUser1_AspNetUsers_ViewersId",
                        column: x => x.ViewersId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "Articles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AuthorId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SystemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Articles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Articles_AspNetUsers_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_Articles_ITSystems_SystemId",
                        column: x => x.SystemId,
                        principalTable: "ITSystems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    isSeen = table.Column<bool>(type: "bit", nullable: false),
                    isDeleted = table.Column<bool>(type: "bit", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RedirectLink = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Key = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Group = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    IdentityRoleWithPermissionId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_permissions_AspNetRoles_IdentityRoleWithPermissionId",
                        column: x => x.IdentityRoleWithPermissionId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_permissions_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    isClosed = table.Column<bool>(type: "bit", nullable: false),
                    priority = table.Column<int>(type: "int", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Attachments = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CurrentStatusId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreationDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FinishDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SystemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Projects_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_Projects_ITSystems_SystemId",
                        column: x => x.SystemId,
                        principalTable: "ITSystems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_Projects_IssueStatuses_CurrentStatusId",
                        column: x => x.CurrentStatusId,
                        principalTable: "IssueStatuses",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SystemAgents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AgentId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SystemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemAgents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SystemAgents_AspNetUsers_AgentId",
                        column: x => x.AgentId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_SystemAgents_ITSystems_SystemId",
                        column: x => x.SystemId,
                        principalTable: "ITSystems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "UserMessage",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ReceivingUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Pictures = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Attachments = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VoiceRecords = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    isSeen = table.Column<bool>(type: "bit", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserMessage", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserMessage_AspNetUsers_ReceivingUserId",
                        column: x => x.ReceivingUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_UserMessage_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "UserSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RefreshTokenHash = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReplacedByTokenHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUsedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSessions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "RelatedSubModules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ModuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RelatedSubModules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RelatedSubModules_RelatedModules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "RelatedModules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ArticleBlocks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    type = table.Column<int>(type: "int", nullable: false),
                    ArticleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    linkViewName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    imageHeight = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    imageWidth = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    textFont = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    textSize = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArticleBlocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ArticleBlocks_Articles_ArticleId",
                        column: x => x.ArticleId,
                        principalTable: "Articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ProjectMessage",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Pictures = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Attachments = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VoiceRecords = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectMessage", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectMessage_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ProjectMessage_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ProjectPrivateNote",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    note = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectPrivateNote", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectPrivateNote_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ProjectPrivateNote_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ProjectTask",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ResponsibleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreationDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FinishDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Attachments = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AssignedAttachments = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CurrentStatusId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    isClosed = table.Column<bool>(type: "bit", nullable: false),
                    priority = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectTask", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectTask_AspNetUsers_ResponsibleId",
                        column: x => x.ResponsibleId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ProjectTask_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ProjectTask_IssueStatuses_CurrentStatusId",
                        column: x => x.CurrentStatusId,
                        principalTable: "IssueStatuses",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProjectTask_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "Questions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionHead = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    isRequired = table.Column<bool>(type: "bit", nullable: false),
                    SubModuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionType = table.Column<string>(type: "nvarchar(21)", maxLength: 21, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Questions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Questions_RelatedSubModules_SubModuleId",
                        column: x => x.SubModuleId,
                        principalTable: "RelatedSubModules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "TextListItem",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BlockId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TextFont = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TextSize = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TextListItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TextListItem_ArticleBlocks_BlockId",
                        column: x => x.BlockId,
                        principalTable: "ArticleBlocks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ProjectMessageSeenUsers",
                columns: table => new
                {
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectMessageSeenUsers", x => new { x.MessageId, x.UserId });
                    table.ForeignKey(
                        name: "FK_ProjectMessageSeenUsers_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ProjectMessageSeenUsers_ProjectMessage_MessageId",
                        column: x => x.MessageId,
                        principalTable: "ProjectMessage",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ProjectTaskSubTask",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProjectTaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectTaskSubTask", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectTaskSubTask_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_ProjectTaskSubTask_ProjectTask_ProjectTaskId",
                        column: x => x.ProjectTaskId,
                        principalTable: "ProjectTask",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "TaskAssignHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskAssignHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskAssignHistory_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_TaskAssignHistory_ProjectTask_TaskId",
                        column: x => x.TaskId,
                        principalTable: "ProjectTask",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "TaskMessage",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Pictures = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Attachments = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VoiceRecords = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    isSeen = table.Column<bool>(type: "bit", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskMessage", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskMessage_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_TaskMessage_ProjectTask_TaskId",
                        column: x => x.TaskId,
                        principalTable: "ProjectTask",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "TaskPrivateNote",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    note = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskPrivateNote", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskPrivateNote_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_TaskPrivateNote_ProjectTask_TaskId",
                        column: x => x.TaskId,
                        principalTable: "ProjectTask",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "TaskStatusDate",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DateTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IssueStatusId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskStatusDate", x => x.id);
                    table.ForeignKey(
                        name: "FK_TaskStatusDate_IssueStatuses_IssueStatusId",
                        column: x => x.IssueStatusId,
                        principalTable: "IssueStatuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_TaskStatusDate_ProjectTask_TaskId",
                        column: x => x.TaskId,
                        principalTable: "ProjectTask",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "QuestionOption",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionOption", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionOption_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AppUserReply",
                columns: table => new
                {
                    ReplyId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ToId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUserReply", x => new { x.ReplyId, x.ToId });
                    table.ForeignKey(
                        name: "FK_AppUserReply_AspNetUsers_ToId",
                        column: x => x.ToId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AppUserReply1",
                columns: table => new
                {
                    CCsId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Reply1Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUserReply1", x => new { x.CCsId, x.Reply1Id });
                    table.ForeignKey(
                        name: "FK_AppUserReply1_AspNetUsers_CCsId",
                        column: x => x.CCsId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AppUserTicket",
                columns: table => new
                {
                    CCsId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CCsId1 = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUserTicket", x => new { x.CCsId, x.CCsId1 });
                    table.ForeignKey(
                        name: "FK_AppUserTicket_AspNetUsers_CCsId1",
                        column: x => x.CCsId1,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AppUserTicket1",
                columns: table => new
                {
                    ToId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ToId1 = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUserTicket1", x => new { x.ToId, x.ToId1 });
                    table.ForeignKey(
                        name: "FK_AppUserTicket1_AspNetUsers_ToId1",
                        column: x => x.ToId1,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "AssignHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssignHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssignHistory_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "KPI",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TicketTaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MainTaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FixedKPIId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ConfirmationDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KPI", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KPI_KPIMasterData_FixedKPIId",
                        column: x => x.FixedKPIId,
                        principalTable: "KPIMasterData",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_KPI_ProjectTaskSubTask_TaskId",
                        column: x => x.TaskId,
                        principalTable: "ProjectTaskSubTask",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_KPI_ProjectTask_MainTaskId",
                        column: x => x.MainTaskId,
                        principalTable: "ProjectTask",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Message",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Pictures = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Attachments = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VoiceRecords = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    isSeen = table.Column<bool>(type: "bit", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Message", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Message_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "MultipleChoiceAnswerOption",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnswerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MultipleChoiceAnswerOption", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MultipleChoiceAnswerOption_QuestionOption_OptionId",
                        column: x => x.OptionId,
                        principalTable: "QuestionOption",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "PrivateNote",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AppUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    note = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrivateNote", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrivateNote_AspNetUsers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "QuestionAnswer",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubModuleAnswerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnswerType = table.Column<string>(type: "nvarchar(21)", maxLength: 21, nullable: false),
                    Value = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SelectedOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TextQuestionAnswer_Value = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionAnswer", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionAnswer_QuestionOption_SelectedOptionId",
                        column: x => x.SelectedOptionId,
                        principalTable: "QuestionOption",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_QuestionAnswer_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "RelatedSubModuleAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RelatedSubModuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TicketHistoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RelatedSubModuleAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RelatedSubModuleAnswers_RelatedSubModules_RelatedSubModuleId",
                        column: x => x.RelatedSubModuleId,
                        principalTable: "RelatedSubModules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "Tickets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RelatedSubModuleAnswerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IssueTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CompanyId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    priority = table.Column<int>(type: "int", nullable: true),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Attachments = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CurrentStatusId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CurrentAssignedId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    isClosed = table.Column<bool>(type: "bit", nullable: false),
                    NotifyUser = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tickets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tickets_AspNetUsers_CurrentAssignedId",
                        column: x => x.CurrentAssignedId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Tickets_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_Tickets_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Tickets_IssueStatuses_CurrentStatusId",
                        column: x => x.CurrentStatusId,
                        principalTable: "IssueStatuses",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Tickets_IssueTypes_IssueTypeId",
                        column: x => x.IssueTypeId,
                        principalTable: "IssueTypes",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Tickets_RelatedSubModuleAnswers_RelatedSubModuleAnswerId",
                        column: x => x.RelatedSubModuleAnswerId,
                        principalTable: "RelatedSubModuleAnswers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "Reply",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SplitTicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ParentReplyId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Attachments = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Pictures = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reply", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reply_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_Reply_Reply_ParentReplyId",
                        column: x => x.ParentReplyId,
                        principalTable: "Reply",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Reply_Tickets_SplitTicketId",
                        column: x => x.SplitTicketId,
                        principalTable: "Tickets",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Reply_Tickets_TicketId",
                        column: x => x.TicketId,
                        principalTable: "Tickets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "TicketStatusDate",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DateTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IssueStatusId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketStatusDate", x => x.id);
                    table.ForeignKey(
                        name: "FK_TicketStatusDate_IssueStatuses_IssueStatusId",
                        column: x => x.IssueStatusId,
                        principalTable: "IssueStatuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_TicketStatusDate_Tickets_TicketId",
                        column: x => x.TicketId,
                        principalTable: "Tickets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "TicketTask",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketTask", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TicketTask_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_TicketTask_Tickets_TicketId",
                        column: x => x.TicketId,
                        principalTable: "Tickets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AlertAppUser_HidersId",
                table: "AlertAppUser",
                column: "HidersId");

            migrationBuilder.CreateIndex(
                name: "IX_AlertAppUser1_ViewersId",
                table: "AlertAppUser1",
                column: "ViewersId");

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_EndDate",
                table: "Alerts",
                column: "EndDate");

            migrationBuilder.CreateIndex(
                name: "IX_AppUserReply_ToId",
                table: "AppUserReply",
                column: "ToId");

            migrationBuilder.CreateIndex(
                name: "IX_AppUserReply1_Reply1Id",
                table: "AppUserReply1",
                column: "Reply1Id");

            migrationBuilder.CreateIndex(
                name: "IX_AppUserTicket_CCsId1",
                table: "AppUserTicket",
                column: "CCsId1");

            migrationBuilder.CreateIndex(
                name: "IX_AppUserTicket1_ToId1",
                table: "AppUserTicket1",
                column: "ToId1");

            migrationBuilder.CreateIndex(
                name: "IX_ArticleBlocks_ArticleId",
                table: "ArticleBlocks",
                column: "ArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_Articles_AuthorId",
                table: "Articles",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_Articles_SystemId",
                table: "Articles",
                column: "SystemId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_EmployeeNumber",
                table: "AspNetUsers",
                column: "EmployeeNumber");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AssignHistory_TicketId",
                table: "AssignHistory",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_AssignHistory_UserId",
                table: "AssignHistory",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_BranchId",
                table: "Employees",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_BusinessUnitId",
                table: "Employees",
                column: "BusinessUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_DepartmentId",
                table: "Employees",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_EmployeeNumber_BranchId",
                table: "Employees",
                columns: new[] { "EmployeeNumber", "BranchId" },
                unique: true,
                filter: "[BranchId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_ManagerId",
                table: "Employees",
                column: "ManagerId");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_WorkLocationId",
                table: "Employees",
                column: "WorkLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_ZenId",
                table: "Employees",
                column: "ZenId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalApplications_Name",
                table: "ExternalApplications",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalAppUser_EmployeeId",
                table: "ExternalAppUser",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_ExternalAppUser_ExternalApplicationId",
                table: "ExternalAppUser",
                column: "ExternalApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_ExternalAppUser_UserName_ExternalApplicationId",
                table: "ExternalAppUser",
                columns: new[] { "UserName", "ExternalApplicationId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalUsers_EmployeeId_ExternalSystemId",
                table: "ExternalUsers",
                columns: new[] { "EmployeeId", "ExternalSystemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalUsers_ExternalSystemId",
                table: "ExternalUsers",
                column: "ExternalSystemId");

            migrationBuilder.CreateIndex(
                name: "IX_KPI_FixedKPIId",
                table: "KPI",
                column: "FixedKPIId");

            migrationBuilder.CreateIndex(
                name: "IX_KPI_MainTaskId",
                table: "KPI",
                column: "MainTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_KPI_TaskId",
                table: "KPI",
                column: "TaskId",
                unique: true,
                filter: "[TaskId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_KPI_TicketId",
                table: "KPI",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_KPI_TicketTaskId",
                table: "KPI",
                column: "TicketTaskId",
                unique: true,
                filter: "[TicketTaskId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Message_TicketId_Date",
                table: "Message",
                columns: new[] { "TicketId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Message_UserId",
                table: "Message",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_MultipleChoiceAnswerOption_AnswerId",
                table: "MultipleChoiceAnswerOption",
                column: "AnswerId");

            migrationBuilder.CreateIndex(
                name: "IX_MultipleChoiceAnswerOption_OptionId",
                table: "MultipleChoiceAnswerOption",
                column: "OptionId");

            migrationBuilder.CreateIndex(
                name: "IX_NewsLetters_EndDate",
                table: "NewsLetters",
                column: "EndDate");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_permissions_AppUserId",
                table: "permissions",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_permissions_IdentityRoleWithPermissionId",
                table: "permissions",
                column: "IdentityRoleWithPermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_permissions_Key",
                table: "permissions",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PrivateNote_AppUserId",
                table: "PrivateNote",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PrivateNote_TicketId",
                table: "PrivateNote",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMessage_ProjectId_Date",
                table: "ProjectMessage",
                columns: new[] { "ProjectId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMessage_UserId",
                table: "ProjectMessage",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMessageSeenUsers_UserId",
                table: "ProjectMessageSeenUsers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectPrivateNote_AppUserId",
                table: "ProjectPrivateNote",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectPrivateNote_ProjectId",
                table: "ProjectPrivateNote",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_CurrentStatusId",
                table: "Projects",
                column: "CurrentStatusId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_SystemId",
                table: "Projects",
                column: "SystemId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_UserId",
                table: "Projects",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTask_CurrentStatusId",
                table: "ProjectTask",
                column: "CurrentStatusId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTask_ProjectId",
                table: "ProjectTask",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTask_ResponsibleId",
                table: "ProjectTask",
                column: "ResponsibleId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTask_UserId",
                table: "ProjectTask",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTaskSubTask_ProjectTaskId",
                table: "ProjectTaskSubTask",
                column: "ProjectTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTaskSubTask_UserId",
                table: "ProjectTaskSubTask",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionAnswer_QuestionId",
                table: "QuestionAnswer",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionAnswer_SelectedOptionId",
                table: "QuestionAnswer",
                column: "SelectedOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionAnswer_SubModuleAnswerId_QuestionId",
                table: "QuestionAnswer",
                columns: new[] { "SubModuleAnswerId", "QuestionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuestionOption_QuestionId",
                table: "QuestionOption",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_SubModuleId",
                table: "Questions",
                column: "SubModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_RelatedModules_SystemId",
                table: "RelatedModules",
                column: "SystemId");

            migrationBuilder.CreateIndex(
                name: "IX_RelatedSubModuleAnswers_RelatedSubModuleId",
                table: "RelatedSubModuleAnswers",
                column: "RelatedSubModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_RelatedSubModuleAnswers_TicketHistoryId",
                table: "RelatedSubModuleAnswers",
                column: "TicketHistoryId");

            migrationBuilder.CreateIndex(
                name: "IX_RelatedSubModules_ModuleId",
                table: "RelatedSubModules",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_Reply_ParentReplyId",
                table: "Reply",
                column: "ParentReplyId");

            migrationBuilder.CreateIndex(
                name: "IX_Reply_SplitTicketId",
                table: "Reply",
                column: "SplitTicketId",
                unique: true,
                filter: "[SplitTicketId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Reply_TicketId",
                table: "Reply",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_Reply_UserId",
                table: "Reply",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SystemAgents_AgentId",
                table: "SystemAgents",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_SystemAgents_SystemId",
                table: "SystemAgents",
                column: "SystemId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignHistory_TaskId",
                table: "TaskAssignHistory",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignHistory_UserId",
                table: "TaskAssignHistory",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskMessage_TaskId_Date",
                table: "TaskMessage",
                columns: new[] { "TaskId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_TaskMessage_UserId",
                table: "TaskMessage",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskPrivateNote_AppUserId",
                table: "TaskPrivateNote",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskPrivateNote_TaskId",
                table: "TaskPrivateNote",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskStatusDate_IssueStatusId",
                table: "TaskStatusDate",
                column: "IssueStatusId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskStatusDate_TaskId",
                table: "TaskStatusDate",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_TextListItem_BlockId",
                table: "TextListItem",
                column: "BlockId");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_CompanyId",
                table: "Tickets",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_CurrentAssignedId",
                table: "Tickets",
                column: "CurrentAssignedId");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_CurrentStatusId",
                table: "Tickets",
                column: "CurrentStatusId");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_IssueTypeId",
                table: "Tickets",
                column: "IssueTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_RelatedSubModuleAnswerId",
                table: "Tickets",
                column: "RelatedSubModuleAnswerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_UserId",
                table: "Tickets",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketStatusDate_IssueStatusId",
                table: "TicketStatusDate",
                column: "IssueStatusId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketStatusDate_TicketId",
                table: "TicketStatusDate",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketTask_TicketId",
                table: "TicketTask",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketTask_UserId",
                table: "TicketTask",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserMessage_ReceivingUserId_UserId_Date",
                table: "UserMessage",
                columns: new[] { "ReceivingUserId", "UserId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_UserMessage_UserId_ReceivingUserId_Date",
                table: "UserMessage",
                columns: new[] { "UserId", "ReceivingUserId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_RefreshTokenHash",
                table: "UserSessions",
                column: "RefreshTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_UserId_RevokedAt",
                table: "UserSessions",
                columns: new[] { "UserId", "RevokedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_AppUserReply_Reply_ReplyId",
                table: "AppUserReply",
                column: "ReplyId",
                principalTable: "Reply",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_AppUserReply1_Reply_Reply1Id",
                table: "AppUserReply1",
                column: "Reply1Id",
                principalTable: "Reply",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_AppUserTicket_Tickets_CCsId",
                table: "AppUserTicket",
                column: "CCsId",
                principalTable: "Tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_AppUserTicket1_Tickets_ToId",
                table: "AppUserTicket1",
                column: "ToId",
                principalTable: "Tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_AssignHistory_Tickets_TicketId",
                table: "AssignHistory",
                column: "TicketId",
                principalTable: "Tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_KPI_TicketTask_TicketTaskId",
                table: "KPI",
                column: "TicketTaskId",
                principalTable: "TicketTask",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_KPI_Tickets_TicketId",
                table: "KPI",
                column: "TicketId",
                principalTable: "Tickets",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Message_Tickets_TicketId",
                table: "Message",
                column: "TicketId",
                principalTable: "Tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_MultipleChoiceAnswerOption_QuestionAnswer_AnswerId",
                table: "MultipleChoiceAnswerOption",
                column: "AnswerId",
                principalTable: "QuestionAnswer",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_PrivateNote_Tickets_TicketId",
                table: "PrivateNote",
                column: "TicketId",
                principalTable: "Tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_QuestionAnswer_RelatedSubModuleAnswers_SubModuleAnswerId",
                table: "QuestionAnswer",
                column: "SubModuleAnswerId",
                principalTable: "RelatedSubModuleAnswers",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_RelatedSubModuleAnswers_Tickets_TicketHistoryId",
                table: "RelatedSubModuleAnswers",
                column: "TicketHistoryId",
                principalTable: "Tickets",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_AspNetUsers_CurrentAssignedId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_AspNetUsers_UserId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_RelatedSubModuleAnswers_Tickets_TicketHistoryId",
                table: "RelatedSubModuleAnswers");

            migrationBuilder.DropTable(
                name: "AlertAppUser");

            migrationBuilder.DropTable(
                name: "AlertAppUser1");

            migrationBuilder.DropTable(
                name: "AppSettings");

            migrationBuilder.DropTable(
                name: "AppUserReply");

            migrationBuilder.DropTable(
                name: "AppUserReply1");

            migrationBuilder.DropTable(
                name: "AppUserTicket");

            migrationBuilder.DropTable(
                name: "AppUserTicket1");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "AssignHistory");

            migrationBuilder.DropTable(
                name: "Departments");

            migrationBuilder.DropTable(
                name: "ExternalAppUser");

            migrationBuilder.DropTable(
                name: "ExternalUsers");

            migrationBuilder.DropTable(
                name: "KPI");

            migrationBuilder.DropTable(
                name: "Message");

            migrationBuilder.DropTable(
                name: "MultipleChoiceAnswerOption");

            migrationBuilder.DropTable(
                name: "NewsLetters");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "permissions");

            migrationBuilder.DropTable(
                name: "PrivateNote");

            migrationBuilder.DropTable(
                name: "ProjectMessageSeenUsers");

            migrationBuilder.DropTable(
                name: "ProjectPrivateNote");

            migrationBuilder.DropTable(
                name: "SystemAgents");

            migrationBuilder.DropTable(
                name: "TaskAssignHistory");

            migrationBuilder.DropTable(
                name: "TaskMessage");

            migrationBuilder.DropTable(
                name: "TaskPrivateNote");

            migrationBuilder.DropTable(
                name: "TaskStatusDate");

            migrationBuilder.DropTable(
                name: "TextListItem");

            migrationBuilder.DropTable(
                name: "TicketStatusDate");

            migrationBuilder.DropTable(
                name: "UserMessage");

            migrationBuilder.DropTable(
                name: "UserSessions");

            migrationBuilder.DropTable(
                name: "Alerts");

            migrationBuilder.DropTable(
                name: "Reply");

            migrationBuilder.DropTable(
                name: "ExternalApplications");

            migrationBuilder.DropTable(
                name: "ExternalSystems");

            migrationBuilder.DropTable(
                name: "KPIMasterData");

            migrationBuilder.DropTable(
                name: "ProjectTaskSubTask");

            migrationBuilder.DropTable(
                name: "TicketTask");

            migrationBuilder.DropTable(
                name: "QuestionAnswer");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "ProjectMessage");

            migrationBuilder.DropTable(
                name: "ArticleBlocks");

            migrationBuilder.DropTable(
                name: "ProjectTask");

            migrationBuilder.DropTable(
                name: "QuestionOption");

            migrationBuilder.DropTable(
                name: "Articles");

            migrationBuilder.DropTable(
                name: "Projects");

            migrationBuilder.DropTable(
                name: "Questions");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "Employees");

            migrationBuilder.DropTable(
                name: "Tickets");

            migrationBuilder.DropTable(
                name: "Companies");

            migrationBuilder.DropTable(
                name: "IssueStatuses");

            migrationBuilder.DropTable(
                name: "IssueTypes");

            migrationBuilder.DropTable(
                name: "RelatedSubModuleAnswers");

            migrationBuilder.DropTable(
                name: "RelatedSubModules");

            migrationBuilder.DropTable(
                name: "RelatedModules");

            migrationBuilder.DropTable(
                name: "ITSystems");
        }
    }
}
