using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZenHrIntegrator.Migrations
{
    /// <inheritdoc />
    public partial class employees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ZenHrBusinessUnits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZenHrBusinessUnits", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ZenHrDepartments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZenHrDepartments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ZenHrDivisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZenHrDivisions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ZenHrEmployees",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: true),
                    EmploymentNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Username = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    ShortNameEn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShortNameAr = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NameEn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NameAr = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PictureUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Birthdate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HiringDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FixingDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TerminationDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Fixed = table.Column<bool>(type: "bit", nullable: true),
                    Gender = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MaritalStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MobileNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Number = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExtNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PersonalEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Religion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Citizen = table.Column<bool>(type: "bit", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ContractType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ContractEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NationalitiesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NationalId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Active = table.Column<bool>(type: "bit", nullable: true),
                    Logo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProfessionalDatumId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZenHrEmployees", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ZenHrPositions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZenHrPositions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ZenHrSections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZenHrSections", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ZenHrWorkLocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZenHrWorkLocations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ZenHrWorkTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZenHrWorkTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ZenHrEmployeeProfessionalData",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    EmploymentNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Outsourced = table.Column<bool>(type: "bit", nullable: true),
                    EffectiveOn = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExpiresOn = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ManagerId = table.Column<int>(type: "int", nullable: true),
                    ManagerName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PositionId = table.Column<int>(type: "int", nullable: true),
                    DepartmentId = table.Column<int>(type: "int", nullable: true),
                    WorkLocationId = table.Column<int>(type: "int", nullable: true),
                    BusinessUnitId = table.Column<int>(type: "int", nullable: true),
                    WorkTypeId = table.Column<int>(type: "int", nullable: true),
                    SectionId = table.Column<int>(type: "int", nullable: true),
                    DivisionId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZenHrEmployeeProfessionalData", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ZenHrEmployeeProfessionalData_ZenHrBusinessUnits_BusinessUnitId",
                        column: x => x.BusinessUnitId,
                        principalTable: "ZenHrBusinessUnits",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ZenHrEmployeeProfessionalData_ZenHrDepartments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "ZenHrDepartments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ZenHrEmployeeProfessionalData_ZenHrDivisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "ZenHrDivisions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ZenHrEmployeeProfessionalData_ZenHrEmployees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "ZenHrEmployees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ZenHrEmployeeProfessionalData_ZenHrPositions_PositionId",
                        column: x => x.PositionId,
                        principalTable: "ZenHrPositions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ZenHrEmployeeProfessionalData_ZenHrSections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "ZenHrSections",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ZenHrEmployeeProfessionalData_ZenHrWorkLocations_WorkLocationId",
                        column: x => x.WorkLocationId,
                        principalTable: "ZenHrWorkLocations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ZenHrEmployeeProfessionalData_ZenHrWorkTypes_WorkTypeId",
                        column: x => x.WorkTypeId,
                        principalTable: "ZenHrWorkTypes",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ZenHrEmployeeProfessionalData_BusinessUnitId",
                table: "ZenHrEmployeeProfessionalData",
                column: "BusinessUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_ZenHrEmployeeProfessionalData_DepartmentId",
                table: "ZenHrEmployeeProfessionalData",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ZenHrEmployeeProfessionalData_DivisionId",
                table: "ZenHrEmployeeProfessionalData",
                column: "DivisionId");

            migrationBuilder.CreateIndex(
                name: "IX_ZenHrEmployeeProfessionalData_EmployeeId",
                table: "ZenHrEmployeeProfessionalData",
                column: "EmployeeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ZenHrEmployeeProfessionalData_PositionId",
                table: "ZenHrEmployeeProfessionalData",
                column: "PositionId");

            migrationBuilder.CreateIndex(
                name: "IX_ZenHrEmployeeProfessionalData_SectionId",
                table: "ZenHrEmployeeProfessionalData",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_ZenHrEmployeeProfessionalData_WorkLocationId",
                table: "ZenHrEmployeeProfessionalData",
                column: "WorkLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ZenHrEmployeeProfessionalData_WorkTypeId",
                table: "ZenHrEmployeeProfessionalData",
                column: "WorkTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_ZenHrEmployees_BranchId",
                table: "ZenHrEmployees",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_ZenHrEmployees_EmploymentNumber",
                table: "ZenHrEmployees",
                column: "EmploymentNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ZenHrEmployeeProfessionalData");

            migrationBuilder.DropTable(
                name: "ZenHrBusinessUnits");

            migrationBuilder.DropTable(
                name: "ZenHrDepartments");

            migrationBuilder.DropTable(
                name: "ZenHrDivisions");

            migrationBuilder.DropTable(
                name: "ZenHrEmployees");

            migrationBuilder.DropTable(
                name: "ZenHrPositions");

            migrationBuilder.DropTable(
                name: "ZenHrSections");

            migrationBuilder.DropTable(
                name: "ZenHrWorkLocations");

            migrationBuilder.DropTable(
                name: "ZenHrWorkTypes");
        }
    }
}
