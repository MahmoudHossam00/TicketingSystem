namespace ZenHrIntegrator.Helper
{
    public sealed class ZenHrOAuthOptions
    {
        public string BasicAuth { get; set; } = string.Empty; // the base64 part only (no "Basic ")
    }
}
