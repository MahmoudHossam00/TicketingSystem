using DocumentFormat.OpenXml.Office2010.Excel;
//using ITDepartmentCompany.Requests.GeneralRequests;
using ITDepartmentCompany.Services.IServices;
using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Hybrid;
using Serilog;

namespace ITDepartmentCompany.Services
{
    public class CompanyService(
        IGenericRepository<Company> repo,
        IGenericRepository<RelatedModule> Modules
        ,UserManager<AppUser> users,HybridCache cache): ICompanyService
    {

        private readonly string cachekeyword = "Companies";

        

        public async Task<ViewCompanyDTO> Create(StringDTO obj, CancellationToken token = default)
        {
            if ((await(await repo.GetAllAsync(token)).AnyAsync(s => s.Name == obj.Name, token)))
            {
                throw new BusinessRuleException("Company with that name already exists", StatusCodes.Status409Conflict);
            }
            Company Company = new Company()
            {
                Name = obj.Name,
            };
            await repo.CreateAsync(Company, token);
            await DeleteCache();
            return ViewCompanyDTO.FromModel(Company);
        }

        public Task Delete(Guid id, CancellationToken token = default)
        {
            throw new NotImplementedException();
        }

        public async Task DeleteCache(CancellationToken token = default)
        {
            await cache.RemoveAsync(cachekeyword, token);
        }

        public async Task<ICollection<ViewCompanyDTO>> GetAll( CancellationToken token = default)
        {
            var objects = await cache.GetOrCreateAsync(cachekeyword, async ct =>
            {
                var entities = (await repo.GetAllAsync(token)).Select(ViewCompanyDTO.FromModel).ToList();

                return entities;

            },cancellationToken:token);
            return objects;
        }

        public async Task<ViewCompanyDTO> GetById(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if(entity==null)
            {
                throw new BusinessRuleException("Company does not exist", StatusCodes.Status404NotFound);
            }
            var dto = ViewCompanyDTO.FromModel(entity);

            return dto;
        }


        public async Task SetIsDeleted(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("Company does not exist", StatusCodes.Status404NotFound);
            }
            if(entity.IsDeleted)
            {
                throw new BusinessRuleException("Company is already deleted", StatusCodes.Status409Conflict);

            }
            entity.IsDeleted=true;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
        }

        public async Task<ViewCompanyDTO> Update(Guid id, StringDTO obj, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("Company does not exist", StatusCodes.Status404NotFound);
            }
            if (entity.IsDeleted)
            {
                throw new BusinessRuleException("Company is already deleted", StatusCodes.Status409Conflict);

            }
            if((await repo.GetAllAsync()).Any(a=>a.Id!=entity.Id && a.Name==obj.Name))
            {
                throw new BusinessRuleException("Company with that name already exists", StatusCodes.Status404NotFound);

            }
            entity.Name = obj.Name;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
            return await GetById(id);
        }

  
    }
}
