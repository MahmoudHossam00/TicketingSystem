//using ITDepartmentSystem.Migrations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ITDepartmentSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        /// <summary>
        /// Get latest notifications (initial load or fallback if SignalR fails)
        /// </summary>
        /// 
        //[HttpGet]
        //public async Task<ActionResult<ICollection<NotificationResponse>>> Get(CancellationToken token)
        //{
        //    var notifications = await _notificationService.GetNotifications(null, token);
        //    return Ok(notifications);
        //}

        /// <summary>
        /// Get 20 more notifications (pagination)
        /// </summary>
        [HttpGet("more")]
        public async Task<IActionResult> GetMore(
            [FromQuery] Guid topNotification,
            CancellationToken token)
        {
            var notifications = await _notificationService.Get20More(topNotification, null, token);
            return Ok(notifications);
        }

        /// <summary>
        /// Mark single notification as seen
        /// </summary>
        [HttpPut("{id}/seen")]
        public async Task<IActionResult> MarkAsSeen(Guid id, CancellationToken token)
        {
            await _notificationService.MarkNotificationAsSeenAsync(id, null, token);
            return NoContent();
        }
        /// <summary>
        /// Mark all notifications as seen
        /// </summary>
        [HttpPut("seen-all")]
        public async Task<IActionResult> MarkAllAsSeen(CancellationToken token)
        {
            await _notificationService.MarkNotificationsAsSeenAsync(null, token);
            return NoContent();
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken token)
        {
            await _notificationService.DeleteNotification(id, null, token);
            return NoContent();
        }


        [HttpGet("MyAlerts")]
        public async Task<IActionResult> GetMyAlerts(CancellationToken token)
        {
            return Ok(await _notificationService.GetMyAlerts(null, token));
        }
        [HttpGet("MyNewsLetter")]
        public async Task<IActionResult> MyNewsLetter(CancellationToken token)
        {
            return Ok(await _notificationService.GetMyNewsLetter(null, token));
        }
        [HttpPost("Alerts")]
        [Authorize(Roles ="ADMIN,MASTER")]
        public async Task<IActionResult> CreateAnAlert(SendAlertRequest req,CancellationToken token)
        {
            await _notificationService.SaveNewAlert(req, token);
            return NoContent();
        }
        [HttpDelete("Alerts/{id}")]
        public async Task<IActionResult> DeleteAnAlert(Guid id, CancellationToken token)
        {
            await _notificationService.DeleteAnAlert(id, token);
            return NoContent();
        }
        [HttpDelete("NewsLetters/{id}")]
        public async Task<IActionResult> DeleteANewsLetter(Guid id, CancellationToken token)
        {
            await _notificationService.DeleteANewsLetter(id, token);
            return NoContent();
        }
        [HttpPut("Alerts/Hide/{Id}")]
        public async Task<IActionResult> HideAnAlert(Guid id, CancellationToken token)
        {
            await _notificationService.HideAnAlert(id,null, token);
            return NoContent();
        }

        //[HttpGet("GetNotificationsNumber")]
        //public async Task<IActionResult> GetNotificationsNumber(Guid id, CancellationToken token)
        //{
        //    await _notificationService.GetNumberOfNotifications(token);
        //    return NoContent();
        //}


        [HttpGet("Alerts/Statistics/{Id}")]
        [Authorize(Roles ="ADMIN,MASTER")]
        public async Task<IActionResult> GetAlertStatistics(Guid id, CancellationToken token)
        {
            var ret=await _notificationService.GetAlertStatistics(id, token);
            return Ok(ret);
        }

        [HttpGet("AlertsWithExpired")]
        [Authorize(Roles = "ADMIN,MASTER")]
        public async Task<IActionResult> GetAllEvenExpired (CancellationToken token)
        {
            var ret = await _notificationService.GetAllAlerts( token);
            return Ok(ret);
        }
    }
}
