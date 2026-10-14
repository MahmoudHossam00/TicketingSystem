using DocumentFormat.OpenXml.Office2010.Excel;
using DocumentFormat.OpenXml.Presentation;
using DocumentFormat.OpenXml.Spreadsheet;
using ITDepartmentSystem.General;
using ITDepartmentSystem.Requests.GeneralRequests;
using Microsoft.AspNetCore.Mvc;
using OpenTelemetry.Trace;
using Org.BouncyCastle.Ocsp;

namespace ITDepartmentSystem.Services.IServices
{
    public interface ITicketService: IUseBasic<CreateTicketRequest,UpdateTicketRequest,TicketResponse, Guid>, IRemoveCache
    {
        public Task<ICollection<string>> GetPrivateNotes(Guid Id,CancellationToken token = default);
        public Task<PaginatedResponse<TicketTaskRespone>> GetKPIs(FilterTicketTaskRequest req, CancellationToken token = default);

        public Task AddPrivateNote(Guid Id, StringDTO note, CancellationToken token = default);
        public Task<ICollection<UserResponseViewDTO>> GetTOs(Guid Id,CancellationToken token = default);
        public Task<ICollection<UserResponseViewDTO>> GetCCs(Guid Id,CancellationToken token = default);
        public Task<ICollection<IssueStatusHistoryResponse>> GetStatuses(Guid Id,CancellationToken token = default);
        //public Task<PaginatedResponse<TicketTaskRespone>> GetKPIs(FilterTicketTaskRequest req, CancellationToken token = default);
        public Task ChangeStatus(Guid Id, Guid StatusId, CancellationToken token = default);
        public Task<ICollection<AssignHistoryResponse>> GetAssignHistory(Guid Id,CancellationToken token = default);
        public Task Reassign(Guid Id,string AgentId, CancellationToken token = default);
        public Task<ICollection<ReplyResponse>> GetReplies(Guid Id,CancellationToken token = default);
        public Task<RelatedSubModuleAnswerResponse> GetRelatedAnswer(Guid Id,CancellationToken token = default);
        public Task<Guid> GetTicketSystemId(Guid id, CancellationToken token = default);
        public Task CreateReply(Guid id, CreateReplyRequest Request, CancellationToken token = default);
        public Task<string> GetTicketFilePath(Guid id,string name,CancellationToken token = default);
        public Task ChangeBasicDataRequest(Guid id,BasicDataRequest req,CancellationToken token = default);
        public Task<ICollection<TicketResponse>> GetAll(FilterTicketRequest FilterRequest,bool getkpiwithdata=false, CancellationToken token = default);
        public Task<ICollection<MessageResponse>> GetMessages(Guid Id, string userId, CancellationToken token = default);
        public Task<ICollection<MessageResponse>> Get20More(Guid topMessage, CancellationToken token = default);
        public Task<ICollection<MessangerResponse>> MyMessanger( string userId,CancellationToken token = default);
        public Task<MessageResponse> SaveMessage(Guid ticketId,string userId,SendMessageRequest message, CancellationToken token = default);
        public Task<int> MyCount(string userId, CancellationToken token = default);
        public Task MarkMessagesAsSeenAsync(Guid ticketId, string userId, CancellationToken token = default);
        public Task<Guid> SplitTicket(SplitTicketRequest request, CancellationToken token = default);
        Task ChangeModule(Guid TicketId,CreateRelatedSubModuleAnswerRequest changeModuleDTO, CancellationToken token);
        Task AddTicketTasks(Guid TicketId,CreateTicketTaskRequest changeModuleDTO, CancellationToken token);
        Task<List<TicketTaskRespone>> MyTicketTasks(Guid TicketId, CancellationToken token);
        //public Task GetReplyFile(Guid id,string name,CancellationToken token = default);
        //public Task GetReplyPictures(Guid id,string name,CancellationToken token = default);
    }

   
}
