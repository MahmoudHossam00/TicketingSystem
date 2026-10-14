using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZenHrIntegrator.Migrations
{
    /// <inheritdoc />
    public partial class configuration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_Tokens",
                table: "Tokens");

            migrationBuilder.RenameTable(
                name: "Tokens",
                newName: "TokenModel");

            migrationBuilder.AlterColumn<string>(
                name: "Token",
                table: "TokenModel",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TokenModel",
                table: "TokenModel",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_TokenModel_DateTime",
                table: "TokenModel",
                column: "DateTime");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_TokenModel",
                table: "TokenModel");

            migrationBuilder.DropIndex(
                name: "IX_TokenModel_DateTime",
                table: "TokenModel");

            migrationBuilder.RenameTable(
                name: "TokenModel",
                newName: "Tokens");

            migrationBuilder.AlterColumn<string>(
                name: "Token",
                table: "Tokens",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Tokens",
                table: "Tokens",
                column: "Id");
        }
    }
}
