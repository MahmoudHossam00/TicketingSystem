namespace ITDepartmentSystem.Requests
{
    public class CreateArticleRequest
    {
        public string Title { get; set; }
        public Guid SystemId { get; set; }

        public List<AddArticleBlockRequest> Blocks { set; get; }
    }

    public class AddArticleBlockRequest
    {
        public ArticleBlockType Type { get; set; }
        public string? Content { get; set; }
        public IFormFile? file { get; set; }
        public int? Order { get; set; } // optional
        public string? linkViewName { set; get; }
        public string? imageHeight { set; get; }
        public string? imageWidth { set; get; }
        public string? textFont { set; get; }
        public string? textSize { set; get; }
        public List<TextListItemDTO>? ListItems { set; get; }
    }
    public class FilterArticleSummaryRequest
    {
        //public Guid Id { get; set; }
        public string? AuthorId { get; set; }
        public Guid? systemId { set; get; }
        public string? title { set; get; }
        public int Pagenumber { set; get; }
        
    }
    public class ArticleSummaryResponse
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string AuthorId { set; get; }
        public string AuthorName { set; get; }
        public static ArticleSummaryResponse FromModel(Article article)
        {
            return new ArticleSummaryResponse()
            {
                Title = article.Title,
                Id = article.Id,
                AuthorId = article.AuthorId,
                AuthorName = article.Author?.UserName ??"Not known"
            };
        }
    }
    public class ArticleResponse
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public Guid systemId { set; get; }
        public string AuthorId { set; get; }
        public string AuthorName { set; get; }
        public List<ArticleBlockDto> Blocks { get; set; }
        public static ArticleResponse FromModel(Article article)
        {
            return new ArticleResponse()
            {
                Title = article.Title,
                Id = article.Id,
                AuthorId = article.AuthorId,
                AuthorName = article.Author?.UserName ?? "Not known",
                systemId=article.SystemId,
                Blocks=article.blocks.Select(ArticleBlockDto.FromModel).ToList()
            };
        }

    }
    public class ArticleBlockDto
    {
        public Guid Id { get; set; }
        public ArticleBlockType Type { get; set; }
        public string Content { get; set; }
        public int Order { get; set; }
        public string? linkViewName { set; get; }
        public string? imageHeight { set; get; }
        public string? imageWidth { set; get; }
        public string? textFont { set; get; }
        public string? textSize { set; get; }
        public List<TextListItemDTO>? ListItems { set; get; } 

        public static ArticleBlockDto FromModel(ArticleBlock article)
        {
            return new ArticleBlockDto()
            {
                Id = article.Id,
                Content = article.Content,
                Type = article.type,
                Order = article.Order,
                ListItems = article.ListItems == null ? null: article.ListItems.Select(s => new TextListItemDTO()
                {
                    Content = s.Content,
                    TextFont = s.TextFont,
                    TextSize = s.TextSize
                }).ToList()
            };
        }
    }
}
