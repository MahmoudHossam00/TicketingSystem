using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ZenHrIntegrator.Models;
using ZenHrIntegrator.Services.Interfaces;

namespace ZenHrIntegrator.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TokenController(ITokenService service) : ControllerBase
    {
        [HttpPost("RefreshToken")]
        public async Task<IActionResult> Refresh()
        {
            return Ok(await service.RefreshToken());
        }

        [HttpGet("GetAllTokens")]
        public async Task<ActionResult<List<TokenModel>>> Get()
        {
            return Ok(await service.GetTokens());
        }


    }
}
