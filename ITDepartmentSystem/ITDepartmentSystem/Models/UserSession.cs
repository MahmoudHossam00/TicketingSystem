using ITDepartmentSystem.Models;
using System.ComponentModel.DataAnnotations.Schema;

namespace ITDepartmentSystem.Models
{
    public class UserSession
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        [ForeignKey("User")]
        public string UserId { get; set; }
        public AppUser User { get; set; } = default!;
        public string RefreshTokenHash { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }

        public DateTime? RevokedAt { get; set; }
        public string? ReplacedByTokenHash { get; set; }

        public DateTime? LastUsedAt { get; set; }
        public string? UserAgent { get; set; }
        public string? IpAddress { get; set; }

        public bool IsActive => RevokedAt == null && DateTime.Now < ExpiresAt;
    }
}
