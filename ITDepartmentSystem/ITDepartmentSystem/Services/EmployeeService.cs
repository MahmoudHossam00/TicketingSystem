using AutoMapper;
using DocumentFormat.OpenXml.Bibliography;
using DocumentFormat.OpenXml.Office2010.Excel;
using ITDepartmentSystem.General;
using Microsoft.Extensions.Caching.Hybrid;
using OfficeOpenXml.FormulaParsing.LexicalAnalysis;
using Serilog;

namespace ITDepartmentSystem.Services
{
    public class EmployeeService(IMapper _mapper,
                                 INotEntityGenericRepository<EmployeeCache> repo,
                                 INotEntityGenericRepository<Models.Department> deptsrepo,
                                 EmployeeSyncService sync,
                                 ILogger<EmployeeCache> log,
                                 HybridCache cache) : IEmployeeService
    {
        public async Task FetchEmployees(CancellationToken token = default)
        {
            await sync.SyncAsync();
            await cache.RemoveAsync("Employees");
        }

        public async Task<ICollection<EmployeeCacheDTO>> GetAll(CancellationToken token = default)
        {
            var Employees = await cache.GetOrCreateAsync("Employees", async ct =>
            {
                var entities = (await repo.GetAllAsync(token)).ToList();

                Console.WriteLine("db visited");
                log.LogInformation("db visited for entity {@entity}", "Employees");
                var dto = _mapper.Map<ICollection<EmployeeCacheDTO>>(entities);
                return dto;

            });
            return Employees;
        }

        public async Task<IEnumerable<Models.Department>> GetAllDepartments(CancellationToken ct)
        {
            var entities = await(await deptsrepo.GetAllAsync(ct)).ToListAsync(ct);

            //var dto = _mapper.Map<EmployeeCacheDTO>(entities);
            return entities;
        }

        public async Task<EmployeeCacheDTO> GetById(Guid id,CancellationToken token = default)
        {
            
             var entities = await (await repo.GetAllAsync(token)).Include(a=>a.Manager).FirstOrDefaultAsync(e=>e.Id==id);
             
             var dto = _mapper.Map<EmployeeCacheDTO>(entities);
             return dto;

            
        }
        public async Task<PaginatedResponse<EmployeeCacheDTO>> GetFiltered(CancellationToken token = default,string? filter=null, List<int>? DepartmentIds = null, int page=0)
        {

            var entities = await repo.GetAllAsync(token);
            page--;
            if(filter!=null)
            {
                entities = entities.Where(e =>
                                    EF.Functions.Like(e.NameEn, $"%{filter}%") ||
                                    EF.Functions.Like(e.EmployeeNumber.ToString(), $"%{filter}%")
                                );

            };
            if(DepartmentIds!=null && DepartmentIds.Count()>0)
            {
                entities = entities.Where(e => e.DepartmentId.HasValue && DepartmentIds.Contains(e.DepartmentId.Value));
            }
            var totalRecords = entities.Count();
            entities = entities.Skip(50 * page).Take(50);
            var data = await entities.ToListAsync();
            var dto = _mapper.Map<ICollection<EmployeeCacheDTO>>(data);
            return new PaginatedResponse<EmployeeCacheDTO>()
            {
                Data = dto.ToList(),
                FilteredCount = data.Count(),
                Page = page,
                PageSize = 50,
                TotalRecords = totalRecords
            };
            //Console.WriteLine("db visited");
            //log.LogInformation("db visited for entity {@entity}", "Employees");
            //return dto;

           
        }

    }
}
