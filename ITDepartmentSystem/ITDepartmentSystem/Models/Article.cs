using Org.BouncyCastle.Bcpg.OpenPgp;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class Article:Entity
    {
        [ForeignKey("Author")]
        public string AuthorId { set; get; }
        public AppUser? Author { set; get; }
        [ForeignKey("System")]
        public Guid SystemId { set; get; }
        public ITSystem? System { set; get; }

        public List<ArticleBlock> blocks { set; get; } = new List<ArticleBlock>();
        public string Title { set; get; } = default!;
    }
    public class ArticleBlock
    {
        public Guid Id { set; get; }
        public ArticleBlockType type { set; get; }
        [ForeignKey("Article")]
        public Guid ArticleId { set; get; }
        public Article Article { set; get; }
        public string Content { set; get; }
        public int Order { get; set; }
        public string? linkViewName { set; get; }
        public string? imageHeight { set; get; }
        public string? imageWidth { set; get; }
        public string? textFont { set; get; }
        public string? textSize { set; get; }
        public List<TextListItem>? ListItems { set; get; } = new();

    }


    public enum ArticleBlockType
    {
        Text,
        Image,
        Link,
        List
    }
    public class TextListItem
    {
        public Guid Id { set; get; }
        public Guid BlockId { set; get; }
        public ArticleBlock Block { set; get; }
        public string Content { set; get; }
        public string TextFont { set; get; }
        public string TextSize { set; get; }
    }
    public class TextListItemDTO
    {
        //public Guid Id { set; get; }
        public string Content { set; get; }
        public string TextFont { set; get; }
        public string TextSize { set; get; }
    }
}
