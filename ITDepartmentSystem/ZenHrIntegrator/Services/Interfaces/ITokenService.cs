using ZenHrIntegrator.Models;

namespace ZenHrIntegrator.Services.Interfaces
{
    public interface ITokenService
    {
        public Task<List<TokenModel>> GetTokens();
        public Task<TokenModel> GetActiveToken();
        public Task<TokenModel?> RefreshToken();
    }
}
