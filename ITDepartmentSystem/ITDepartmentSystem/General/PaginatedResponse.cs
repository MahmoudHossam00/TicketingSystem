namespace ITDepartmentSystem.General
{
    public class PaginatedResponse<T>
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        //public int TotalPages { get; set; }
        public int TotalRecords { get; set; }
        public int FilteredCount { set; get; }
        public List<T> Data { get; set; }



    }
}
