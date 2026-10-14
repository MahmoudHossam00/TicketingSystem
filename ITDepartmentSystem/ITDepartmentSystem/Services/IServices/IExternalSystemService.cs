using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Services.IServices
{
    public interface IExternalSystemService
    {
        public Task LoadSystemsUsers(CancellationToken token = default);
        public Task LoadNewSystemFromExcel(SystemFromExcelRequest Request,CancellationToken token=default);
        public  Task<ExternalSystem> CreateExternalSystemAsync(ExernalSystemRequest request);
        public Task AddExternalUser(ExternalUserRequest request, CancellationToken Token = default);
        public Task AddExternalUsersFromExcel(ExternalUserFromExcel request, CancellationToken token = default);
        public Task<ICollection<systemAccount>> ByEmployee(Guid EmployeeId, CancellationToken token = default);
        public Task<ICollection<ExternalSystem>> GetAll( CancellationToken token = default);


    }
    public class SystemFromExcelRequest() 
    {
        public string Name { set; get; }
        public IFormFile Excel { set; get; }
    }
    public class systemAccount()
    {
        public Guid Id { set; get; }
        public Guid ExternalSystemId { set; get; }
        public string ExternalSystemName { set; get; }
        //[ForeignKey("Employee")]
        //public Guid EmployeeId { set; get; }
        //public EmployeeCache Employee { set; get; }

        public string UserName { set; get; }
        public string? Status { set; get; }
        public bool isActive { set; get; }
    }
}
