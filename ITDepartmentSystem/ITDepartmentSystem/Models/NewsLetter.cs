namespace ITDepartmentSystem.Models
{
    public class NewsLetter:Entity
    {
        public string Text { set; get; } = default!;
        public DateTime EndDate { set; get; }
    }
}
