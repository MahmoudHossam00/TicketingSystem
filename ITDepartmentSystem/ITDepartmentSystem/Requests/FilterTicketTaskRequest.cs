namespace ITDepartmentSystem.Requests
{
    public class FilterTicketTaskRequest
    {
        public List<string>? userIds { set; get; }
        public List<Guid>? systemIds { set; get; }
        public bool? hasKpi { set; get; }
        public int page { set; get; }
    }
}
