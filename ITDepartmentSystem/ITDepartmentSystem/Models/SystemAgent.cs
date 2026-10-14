using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class SystemAgent:Entity
    {
        [ForeignKey("Agent")]
        public string AgentId { set; get; }
        public AppUser Agent { set; get; }
        [ForeignKey("System")]
        public Guid SystemId { set; get; }
        public ITSystem System { set; get; }
    }
}
