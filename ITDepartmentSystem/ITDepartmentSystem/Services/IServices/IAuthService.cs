using ITDepartmentSystem.General;
using Microsoft.AspNetCore.Identity.Data;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Services.IServices
{
    public interface IAuthService
    {
        public Task<TokenResponse> Login(LoginToAccountRequest request);
        public Task CreateAccount(CreateAccountRequest request);
        public Task AddRole(AddRoleRequest request);
        public Task AddPermissionToRole(UpdateRole request);
        public Task AddPicture(string USERId,IFormFile picture);
        public Task ChangeMyPicture(IFormFile picture);
        public Task CreateRole(CreateRole Request);
        public Task<Dictionary<string,string>> GetAllRoles();
        public Task<Dictionary<string,string>> GetAllUsers();
        public Task<PaginatedResponse<BasicUserDataResponse>> GetAllUsersBasicData(FilterDataRequest filter,CancellationToken token);
        public Task<List<string>> GetUserRoles(Guid userId );
        Task<TokenResponse> Refresh(string refreshToken, string? userAgent, string? ip, CancellationToken ct);
        Task<UserResponse> GetUserDetails(Guid EmployeeNumber, CancellationToken ct);
        Task<UserResponse> GetUserDetails(string userId, CancellationToken ct);
        Task<ICollection<DataUserResponse>> AllUsersWithEmployeeData(CancellationToken ct);
        Task<string> GetMyPicture(CancellationToken ct);
        Task Revoke(string refreshToken, CancellationToken ct);

    }

    public class UserResponse
    {
        public Guid EmployeeNumber { get; set; }
        public string? UserName { set; get; }
        public string? Email { set; get; }
        public string? Picture { set; get; }
        public bool isDisabled { set; get; } = false;
        public static UserResponse FromModel(AppUser User)
        {
            return new UserResponse()
            {
                EmployeeNumber = User.EmployeeNumber,
                Email = User.Email,
                isDisabled = User.isDisabled,
                Picture = User.Picture,
                UserName = User.UserName
            };
        }
    }
    public class DataUserResponse
    {
        public Guid EmployeeId { get; set; }
        public int EmployeeNumber { get; set; }
        public string? Email { set; get; }
        public string? UserName { set; get; }
        public string? UserId { set; get; }
        public string? Picture { set; get; }
        public bool isDisabled { set; get; } = false;
        public static DataUserResponse FromModel(AppUser User)
        {
            return new DataUserResponse()
            {
                EmployeeNumber = User.Employee.EmployeeNumber,
                Email = User.Email,
                isDisabled = User.isDisabled,
                Picture = User.Picture,
                UserName = User.UserName,
                EmployeeId=User.EmployeeNumber,
                UserId=User.Id
            };
        }
    }
}
