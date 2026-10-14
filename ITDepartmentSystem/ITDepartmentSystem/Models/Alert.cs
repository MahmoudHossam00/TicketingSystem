namespace ITDepartmentSystem.Models
{
    public class Alert : Entity
    {
        public string Text { set; get; }
        public DateTime EndDate { set; get; }
        public List<AppUser> Hiders { set; get; }
        public List<AppUser> Viewers { set; get; }
    }
}
