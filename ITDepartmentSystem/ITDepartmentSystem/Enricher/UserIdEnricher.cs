using Serilog.Core;
using Serilog.Events;
using System.Security.Claims;

namespace ITDepartmentSystem.Enricher
{
    public sealed class UserIdEnricher : ILogEventEnricher
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public UserIdEnricher(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
        {
            var userId =
                _httpContextAccessor.HttpContext?
                    .User?
                    .FindFirst(ClaimTypes.NameIdentifier)?
                    .Value;

            if (!string.IsNullOrEmpty(userId))
            {
                logEvent.AddPropertyIfAbsent(
                    propertyFactory.CreateProperty("UserId", userId));
            }
            var userName =
                _httpContextAccessor.HttpContext?
                    .User?
                    .FindFirst(ClaimTypes.Name)?
                    .Value;

            if (!string.IsNullOrEmpty(userName))
            {
                logEvent.AddPropertyIfAbsent(
                    propertyFactory.CreateProperty("userName", userName));
            }
            var forwardedFor = _httpContextAccessor.HttpContext?
            .Request?
            .Headers["X-Forwarded-For"]
            .FirstOrDefault();

            var ip =
                forwardedFor?.Split(',').FirstOrDefault()?.Trim()
                ?? _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

            if (!string.IsNullOrWhiteSpace(ip))
            {
                logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("ipAddress", ip));
            }

        }

    }
}
