using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZenHrIntegrator.Migrations
{
    /// <inheritdoc />
    public partial class excelname : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExcelHrName",
                table: "ZenHrDepartments",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExcelHrName",
                table: "ZenHrDepartments");
        }
    }
}
