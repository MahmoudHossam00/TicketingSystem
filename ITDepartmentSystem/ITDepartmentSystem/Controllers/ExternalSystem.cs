//using ITDepartmentCompany.Requests.GeneralRequests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OfficeOpenXml;

namespace ITDepartmentCompany.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles ="ADMIN,MASTER,MODERATOR")]
    public class ExternalSystemController(IExternalSystemService service) : ControllerBase
    {
        [HttpPost("CreateExternalSystem")]
        public async Task<IActionResult> Create(ExernalSystemRequest req)
        {
            await service.CreateExternalSystemAsync(req);
            return Ok();
        }
        [HttpPost("Load")]
        public async Task<IActionResult> Load()
        {
            await service.LoadSystemsUsers();
            return Ok();
        }

        [HttpGet("ByEmployee/{EmployeeId}")]
        public async Task<IActionResult> ByEmployee(Guid EmployeeId,CancellationToken token=default)
        {
            var systems=await service.ByEmployee(EmployeeId,token);
            return Ok(systems);
        }
        [HttpPost("import-from-excel")]
        public async Task<IActionResult> ImportExternalUsersFromExcel([FromForm] ExternalUserFromExcel request)
        {
            await service.AddExternalUsersFromExcel(request);
            return Ok(new { Message = "Users imported successfully" });
        }
        [HttpGet]
        public async Task<IActionResult> GetALL (CancellationToken token= default)
        {
            var systems=await service.GetAll(token);
            return Ok(systems);
        }
        [HttpPost("AddExternalUser")]
        public async Task<IActionResult> AddExternalUser(ExternalUserRequest req,CancellationToken token = default)
        {
            await service.AddExternalUser(req,token);
            return Ok(new { Message="User Linked"});
        }
        [HttpGet("excel-template")]
        public IActionResult DownloadExcelTemplate()
        {
            //ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

            using var package = new ExcelPackage();
            var ws = package.Workbook.Worksheets.Add("ExternalUsers");

            // Add headers
            ws.Cells[1, 1].Value = "Username";
            ws.Cells[1, 2].Value = "EmployeeNumber";
            ws.Cells[1, 3].Value = "IsDisabled";

            // Optional: add example row
            ws.Cells[2, 1].Value = "jdoe";
            ws.Cells[2, 2].Value = 1234;
            ws.Cells[2, 3].Value = false;

            var fileBytes = package.GetAsByteArray();
            return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "ExternalUsersTemplate.xlsx");
        }
    }
}
