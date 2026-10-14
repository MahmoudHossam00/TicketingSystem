using ZenHrIntegrator.Responses;

namespace ZenHrIntegrator.Services.Interfaces
{
    public interface IZenHrLookupService
    {
        Task<List<MasterDto>> GetDepartmentsAsync(CancellationToken ct = default);
        Task<List<MasterDto>> GetPositionsAsync(CancellationToken ct = default);
        Task<List<MasterDto>> GetWorkLocationsAsync(CancellationToken ct = default);
        Task<List<MasterDto>> GetBusinessUnitsAsync(CancellationToken ct = default);
        Task<List<MasterDto>> GetWorkTypesAsync(CancellationToken ct = default);
        Task<List<MasterDto>> GetSectionsAsync(CancellationToken ct = default);
        Task<List<MasterDto>> GetDivisionsAsync(CancellationToken ct = default);
    }
}
