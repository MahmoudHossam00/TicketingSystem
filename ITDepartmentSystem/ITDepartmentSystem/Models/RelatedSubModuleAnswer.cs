using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class RelatedSubModuleAnswer : Entity
    {
        public Guid RelatedSubModuleId { set; get; }
        public RelatedSubModule RelatedSubModule { set; get; }
        public List<QuestionAnswer> Answers { get; set; } = new();
        
        [InverseProperty("RelatedSubModuleAnswer")]
        public  Ticket? Ticket { set; get; }
        [ForeignKey("TicketHistory")]
        public Guid? TicketHistoryId { set; get; }
        [InverseProperty("AnswerHistory")]
        public  Ticket? TicketHistory { set; get; }

    }
    public class RelatedSubModuleAnswerResponse : EntityResponse
    {
        public Guid RelatedSubModuleId { set; get; }
        public RelatedSubModuleResponse RelatedSubModule { set; get; }
        public Guid ModuleId { set; get; }
        public string ModuleName { set; get; }
        public Guid SystemId { set; get; }
        public string SystemName { set; get; }
        public List<AnswerResponse> Answers { get; set; } = new();
        public static RelatedSubModuleAnswerResponse FromModel(RelatedSubModuleAnswer answer)
        {
            RelatedSubModuleAnswerResponse response = new RelatedSubModuleAnswerResponse()
            {
                RelatedSubModuleId = answer.Id,
                RelatedSubModule = RelatedSubModuleResponse.FromModel(answer.RelatedSubModule),
                ModuleId = answer.RelatedSubModule.ModuleId,
                ModuleName = answer.RelatedSubModule.Module.Name,
                SystemId = answer.RelatedSubModule.Module.System.Id,
                SystemName = answer.RelatedSubModule.Module.System.Name,
                Answers=answer.Answers.Select(AnswerResponse.FromModel).ToList()
            };
            return response;
        }
    }
}
