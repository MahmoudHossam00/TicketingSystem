namespace ITDepartmentSystem.Services.IServices
{
    public interface IFixedKPIService : IUseBasic<StringDTO, StringDTO, ViewFixedKPIDTO, Guid>, IRemoveCache
    {
        public Task<Guid> CreateKPIRequest(CreateKPIRequest REQ, CancellationToken token = default);
    }
}
