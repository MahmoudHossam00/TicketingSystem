using ITDepartmentSystem.Enums;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Requests
{
    public class CreateProjectRequest
    {
        public IssuePriority? priority { set; get; }
        public string Description { set; get; }
        public List<IFormFile> Attachments { set; get; } = new List<IFormFile>();
        public Guid? CurrentStatusId { get; set; }
        public DateTime StartDate { set; get; }
        public DateTime EndDate { set; get; }
        public Guid SystemId { set; get; }


        public static async Task<Project> ToModel(CreateProjectRequest request)
        {
            Project entity = new()
            {
                Description = request.Description,
                priority = request.priority,
                

                Attachments = (await Task.WhenAll(
                   request.Attachments.Select(a => a.Save(new List<string>
                   {
                       //"Project"
                   }))
               )).ToList(),
               isClosed=false,
               SystemId = request.SystemId,
               StartDate = request.StartDate,
               FinishDate = null,
               CreationDate=DateTime.Now,
               
               EndDate = request.EndDate,
               CurrentStatusId = request.CurrentStatusId,
                //priority = request.priority,
                //priority = request.priority,
            };
            //entity.Attachments = (await Task.WhenAll(
            //       request.Attachments.Select(a => a.Save(new List<string> { "Project" }))
            //   )).ToList();
            return entity;
        }

        public class UpdateProjectRequest
        {

        }
    }

}
