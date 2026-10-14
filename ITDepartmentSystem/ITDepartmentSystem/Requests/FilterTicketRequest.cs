namespace ITDepartmentSystem.Requests
{
    public class FilterTicketRequest
    {
        public Guid? SystemId { set; get; }
        public Guid? IssueStatusId { set; get; }
        public bool? OnlyMyTickets { set; get; } = null;
        public bool? OnlyNonAssignedTickets { set; get; } = null;
        public bool? GetMyOpenedTicketsOnly { set; get; } = null;
    }


    public class FilterTaskRequest
    {
        public Guid? SystemId { set; get; }
        public Guid? IssueStatusId { set; get; }
        public bool? OnlyAssignedTasks { set; get; } = null;
        public bool? OnlyResponsibleTasks { set; get; } = null;
        public int pagenum { set; get; } = 1;
        //public bool? OnlyNonAssignedTickets { set; get; } = null;
        //public bool? GetMyOpenedTasksOnly { set; get; } = null;
    }
}
