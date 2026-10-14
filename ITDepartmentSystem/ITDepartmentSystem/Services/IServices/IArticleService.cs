using ITDepartmentSystem.General;

namespace ITDepartmentSystem.Services.IServices
{
    public interface IArticleService
    {
        Task<Guid> CreateArticle(CreateArticleRequest request,CancellationToken token=default);
        Task AddBlock(Guid articleId, AddArticleBlockRequest request, CancellationToken token = default);
        Task RemoveBlock(Guid blockId, CancellationToken token = default);

        Task<PaginatedResponse<ArticleSummaryResponse>> GetAllArticles(FilterArticleSummaryRequest filter,CancellationToken token = default);
        Task<ArticleResponse> GetArticleById(Guid id, CancellationToken token = default);
        Task<List<userData>> GetAllSystemsAgents(CancellationToken token = default);

    }
}
