namespace ZenHrIntegrator.Models
{
    public class TokenModel
    {
        public int Id { set; get; }
        public required string Token { set; get; }  
        public required string RefreshToken { set; get; }
        public DateTime? DateTime { set; get; }
        public string? json { set; get; }
    }
}
