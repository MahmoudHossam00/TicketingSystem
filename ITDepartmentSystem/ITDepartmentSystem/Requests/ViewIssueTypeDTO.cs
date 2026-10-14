namespace ITDepartmentSystem.Requests
{
    public class ViewIssueTypeDTO : EntityResponse
    {
        public string IssueTypeName { set; get; }

        public static ViewIssueTypeDTO FromModel(IssueType system)
        {
            var sys = new ViewIssueTypeDTO()
            {
                IssueTypeName = system.IssueTypeName,
            };
            MapBase(system, sys);
            return sys;
        }
    }
}
