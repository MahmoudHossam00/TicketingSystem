using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using OfficeOpenXml.FormulaParsing.LexicalAnalysis;

namespace ITDepartmentSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "ADMIN,MODERATOR")]
    public class TasksController(ITaskService service) : ControllerBase
    {
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken token)
        {
            TaskResponse objs = await service.GetById(id, token);
            return Ok(objs);
        }
        [HttpGet("Filtered")]
        public async Task<IActionResult> GetAllFiltered([FromQuery]FilterTaskRequest req, CancellationToken token)
        {
            var objs = await service.GetAllFiltered(req,false ,token);
            return Ok(objs);
        }

        [HttpPut("{Id:guid}")]
        public async Task<IActionResult> Update(Guid Id, [FromBody] UpdateTaskRequest dto, CancellationToken token)
        {
            var objs = await service.Update(Id, dto, token);
            return Ok(objs);
        }
        [HttpDelete("{Id:guid}")]
        public async Task<IActionResult> Delete(Guid Id, CancellationToken token)
        {
            await service.SetIsDeleted(Id, token);
            return Ok(new { Message = "Deleted" });
        }
        [HttpGet("{id}/PrivateNotes")]
        public async Task<IActionResult> GetPrivateNotes(Guid Id, CancellationToken token)
        {
            var notes = await service.GetPrivateNotes(Id, token);
            return Ok(notes);
        }
        [HttpPost("{id}/PrivateNotes")]
        public async Task<IActionResult> AddPrivateNote(Guid Id, StringDTO note, CancellationToken token)
        {
            await service.AddPrivateNote(Id, note, token);
            return Ok(new { Message = "Note Added" });
        }
        [HttpGet("{id}/Statuses")]
        public async Task<IActionResult> GetStatuses(Guid Id, CancellationToken token)
        {
            var ret = await service.GetStatuses(Id, token);
            return Ok(ret);
        }
        [HttpPut("{id}/changestatus/{statusId}")]
        public async Task<IActionResult> ChangeStatus(Guid Id, Guid StatusId, CancellationToken token)
        {
            await service.ChangeStatus(Id, StatusId, token);
            return Ok(new { Message = "Status changed successfully" });
        }
        [HttpGet("{id}/AssignHistories")]
        public async Task<IActionResult> GetAssignHistories(Guid Id, CancellationToken token)
        {
            var ret = await service.GetAssignHistory(Id, token);
            return Ok(ret);
        }
        [HttpPut("{id}/ReAssign/{AgentId}")]
        [Authorize]
        public async Task<IActionResult> ReAssign(Guid Id, string AgentId, CancellationToken token)
        {
            await service.Reassign(Id, AgentId, token);
            return Ok(new { Message = "Task Reassigned Successfully" });
        }



        [HttpGet("{id}/files/{fileName}")]
        [AllowAnonymous]

        public async Task<IActionResult> GetTicketFile(Guid id, string fileName, CancellationToken token)
        {
            var filePath = await service.GetTicketFilePath(id, fileName, token);

            if (!System.IO.File.Exists(filePath))
                return NotFound();

            var contentType = GetContentType(filePath);

            return PhysicalFile(filePath, contentType, fileName);
        }
        [HttpGet("{id}/Messages")]
        public async Task<IActionResult> GetMessages(Guid id, CancellationToken token)
        {
            var msgs = await service.GetMessages(id, null, token);
            return Ok(msgs);
        }

        public static string GetContentType(string path)
        {
            var extension = Path.GetExtension(path).ToLowerInvariant();

            return extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".pdf" => "application/pdf",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => "application/octet-stream"
            };
        }
        [HttpGet("MyMessanger")]
        public async Task<IActionResult> MyMessanger(CancellationToken token)
        {
            var msgs = await service.MyMessanger(null, token);
            return Ok(msgs);
        }
        [HttpGet("20more/{MessageId}")]
        public async Task<IActionResult> Get20More(Guid MessageId, CancellationToken token)
        {
            var msgs = await service.Get20More(MessageId, token);



            return Ok(msgs);
        }

        [HttpPut("{id}/Attachments")]
        public async Task<IActionResult> UploadAttachments(Guid id , filesDTO dto, CancellationToken token)
        {
            await service.UploadAssignedAttachments(id,dto.file,token);
            return Ok(new{ Message="Files Uploaded Successfully"});
        }

        [HttpGet("KPIs")]
        [Authorize(Roles = "ADMIN,MODERATOR")]
        public async Task<IActionResult> GetKPIs([FromQuery]FilterTicketTaskRequest req, CancellationToken token)
        {
            var notes = await service.GetKPIs(req, token);
            return Ok(notes);
        }

        [HttpGet("{id}/Tasks")]
        [Authorize]
        public async Task<IActionResult> GetMyTasks(Guid Id, CancellationToken token)
        {
            var notes = await service.MyTicketTasks(Id, token);
            return Ok(notes);
        }
        [HttpPost("{id}/Tasks")]
        [Authorize]
        public async Task<IActionResult> GetMyTasks(Guid Id, CreateTicketTaskRequest req, CancellationToken token)
        {
            await service.AddTicketTasks(Id, req, token);
            return Ok();
        }
    }
}
