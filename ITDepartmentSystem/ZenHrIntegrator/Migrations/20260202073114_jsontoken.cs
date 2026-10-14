using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZenHrIntegrator.Migrations
{
    /// <inheritdoc />
    public partial class jsontoken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "json",
                table: "TokenModel",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "json",
                table: "TokenModel");
        }
    }
}
