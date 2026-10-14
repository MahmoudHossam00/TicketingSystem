namespace ITDepartmentSystem.Requests.GeneralRequests
{
    public class StringDTO
    {
        public string Name { set; get; }
    }
    public class IssueStatusCreateRequest
    {
        public string Name { set; get; }
        public string Color { set; get; }
        public bool isFinished { set; get; }

    }
    public class IssueStatusResponse
    {
        public Guid id { set; get; }
        public string Name { set; get; }
        public string Color { set; get; }
        public bool isFinished { set; get; }

        public static IssueStatusResponse FromModel(IssueStatus status)
        {
            return new IssueStatusResponse()
            {
                id = status.Id,
                Color = status.Color,
                Name = status.StatusName,
                isFinished=status.isFinished
            };
        }
    }
}
