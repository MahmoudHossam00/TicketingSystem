using Microsoft.AspNetCore.Mvc;
using ZenHrIntegrator.Services.Interfaces;

namespace ZenHrIntegrator.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ZenServerController(IZenServerService service) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetEmployeeBranches()
        {
            var result = await service.GetAllEmployeeBranches();
            return Ok(result);
        }
        [HttpPost]
        public async Task<IActionResult> Integrate()
        {
            await service.IntegrateEmployeesBranches();
            return Ok();
        }
    }
}
