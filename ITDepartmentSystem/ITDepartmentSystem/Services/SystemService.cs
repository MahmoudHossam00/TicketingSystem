using DocumentFormat.OpenXml.Office2010.Excel;
using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Hybrid;
using Serilog;

namespace ITDepartmentSystem.Services
{
    public class SystemService(
        IGenericRepository<ITSystem> repo,
        IGenericRepository<RelatedModule> Modules
        ,UserManager<AppUser> users,HybridCache cache,
        IGenericRepository<ProjectTask> TasksRepo,
        IGenericRepository<Ticket> TicketsRepo,
        IGenericRepository<Project>projects): ISystemService
    {

        private readonly string cachekeyword = "Systems";

        public async Task AddAgent(Guid id, string agentId, CancellationToken token)
        {
            var sys=await getagentincluded(id);
            var user =await users.FindByIdAsync(agentId);
            if (user==null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }
            if (sys.Agents.Any(a=>a.AgentId==agentId))
            {
               throw new BusinessRuleException("Agent already exists in the system", StatusCodes.Status409Conflict);
            }
            sys.Agents.Add(new()
            {
                Id=Guid.Empty,
                AgentId = agentId,
                SystemId = id,

            });
            
            await repo.SaveChangesAsync();
            var prjcts = (await projects.Where(p => p.SystemId == id)).Select(p => p.Id);
            foreach(var prjctid in prjcts)
            {
                await cache.RemoveAsync($"ProjectChat_{prjctid}");

            }
        }

        public async Task<ViewSystemDTO> Create(StringDTO obj, CancellationToken token = default)
        {
            if ((await(await repo.GetAllAsync(token)).AnyAsync(s => s.Name == obj.Name, token)))
            {
                throw new BusinessRuleException("System with that name already exists", StatusCodes.Status409Conflict);
            }
            ITSystem system = new ITSystem()
            {
                Name = obj.Name,
            };
            await repo.CreateAsync(system, token);
            await DeleteCache();
            return ViewSystemDTO.FromModel(system);
        }

        public Task Delete(Guid id, CancellationToken token = default)
        {
            throw new NotImplementedException();
        }

        public async Task DeleteCache(CancellationToken token = default)
        {
            await cache.RemoveAsync(cachekeyword, token);
        }

        public async Task<ICollection<ViewSystemDTO>> GetAll( CancellationToken token = default)
        {
            return (await repo.GetAllAsync(token)).Select(ViewSystemDTO.FromModel).ToList();

            var objects = await cache.GetOrCreateAsync(cachekeyword, async ct =>
            {
                var entities = (await repo.GetAllAsync(token)).Select(ViewSystemDTO.FromModel).ToList();

                return entities;

            },cancellationToken:token);
            return objects;
        }

        public async Task<ViewSystemDTO> GetById(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if(entity==null)
            {
                throw new BusinessRuleException("System does not exist", StatusCodes.Status404NotFound);
            }
            var dto = ViewSystemDTO.FromModel(entity);

            return dto;
        }
        private async Task<ITSystem> getagentincluded(Guid id,CancellationToken token=default)
        {
            var entity = await(await repo.GetAllAsync(token)).Include(m=>m.Modules).ThenInclude(s=>s.SubModules).Include(s => s.Agents).ThenInclude(s => s.Agent).FirstOrDefaultAsync(r => r.Id == id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("System does not exist", StatusCodes.Status404NotFound);
            }
            return entity;
        }
        public async Task<List<UserResponseDTO>> GetSystemAgents(Guid id, CancellationToken token = default)
        {
            var entity = await (await repo.GetAllAsync(token))
                .Include(s=>s.Agents)
                .ThenInclude(s=>s.Agent)
                .ThenInclude(s=>s.Employee)
                .ThenInclude(s=>s.Manager)
                .FirstOrDefaultAsync(r => r.Id == id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("System does not exist", StatusCodes.Status404NotFound);
            }
            var agents = entity.Agents.Select(s => s.Agent);
            return agents.AsQueryable().Select(UserResponseDTO.FromExpr()).ToList();
        }

        public async Task RemoveAgent(Guid id, string agentId, CancellationToken token)
        {
            var sys = await getagentincluded(id);
            var user = await users.FindByIdAsync(agentId);
            if (user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }
            var agent = sys.Agents.Where(a => a.AgentId == agentId).FirstOrDefault();
            if (agent==null)
            {
                throw new BusinessRuleException("Agent does not exist in the system", StatusCodes.Status409Conflict);
            }

            sys.Agents.Remove(agent);
            await repo.SaveChangesAsync();
            var prjcts = (await projects.Where(p => p.SystemId == id)).Select(p => p.Id);
            foreach (var prjctid in prjcts)
            {
                await cache.RemoveAsync($"ProjectChat_{prjctid}");

            }
        }

        public async Task SetIsDeleted(Guid id, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("System does not exist", StatusCodes.Status404NotFound);
            }
            if(entity.IsDeleted)
            {
                throw new BusinessRuleException("System is already deleted", StatusCodes.Status409Conflict);

            }
            entity.IsDeleted=true;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
        }

        public async Task<ViewSystemDTO> Update(Guid id, StringDTO obj, CancellationToken token = default)
        {
            var entity = await repo.GetByIdAsync(id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("System does not exist", StatusCodes.Status404NotFound);
            }
            if (entity.IsDeleted)
            {
                throw new BusinessRuleException("System is already deleted", StatusCodes.Status409Conflict);

            }
            if((await repo.GetAllAsync()).Any(a=>a.Id!=entity.Id && a.Name==obj.Name))
            {
                throw new BusinessRuleException("System with that name already exists", StatusCodes.Status404NotFound);

            }
            entity.Name = obj.Name;
            await DeleteCache();

            await repo.SaveChangesAsync(token);
            return await GetById(id);
        }

        public async Task AddModule(CreateRelatedModuleRequest dto, CancellationToken token)
        {
            var sys = await getagentincluded(dto.SystemId);
            
            if (sys.Modules.Any(a => a.Name == dto.Name))
            {
                throw new BusinessRuleException("Agent already exists in the system", StatusCodes.Status409Conflict);
            }
            sys.Modules.Add(new()
            {
                Id = Guid.Empty,
                Name=dto.Name,
                SystemId = dto.SystemId,

            });
            await repo.SaveChangesAsync();
        }

        public async Task<List<RelatedModuleResponse>> GetSystemModules(Guid id, CancellationToken token = default)
        {
            var entity = await (await repo.GetAllAsync(token))
                .Include(s => s.Modules)
                .ThenInclude(s => s.SubModules)
                //.ThenInclude(s => s.Employee)
                //.ThenInclude(s => s.Manager)
                .FirstOrDefaultAsync(r => r.Id == id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("System does not exist", StatusCodes.Status404NotFound);
            }
            var agents = entity.Modules;
            return agents.AsQueryable().Select(RelatedModuleResponse.FromModel).ToList();
        }

        public async Task RemoveModule(Guid id, Guid ModuleId, CancellationToken token)
        {
            var sys = await getagentincluded(id);
            var module = await Modules.GetByIdAsync(ModuleId);
            if (module == null)
            {
                throw new BusinessRuleException("module does not exist", StatusCodes.Status404NotFound);
            }
            var currentmodule = sys.Modules.Where(a => a.Id == ModuleId).FirstOrDefault();
            if (currentmodule == null)
            {
                throw new BusinessRuleException("currentmodule does not exist in the system", StatusCodes.Status409Conflict);
            }

            sys.Modules.Remove(currentmodule);
            await repo.SaveChangesAsync();
        }

        public async Task<List<AgentResponseWithTasksNumberDTO>> GetSystemAgentsWithTaskNumbers(Guid id, CancellationToken token)
        {
            //var agents= await GetSystemAgents(id);

            var entity = await (await repo.GetAllAsync(token))
               .Include(s => s.Agents)
               .ThenInclude(s => s.Agent)
               .ThenInclude(s => s.Employee)
               //.ThenInclude(s => s.Manager)
               .FirstOrDefaultAsync(r => r.Id == id, token);
            if (entity == null)
            {
                throw new BusinessRuleException("System does not exist", StatusCodes.Status404NotFound);
            }
            var agents = entity.Agents.Select(a=>a.Agent);
            //return agents.AsQueryable().Select(UserResponseDTO.FromExpr()).ToList();
            List<AgentResponseWithTasksNumberDTO> list = new();
            foreach(var agent in agents)
            {
                AgentResponseWithTasksNumberDTO x = new AgentResponseWithTasksNumberDTO();
                //list.Add(new()
                //{
                x.userdataresponse = new BasicUserDataResponse(agent.Id, agent.UserName ?? "UNknown", agent.Employee.NameEn, agent.Employee.EmployeeNumber);
                //})
                x.NumberOfAssignedActiveTicketss = await (TicketsRepo.Wheree(t => t.CurrentAssignedId == agent.Id && !t.isClosed && !t.CurrentStatus.isFinished, token)).CountAsync(token);
                x.NumberOfAssignedActiveProjectTasks = await (TicketsRepo.Wheree(t => t.CurrentAssignedId == agent.Id && !t.isClosed && !t.CurrentStatus.isFinished, token)).CountAsync(token);
                list.Add(x);
            }
            return list;
        }
    }
}
