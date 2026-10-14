using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZenHrIntegrator.Models;
using ZenHrIntegrator.Responses;
using ZenHrIntegrator.Services.Interfaces;

namespace ZenHrIntegrator.Controllers
{
    [ApiController]
    [Route("api/zenhr/lookups")]
    public sealed class ZenHrLookupsController : ControllerBase
    {
        private readonly IZenHrLookupService _service;
        private readonly AppDbContext _context;

        public ZenHrLookupsController(IZenHrLookupService service,AppDbContext context)
        {
            _service = service;
            _context = context;
        }

        [HttpGet("professionaldata")]
        public async Task<IActionResult> ProfessionalData(CancellationToken ct)
        {
            var data = await _context.ZenHrEmployeeProfessionalData
                .AsNoTracking()
                .Include(x => x.Department)
                .Include(x => x.Position)
                .Include(x => x.WorkLocation)
                .Include(x => x.BusinessUnit)
                .Include(x => x.WorkType)
                .Include(x => x.Section)
                .Include(x => x.Division)
                .Select(x => new ProfessionalDatumDto
                {
                    Id = x.Id,
                    EmployeeId = x.EmployeeId,

                    DepartmentId = x.DepartmentId,
                    DepartmentName = x.Department != null ? x.Department.Name : null,

                    PositionId = x.PositionId,
                    PositionName = x.Position != null ? x.Position.Name : null,

                    WorkLocationId = x.WorkLocationId,
                    WorkLocationName = x.WorkLocation != null ? x.WorkLocation.Name : null,

                    BusinessUnitId = x.BusinessUnitId,
                    BusinessUnitName = x.BusinessUnit != null ? x.BusinessUnit.Name : null,

                    WorkTypeId = x.WorkTypeId,
                    WorkTypeName = x.WorkType != null ? x.WorkType.Name : null,

                    SectionId = x.SectionId,
                    SectionName = x.Section != null ? x.Section.Name : null,

                    DivisionId = x.DivisionId,
                    DivisionName = x.Division != null ? x.Division.Name : null,
                })
                .ToListAsync(ct);

            return Ok(data);
        }

        [HttpGet("departments")]
        public async Task<IActionResult> Departments(CancellationToken ct) =>
            Ok(await _service.GetDepartmentsAsync(ct));

        [HttpGet("positions")]
        public async Task<IActionResult> Positions(CancellationToken ct) =>
            Ok(await _service.GetPositionsAsync(ct));

        [HttpGet("worklocations")]
        public async Task<IActionResult> WorkLocations(CancellationToken ct) =>
            Ok(await _service.GetWorkLocationsAsync(ct));

        [HttpGet("businessunits")]
        public async Task<IActionResult> BusinessUnits(CancellationToken ct) =>
            Ok(await _service.GetBusinessUnitsAsync(ct));

        [HttpGet("worktypes")]
        public async Task<IActionResult> WorkTypes(CancellationToken ct) =>
            Ok(await _service.GetWorkTypesAsync(ct));

        [HttpGet("sections")]
        public async Task<IActionResult> Sections(CancellationToken ct) =>
            Ok(await _service.GetSectionsAsync(ct));

        [HttpGet("divisions")]
        public async Task<IActionResult> Divisions(CancellationToken ct) =>
            Ok(await _service.GetDivisionsAsync(ct));
    }
}
