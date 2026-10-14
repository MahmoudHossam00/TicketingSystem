using ITDepartmentSystem.Requests.GeneralRequests;

namespace ITDepartmentSystem.Services.IServices
{
    public interface ISubModuleService : IUseBasic<CreateSubModuleRequest, CreateSubModuleRequest, RelatedSubModuleResponse, Guid>, IRemoveCache


    {
        public Task<ICollection<RelatedSubModuleResponse>> GetByParent(Guid id, CancellationToken token = default);
        Task AddQuestion(CreateQuestionRequest request, CancellationToken token);
        Task<ICollection<QuestionResponse>> GetQuestions(Guid id, CancellationToken token);
        Task<RelatedSubModuleAnswerResponse> GetByAnswerId(Guid id, CancellationToken token);
        Task RemoveQuestion(Guid id, Guid questionId, CancellationToken token);
        Task UpdateQuestion(Guid subModuleId, Guid questionId, UpdateQuestionRequest req, CancellationToken token);
        Task AddOption(Guid subModuleId, Guid questionId, CreateQuestionOptionRequest req, CancellationToken token);
        Task RemoveOption(Guid subModuleId, Guid questionId, Guid optionId, CancellationToken token);

        //Task AddModule(CreateRelatedModuleRequest dto, CancellationToken token);
        //public Task<List<RelatedModuleResponse>> GetSystemModules(Guid id, CancellationToken token = default);
        //Task RemoveModule(Guid id, Guid ModuleId, CancellationToken token);
    }
}
