using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Hybrid;

namespace ITDepartmentSystem.Services
{
    public class IssueStatusService(
        IGenericRepository<IssueStatus> repo,
        HybridCache cache) : IIsueStatusService
    {

        private readonly string cachekeyword = "IssueStatus";

        

        public async Task<IssueStatusResponse> Create(IssueStatusCreateRequest obj, CancellationToken token = default)
        {
            if ((await (await repo.GetAllAsync(token)).AnyAsync(s => s.StatusName == obj.Name, token)))
            {
                throw new BusinessRuleException("System with that name already exists", StatusCodes.Status409Conflict);
            }
            IssueStatus system = new IssueStatus()
            {
                StatusName = obj.Name,
                Color=obj.Color,
                isFinished=obj.isFinished
            };
            await repo.CreateAsync(system, token);
            await DeleteCache();
            return IssueStatusResponse.FromModel(system);
        }

        public async Task Delete(Guid id, CancellationToken token = default)
        {
            var entity = await privateGetById(id);
            entity.IsDeleted = true;
            await repo.SaveChangesAsync();
            await DeleteCache();
        }


        private async Task<IssueStatus> privateGetById(Guid id, CancellationToken token = default)
        {

            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("System does not exist", StatusCodes.Status404NotFound);
            }
            return entity;
        }
        public async Task DeleteCache(CancellationToken token = default)
        {
            await cache.RemoveAsync(cachekeyword, token);
        }

        public async Task<ICollection<IssueStatusResponse>> GetAll(CancellationToken token = default)
        {
            var objects = await cache.GetOrCreateAsync(cachekeyword, async ct =>
            {
                var entities = (await (await repo.GetAllAsync(token)).ToListAsync(token)).Select(IssueStatusResponse.FromModel).ToList();

                return entities;

            }, cancellationToken: token);
            return objects;
        }

        public async Task<IssueStatusResponse> GetById(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("Status does not exist", StatusCodes.Status404NotFound);
            }
            var dto = IssueStatusResponse.FromModel(entity);

            return dto;
        }
        public async Task<IssueStatusResponse> Update(Guid id, IssueStatusCreateRequest obj, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("Issue Status does not exist", StatusCodes.Status404NotFound);
            }
            if (entity.IsDeleted)
            {
                throw new BusinessRuleException("Issue Status is already deleted", StatusCodes.Status409Conflict);

            }
            if ((await repo.GetAllAsync()).Any(a => a.Id != entity.Id && a.StatusName == obj.Name))
            {
                throw new BusinessRuleException("System with that name already exists", StatusCodes.Status404NotFound);

            }
            entity.StatusName = obj.Name;
            entity.Color = obj.Color;
            entity.isFinished = obj.isFinished;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
            return await GetById(id);
        }

        public async Task SetIsDeleted(Guid id, CancellationToken token = default)
        {
            var entity = await privateGetById(id);
            entity.IsDeleted = true;
            await repo.SaveChangesAsync();
            await DeleteCache();
        }
    }
}
