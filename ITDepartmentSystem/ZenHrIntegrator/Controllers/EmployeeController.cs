using Microsoft.AspNetCore.Mvc;
using ZenHrIntegrator.Services.Interfaces;

namespace ZenHrIntegrator.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeCountController(IHeadCountService service) : ControllerBase
    {
        //[HttpGet("branches/raw")]
        //public async Task<IActionResult> GetBranchesRaw()
        //{
        //    var body = await service.tempgetbody();

        //    // return raw JSON exactly as received
        //    return Ok(body);
        //}
        [HttpPost]
        public async Task<IActionResult> UpdateEmployees()
        {
            await service.UpdateEmployeesAsync();
            return Ok();
        }
        [HttpGet]
        public async Task<IActionResult> getAllEmployees()
        {
            var body = await service.GetAllEmployees();

            // return raw JSON exactly as received
            return Ok(body);
        }

        [HttpGet("Since/{since}")]
        public async Task<IActionResult> getAllEmployeesSince(DateTime since)
        {
            var body = await service.GetAllChanges(since);

            // return raw JSON exactly as received
            return Ok(body);
        }
    }
}
