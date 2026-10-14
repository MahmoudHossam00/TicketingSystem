//using ITDepartmentFixedKPI.Requests.GeneralRequests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITDepartmentCompany.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FixedKPIController(IFixedKPIService service) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetALL(CancellationToken token)
        {
            var objs = await service.GetAll(token);
            return Ok(objs);
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id,CancellationToken token)
        {
            var objs = await service.GetById(id,token);
            return Ok(objs);
        }
        [HttpPost]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> Create(StringDTO CreateDTO, CancellationToken token)
        {
            var objs = await service.Create(CreateDTO, token);
            return Ok(objs);
        }
        [HttpPut("{Id:guid}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> Update(Guid Id, [FromBody]StringDTO dto,CancellationToken token)
        {
            var objs = await service.Update(Id, dto,token);
            return Ok(objs);
        }
        [HttpDelete("{Id:guid}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> Delete(Guid Id, CancellationToken token)
        {
            await service.SetIsDeleted(Id, token);
            return Ok(new { Message="Deleted"});
        }


        [HttpPost("CreateKPI")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> CreateKPI(CreateKPIRequest REQUEST, CancellationToken token)
        {
            var guid=await service.CreateKPIRequest(REQUEST, token);
            return Ok(new { guid = guid });
        }
       
    }
    
}
