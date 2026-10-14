namespace ITDepartmentSystem.Models
{
    public class ExternalApplication:Entity
    {
        //public int Id { set; get; }
        public string Name { set; get; }
        public List<ExternalAppUser> Users { get; set; }
    }
}
