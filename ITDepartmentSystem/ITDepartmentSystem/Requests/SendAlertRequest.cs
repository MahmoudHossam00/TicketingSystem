namespace ITDepartmentSystem.Requests
{
    public class SendAlertRequest
    {
        public string Text { set; get; }
        public DateTime EndDate { set; get; }
        public AlertType type { set; get; }
    }
    [Flags]
    public enum AlertType
    {
        Alert=1,
        Newsletter=2,
        //both
    }
}
