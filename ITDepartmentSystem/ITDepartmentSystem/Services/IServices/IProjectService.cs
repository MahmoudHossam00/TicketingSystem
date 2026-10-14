using ITDepartmentSystem.General;
using static ITDepartmentSystem.Requests.CreateProjectRequest;

namespace ITDepartmentSystem.Services.IServices
{
    public interface IProjectService : IUseBasic2<CreateProjectRequest, UpdateProjectRequest, ProjectResponse, Guid>, IRemoveCache
    {
        public Task<ICollection<string>> GetPrivateNotes(Guid Id, CancellationToken token = default);
        //public Task<ICollection<KPIViewDTO>> GetKPIs(Guid Id, CancellationToken token = default);
        public Task AddPrivateNote(Guid Id, StringDTO note, CancellationToken token = default);
        public Task ChangeStatus(Guid Id, Guid StatusId, CancellationToken token = default);
        //public Task<Guid> GetTicketSystemId(Guid id, CancellationToken token = default);
        public Task<string> GetTicketFilePath(Guid id, string name, CancellationToken token = default);
        public Task<PaginatedResponse<ProjectResponse>> GetAll(FilterTicketRequest FilterRequest, int page = 0, CancellationToken token = default);
        public Task<ICollection<MessageResponse>> GetMessages(Guid Id, string userId, CancellationToken token = default);
        public Task<ICollection<MessageResponse>> Get20More(Guid topMessage, CancellationToken token = default);

        public Task<ICollection<MessangerResponse>> MyMessanger(string userId,CancellationToken token = default);
        public Task<MessageResponse> SaveMessage(Guid projectId, string userId, SendMessageRequest message, CancellationToken token = default);
        public Task MarkMessagesAsSeenAsync(Guid projectId, string userId, CancellationToken token = default);
        public Task ToggleProjectClosed(Guid projectId, CancellationToken token = default);
        //Task AddTask(Guid id, CreateTaskRequest createTaskRequest, CreateTaskRequest req, CancellationToken token);
        Task AddTask(Guid id, CreateTaskRequest req, CancellationToken token);
        Task<ICollection<TaskResponse>> GetProjectTasks(Guid id, CancellationToken token);
        public Task<int> MyCount(string userId, CancellationToken token = default);

        //public Task<ICollection<UserResponseViewDTO>> GetTOs(Guid Id, CancellationToken token = default);
        //public Task<ICollection<UserResponseViewDTO>> GetCCs(Guid Id, CancellationToken token = default);
        //public Task ChangeBasicDataRequest(Guid id, BasicDataRequest req, CancellationToken token = default);
        //public Task<ICollection<IssueStatusHistoryResponse>> GetStatuses(Guid Id, CancellationToken token = default);
        //public Task<ICollection<AssignHistoryResponse>> GetAssignHistory(Guid Id, CancellationToken token = default);
        //public Task Reassign(Guid Id, string AgentId, CancellationToken token = default);
        //public Task<ICollection<ReplyResponse>> GetReplies(Guid Id, CancellationToken token = default);
        //public Task<RelatedSubModuleAnswerResponse> GetRelatedAnswer(Guid Id, CancellationToken token = default);
        //public Task CreateReply(Guid id, CreateReplyRequest Request, CancellationToken token = default);
        //public Task<Guid> SplitTicket(SplitTicketRequest request, CancellationToken token = default);
        //public Task GetReplyFile(Guid id,string name,CancellationToken token = default);
        //public Task GetReplyPictures(Guid id,string name,CancellationToken token = default);
    }
}
