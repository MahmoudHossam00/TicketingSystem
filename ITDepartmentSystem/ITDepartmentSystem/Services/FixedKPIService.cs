using DocumentFormat.OpenXml.Office2010.Excel;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace ITDepartmentSystem.Services
{
    public class FixedKPIService(
        IGenericRepository<KPIMasterData> repo,
        IGenericRepository<KPI> kpirepo,
        IGenericRepository<Ticket> ticketsrepo,
        IGenericRepository<TicketTask> ticketTasksrepo,
        IGenericRepository<ProjectTask> tasksrepo,
        IGenericRepository<ProjectTaskSubTask> subtasksrepo,

        IGenericRepository<SystemAgent> systemagentsrepo,
        IGenericRepository<RelatedModule> Modules,
        IHttpContextAccessor httpContextAccessor
        , UserManager<AppUser> users, HybridCache cache) : IFixedKPIService
    {
        private readonly string cachekeyword = "FixedKPI";

        private ClaimsPrincipal User =>
        httpContextAccessor.HttpContext?.User
        ?? throw new BusinessRuleException("Unauthorized", StatusCodes.Status401Unauthorized);

        public async Task<ViewFixedKPIDTO> Create(StringDTO obj, CancellationToken token = default)
        {
            if ((await (await repo.GetAllAsync(token)).AnyAsync(s => s.Name == obj.Name, token)))
            {
                throw new BusinessRuleException("KPIMasterData with that name already exists", StatusCodes.Status409Conflict);
            }
            KPIMasterData KPIMasterData = new KPIMasterData()
            {
                Name = obj.Name,
            };
            await repo.CreateAsync(KPIMasterData, token);
            await DeleteCache();
            return ViewFixedKPIDTO.FromModel(KPIMasterData);
        }

        public async Task<Guid> CreateKPIRequest(CreateKPIRequest REQ, CancellationToken token = default)
        {
            var userid = GetUserId();
            Guid? ticketid = null;
            if (REQ.TicketTaskId != null)
            {

            var ticketTask = await (await ticketTasksrepo.GetAllAsync(token)).FirstOrDefaultAsync(t => t.Id == REQ.TicketTaskId);
            if(ticketTask == null)
            {
                throw new BusinessRuleException("Ticket Task does not exist", StatusCodes.Status404NotFound);
            }
            ticketid= ticketTask.TicketId;
            var systemid = await (await ticketsrepo.GetAllAsync()).Where(t => t.Id == ticketid).Select(t => t.RelatedSubModuleAnswer.RelatedSubModule.Module.SystemId).FirstOrDefaultAsync();

            if (!await(systemagentsrepo.AnyAsync(T=>T.SystemId==systemid&&T.AgentId==userid)))
            {
                throw new BusinessRuleException("Only system Users can set the kpi", StatusCodes.Status403Forbidden);
            }
            }
            Guid? maintaskid = null;
            if(REQ.TaskId!=null)
            {
                var task = await subtasksrepo.GetByIdAsync(REQ.TaskId.Value);
                if(task==null)
                {
                    throw new BusinessRuleException("TASK WAS NOT FOUND", StatusCodes.Status404NotFound);
                }
                maintaskid = task.ProjectTaskId;
            }
            var kpi = new KPI()
            {
                TicketId = ticketid,
                TaskId=REQ.TaskId,      
                MainTaskId = maintaskid,
                FixedKPIId = REQ.FixedKPIId,
                ConfirmationDate = DateTime.Now,
                TicketTaskId = REQ.TicketTaskId
            };
            await kpirepo.AddAsync(kpi,token);
            await kpirepo.SaveChangesAsync(token);
            return kpi.Id;
        }
        private string GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub"); // JWT fallback

            if (id == null)
                throw new BusinessRuleException("User ID not found in token", StatusCodes.Status401Unauthorized);

            return id;
        }
        public Task Delete(Guid id, CancellationToken token = default)
        {
            throw new NotImplementedException();
        }

        public async Task DeleteCache(CancellationToken token = default)
        {
            await cache.RemoveAsync(cachekeyword, token);
        }

        public async Task<ICollection<ViewFixedKPIDTO>> GetAll(CancellationToken token = default)
        {
            var objects = await cache.GetOrCreateAsync(cachekeyword, async ct =>
            {
                var entities = (await repo.GetAllAsync(token)).Select(ViewFixedKPIDTO.FromModel).ToList();

                return entities;

            }, cancellationToken: token);
            return objects;
        }

        public async Task<ViewFixedKPIDTO> GetById(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("KPIMasterData does not exist", StatusCodes.Status404NotFound);
            }
            var dto = ViewFixedKPIDTO.FromModel(entity);

            return dto;
        }


        public async Task SetIsDeleted(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("KPIMasterData does not exist", StatusCodes.Status404NotFound);
            }
            if (entity.IsDeleted)
            {
                throw new BusinessRuleException("KPIMasterData is already deleted", StatusCodes.Status409Conflict);

            }
            entity.IsDeleted = true;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
        }

        public async Task<ViewFixedKPIDTO> Update(Guid id, StringDTO obj, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("KPIMasterData does not exist", StatusCodes.Status404NotFound);
            }
            if (entity.IsDeleted)
            {
                throw new BusinessRuleException("KPIMasterData is already deleted", StatusCodes.Status409Conflict);

            }
            if ((await repo.GetAllAsync()).Any(a => a.Id != entity.Id && a.Name == obj.Name))
            {
                throw new BusinessRuleException("KPIMasterData with that name already exists", StatusCodes.Status404NotFound);

            }
            entity.Name = obj.Name;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
            return await GetById(id);
        }

    }
}
