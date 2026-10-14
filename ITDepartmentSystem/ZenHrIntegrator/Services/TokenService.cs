using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using ZenHrIntegrator.Helper;
using ZenHrIntegrator.Models;
using ZenHrIntegrator.Responses;
using ZenHrIntegrator.Services.Interfaces;

namespace ZenHrIntegrator.Services
{
    public class TokenService: ITokenService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TokenService> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ZenHrOAuthOptions _opts;

        public TokenService(
            AppDbContext context,
            ILogger<TokenService> logger,
            IHttpClientFactory httpClientFactory,
            IOptions<ZenHrOAuthOptions> opts)
        {
            _context = context;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            _opts = opts.Value;
        }
        public async Task<List<TokenModel>> GetTokens()
        {
            return await _context.Tokens
                .OrderByDescending(t => t.DateTime)
                .ToListAsync();
        }
        public async Task<TokenModel> GetActiveToken()
        {
            var token = await _context.Tokens
                .OrderByDescending(t => t.DateTime)
                .FirstOrDefaultAsync();
            if(token==null)
            {
                throw new Exception();
            }
            if(token.DateTime<(DateTime.Now.AddMinutes(-50)))
            {
               await RefreshToken();
               return await GetActiveToken();
            }
            return token;
        }

        public async Task<TokenModel?> RefreshToken()
        {
            var token = await _context.Tokens
                .OrderByDescending(t => t.DateTime)
                .FirstOrDefaultAsync();

            if (token is null)
            {
                _logger.LogWarning("No tokens found in database. Cannot refresh.");
                throw new Exception();
            }

            if (string.IsNullOrWhiteSpace(token.RefreshToken))
            {
                _logger.LogWarning("Latest token has no refresh_token. Cannot refresh.");
                throw new Exception();
            }


            var client = _httpClientFactory.CreateClient("ZenHrOAuth");

            var payload = new
            {
                refresh_token = token.RefreshToken,
                grant_type = "refresh_token"
            };

            var request = new HttpRequestMessage(HttpMethod.Post, "oauth/token")
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8,
                    "application/json"
                )
            };

            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", _opts.BasicAuth);

            



            // 3) Send
            var response = await client.SendAsync(request);

            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("ZenHR token refresh failed. Status: {Status}. Body: {Body}",
                    (int)response.StatusCode,
                    responseBody);

                throw new Exception();
            }




            // 4) Deserialize
            ZenHrTokenResponse? dto;
            try
            {
                dto = JsonSerializer.Deserialize<ZenHrTokenResponse>(
                    responseBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deserialize ZenHR token response. Body: {Body}", responseBody);
                throw new Exception();
            }

            if (dto is null || string.IsNullOrWhiteSpace(dto.AccessToken))
            {
                _logger.LogError("ZenHR token response is empty/invalid. Body: {Body}", responseBody);
                throw new Exception();
            }

            // 5) Save new token record (recommended: keep history)
            var newToken = new TokenModel
            {
                Token = dto.AccessToken,
                RefreshToken = dto.RefreshToken ?? token.RefreshToken, // fallback if API doesn't return it
                json= responseBody,
                DateTime = DateTime.Now
            };

            _context.Tokens.Add(newToken);
            await _context.SaveChangesAsync();

            return newToken;
        }
    }
}
