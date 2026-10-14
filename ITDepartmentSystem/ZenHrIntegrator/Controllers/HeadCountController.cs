using Microsoft.AspNetCore.Mvc;
using ZenHrIntegrator.Services.Interfaces;

namespace ZenHrIntegrator.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HeadCountController(IHeadCountService service) : ControllerBase
    {
        [HttpGet("branches/raw")]
        public async Task<IActionResult> GetBranchesRaw()
        {
            var body = await service.tempgetbody();

            // return raw JSON exactly as received
            return Ok(body);
        }
        [HttpPost]
        public async Task<IActionResult> UpdateBranches()
        {
            await service.UpdateBranchesAsync();
            return Ok();
        }
        [HttpGet]
        public async Task<IActionResult> getAllBranches()
        {
            var body = await service.GetAllBranches();

            // return raw JSON exactly as received
            return Ok(body);
        }

    }
}
