using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITDepartmentSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SystemController(ISystemService service) : ControllerBase
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

        [HttpGet("{id}/agents")]
        public async Task<IActionResult> GetSystemAgents(Guid id, CancellationToken token)
        {
            var objs = await service.GetSystemAgents(id, token);
            return Ok(objs);
        }
        [HttpGet("{id}/AgentsWithTaskNumbers")]
        public async Task<IActionResult> AgentsWithTaskNumbers(Guid id, CancellationToken token)
        {
            List<AgentResponseWithTasksNumberDTO> objs = await service.GetSystemAgentsWithTaskNumbers(id, token);
            return Ok(objs);
        }
        [HttpPost("{id}/agents/{agentId}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> AddAgent(Guid id, string AgentId, CancellationToken token)
        {
             await service.AddAgent(id, AgentId, token);
            return Ok();
        }
        [HttpDelete("{id}/agents/{agentId}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> RemoveAgent(Guid id, string AgentId, CancellationToken token)
        {
             await service.RemoveAgent(id, AgentId, token);
            return Ok();
        }



        [HttpGet("{id}/Modules")]
        public async Task<IActionResult> GetSystemModule(Guid id, CancellationToken token)
        {
            var objs = await service.GetSystemModules(id, token);
            return Ok(objs);
        }
        [HttpPost("{id}/Modules")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> AddModule(Guid id, StringDTO ModuleId, CancellationToken token)
        {

            await service.AddModule(new() { Name=ModuleId.Name,SystemId=id}, token);
            return Ok();
        }
        [HttpDelete("{id}/Modules/{ModuleId}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> RemoveModule(Guid id, Guid ModuleId, CancellationToken token)
        {
            await service.RemoveModule(id, ModuleId, token);
            return Ok();
        }
    }
}
