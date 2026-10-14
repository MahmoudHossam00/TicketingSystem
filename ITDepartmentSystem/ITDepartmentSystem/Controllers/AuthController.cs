using DocumentFormat.OpenXml.InkML;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ITDepartmentSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController(
        IUserMessageService messageService,
        ITicketService TicketMessage,
        ITaskService TaskMessage,
        IProjectService ProjectMessage,
        
        IAuthService service,UserManager<AppUser> _userManager,INotEntityGenericRepository<EmployeeCache> emps) : ControllerBase
    {
        [HttpGet("ip-test")]
        public IActionResult IpTest()
        {
            return Ok(new
            {
                Remote = HttpContext.Connection.RemoteIpAddress?.ToString(),
                XFF = Request.Headers["X-Forwarded-For"].ToString()
            });
        }
        [HttpPost("CreateAccount")]
        [Authorize(Roles ="ADMIN,MODERATOR")]

        public async Task<IActionResult> CreatAccount(CreateAccountRequest request)
        {
            await service.CreateAccount(request);
            return Ok(new { Message="Account Created Successfully"});
        }

        [HttpGet("AllUsers")]
        [Authorize]
        public async Task<IActionResult> AllUsers()
        {
            var allusers= await service.GetAllUsers();
            return Ok(allusers);
        }
        [HttpGet("CompleteUsersBasicData")]
        [Authorize]
        public async Task<IActionResult> AllUsers([FromQuery]FilterDataRequest request,CancellationToken token)
        {
            var allusers= await service.GetAllUsersBasicData(request,token);
            return Ok(allusers);
        }
        [HttpGet("UserRoles/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UserRoles(Guid id)
        {
            var roles = await service.GetUserRoles(id);
            return Ok(roles);
        }
        [HttpPost("Login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login(LoginToAccountRequest request)
        {
            var response=await service.Login(request);
            return Ok(response);
        }


        [HttpPost("RevokeToken")]
        [AllowAnonymous]
        public async Task<IActionResult> Revoke(RevokeRefreshTokenRequest request,CancellationToken ct)
        {
            await service.Revoke(request.RefreshToken, ct);
            return NoContent();
        }

        public class RefreshTokenRequest
        {
            public string RefreshToken { get; set; } = string.Empty;
        }

        [HttpPost("Refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken ct)
        {
            var ua = Request.Headers.UserAgent.ToString();
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

            var res = await service.Refresh(request.RefreshToken, ua, ip, ct);
            return Ok(res);
        }


        [HttpPost("AddPicture/{userId}")]
        [Authorize(Roles ="ADMIN")]
        public async Task<IActionResult> AddPicture([FromForm] FileDTO dto,string userId, CancellationToken ct)
        {
            //var ua = Request.Headers.UserAgent.ToString();
            //var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            IFormFile file = dto.file;
            await service.AddPicture(userId, file);
            return Ok(new { Message=" picture added"});
        }
        [HttpPost("ChangeMyPicture")]
        [Authorize]
        public async Task<IActionResult> ChangeMyPicture([FromForm] FileDTO dto, CancellationToken ct)
        {
            //var ua = Request.Headers.UserAgent.ToString();
            //var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            IFormFile file = dto.file;
            await service.ChangeMyPicture(file);
            return Ok(new { Message = " picture added" });
        }

        [HttpPost("ChangeMyPassword")]
        [Authorize]
        public async Task<IActionResult> ChangeMyPassword( ChangePasswordDTO dto, CancellationToken ct)
        {
            var user = await _userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier));
            if (user is null)
            {
                return BadRequest(new { Message = "User is not authenticated" });
            }
            if (string.Compare(dto.NewPassword, dto.ConfirmNewPassword) != 0)
            {
                return BadRequest(new { Message = "New password and confirmpassword dont match" });

            }
            user.ChangedHisOwnPassword = true;
            var result = await _userManager.ChangePasswordAsync(user, dto.OldPassword, dto.NewPassword);
            if (!result.Succeeded)
            {
                var errorMessage = string.Join(" | ", result.Errors.Select(e => e.Description));
                return BadRequest(new { Message = errorMessage });
            }

            return Ok(new { Message = "Password Updated Successfully" });
        }

        [HttpPut("EditAccount")]
        [Authorize(Roles = "ADMIN,MODERATOR")]
        public async Task<IActionResult> UpdateAccount([FromForm] CreateAccountRequest dto)
        {
            var user = await _userManager.Users.SingleOrDefaultAsync(u => u.EmployeeNumber == dto.EmployeeId);
            if (user == null)
            {
                return BadRequest(new { Message = " User was not found" });
            }
            if (await _userManager.Users
                .AnyAsync(u => u.EmployeeNumber != dto.EmployeeId && u.UserName == dto.UserName))
            {
                return BadRequest(new { Message = " Username Already Exists" });
            }
            //if (dto.ProfilePicture != null)
            //{
            //    user.Picture = dto.ProfilePicture.Save();
            //}
            user.UserName = dto.UserName;

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var resetResult = await _userManager.ResetPasswordAsync(user, token, dto.Password);
                if (!resetResult.Succeeded)
                    return BadRequest(new { Message = "Password change failed", Errors = resetResult.Errors });
            }
            var emp =await ((await emps.GetAllAsync()).FirstOrDefaultAsync(e => e.Id == dto.EmployeeId));

            if (dto.Email is not null)
            {
                //if((await _userManager.FindByEmailAsync(dto.Email)) is AppUser ExistingUser && ExistingUser .Id!= user.Id)
                //{
                //    return BadRequest(new { Message = " Email Exists for another user" });
                //}

                var result = await _userManager.SetEmailAsync(user, dto.Email);

                if (!result.Succeeded)
                {
                    return BadRequest(new { Message = " Email was not updated" });
                }
                if (emp is not null)
                {
                    user.Email = dto.Email;
                    emp.Email = dto.Email;

                }

            }
            //if (dto.DirectManagerNumber is not null)
            //{
            //    if (emp is not null)
            //    {
            //        emp.DirectManagerId = dto.DirectManagerNumber;
            //    }
            //}
            var currentRoles = await _userManager.GetRolesAsync(user);
            var removeRolesResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!removeRolesResult.Succeeded)
                return BadRequest(new { Message = "Failed to remove old roles", Errors = removeRolesResult.Errors });
            foreach(var role in dto.Roles)
            {

            var addRoleResult = await _userManager.AddToRoleAsync(user, role.ToString().ToUpper());
            if (!addRoleResult.Succeeded)
                return BadRequest(new { Message = "Failed to add new role", Errors = addRoleResult.Errors });
            }




            return Ok(new { Message = "Updated" });

        }
        [HttpGet("GetMyPicture")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMyPicture(CancellationToken ct)
        {
            //var ua = Request.Headers.UserAgent.ToString();
            //var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            //IFormFile file = dto.file;
            var filepath=await service.GetMyPicture(ct);
            if (!System.IO.File.Exists(filepath))
                filepath= Path.Combine(Directory.GetCurrentDirectory(), "Default", "default.webp"); 

            var contentType = "application/octet-stream";
            return PhysicalFile(filepath, contentType, "Picture");
        }
        [HttpGet("GetUserDetails/{EmployeeId}")]
        [Authorize]
        public async Task<IActionResult> GetUserDetails(Guid EmployeeId,CancellationToken ct)
        {
            //var ua = Request.Headers.UserAgent.ToString();
            //var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            //IFormFile file = dto.file;
            var UserDetails = await service.GetUserDetails(EmployeeId,ct);
            return Ok(UserDetails);
        }
        [HttpPost("CreateRole")]
        [Authorize(Roles = "MASTER")]

        public async Task<IActionResult> CreatRole(CreateRole request)
        {
            await service.CreateRole(request);
            return Ok(new { Message = "Role Created Successfully" });
        }

        [HttpPut("UpdateRole")]
        [Authorize(Roles = "MASTER")]

        public async Task<IActionResult> UpdateRole(UpdateRole request)
        {
            await service.AddPermissionToRole(request);
            return Ok(new { Message = "Role Updated Successfully" });
        }
        [HttpPost("AddRoleToUser")]
        [Authorize(Roles = "MASTER")]

        public async Task<IActionResult> AddRoleToUser(AddRoleRequest request)
        {
            await service.AddRole(request);
            return Ok(new { Message = "Role Added Successfully" });
        }

        [HttpPost("GetAllRoles")]
        [Authorize(Roles = "ADMIN")]

        public async Task<IActionResult> GetAllRoles()
        {
            
            return Ok(await service.GetAllRoles());
        }


        [HttpPost("GetUserRoles")]
        

        public async Task<IActionResult> GetUserRoles(Guid userId)
        {

            return Ok(await service.GetUserRoles(userId));
        }
        [HttpGet("MyMessanger")]
        public async Task<IActionResult> MyMessanger(CancellationToken token)
        {
            var msgs = await messageService.MyMessanger(null,token);



            return Ok(msgs);
        }

        /// <summary>Full message history for the direct thread with the given user (complements SignalR initial load).</summary>





        //[HttpGet("DirectMessages/{otherUserId}")]
        //public async Task<IActionResult> DirectMessages(string otherUserId, CancellationToken token)
        //{
        //    var msgs = await messageService.GetMessages(otherUserId, token);
        //    return Ok(msgs);
        //}

        [HttpGet("AllUsersWithEmployeeData")]
        public async Task<IActionResult> AllUsersWithEmployeeData(CancellationToken token)
        {
            var msgs = await service.AllUsersWithEmployeeData(token);



            return Ok(msgs);
        }
        [HttpGet("20more/{MessageId}")]
        public async Task<IActionResult> Get20More(Guid MessageId, CancellationToken token)
        {
            var msgs = await messageService.Get20More(MessageId, token);



            return Ok(msgs);
        }
        [HttpGet("MessageCount")]
        [Authorize]
        public async Task<IActionResult> GetMessagesCount(CancellationToken token)
        {
            var userid = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var msgs = 
                await messageService.MyCount(userid, token) +
                await TicketMessage.MyCount(userid, token) +
                await ProjectMessage.MyCount(userid, token) +
                await TaskMessage.MyCount(userid, token) 
                ;



            return Ok(msgs);
        }
    }
}
