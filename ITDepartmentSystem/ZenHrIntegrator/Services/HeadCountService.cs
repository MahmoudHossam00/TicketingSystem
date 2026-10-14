using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;
using ZenHrIntegrator.JSONRESPONSES;
using ZenHrIntegrator.Migrations;
using ZenHrIntegrator.Models;
using ZenHrIntegrator.Services.Interfaces;

namespace ZenHrIntegrator.Services
{
    public class HeadCountService(IHttpClientFactory _httpClientFactory,ILogger<TokenService> _logger, ITokenService tokenservice, AppDbContext _context) : IHeadCountService
    {

        static readonly JsonSerializerOptions ZenHrJsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };
        //[HttpGet("get")]
        //public async Task<IActionResult> Get()
        //{
        //    var httpclient = _httpClientFactory.CreateClient();
        //    var url = "https://app.zenhr.com/api/v3/branches";
        //    var token = "eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwcC56ZW5oci5jb20iLCJhcHAiOiJDUk0gQVBJIEludGVncmF0aW9uIiwiYXBwX2lkIjoyMjcsImlhdCI6MTc2ODk4NTkzMiwiYXVkIjoibi1XTEZObXRidEY5SEVDM0l5VHRVZFAwWVUxczZKOUpRbDhfVVZaeEtmTSIsImp0aSI6IjNlNTFhYThmLWRlMWYtNGE1Mi1hODM1LTFkNWY3N2I1YTJjZSIsInN1YiI6NjUyODE4LCJzY29wZXMiOlsicmVhZDpicmFuY2giLCJyZWFkOmVtcGxveWVlIiwicmVhZDpwcm9mZXNzaW9uYWxfaW5mbyIsInJlYWQ6dGltZW9mZl90cmFuc2FjdGlvbiIsInJlYWQ6dGltZW9mZl90cmFuc2FjdGlvbl9yZXF1ZXN0IiwicmVhZDp0aW1lb2ZmIl0sInJlc291cmNlIjp7InR5cGUiOiJDb21wYW55IiwiaWQiOjEyOTg0fSwicHJvcHMiOnsiYWNjZXNzZWRfYnJhbmNoZXNfaWRzIjpbXSwiY29tcGFueV9pZCI6MTI5ODQsImJyYW5jaF9pZCI6bnVsbCwidXNlcl9pZCI6bnVsbCwiZW1wbG95ZWVfaWQiOm51bGwsIm5hbWUiOiJGUEkgR3JvdXAiLCJlbWFpbCI6bnVsbCwiY29uZmlybWVkX2F0IjpudWxsLCJ1bmxvY2tfdG9rZW4iOm51bGwsImFjdGl2ZSI6dHJ1ZSwiZGV2aWNlX2lkIjpudWxsLCJob21lX2NvdW50cnkiOm51bGx9LCJleHAiOjE3Njg5ODk1MzJ9.ZVL9g_opQhdAKOikO6N5iZIqgtpYOUzAnVqfYBY3PoLNDtEKWwSYtOOUXkdTF9gtNUAOd_EMWU53ie6m8PnWl39d4ZWjbd47OAIZwbKOwBTNZCKb93VDDH1QXv_DtJqGTr8Ncj-bqiMgjP9w5PBM2QMhdU9FHQSJCyir_D6JFdD1MtQ92F0c2sBwtotd-scIW5u636GXOKfOIxstgK_73adunP5MAn5k0vhn0uHoI8xcA5ME_3KnS1U3F9kPxv2eK3rWa01TzV7I1trZ3NnTsrJcEJnxnZimJPMsXnmh7MbFDLUYBZ_P74RHE3qmaZjzg_vKizo60oGU6wcDNFGvhg"; // full token

        //    using var request = new HttpRequestMessage(HttpMethod.Get, url);

        //    // EXACT headers
        //    request.Headers.TryAddWithoutValidation("Accept", "application/json");
        //    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");




        //    var response = await httpclient.SendAsync(request);
        //    var responsebody = await response.Content.ReadAsStringAsync();
        //    using var jsonDoc = JsonDocument.Parse(responsebody);

        //    var ids = new List<int>();

        //    foreach (var item in jsonDoc.RootElement.GetProperty("data").EnumerateArray())
        //    {
        //        ids.Add(item.GetProperty("id").GetInt32());
        //    }

        //    //Dictionary<int, List<int>> branchemployeedictionary = new();
        //    var employeeList = new List<EmployeeInfo>(); // List to hold the employee info

        //    foreach (var id in ids)
        //    {
        //        int page = 1;
        //        int totalnumberofpages = 1;
        //        while (page <= totalnumberofpages)
        //        {
        //            var url2 = $"https://app.zenhr.com/api/v3/branches/{id}/employees?limit=25&page={page++}&include[]=employee.professional_datum";
        //            using var request2 = new HttpRequestMessage(HttpMethod.Get, url2);

        //            // EXACT headers
        //            request2.Headers.TryAddWithoutValidation("Accept", "application/json");
        //            request2.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");
        //            response = await httpclient.SendAsync(request2);
        //            responsebody = await response.Content.ReadAsStringAsync();
        //            using var jsonDoc2 = JsonDocument.Parse(responsebody);
        //            totalnumberofpages = jsonDoc2.RootElement.GetProperty("pagination").GetProperty("total_pages").GetInt32();


        //            foreach (var item in jsonDoc2.RootElement.GetProperty("data").EnumerateArray())
        //            {
        //                var employee = new EmployeeInfo();

        //                employee.EnglishName = item.GetProperty("user").GetProperty("name").GetProperty("en").GetProperty("first_name").GetString() + " " +
        //                    item.GetProperty("user").GetProperty("name").GetProperty("en").GetProperty("second_name").GetString() + " " +
        //                    item.GetProperty("user").GetProperty("name").GetProperty("en").GetProperty("third_name").GetString() + " " +
        //                item.GetProperty("user").GetProperty("name").GetProperty("en").GetProperty("last_name").GetString();

        //                employee.ArabicName = item.GetProperty("user").GetProperty("name").GetProperty("ar").GetProperty("first_name").GetString() + " " +
        //                    item.GetProperty("user").GetProperty("name").GetProperty("ar").GetProperty("second_name").GetString() + " " +
        //                    item.GetProperty("user").GetProperty("name").GetProperty("ar").GetProperty("third_name").GetString() + " " +
        //                item.GetProperty("user").GetProperty("name").GetProperty("ar").GetProperty("last_name").GetString();

        //                employee.EmploymentNumber = item.GetProperty("employment_number").GetString();
        //                employee.Branch_Id = item.GetProperty("branch").GetProperty("id").GetInt32();
        //                employee.Active = item.GetProperty("active").GetBoolean();
        //                if (item.TryGetProperty("termination_date", out var terminationDateElement) && terminationDateElement.ValueKind != JsonValueKind.Null)
        //                {
        //                    // Try to get the DateTime value from the element
        //                    if (terminationDateElement.TryGetDateTime(out var terminationDate))
        //                    {
        //                        employee.TerminationDate = terminationDate;
        //                    }
        //                    else
        //                    {
        //                        // If the date could not be parsed, handle appropriately, maybe log it
        //                        employee.TerminationDate = null;
        //                    }
        //                }
        //                else
        //                {
        //                    // If the "termination_date" property doesn't exist or is null, handle it here
        //                    employee.TerminationDate = null;
        //                }
        //                try
        //                {
        //                    employee.DepartmentId = item.GetProperty("professional_datum").GetProperty("department").GetProperty("id").GetInt32();
        //                    employee.DepartmentName = item.GetProperty("professional_datum").GetProperty("department").GetProperty("name").GetString();
        //                    employee.Position = item.GetProperty("professional_datum").GetProperty("position").GetProperty("name").GetString();
        //                }
        //                catch (Exception ex)
        //                {
        //                    Console.WriteLine(item.ToString());
        //                    employee.DepartmentId = 0;
        //                    employee.DepartmentName = "No Department";
        //                    employee.Position = "None";
        //                }



        //                employeeList.Add(employee);
        //            }
        //        }
        //    }
        //    var x = employeeList.Count();
        //    return employeeList;
        //}

        public async Task<EmployeesDumpResult> tempgetbody()
        {
            var httpclient = _httpClientFactory.CreateClient();

            // 1) Get branches from DB
            var branchIds = await _context.ZenHrBranches
                .AsNoTracking()
                .OrderBy(b => b.Id)
                .Select(b => b.Id)
                .ToListAsync();

            // 2) Get latest token from DB (replace with your own method)
            var tokenmodel = await tokenservice.GetActiveToken();
            var token = tokenmodel.Token;
            if (string.IsNullOrWhiteSpace(token))
                throw new Exception();

            var dumps = new List<BranchEmployeesRawDump>();
            int totalPagesCount = 0;

            foreach (var branchId in branchIds)
            {
                int page = 1;
                int totalPages = 1;

                while (page <= totalPages)
                {
                    var url = $"https://app.zenhr.com/api/v3/branches/{branchId}/employees" +
                              $"?limit={1023}&page={page}&include[]=employee.professional_datum";

                    using var req = new HttpRequestMessage(HttpMethod.Get, url);
                    req.Headers.TryAddWithoutValidation("Accept", "application/json");
                    req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");

                    using var res = await httpclient.SendAsync(req);
                    var body = await res.Content.ReadAsStringAsync();

                    // لو حصل خطأ خليه واضح في الـ dump بدل ما البرنامج يقع
                    if (!res.IsSuccessStatusCode)
                    {
                        dumps.Add(new BranchEmployeesRawDump(
                            branchId, page, url,
                            $"{{\"error\":true,\"status\":{(int)res.StatusCode},\"body\":{JsonSerializer.Serialize(body)} }}"
                        ));
                        break;
                    }

                    dumps.Add(new BranchEmployeesRawDump(branchId, page, url, body));
                    totalPagesCount++;

                    // اقرأ total_pages مرة واحدة من نفس الـ body (Parsing بسيط)
                    try
                    {
                        using var doc = JsonDocument.Parse(body);
                        totalPages = doc.RootElement
                            .GetProperty("pagination")
                            .GetProperty("total_pages")
                            .GetInt32();
                    }
                    catch
                    {
                        // لو شكل الـ JSON مختلف، وقف عند الصفحة دي واعتبره dump كفاية
                        break;
                    }

                    page++;
                }
            }

            var result = new EmployeesDumpResult(
                TotalBranches: branchIds.Count,
                TotalPages: totalPagesCount,
                Pages: dumps
            );

            return result;
        }
        #region Employees
        public async Task<List<EmployeeFullDto>> GetAllEmployees()
        {
            return await _context.ZenHrEmployees
        .AsNoTracking()
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.Department)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.Position)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.WorkLocation)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.BusinessUnit)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.WorkType)
        .Select(e => new EmployeeFullDto
        {
            Id = e.Id,
            EmploymentNumber = e.EmploymentNumber,

            BranchId = e.BranchId,
            BranchName = _context.ZenHrBranches
                .Where(b => b.Id == e.BranchId)
                .Select(b => b.NameEn)
                .FirstOrDefault(),

            NameEn = e.NameEn,
            NameAr = e.NameAr,

            Email = e.Email,
            Username = e.Username,
            Active = e.Active,

            Birthdate = e.Birthdate,
            HiringDate = e.HiringDate,
            FixingDate = e.FixingDate,
            TerminationDate = e.TerminationDate,

            Gender = e.Gender,
            MaritalStatus = e.MaritalStatus,
            MobileNumber = e.MobileNumber,
            PersonalEmail = e.PersonalEmail,
            Religion = e.Religion,
            Citizen = e.Citizen,

            DepartmentId = e.ProfessionalDatum!.DepartmentId,
            DepartmentName = e.ProfessionalDatum!.Department!.Name,

            PositionId = e.ProfessionalDatum!.PositionId,
            PositionName = e.ProfessionalDatum!.Position!.Name,

            WorkLocationId = e.ProfessionalDatum!.WorkLocationId,
            WorkLocationName = e.ProfessionalDatum!.WorkLocation!.Name,

            BusinessUnitId = e.ProfessionalDatum!.BusinessUnitId,
            BusinessUnitName = e.ProfessionalDatum!.BusinessUnit!.Name,

            WorkTypeId = e.ProfessionalDatum!.WorkTypeId,
            WorkTypeName = e.ProfessionalDatum!.WorkType!.Name,

            CreatedAt=e.CreatedAt,
            UpdatedAt=e.UpdatedAt,
        })
        .ToListAsync();
        }

        public async Task<List<EmployeeFullDto>> GetAllChanges(DateTime since)
        {
            return await _context.ZenHrEmployees
        .AsNoTracking()
         .Where(e => (e.UpdatedAt ?? e.CreatedAt) != null)
            .Where(e => (e.UpdatedAt ?? e.CreatedAt) > since)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.Department)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.Position)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.WorkLocation)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.BusinessUnit)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.WorkType)
        .Select(e => new EmployeeFullDto
        {
            Id = e.Id,
            EmploymentNumber = e.EmploymentNumber,

            BranchId = e.BranchId,
            BranchName = _context.ZenHrBranches
                .Where(b => b.Id == e.BranchId)
                .Select(b => b.NameEn)
                .FirstOrDefault(),

            NameEn = e.NameEn,
            NameAr = e.NameAr,

            Email = e.Email,
            Username = e.Username,
            Active = e.Active,

            Birthdate = e.Birthdate,
            HiringDate = e.HiringDate,
            FixingDate = e.FixingDate,
            TerminationDate = e.TerminationDate,

            Gender = e.Gender,
            MaritalStatus = e.MaritalStatus,
            MobileNumber = e.MobileNumber,
            PersonalEmail = e.PersonalEmail,
            Religion = e.Religion,
            Citizen = e.Citizen,

            DepartmentId = e.ProfessionalDatum!.DepartmentId,
            DepartmentName = e.ProfessionalDatum!.Department!.Name,

            PositionId = e.ProfessionalDatum!.PositionId,
            PositionName = e.ProfessionalDatum!.Position!.Name,

            WorkLocationId = e.ProfessionalDatum!.WorkLocationId,
            WorkLocationName = e.ProfessionalDatum!.WorkLocation!.Name,

            BusinessUnitId = e.ProfessionalDatum!.BusinessUnitId,
            BusinessUnitName = e.ProfessionalDatum!.BusinessUnit!.Name,

            WorkTypeId = e.ProfessionalDatum!.WorkTypeId,
            WorkTypeName = e.ProfessionalDatum!.WorkType!.Name,
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt,
        })
        .ToListAsync();
        }

        public async Task<List<EmployeeFullDto>> GetChanges(DateTime since)
        {
            return await _context.ZenHrEmployees
        .AsNoTracking()
         .Where(e => (e.UpdatedAt ?? e.CreatedAt) != null)
            .Where(e => (e.UpdatedAt ?? e.CreatedAt) > since)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.Department)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.Position)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.WorkLocation)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.BusinessUnit)
        .Include(e => e.ProfessionalDatum)
            .ThenInclude(pd => pd.WorkType)
        .Select(e => new EmployeeFullDto
        {
            Id = e.Id,
            EmploymentNumber = e.EmploymentNumber,

            BranchId = e.BranchId,
            BranchName = _context.ZenHrBranches
                .Where(b => b.Id == e.BranchId)
                .Select(b => b.NameEn)
                .FirstOrDefault(),

            NameEn = e.NameEn,
            NameAr = e.NameAr,

            Email = e.Email,
            Username = e.Username,
            Active = e.Active,

            Birthdate = e.Birthdate,
            HiringDate = e.HiringDate,
            FixingDate = e.FixingDate,
            TerminationDate = e.TerminationDate,

            Gender = e.Gender,
            MaritalStatus = e.MaritalStatus,
            MobileNumber = e.MobileNumber,
            PersonalEmail = e.PersonalEmail,
            Religion = e.Religion,
            Citizen = e.Citizen,

            DepartmentId = e.ProfessionalDatum!.DepartmentId,
            DepartmentName = e.ProfessionalDatum!.Department!.Name,

            PositionId = e.ProfessionalDatum!.PositionId,
            PositionName = e.ProfessionalDatum!.Position!.Name,

            WorkLocationId = e.ProfessionalDatum!.WorkLocationId,
            WorkLocationName = e.ProfessionalDatum!.WorkLocation!.Name,

            BusinessUnitId = e.ProfessionalDatum!.BusinessUnitId,
            BusinessUnitName = e.ProfessionalDatum!.BusinessUnit!.Name,

            WorkTypeId = e.ProfessionalDatum!.WorkTypeId,
            WorkTypeName = e.ProfessionalDatum!.WorkType!.Name,

            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt,
        })
        .ToListAsync();
        }

        public async Task<int> UpdateEmployeesAsync(CancellationToken ct = default)
        {
            await UpdateBranchesAsync();
            var client = _httpClientFactory.CreateClient("ZenHrApi"); // انت عامل client بالـ token already

            // هات البرانشز من DB (اللي أنت خزنتهم قبل كده)
            var branchIds = await _context.ZenHrBranches
                .Select(b => b.Id)
                .ToListAsync(ct);

            // caches for master tables (performance)
            var deptCache = await _context.ZenHrDepartments.ToDictionaryAsync(x => x.Id, ct);
            var posCache = await _context.ZenHrPositions.ToDictionaryAsync(x => x.Id, ct);
            var locCache = await _context.ZenHrWorkLocations.ToDictionaryAsync(x => x.Id, ct);
            var buCache = await _context.ZenHrBusinessUnits.ToDictionaryAsync(x => x.Id, ct);
            var wtCache = await _context.ZenHrWorkTypes.ToDictionaryAsync(x => x.Id, ct);
            var secCache = await _context.ZenHrSections.ToDictionaryAsync(x => x.Id, ct);
            var divCache = await _context.ZenHrDivisions.ToDictionaryAsync(x => x.Id, ct);
            var token = (await tokenservice.GetActiveToken()).Token;
            int upserts = 0;

            foreach (var branchId in branchIds)
            {
                int page = 1, totalPages = 1;

                while (page <= totalPages)
                {
                    // include professional_datum like your current call
                    var url = $"https://app.zenhr.com/api/v3/branches/{branchId}/employees?limit=25&page={page}&include[]=employee.professional_datum";

                    using var req = new HttpRequestMessage(HttpMethod.Get, url);
                    req.Headers.TryAddWithoutValidation("Accept", "application/json");
                    req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");

                    using var res = await client.SendAsync(req, ct);
                    var body = await res.Content.ReadAsStringAsync(ct);


                    // لو حابب “أجيبلك الـ JSON كامل” للتأكد:
                    // _logger.LogInformation("ZenHR employees raw body (branch {BranchId} page {Page}): {Body}", branchId, page, body);
                    if (!res.IsSuccessStatusCode)
                    {
                        _logger.LogError("ZenHR call failed. Status={Status} Url={Url} Body={Body}",
                            (int)res.StatusCode, url, body);

                        throw new Exception();
                    }
                    var dto = JsonSerializer.Deserialize<ZenHrEmployeesResponse>(body, ZenHrJsonOptions);
                    if (dto == null) break;

                    totalPages = dto.Pagination.TotalPages;
                    page++;

                    if (dto.Data.Count == 0) continue;

                    // preload existing employees for this batch
                    var ids = dto.Data.Select(x => x.Id).ToList();
                    var existingEmployees = await _context.ZenHrEmployees
                        .Include(e => e.ProfessionalDatum)
                        .Where(e => ids.Contains(e.Id))
                        .ToDictionaryAsync(e => e.Id, ct);

                    foreach (var emp in dto.Data)
                    {
                        if (!existingEmployees.TryGetValue(emp.Id, out var entity))
                        {
                            entity = new ZenHrEmployee { Id = emp.Id };
                            await _context.ZenHrEmployees.AddAsync(entity, ct);
                            existingEmployees[emp.Id] = entity;
                        }

                        // map simple fields
                        entity.BranchId = emp.BranchId ?? emp.Branch?.Id ?? branchId;
                        entity.EmploymentNumber = emp.EmploymentNumber;
                        entity.Email = emp.Email;
                        entity.Username = emp.Username;

                        entity.UserId = emp.User?.Id;
                        entity.ShortNameEn = emp.User?.ShortName?.En;
                        entity.ShortNameAr = emp.User?.ShortName?.Ar;
                        entity.PictureUrl = emp.User?.Picture?.Url;

                        // compose full names
                        string Compose(ZenHrPersonName? n) =>
                            n == null ? "" : string.Join(" ",
                                new[] { n.FirstName, n.SecondName, n.ThirdName, n.LastName }
                                .Where(s => !string.IsNullOrWhiteSpace(s)));

                        entity.NameEn = Compose(emp.User?.Name?.En);
                        entity.NameAr = Compose(emp.User?.Name?.Ar);

                        entity.Birthdate = emp.Birthdate;
                        entity.HiringDate = emp.HiringDate;
                        entity.FixingDate = emp.FixingDate;
                        entity.TerminationDate = emp.TerminationDate;
                        entity.Fixed = emp.Fixed;

                        entity.Gender = emp.Gender;
                        entity.MaritalStatus = emp.MaritalStatus;
                        entity.MobileNumber = emp.MobileNumber;
                        entity.Number = emp.Number;
                        entity.ExtNumber = emp.ExtNumber;
                        entity.PersonalEmail = emp.PersonalEmail;
                        entity.Religion = emp.Religion;
                        entity.Citizen = emp.Citizen;

                        entity.Address = emp.Address;
                        entity.ContractType = emp.ContractType;
                        entity.ContractEndDate = emp.ContractEndDate;
                        entity.NationalitiesJson = emp.Nationalities.Count == 0 ? null : JsonSerializer.Serialize(emp.Nationalities);
                        entity.NationalId = emp.NationalId;
                        entity.Active = emp.Active;

                        entity.Logo = emp.Logo;
                        entity.CreatedAt = emp.CreatedAt;
                        entity.UpdatedAt = emp.UpdatedAt;

                        // professional datum + master upserts
                        if (emp.ProfessionalDatum != null)
                        {
                            var pdDto = emp.ProfessionalDatum;

                            if (entity.ProfessionalDatum == null || entity.ProfessionalDatum.Id != pdDto.Id)
                            {
                                entity.ProfessionalDatum = new ZenHrEmployeeProfessionalDatum
                                {
                                    Id = pdDto.Id,
                                    EmployeeId = entity.Id
                                };
                            }

                            var pd = entity.ProfessionalDatum;
                            pd.EmploymentNumber = pdDto.EmploymentNumber;
                            pd.Outsourced = pdDto.Outsourced;
                            pd.EffectiveOn = pdDto.EffectiveOn;
                            pd.ExpiresOn = pdDto.ExpiresOn;

                            pd.ManagerId = pdDto.Manager?.Id;
                            pd.ManagerName = pdDto.Manager?.Name;

                            pd.PositionId = await UpsertMasterAsync(
                                _context.ZenHrPositions,
                                pdDto.Position?.Id,
                                pdDto.Position?.Name,
                                posCache,
                                x => ((ZenHrPosition)(object)x!).Id,
                                (x, name) => ((ZenHrPosition)(object)x!).Name = name,
                                id => new ZenHrPosition { Id = id },
                                ct);

                            pd.DepartmentId = await UpsertMasterAsync(
                                _context.ZenHrDepartments,
                                pdDto.Department?.Id,
                                pdDto.Department?.Name,
                                deptCache,
                                x => ((ZenHrDepartment)(object)x!).Id,
                                (x, name) => ((ZenHrDepartment)(object)x!).Name = name,
                                id => new ZenHrDepartment { Id = id },
                                ct);

                            pd.WorkLocationId = await UpsertMasterAsync(
                                _context.ZenHrWorkLocations,
                                pdDto.WorkLocation?.Id,
                                pdDto.WorkLocation?.Name,
                                locCache,
                                x => ((ZenHrWorkLocation)(object)x!).Id,
                                (x, name) => ((ZenHrWorkLocation)(object)x!).Name = name,
                                id => new ZenHrWorkLocation { Id = id },
                                ct);

                            pd.BusinessUnitId = await UpsertMasterAsync(
                                _context.ZenHrBusinessUnits,
                                pdDto.BusinessUnit?.Id,
                                pdDto.BusinessUnit?.Name,
                                buCache,
                                x => ((ZenHrBusinessUnit)(object)x!).Id,
                                (x, name) => ((ZenHrBusinessUnit)(object)x!).Name = name,
                                id => new ZenHrBusinessUnit { Id = id },
                                ct);

                            pd.WorkTypeId = await UpsertMasterAsync(
                                _context.ZenHrWorkTypes,
                                pdDto.WorkType?.Id,
                                pdDto.WorkType?.Name,
                                wtCache,
                                x => ((ZenHrWorkType)(object)x!).Id,
                                (x, name) => ((ZenHrWorkType)(object)x!).Name = name,
                                id => new ZenHrWorkType { Id = id },
                                ct);

                            pd.SectionId = await UpsertMasterAsync(
                                _context.ZenHrSections,
                                pdDto.Section?.Id,
                                pdDto.Section?.Name,
                                secCache,
                                x => ((ZenHrSection)(object)x!).Id,
                                (x, name) => ((ZenHrSection)(object)x!).Name = name,
                                id => new ZenHrSection { Id = id },
                                ct);

                            pd.DivisionId = await UpsertMasterAsync(
                                _context.ZenHrDivisions,
                                pdDto.Division?.Id,
                                pdDto.Division?.Name,
                                divCache,
                                x => ((ZenHrDivision)(object)x!).Id,
                                (x, name) => ((ZenHrDivision)(object)x!).Name = name,
                                id => new ZenHrDivision { Id = id },
                                ct);

                            pd.CreatedAt = pdDto.CreatedAt;
                            pd.UpdatedAt = pdDto.UpdatedAt;
                        }

                        upserts++;
                    }

                    await _context.SaveChangesAsync(ct);
                }
            }

            return upserts;
        }


        static async Task<int?> UpsertMasterAsync<T>(
        DbSet<T> set,
        int? id,
        string? name,
        Dictionary<int, T> cache,
        Func<T, int> getId,
        Action<T, string?> setName,
        Func<int, T> factory,
        CancellationToken ct)
        where T : class
        {
            if (id is null) return null;

            if (cache.TryGetValue(id.Value, out var existing))
            {
                setName(existing, name);
                return id;
            }

            var dbExisting = await set.FindAsync(new object[] { id.Value }, ct);
            if (dbExisting != null)
            {
                setName(dbExisting, name);
                cache[id.Value] = dbExisting;
                return id;
            }

            var created = factory(id.Value);
            setName(created, name);
            await set.AddAsync(created, ct);
            cache[id.Value] = created;
            return id;
        }

        #endregion
        #region Branch
        public async Task<List<ZenHrBranch>> GetAllBranches()
        {
            return await _context.ZenHrBranches
                            .ToListAsync();
        }
        public async Task<int> UpdateBranchesAsync()
        {
            var client = _httpClientFactory.CreateClient(); // أو "ZenHrApi"
            var url = "https://app.zenhr.com/api/v3/branches";

            var tokenmodel = await tokenservice.GetActiveToken();
            var token = tokenmodel.Token; // put it from DB later

            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.TryAddWithoutValidation("Accept", "application/json");
            req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");

            using var res = await client.SendAsync(req);
            var body = await res.Content.ReadAsStringAsync();

            res.EnsureSuccessStatusCode();

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            options.Converters.Add(new FlexibleNullableIntConverter());

            var dto = JsonSerializer.Deserialize<ZenHrBranchesResponse>(body, options);

            if (dto == null || dto.Data.Count == 0) return 0;

            var ids = dto.Data.Select(x => x.Id).ToList();

            // load existing branches
            var existing = await _context.ZenHrBranches
                .Where(b => ids.Contains(b.Id))
                .ToDictionaryAsync(b => b.Id);

            foreach (var b in dto.Data)
            {
                var daysOffCsv = (b.DaysOff?.Count > 0) ? string.Join(",", b.DaysOff) : null;

                if (!existing.TryGetValue(b.Id, out var entity))
                {
                    entity = new ZenHrBranch { Id = b.Id };
                    _context.ZenHrBranches.Add(entity);
                }

                // map
                entity.NameAr = b.Name?.Ar;
                entity.NameEn = b.Name?.En;

                entity.ProbationType = b.ProbationPeriod?.Type;
                entity.ProbationPeriod = b.ProbationPeriod?.Period;

                entity.WorkingHours = b.WorkingHours;
                entity.CutOffDate = b.CutOffDate;
                entity.ShowCutOffDate = b.ShowCutOffDate;
                entity.WorkingDays = b.WorkingDays;

                entity.DaysOffCsv = daysOffCsv;
                entity.Timezone = b.Timezone;
                entity.Currency = b.CurrencyCurrency;

                entity.ShowCompanyContributions = b.ShowCompanyContributions;
                entity.DeductAbsence = b.DeductAbsence;

                entity.CountryId = b.Country?.CountryId;
                entity.CountryNameAr = b.Country?.Name?.Ar;
                entity.CountryNameEn = b.Country?.Name?.En;
                entity.CountryCode = b.Country?.CountryCode;
                entity.SsAvailable = b.Country?.SsAvailable;
                entity.SsName = b.Country?.SsName;

                entity.CreatedAt = b.CreatedAt;
                entity.UpdatedAt = b.UpdatedAt;

                entity.LogoUrl = b.LogoUrl;
                entity.ClockingWithQrCodeEnabled = b.ClockingWithQrCodeEnabled;
                entity.EditableEmployeeProfilePicture = b.EditableEmployeeProfilePicture;
                entity.Round = b.Round;

                entity.SyncedAtUtc = DateTime.UtcNow;
            }

            return await _context.SaveChangesAsync();
        }
        #endregion

        //public async Task<string> tempgetbody()
        //{
        //    var httpclient = _httpClientFactory.CreateClient();
        //    var url = "https://app.zenhr.com/api/v3/branches";
        //    var tokenmodel = await tokenservice.GetActiveToken();
        //    var token = tokenmodel.Token; // put it from DB later

        //    using var request = new HttpRequestMessage(HttpMethod.Get, url);
        //    request.Headers.TryAddWithoutValidation("Accept", "application/json");
        //    request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");

        //    using var response = await httpclient.SendAsync(request);
        //    var body = await response.Content.ReadAsStringAsync();
        //    return body;
        //}
    }
}
