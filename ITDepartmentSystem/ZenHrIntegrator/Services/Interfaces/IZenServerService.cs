using ZenHrIntegrator.SecondModels;

namespace ZenHrIntegrator.Services.Interfaces
{
    public interface IZenServerService
    {
        Task<ICollection<EmployeesBranch>> GetAllEmployeeBranches();
        Task IntegrateEmployeesBranches();
    }
}
