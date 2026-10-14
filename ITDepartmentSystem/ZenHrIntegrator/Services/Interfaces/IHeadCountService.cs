using Microsoft.EntityFrameworkCore;
using ZenHrIntegrator.Models;

namespace ZenHrIntegrator.Services.Interfaces
{
    public interface IHeadCountService
    {
        public  Task<List<ZenHrBranch>> GetAllBranches();
        public  Task<int> UpdateBranchesAsync();
        public  Task<List<EmployeeFullDto>> GetAllEmployees();
        public Task<List<EmployeeFullDto>> GetAllChanges(DateTime since);

        public Task<int> UpdateEmployeesAsync(CancellationToken ct = default);
        public Task<EmployeesDumpResult> tempgetbody();
    }
}
