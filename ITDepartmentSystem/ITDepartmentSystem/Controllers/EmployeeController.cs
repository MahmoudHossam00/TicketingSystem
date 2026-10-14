using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITDepartmentSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeController(IEmployeeService service): ControllerBase
    {
        [HttpGet]
        [Authorize(Roles = "ADMIN,MODERATOR")]
        public async Task<IActionResult> GetAll(CancellationToken ct)
        {
            var emps=await service.GetAll(ct);
            return Ok(emps);
        }
        [HttpGet("Departments")]
        [Authorize]
        public async Task<IActionResult> GetAllDepartments(CancellationToken ct)
        {
            var emps = await service.GetAllDepartments(ct);
            return Ok(emps);
        }
        [HttpGet("Filtered")]
        [Authorize(Roles = "ADMIN,MODERATOR")]
        public async Task<IActionResult> GetFiltered(CancellationToken ct, string? filter = null,
            [FromQuery(Name = "DepartmentIds")] List<int>? DepartmentIds = null
            , int pagenum=1)
        {
            var emps = await service.GetFiltered(ct,filter, DepartmentIds, pagenum);
            return Ok(emps);
        }
        [HttpGet("{id}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]


        public async Task<IActionResult> GetFiltered(Guid id,CancellationToken ct)
        {
            var emps = await service.GetById(id,ct);
            return Ok(emps);
        }

        [HttpPost]
        [Authorize(Roles = "MASTER")]

        public async Task<IActionResult> Sync(CancellationToken ct)
        {
            await service.FetchEmployees(ct);
            return Ok(new { Message = "Done" });
        }
    }
}
