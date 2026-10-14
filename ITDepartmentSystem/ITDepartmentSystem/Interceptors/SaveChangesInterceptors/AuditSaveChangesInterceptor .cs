using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Runtime.CompilerServices;
using System.Security.Claims;

public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ILogger<AuditSaveChangesInterceptor> _logger;
    private readonly IHttpContextAccessor _http;

    // per DbContext instance (interceptor is singleton usually) -> avoid memory leak
    private readonly ConditionalWeakTable<DbContext, List<AuditEntry>> _pending = new();

    public AuditSaveChangesInterceptor(ILogger<AuditSaveChangesInterceptor> logger, IHttpContextAccessor http)
    {
        _logger = logger;
        _http = http;
    }

    private string CurrentUser =>
        _http.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? _http.HttpContext?.User?.Identity?.Name
        ?? "System";

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context == null) return base.SavingChangesAsync(eventData, result, cancellationToken);

        var now = DateTime.UtcNow;
        var user = CurrentUser;

        var list = _pending.GetOrCreateValue(context);
        list.Clear(); // important in case same context does multiple SaveChanges

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted);

        foreach (var entry in entries)
        {
            var entityName = entry.Entity.GetType().Name;
            var state = entry.State;

            // set audit fields (use UTC)
            if (entry.Entity is Entity auditable)
            {
                if (state == EntityState.Added)
                {
                    auditable.CreatedAt = now;
                    auditable.CreatedBy = user;
                    auditable.LastUpdatedAt = null;
                    auditable.LastUpdateBy = null;
                }
                else if (state == EntityState.Modified)
                {
                    auditable.LastUpdatedAt = now;
                    auditable.LastUpdateBy = user;

                    entry.Property(nameof(Entity.CreatedAt)).IsModified = false;
                    entry.Property(nameof(Entity.CreatedBy)).IsModified = false;
                }
            }

            var audit = new AuditEntry
            {
                Entity = entityName,
                State = state,
                User = user,
                UtcTime = now,
                Data = state switch
                {
                    EntityState.Modified => entry.Properties
                        .Where(p => p.IsModified)
                        .Select(p => p.Metadata.Name)
                        .ToList(),

                    EntityState.Added => new { Key = GetEntityKey(entry, original: false) },
                    EntityState.Deleted => new { Key = GetEntityKey(entry, original: true) },

                    _ => null
                }
            };

            list.Add(audit);
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static object GetEntityKey(EntityEntry entry, bool original)
    {
        var pk = entry.Metadata.FindPrimaryKey();
        if (pk == null) return new { };

        // single key => return the value directly
        if (pk.Properties.Count == 1)
        {
            var name = pk.Properties[0].Name;
            return original ? entry.OriginalValues[name] : entry.CurrentValues[name];
        }

        // composite key => return name/value dictionary
        var dict = new Dictionary<string, object?>();
        foreach (var p in pk.Properties)
        {
            dict[p.Name] = original ? entry.OriginalValues[p.Name] : entry.CurrentValues[p.Name];
        }
        return dict;
    }
    public override ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData,
        int result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context != null && _pending.TryGetValue(context, out var list))
        {
            foreach (var a in list)
            {
                _logger.LogInformation("AUDIT SUCCESS {State} {Entity} {User} {Data}",
                 a.State, a.Entity, a.User, a.Data);
            }

            list.Clear();
        }

        return base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    public override Task SaveChangesFailedAsync(
        DbContextErrorEventData eventData,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context != null && _pending.TryGetValue(context, out var list))
        {
            foreach (var a in list)
            {
                _logger.LogWarning(eventData.Exception,
                    "AUDIT FAILED {State} {Entity} {User} {Data}",
                    a.State, a.Entity, a.User, a.Data);
            }

            list.Clear();
        }

        return base.SaveChangesFailedAsync(eventData, cancellationToken);
    }

    private sealed class AuditEntry
    {
        public string Entity { get; set; } = "";
        public EntityState State { get; set; }
        public string User { get; set; } = "";
        public DateTime UtcTime { get; set; }
        public object? Data { get; set; }
    }
}

