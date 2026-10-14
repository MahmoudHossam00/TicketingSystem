namespace ITDepartmentSystem.Responses
{
    public sealed record BasicUserDataResponse(string userId, string userName, string EmployeeName, int EmployeeNumber);
    public sealed record FilterDataRequest(string? filter=null, int page=0, List<int>? departmentIDS = null);

}
