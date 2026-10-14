using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZenHrIntegrator.Migrations
{
    /// <inheritdoc />
    public partial class branches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ZenHrBranches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    NameEn = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    ProbationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ProbationPeriod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    WorkingHours = table.Column<int>(type: "int", nullable: true),
                    CutOffDate = table.Column<int>(type: "int", nullable: true),
                    ShowCutOffDate = table.Column<bool>(type: "bit", nullable: true),
                    WorkingDays = table.Column<int>(type: "int", nullable: true),
                    DaysOffCsv = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Timezone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    ShowCompanyContributions = table.Column<bool>(type: "bit", nullable: true),
                    DeductAbsence = table.Column<bool>(type: "bit", nullable: true),
                    CountryId = table.Column<int>(type: "int", nullable: true),
                    CountryNameAr = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CountryNameEn = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CountryCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    SsAvailable = table.Column<bool>(type: "bit", nullable: true),
                    SsName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ClockingWithQrCodeEnabled = table.Column<bool>(type: "bit", nullable: true),
                    EditableEmployeeProfilePicture = table.Column<bool>(type: "bit", nullable: true),
                    Round = table.Column<int>(type: "int", nullable: true),
                    SyncedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZenHrBranches", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ZenHrBranches");
        }
    }
}
