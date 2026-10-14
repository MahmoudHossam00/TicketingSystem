namespace ITDepartmentSystem.Models
{
    public class ITSystem:Entity
    {
        public string Name { get; set; }
        public List<SystemAgent> Agents { set; get; }
        public List<RelatedModule> Modules { set; get; }
    }
}
