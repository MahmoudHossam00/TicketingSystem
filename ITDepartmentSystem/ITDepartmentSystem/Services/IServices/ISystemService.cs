using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace ITDepartmentSystem.Services.IServices
{
    public interface ISystemService:IUseBasic<StringDTO, StringDTO, ViewSystemDTO,Guid>, IRemoveCache


    {
        Task AddAgent(Guid id, string agentId, CancellationToken token);
        public Task<List<UserResponseDTO>> GetSystemAgents(Guid id, CancellationToken token = default);
        Task RemoveAgent(Guid id, string agentId, CancellationToken token);


        Task AddModule(CreateRelatedModuleRequest dto, CancellationToken token);
        public Task<List<RelatedModuleResponse>> GetSystemModules(Guid id, CancellationToken token = default);
        Task RemoveModule(Guid id, Guid ModuleId, CancellationToken token);
        Task<List<AgentResponseWithTasksNumberDTO>> GetSystemAgentsWithTaskNumbers(Guid id, CancellationToken token);
    }



}
