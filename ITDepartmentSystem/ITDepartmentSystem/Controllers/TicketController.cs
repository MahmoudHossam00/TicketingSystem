using DocumentFormat.OpenXml.ExtendedProperties;
using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ITDepartmentSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TicketController(ITicketService service) : ControllerBase
    {
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetALL(FilterTicketRequest filterrequest, CancellationToken token)
        {
            var objs = await service.GetAll(token);
            return Ok(objs);
        }
        [HttpGet("Filtered")]
        [Authorize]
        public async Task<IActionResult> GetALLFiltered([FromQuery]FilterTicketRequest filterrequest, CancellationToken token)
        {
            var objs = await service.GetAll(filterrequest,false,token);
            return Ok(objs);
        }
        [HttpGet("FilteredWithKpis")]
        [Authorize]

        public async Task<IActionResult> GetALLFilteredWithKpis([FromQuery] FilterTicketRequest filterrequest, CancellationToken token)
        {
            var objs = await service.GetAll(filterrequest,true, token);
            return Ok(objs);
        }
        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetById(Guid id, CancellationToken token)
        {
            var objs = await service.GetById(id, token);
            return Ok(objs);
        }
        [HttpGet("TicketSystem/{id}")]
        [Authorize]

        public async Task<IActionResult> GetTicketSystemId(Guid id, CancellationToken token)
        {
            var objs = await service.GetTicketSystemId(id, token);
            return Ok(objs);
        }
        [HttpPost]
        [Authorize]

        public async Task<IActionResult> Create([FromForm]CreateTicketRequest CreateDTO, CancellationToken token)
        {
            var objs = await service.Create(CreateDTO, token);
            return Ok(objs);
        }
        [HttpPost("{Id}/ChangeModule")]
        [Authorize(Roles ="ADMIN")]

        public async Task<IActionResult> ChangeTicketModule(Guid Id,CreateRelatedSubModuleAnswerRequest ChangeModuleDTO, CancellationToken token)
        {
            await service.ChangeModule(Id,ChangeModuleDTO, token);
            return Ok();
        }
        [HttpPut("{Id:guid}")]
        [Authorize]

        public async Task<IActionResult> Update(Guid Id, [FromBody] UpdateTicketRequest dto, CancellationToken token)
        {
            var objs = await service.Update(Id, dto, token);
            return Ok(objs);
        }
        [HttpDelete("{Id:guid}")]
        [Authorize(Roles ="ADMIN,MODERATOR")]

        public async Task<IActionResult> Delete(Guid Id, CancellationToken token)
        {
            await service.SetIsDeleted(Id, token);
            return Ok(new { Message = "Deleted" });
        }

        [HttpGet("{id}/PrivateNotes")]
        [Authorize]

        public async Task<IActionResult> GetPrivateNotes(Guid Id, CancellationToken token)
        {
            var notes=await service.GetPrivateNotes(Id, token);
            return Ok(notes);
        }
        [HttpPost("{id}/PrivateNotes")]
        [Authorize]

        public async Task<IActionResult> AddPrivateNote(Guid Id,StringDTO note, CancellationToken token)
        {
            await service.AddPrivateNote(Id,note, token);
            return Ok(new { Message = "Note Added" });
        }
        [HttpGet("{id}/CCs")]
        [Authorize]

        public async Task<IActionResult> GetCCs(Guid Id, CancellationToken token)
        {
            var ret = await service.GetCCs(Id, token);
            return Ok(ret);
        }
        [HttpGet("{id}/TOs")]
        [Authorize]

        public async Task<IActionResult> GetTOs(Guid Id, CancellationToken token)
        {
            var ret = await service.GetTOs(Id, token);
            return Ok(ret);
        }
        [HttpGet("{id}/RelatedAnswer")]
        [Authorize]

        public async Task<IActionResult> GetRelatedAnswer(Guid Id, CancellationToken token)
        {
            var ret = await service.GetRelatedAnswer(Id, token);
            return Ok(ret);
        }
        [HttpGet("{id}/Statuses")]
        [Authorize]
        public async Task<IActionResult> GetStatuses(Guid Id, CancellationToken token)
        {
            var ret = await service.GetStatuses(Id, token);
            return Ok(ret);
        }
        [HttpPut("{id}/changestatus/{statusId}")]
        [Authorize(Roles = "ADMIN,MODERATOR")]
        public async Task<IActionResult> ChangeStatus(Guid Id,Guid StatusId, CancellationToken token)
        {
            await service.ChangeStatus(Id, StatusId, token);
            return Ok(new { Message="Status changed successfully"});
        }
        [HttpGet("{id}/AssignHistories")]
        //[Authorize(Roles = "ADMIN,MODERATOR")]
        public async Task<IActionResult> GetAssignHistories(Guid Id, CancellationToken token)
        {
            var ret = await service.GetAssignHistory(Id, token);
            return Ok(ret);
        }
        [HttpPut("{id}/ReAssign/{AgentId}")]
        [Authorize(Roles ="ADMIN,MODERATOR")]
        public async Task<IActionResult> ReAssign(Guid Id,string AgentId, CancellationToken token)
        {
             await service.Reassign(Id,AgentId, token);
            return Ok(new { Message="Task Reassigned Successfully"});
        }
        [HttpGet("{id}/Replies")]
        [Authorize]
        public async Task<IActionResult> GetReplies(Guid Id, CancellationToken token)
        {
            var ret =  await service.GetReplies(Id, token);
            return Ok(ret);
        }
        [HttpPost("{id}/Replies")]
        [Authorize]
        public async Task<IActionResult> CreateReplies(Guid Id, [FromForm]CreateReplyRequest Request, CancellationToken token)
        {
             await service.CreateReply(Id,Request, token);
            return Ok(new {Message="Reply Added" });
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
        [HttpPut("{id}/BasicData")]
        
        public async Task<IActionResult> ChangeBasicData(Guid id,BasicDataRequest req , CancellationToken token)
        {
            await service.ChangeBasicDataRequest(id, req, token);

            

            return Ok(new {Message="Changes were applied" });
        }
        //[HttpGet("{id}/Messages")]
        //public async Task<IActionResult> GetMessages(Guid id, BasicDataRequest req, CancellationToken token)
        //{
        //    var msgs=await service.GetMessages(id, null, token);



        //    return Ok(msgs);
        //}

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
        public async Task<IActionResult> MyMessanger( CancellationToken token)
        {
            var msgs = await service.MyMessanger(null, token);



            return Ok(msgs);
        }
            [HttpGet("20more/{MessageId}")]
            public async Task<IActionResult> Get20More(Guid MessageId,CancellationToken token)
            {
                var msgs = await service.Get20More(MessageId, token);



                return Ok(msgs);
            }

        [HttpPost("SplitTicket")]
        [Authorize(Roles ="ADMIN,MODERATOR")]
        public async Task<IActionResult> SplitReplyIntoATicket([FromForm] SplitTicketRequest Request,CancellationToken token)
        {
             var guid=await service.SplitTicket(Request,token);



            return Ok(new { guid= guid });
        }



        [HttpGet("KPIs")]
        [Authorize(Roles = "ADMIN,MODERATOR")]
        public async Task<IActionResult> GetKPIs([FromQuery] FilterTicketTaskRequest req, CancellationToken token)
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
        public async Task<IActionResult> GetMyTasks(Guid Id,CreateTicketTaskRequest req, CancellationToken token)
        {
            await service.AddTicketTasks(Id,req, token);
            return Ok();
        }

        [HttpGet("{ticketId:guid}/messages")]
        [Authorize]
        public async Task<IActionResult> GetMessages(Guid ticketId, CancellationToken token)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized();

            var messages = await service.GetMessages(ticketId, userId, token);
            return Ok(messages);
        }

        [HttpGet("unread-count")]
        [Authorize]
        public async Task<IActionResult> GetUnreadCount(CancellationToken token)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized();

            var count = await service.MyCount(userId, token);
            return Ok(count);
        }
    }
}
