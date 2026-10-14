using DocumentFormat.OpenXml.Office2010.Excel;
using ITDepartmentSystem.General;

namespace ITDepartmentSystem.Services.IServices
{
    public interface IEmployeeService
    {
        public Task<ICollection<EmployeeCacheDTO>> GetAll(CancellationToken token = default);
        public Task<EmployeeCacheDTO> GetById(Guid id,CancellationToken token = default);
        public Task<PaginatedResponse<EmployeeCacheDTO>> GetFiltered(CancellationToken token = default,string? filter=null,List<int>? DepartmentIds=null, int page = 0);
        public Task FetchEmployees(CancellationToken token = default);
        Task<IEnumerable<Department>> GetAllDepartments(CancellationToken ct);
    }
}
