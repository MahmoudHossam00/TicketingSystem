using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ITDepartmentSystem.Token
{
    public class JwtTokenProvider(IConfiguration configuration, IOptionsMonitor<JWTConfiguration> configurations)
    {
        public TokenResponse GenerateJwtToken(GenerateTokenRequest request)
        {
            var jwtSettings = configurations.CurrentValue;

            var issuer = jwtSettings.Issuer;
            var audience = jwtSettings.Audience;
            var key = jwtSettings.SecretKey;

            // should be DateTime.UtcNow.AddMinutes(int.Parse(jwtSettings["TokenExpirationInMinutes"]!));
            // for testing purposes
            var expires = DateTime.Now.AddMinutes(jwtSettings.TokenExpirationInMinutes);

            var claims = new List<Claim>
        {
            new (JwtRegisteredClaimNames.Sub, request.Id!),
            new (JwtRegisteredClaimNames.Email, request.Email??"None"),
            //new (JwtRegisteredClaimNames.FamilyName, request.LastName!),
            new (JwtRegisteredClaimNames.Name, request.UserName!),
            new ("EmployeeNumber", request.EmployeeNumber.ToString()!),
            new ("EmployeeId", request.EmployeeId.ToString()!),
            new ("Picture", request.Picture??"Default"),
            new ("FirstLogin",request.firstLogin.ToString()),

            //new ("Department", request.Department.ToString()!),
        };

            foreach (var role in request.Roles)
            {
                claims.Add(new(ClaimTypes.Role, role));
            }

            foreach (var permission in request.Permissions)
                claims.Add(new("permission", permission));

            var descriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = expires,
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                    SecurityAlgorithms.HmacSha256Signature
                )
            };

            var tokenHandler = new JwtSecurityTokenHandler();

            var securityToken = tokenHandler.CreateToken(descriptor);

            return new TokenResponse
            {
                AccessToken = tokenHandler.WriteToken(securityToken),
                RefreshToken = GenerateRefreshToken(),
                Expires = expires
            };
        }
        public static string GenerateRefreshToken()
        {
            var randomBytes = new byte[64]; // 512 bits
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);

            return Convert.ToBase64String(randomBytes);
        }
        public static string GenerateRefreshToken(int bytes = 64)
        {
            var data = RandomNumberGenerator.GetBytes(bytes);
            return Convert.ToBase64String(data);
        }

        // Hash ثابت (SHA256) — ممكن تزود salt لو تحب
        public static string Sha256(string input)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes); // طول 64 hex
        }
    }
}
