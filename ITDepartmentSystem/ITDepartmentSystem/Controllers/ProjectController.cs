using DocumentFormat.OpenXml.ExtendedProperties;
using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using static ITDepartmentSystem.Requests.CreateProjectRequest;

namespace ITDepartmentSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles ="ADMIN,MODERATOR")]
    public class ProjectController(
        IProjectService service,
        ITaskService taskservice
        ) : ControllerBase
    {
        [HttpGet]
        [Authorize(Roles ="ADMIN")]
        public async Task<IActionResult> GetALL(CancellationToken token)
        {
            var objs = await service.GetAll(token);
            return Ok(objs);
        }
        [HttpGet("Filtered")]
        [Authorize]
        public async Task<IActionResult> GetALLFiltered([FromQuery] FilterTicketRequest filterrequest, CancellationToken token)
        {
            var objs = await service.GetAll(filterrequest,0,token);
            return Ok(objs);
        }
        [HttpGet("FilteredWithKpis")]
        [Authorize]
        public async Task<IActionResult> GetALLFilteredWithKpis([FromQuery] FilterTicketRequest filterrequest, CancellationToken token, int pagenum = 0)
        {
            var objs = await service.GetAll(filterrequest,pagenum, token);
            return Ok(objs);
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken token)
        {
            var objs = await service.GetById(id, token);
            return Ok(objs);
        }
        //[HttpGet("ProjectSystem/{id}")]
        //public async Task<IActionResult> GetProjectSystemId(Guid id, CancellationToken token)
        //{
        //    var objs = await service.GetProjectSystemId(id, token);
        //    return Ok(objs);
        //}
        [HttpPost]
        public async Task<IActionResult> Create([FromForm]CreateProjectRequest CreateDTO, CancellationToken token)
        {
            var objs = await service.Create(CreateDTO, token);
            return Ok(objs);
        }
        [HttpPut("{Id:guid}")]
        public async Task<IActionResult> Update(Guid Id, [FromBody] UpdateProjectRequest dto, CancellationToken token)
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
            var notes=await service.GetPrivateNotes(Id, token);
            return Ok(notes);
        }
        [HttpPost("{id}/PrivateNotes")]
        public async Task<IActionResult> AddPrivateNote(Guid Id,StringDTO note, CancellationToken token)
        {
            await service.AddPrivateNote(Id,note, token);
            return Ok(new { Message = "Note Added" });
        }



        [HttpPut("{id}/changestatus/{statusId}")]
        public async Task<IActionResult> ChangeStatus(Guid Id,Guid StatusId, CancellationToken token)
        {
            await service.ChangeStatus(Id, StatusId, token);
            return Ok(new { Message="Status changed successfully"});
        }

        
        

        [HttpGet("{id}/files/{fileName}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProjectFile(Guid id, string fileName, CancellationToken token)
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
            var msgs=await service.GetMessages(id, null, token);



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

        [HttpGet("20more/{MessageId}")]
        public async Task<IActionResult> Get20More(Guid MessageId, CancellationToken token)
        {
            var msgs = await service.Get20More(MessageId, token);



            return Ok(msgs);
        }
        [HttpGet("MyMessanger")]
        public async Task<IActionResult> MyMessanger( CancellationToken token)
        {
            var msgs = await service.MyMessanger(null, token);
            return Ok(msgs);
        }

        [HttpGet("{id}/KPIs")]
        public async Task<IActionResult> GetKPIs(FilterTicketTaskRequest Id, CancellationToken token)
        {
            var notes = await taskservice.GetKPIs(Id, token);
            return Ok(notes);
        }

        [HttpPut("ToggleProjectClosed/{id}")]
        public async Task<IActionResult> ToggleProjectClosed(Guid Id, CancellationToken token)
        {
            await service.ToggleProjectClosed(Id, token);
            return Ok(new { Message = "Toggled" });
        }



        [HttpPost("{id}/Tasks")]
        public async Task<IActionResult> AddTask(Guid Id,CreateTaskRequest req, CancellationToken token)
        {
            await service.AddTask(Id,req, token);
            return Ok(new { Message = "Task Created" });
        }
        [HttpGet("{id}/Tasks")]
        public async Task<IActionResult> GetProjectTasks(Guid Id, CancellationToken token)
        {
            ICollection<TaskResponse> response=  await service.GetProjectTasks(Id, token);
            return Ok(response);
        }
    }
}
