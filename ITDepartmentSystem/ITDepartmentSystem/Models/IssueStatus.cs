using System.Drawing;

namespace ITDepartmentSystem.Models
{
    public class IssueStatus : Entity
    {
        public string StatusName { set; get; }
        public string Color { get; set; } = "#3B82F6";
        public bool isFinished { set; get; } = false;
    }
}
