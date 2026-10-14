using Microsoft.EntityFrameworkCore;
using ZenHrIntegrator.Models;
using ZenHrIntegrator.Responses;
using ZenHrIntegrator.Services.Interfaces;

namespace ZenHrIntegrator.Services
{
    public sealed class ZenHrLookupService : IZenHrLookupService
    {
        private readonly AppDbContext _context;

        public ZenHrLookupService(AppDbContext context)
        {
            _context = context;
        }

        public Task<List<MasterDto>> GetDepartmentsAsync(CancellationToken ct = default) =>
            _context.ZenHrDepartments.AsNoTracking()
                .OrderBy(x => x.Name).Select(x => new MasterDto { Id = x.Id, Name = x.Name })
                .ToListAsync(ct);

            public Task<List<MasterDto>> GetPositionsAsync(CancellationToken ct = default) =>
                _context.ZenHrPositions.AsNoTracking()
                    .OrderBy(x => x.Name).Select(x => new MasterDto { Id = x.Id, Name = x.Name })
                    .ToListAsync(ct);

            public Task<List<MasterDto>> GetWorkLocationsAsync(CancellationToken ct = default) =>
                _context.ZenHrWorkLocations.AsNoTracking()
                    .OrderBy(x => x.Name).Select(x => new MasterDto { Id = x.Id, Name = x.Name })
                    .ToListAsync(ct);

            public Task<List<MasterDto>> GetBusinessUnitsAsync(CancellationToken ct = default) =>
                _context.ZenHrBusinessUnits.AsNoTracking()
                    .OrderBy(x => x.Name).Select(x => new MasterDto { Id = x.Id, Name = x.Name })
                    .ToListAsync(ct);

            public Task<List<MasterDto>> GetWorkTypesAsync(CancellationToken ct = default) =>
                _context.ZenHrWorkTypes.AsNoTracking()
                    .OrderBy(x => x.Name).Select(x => new MasterDto { Id = x.Id, Name = x.Name })
                    .ToListAsync(ct);

            public Task<List<MasterDto>> GetSectionsAsync(CancellationToken ct = default) =>
                _context.ZenHrSections.AsNoTracking()
                    .OrderBy(x => x.Name).Select(x => new MasterDto { Id = x.Id, Name = x.Name })
                    .ToListAsync(ct);

            public Task<List<MasterDto>> GetDivisionsAsync(CancellationToken ct = default) =>
                _context.ZenHrDivisions.AsNoTracking()
                    .OrderBy(x => x.Name).Select(x => new MasterDto { Id = x.Id, Name = x.Name })
                    .ToListAsync(ct);
    }
}
