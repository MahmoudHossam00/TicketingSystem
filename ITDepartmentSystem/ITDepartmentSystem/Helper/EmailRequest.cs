namespace ITDepartmentSystem.Helper
{
    public class EmailRequest
    {
        public required string ToEmail { get; set; }
        public string? ToName { get; set; }

        public required string Subject { get; set; }
        public required string HtmlBody { get; set; }

        public List<string> To { set; get; } = [];
        public List<string> CC { set; get; } = [];

        public List<(byte[] Content, string FileName, string ContentType)> Attachments { get; set; } = new();
    }
}
