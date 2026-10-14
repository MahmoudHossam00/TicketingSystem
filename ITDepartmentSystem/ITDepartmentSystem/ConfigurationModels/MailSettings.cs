namespace ITDepartmentSystem.ConfigurationModels
{
    public class MailSettings
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string DisplayName { get; set; } = "FPI Exporting System";
        public string Host { get; set; } = "";
        public int Port { get; set; } = 465;
        public bool UseSsl { get; set; } = true;
    }
}
