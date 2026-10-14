using System.ComponentModel.DataAnnotations;

namespace ZenHrIntegrator.Models
{
    public class deptTempTable
    {

        public int deptcode { set; get; }
        [Key]
        public string name { set; get; }
    }
}
