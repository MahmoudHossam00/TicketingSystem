using ITDepartmentSystem.General;

namespace ITDepartmentSystem.Services.IServices
{
    public interface ITaskService: IUpdate<UpdateTaskRequest, Guid, TaskResponse>,
        IDelete<Guid>,
        IIsDeleted<Guid>,
        IGetById<TaskResponse, Guid>
        , IRemoveCache
    {
        public Task<ICollection<string>> GetPrivateNotes(Guid Id, CancellationToken token = default);
        public Task<PaginatedResponse<ProjectTaskSubTaskRespone>> GetKPIs(FilterTicketTaskRequest req, CancellationToken token = default);
        public Task AddPrivateNote(Guid Id, StringDTO note, CancellationToken token = default);
        public Task<ICollection<IssueStatusHistoryResponse>> GetStatuses(Guid Id, CancellationToken token = default);
        public Task ChangeStatus(Guid Id, Guid StatusId, CancellationToken token = default);
        public Task<ICollection<AssignHistoryResponse>> GetAssignHistory(Guid Id, CancellationToken token = default);
        public Task Reassign(Guid Id, string AgentId, CancellationToken token = default);
        public Task<string> GetTicketFilePath(Guid id, string name, CancellationToken token = default);
        public Task<ICollection<MessageResponse>> GetMessages(Guid Id, string userId, CancellationToken token = default);
        public Task<ICollection<MessageResponse>> Get20More(Guid topMessage, CancellationToken token = default);

        public Task<ICollection<MessangerResponse>> MyMessanger(string userId, CancellationToken token = default);
        public Task<int> MyCount(string userId, CancellationToken token = default);

        public Task<MessageResponse> SaveMessage(Guid ticketId, string userId, SendMessageRequest message, CancellationToken token = default);
        public Task MarkMessagesAsSeenAsync(Guid ticketId, string userId, CancellationToken token = default);
        public Task UploadAssignedAttachments(Guid TaskId, List<IFormFile> files, CancellationToken token = default);
        Task<PaginatedResponse<TaskResponse>> GetAllFiltered(FilterTaskRequest req, bool getKPIWithdata = false, CancellationToken token = default);
        //Task<ICollection<KPIViewDTO>> GetKPIs(Guid Id, CancellationToken token = default);

        Task AddTicketTasks(Guid ProjectTaskId, CreateTicketTaskRequest changeModuleDTO, CancellationToken token);
        Task<List<ProjectTaskSubTaskRespone>> MyTicketTasks(Guid TicketId, CancellationToken token);

    }


}
