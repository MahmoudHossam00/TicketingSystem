namespace  ITDepartmentSystem.ConfigurationModels
{
    public class JWTConfiguration
    {
            public string Issuer { get; set; }
            public string Audience { get; set; }
            public int TokenExpirationInMinutes { get; set; }
            public int RefreshMinutes { get; set; }
            public string SecretKey { get; set; }

    }
}
