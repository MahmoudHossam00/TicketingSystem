using DocumentFormat.OpenXml.InkML;
using DocumentFormat.OpenXml.Spreadsheet;
using ITDepartmentSystem.General;
using System.Security.Claims;

namespace ITDepartmentSystem.Services
{
    public class ArticleService (
        IGenericRepository<Article> repo,
        IGenericRepository<SystemAgent> systemagentsrepo,
        INotEntityGenericRepository<ArticleBlock> articleblocksrepo,
        IHttpContextAccessor httpContextAccessor
        ) : IArticleService
    {
        private ClaimsPrincipal User =>
        httpContextAccessor.HttpContext?.User
        ?? throw new BusinessRuleException("Unauthorized", StatusCodes.Status401Unauthorized);
        private string GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub"); // JWT fallback

            if (id == null)
                throw new BusinessRuleException("User ID not found in token", StatusCodes.Status401Unauthorized);

            return id;
        }

        public async Task<List<userData>> GetAllSystemsAgents(CancellationToken token = default)
        {
            var users = await ((await systemagentsrepo.GetAllAsync(token)).Include(s => s.Agent).Select(a => new userData(a.AgentId, a.Agent.UserName??"Unknown") 
            ).ToListAsync(token));
            return users.DistinctBy(u=>u.userId).ToList();
        }
        public async Task AddBlock(Guid articleId, AddArticleBlockRequest request, CancellationToken token = default)
        {
            var article = await repo
                        .FirstOrDefaultWithIncludes(a => a.Id == articleId,a=>a.Include(a=>a.blocks),token);
                        

            if (article == null)
                throw new Exception("Article not found");
            if(article.AuthorId!=GetUserId())
            {
                throw new BusinessRuleException("only article author can edit",StatusCodes.Status404NotFound);
            }
            article.blocks ??= new();
            int order = request.Order ?? (article.blocks.Any()
                ? article.blocks.Max(b => b.Order) + 1
                : 0);

            var block = new ArticleBlock
            {
                Id = Guid.NewGuid(),
                ArticleId = articleId,
                type = request.Type,
                Content = request.Content,
                Order = order
            };
            article.blocks.Add(block);
            await repo.UpdateAsync(article);
            await repo.SaveChangesAsync(token);
        }

            public async Task<Guid> CreateArticle(CreateArticleRequest request, CancellationToken token = default)
            {
            var userid = GetUserId();
            if(!(await systemagentsrepo.AnyAsync(A=>A.SystemId==request.SystemId &&A.AgentId==userid)))
            {
                throw new BusinessRuleException("You have to be a system agent in order to add articles", StatusCodes.Status403Forbidden);
            }
            var article = new Article
                {
                    Id = Guid.NewGuid(),
                    Title = request.Title,
                    SystemId = request.SystemId,
                    AuthorId = userid, // or inject IUserContext,
                    
                };
                int maxordercount = 0;
                foreach (var block in request.Blocks)
                {
                    article.blocks ??= new();

                var newBlock = new ArticleBlock
                {
                    type = block.Type,
                    Content = block.Type == ArticleBlockType.Image
                ? block.file == null
                    ? throw new BusinessRuleException("image not sent", StatusCodes.Status400BadRequest)
                    : (await block.file.Save(new List<string>()))
                : block.Content ?? "",
                    Order = (block.Order ?? maxordercount++),
                    textFont = block.textFont,
                    textSize = block.textSize,
                    imageHeight = block.imageHeight,
                    imageWidth = block.imageWidth,
                    linkViewName = block.linkViewName,
                };

                if (block.ListItems != null && block.ListItems.Any())
                {
                    newBlock.ListItems = block.ListItems.Select(s => new TextListItem
                    {
                        Content = s.Content,

                        TextFont = s.TextFont,
                        TextSize = s.TextSize,
                        Block = newBlock // 🔥 دي أهم سطر
                    }).ToList();
                }

                article.blocks.Add(newBlock);
                maxordercount = maxordercount >= (block.Order??0) ? maxordercount : (block.Order??0);
                }
                
                await repo.AddAsync(article);

            try
            {
                await repo.SaveChangesAsync(token);

            }
            catch(Exception ex)
            {
                throw ex;
            }

                return article.Id;
            }

        public async Task<PaginatedResponse<ArticleSummaryResponse>> GetAllArticles(FilterArticleSummaryRequest filter,CancellationToken token = default)
        {
            var articles = (await repo.GetAllAsync(token));
            if(filter.AuthorId!=null)
            {
                articles = articles.Where(a => a.AuthorId == filter.AuthorId);
            }
            if(filter.systemId!=null)
            {
                articles = articles.Where(a => a.SystemId == filter.systemId);
            }
            if(!string.IsNullOrWhiteSpace(filter.title))
            {
                articles = articles.Where(a => a.Title.Contains(filter.title));
            }
            var count = articles.Count();
            var data = articles.Skip((filter.Pagenumber - 1) * 50)
                                .Take(50).Select(ArticleSummaryResponse.FromModel).ToList();
            PaginatedResponse<ArticleSummaryResponse> ret = new PaginatedResponse<ArticleSummaryResponse>()
            {
                PageSize = 50,
                TotalRecords = count,
                Page = filter.Pagenumber,
                Data = data,
                FilteredCount = data.Count()
            };
            return ret;
        }

        public async Task<ArticleResponse> GetArticleById(Guid id, CancellationToken token = default)
        {
            var article = await repo
        .FirstOrDefaultWithIncludes(a => a.Id == id,r=>r.Include(r=>r.blocks).ThenInclude(r=>r.ListItems));

            if (article == null)
                throw new Exception("Article not found");
            article.blocks ??= new();
            return new ArticleResponse
            {
                Id = article.Id,
                Title = article.Title,
                Blocks = article.blocks
                    .OrderBy(b => b.Order)
                    .Select(b => new ArticleBlockDto
                    {
                        Id = b.Id,
                        Type = b.type,
                        Content = b.Content,
                        Order = b.Order,
                        imageHeight = b.imageHeight,
                        imageWidth = b.imageWidth,
                        linkViewName= b.linkViewName,
                        textFont = b.textFont,
                        textSize = b.textSize,
                        ListItems = b.ListItems.Select(l => new TextListItemDTO()
                        {
                            Content=l.Content,
                            TextFont=l.TextFont,
                            TextSize=l.TextSize
                        }).ToList()
                    })
                    .ToList()
            };
        }

        public async Task RemoveBlock(Guid blockId, CancellationToken token = default)
        {
            var block = await (await articleblocksrepo
        .Where(b => b.Id == blockId, token)).FirstOrDefaultAsync(token);

            if (block == null)
                throw new Exception("Block not found");

            await articleblocksrepo.DeleteAsync(block,token);
            await articleblocksrepo.SaveChangesAsync(token);
        }
    }
}
