using ITDepartmentSystem.Clients;
using Microsoft.Extensions.Caching.Hybrid;

namespace ITDepartmentSystem.Services
{
    public class EmployeeSyncService(
    AppDbContext db,
    EmployeeDirectoryClient client,
    HybridCache cache,
    ILogger<EmployeeSyncService> logger)
    {
        private const string SinceKey = "EmployeeSync:LastSince";

        public async Task SyncAsync(CancellationToken ct = default)
        {
            var since = await GetSince(ct);
            since = DateTime.UtcNow.AddYears(-10);
            logger.LogInformation("Employee sync started. Since: {since}", since);

            // Pull changes (incremental)
            var changes = (await client.GetChanges(since, ct)).Where(c=>c.BranchId==18908).ToList();

            if (changes.Count == 0)
            {
                logger.LogInformation("Employee sync: no changes.");
                await SetSince(DateTime.UtcNow, ct); // اختياري
                return;
            }

            var now = DateTime.UtcNow;

            // Load existing ids to upsert efficiently
            var ids = changes.Select(x => x.Id).ToList();

            var empNumbers = changes
            .Select(x => x.EmploymentNumber)
            .ToHashSet();
            var existingByEmpNumber = await db.Employees
            .Where(e => empNumbers.Contains(e.EmployeeNumber))
            .ToDictionaryAsync(e => e.EmployeeNumber, ct);
            var existing = await db.Employees.Where(e => ids.Contains(e.ZenId)).ToDictionaryAsync(e => e.ZenId, ct);

            foreach (var dto in changes)
            {
                if (!existing.TryGetValue(dto.Id, out var row))
                {
                    row = new EmployeeCache { ZenId = dto.Id };
                    db.Employees.Add(row);
                }
                if (existingByEmpNumber.TryGetValue(dto.EmploymentNumber!.Value, out var conflict))
                {
                    if (conflict.ZenId != dto.Id)
                        throw new Exception($"Duplicate EmployeeNumber: {dto.EmploymentNumber!.Value}");
                }
                row.EmployeeNumber = dto.EmploymentNumber.Value;
                row.NameEn = dto.NameEn;
                row.NameAr = dto.NameAr;
                row.Email = dto.Email;
                row.Active = dto.Active;

                row.BranchId = dto.BranchId;

                row.DepartmentId = dto.DepartmentId;
                row.DepartmentName = dto.DepartmentName;

                row.PositionId = dto.PositionId;
                row.PositionName = dto.PositionName;

                row.BusinessUnitId = dto.BusinessUnitId;
                row.BusinessUnitName = dto.BusinessUnitName;

                row.WorkLocationId = dto.WorkLocationId;
                row.WorkLocationName = dto.WorkLocationName;

                row.WorkTypeId = dto.WorkTypeId;
                row.WorkTypeName = dto.WorkTypeName;

                // SourceUpdatedAt: هنا محتاجين مصدر timestamp من الـ directory
                // لو مش مرجّعه حالياً في DTO، هنحلها في Step 1.3 تحت.
                row.SourceUpdatedAt = now; // مؤقت
                row.SyncedAt = now;
                row.Birthdate= dto.Birthdate;
                row.MobileNumber = dto.MobileNumber;
                row.HiringDate = dto.HiringDate;
                row.FixingDate = dto.FixingDate;
                row.TerminationDate = dto.TerminationDate;
                row.Gender = dto.Gender;
                row.MaritalStatus = dto.MaritalStatus;
                row.PersonalEmail = dto.PersonalEmail;
                      
            }

            var incomingDepartments = changes
                .Where(x => x.DepartmentId.HasValue)
                .GroupBy(x => x.DepartmentId!.Value)
                .Select(g => new
                {
                    Id = g.Key,
                    Name = g.Select(x => x.DepartmentName).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n))
                })
                .ToList();

            // load existing departments from DB
            var incomingDepartmentIds = incomingDepartments
                .Select(x => x.Id)
                .ToList();

            var existingDepartmentIds = 
                await db.Departments
                .Where(d => incomingDepartmentIds.Contains(d.DepartmentId))
                .Select(d => d.DepartmentId)
                .ToListAsync(ct);

            var existingDepartmentIdSet = existingDepartmentIds.ToHashSet();

            // add only missing departments
            var newDepartments = incomingDepartments
                .Where(x => !existingDepartmentIdSet.Contains(x.Id))
                .Select(x => new Department
                {
                    DepartmentId = x.Id,
                    DepartmentName = x.Name
                })
                .ToList();

            if (newDepartments.Any())
            {
                db.Departments.AddRange(newDepartments);
            }
            try
            {

            await db.SaveChangesAsync(ct);
            }
            catch(Exception ex)
            {
                throw ex;
            }
            await cache.RemoveAsync("Employees");

            // Advance since (الأفضل آخر updatedAt جايلك من المصدر)
            await SetSince(now, ct);

            logger.LogInformation("Employee sync done. Upserted: {count}", changes.Count);
        }

        private async Task<DateTime> GetSince(CancellationToken ct)
        {
            var s = await db.AppSettings.AsNoTracking().FirstOrDefaultAsync(x => x.Key == SinceKey, ct);
            if (s == null) return DateTime.UtcNow.AddYears(-10); // first run
            return DateTime.Parse(s.Value).ToUniversalTime();
        }

        private async Task SetSince(DateTime value, CancellationToken ct)
        {
            var row = await db.AppSettings.FirstOrDefaultAsync(x => x.Key == SinceKey, ct);
            if (row == null)
                db.AppSettings.Add(new AppSetting { Key = SinceKey, Value = value.ToString("O") });
            else
                row.Value = value.ToString("O");

            await db.SaveChangesAsync(ct);
        }
    }
}
