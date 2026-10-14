using DocumentFormat.OpenXml.Office2010.Excel;
using ITDepartmentCompany.Services.IServices;
using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Hybrid;
using Serilog;

namespace ITDepartmentSystem.Services
{
    public class IssueTypeService(
        IGenericRepository<IssueType> repo,
        IGenericRepository<RelatedModule> Modules
        ,UserManager<AppUser> users,HybridCache cache): IIssueTypeService
    {

        private readonly string cachekeyword = "IIssueType";



        public async Task<ViewIssueTypeDTO> Create(StringDTO obj, CancellationToken token = default)
        {
            if ((await (await repo.GetAllAsync(token)).AnyAsync(s => s.IssueTypeName == obj.Name, token)))
            {
                throw new BusinessRuleException("IssueType with that name already exists", StatusCodes.Status409Conflict);
            }
            IssueType IssueType = new IssueType()
            {
                IssueTypeName = obj.Name,
            };
            await repo.CreateAsync(IssueType, token);
            await DeleteCache();
            return ViewIssueTypeDTO.FromModel(IssueType);
        }

        public Task Delete(Guid id, CancellationToken token = default)
        {
            throw new NotImplementedException();
        }

        public async Task DeleteCache(CancellationToken token = default)
        {
            await cache.RemoveAsync(cachekeyword, token);
        }

        public async Task<ICollection<ViewIssueTypeDTO>> GetAll(CancellationToken token = default)
        {
            var objects = await cache.GetOrCreateAsync(cachekeyword, async ct =>
            {
                var entities = (await repo.GetAllAsync(token)).Select(ViewIssueTypeDTO.FromModel).ToList();

                return entities;

            }, cancellationToken: token);
            return objects;
        }

        public async Task<ViewIssueTypeDTO> GetById(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("IssueType does not exist", StatusCodes.Status404NotFound);
            }
            var dto = ViewIssueTypeDTO.FromModel(entity);

            return dto;
        }


        public async Task SetIsDeleted(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("IssueType does not exist", StatusCodes.Status404NotFound);
            }
            if (entity.IsDeleted)
            {
                throw new BusinessRuleException("IssueType is already deleted", StatusCodes.Status409Conflict);

            }
            entity.IsDeleted = true;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
        }

        public async Task<ViewIssueTypeDTO> Update(Guid id, StringDTO obj, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("IssueType does not exist", StatusCodes.Status404NotFound);
            }
            if (entity.IsDeleted)
            {
                throw new BusinessRuleException("IssueType is already deleted", StatusCodes.Status409Conflict);

            }
            if ((await repo.GetAllAsync()).Any(a => a.Id != entity.Id && a.IssueTypeName == obj.Name))
            {
                throw new BusinessRuleException("IssueType with that name already exists", StatusCodes.Status404NotFound);

            }
            entity.IssueTypeName = obj.Name;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
            return await GetById(id);
        }


    }
}
