//using ITDepartmentSubModule.Requests.GeneralRequests;
using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITDepartmentSubModule.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SubModuleController(ISubModuleService service) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetALL(CancellationToken token)
        {
            var objs = await service.GetAll(token);
            return Ok(objs);
        }
        [HttpGet("byModuleId/{id}")]
        public async Task<IActionResult> GetALL(Guid id,CancellationToken token)
        {
            var objs = await service.GetByParent(id,token);
            return Ok(objs);
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken token)
        {
            var objs = await service.GetById(id, token);
            return Ok(objs);
        }
        [HttpGet("ByAnswer/{id}")]
        public async Task<IActionResult> GetByAnswerId(Guid id, CancellationToken token)
        {
            var objs = await service.GetByAnswerId(id, token);
            return Ok(objs);
        }
        [HttpPost]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> Create([FromBody]CreateSubModuleRequest CreateDTO, CancellationToken token)
        {
            var objs = await service.Create(CreateDTO, token);
            return Ok(objs);
        }


        [HttpPut("{Id:guid}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> Update(Guid Id, [FromBody] CreateSubModuleRequest dto, CancellationToken token)
        {
            //if(dto.ModuleId!=Id)
            //{
            //    throw new BusinessRuleException("wrong id sent", StatusCodes.Status409Conflict);
            //}
            var objs = await service.Update(Id, dto, token);
            return Ok(objs);
        }
        [HttpDelete("{Id:guid}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> Delete(Guid Id, CancellationToken token)
        {
            await service.SetIsDeleted(Id, token);
            return Ok(new { Message = "Deleted" });
        }

        [HttpGet("{id}/questions")]
        public async Task<IActionResult> GetSystemQuestions(Guid id, CancellationToken token)
        {
            var objs = await service.GetQuestions(id, token);
            return Ok(objs);
        }
        [HttpPost("{id}/questions/")]
        public async Task<IActionResult> AddQuestion(Guid id,CreateQuestionRequest Request, CancellationToken token)
        {
            await service.AddQuestion( Request, token);
            return Ok();
        }
        [HttpDelete("{id}/questions/{QuestionId}")]
        public async Task<IActionResult> RemoveQuestion(Guid id, Guid QuestionId, CancellationToken token)
        {
            await service.RemoveQuestion(id, QuestionId, token);
            return Ok();
        }



        [HttpPut("{subModuleId:guid}/questions/{questionId:guid}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> UpdateQuestion(Guid subModuleId, Guid questionId, UpdateQuestionRequest req, CancellationToken token)
        {
            //var res = 
                await service.UpdateQuestion(subModuleId, questionId, req, token);
            return Ok();
        }

        // Options
        [HttpPost("{subModuleId:guid}/questions/{questionId:guid}/options")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> AddOption(Guid subModuleId, Guid questionId, CreateQuestionOptionRequest req, CancellationToken token)
        {
            //var res = 
                await service.AddOption(subModuleId, questionId, req, token);
            return Ok();
        }

        [HttpDelete("{subModuleId:guid}/questions/{questionId:guid}/options/{optionId:guid}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]

        public async Task<IActionResult> RemoveOption(Guid subModuleId, Guid questionId, Guid optionId, CancellationToken token)
        {
            await service.RemoveOption(subModuleId, questionId, optionId, token);
            return Ok();
        }

    }
}
