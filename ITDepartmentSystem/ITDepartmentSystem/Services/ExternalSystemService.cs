using Microsoft.AspNetCore.DataProtection;
using OfficeOpenXml;
using System.Net.Http.Headers;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;

namespace ITDepartmentSystem.Services
{
    public class ExternalSystemService
        : IExternalSystemService
    {
        private readonly INotEntityGenericRepository<ExternalSystem> _repository;
        private readonly INotEntityGenericRepository<EmployeeCache> _employeerepo;
        private readonly INotEntityGenericRepository<ExternalUser> _ExternalUsersrepo;
        private readonly IDataProtector _protector;

        public ExternalSystemService(
            INotEntityGenericRepository<ExternalSystem> repository,
            IDataProtectionProvider dataProtectionProvider,
            INotEntityGenericRepository<EmployeeCache> employeerepo,
            INotEntityGenericRepository<ExternalUser> externalUsersrepo)
        {
            _repository = repository;
            _employeerepo = employeerepo;

            // Create a protector with a unique purpose string
            _protector = dataProtectionProvider.CreateProtector("ExternalSystem.AdminCredentials");
            _ExternalUsersrepo = externalUsersrepo;
        }
        public async Task<ICollection<ExternalSystem>> GetAll(CancellationToken token = default)
        {
            var externalsystems = await (await _repository.GetAllAsync(token)).ToListAsync(token);
            return externalsystems;
        }

        public async Task<ExternalSystem> CreateExternalSystemAsync(ExernalSystemRequest request)
        {
            var system = ExernalSystemRequest.FromModel(request);
            
            system.AdminUserName = request.adminUsername==null? null:  _protector.Protect(request.adminUsername);   // encrypted
            system.AdminPassword = request.adminPassword == null ? null : _protector.Protect(request.adminPassword);   // encrypted
            await _repository.AddAsync(system);
            await _repository.SaveChangesAsync();
            return system;
        }
        public Task LoadNewSystemFromExcel(SystemFromExcelRequest Request, CancellationToken token = default)
        {

            throw new NotImplementedException();
        }
        //private Task IntegrateProductDevelopmentSystem()
        //{

        //}
        //private Task IntegrateSalesSheetSystem()
        //{

        //}
        //private Task IntegratePharmaDRMSSystem()
        //{

        //}
        //private Task IntegrateQRCodesSystem()
        //{

        //}

        public async Task AddExternalUser(ExternalUserRequest request,CancellationToken Token=default)
        {
            if ((await (await _employeerepo.Where(E => E.Id == request.EmployeeId && E.Active == true)).CountAsync(Token)) == 0)
            {
                throw new BusinessRuleException("Cant add system to inactive user", StatusCodes.Status406NotAcceptable);
            }

            await _ExternalUsersrepo.AddAsync(new ExternalUser()
            {
                ExternalSystemId = request.ExternalSystemId,
                EmployeeId = request.EmployeeId,
                isActive = !request.IsDisabled,
                Status = request.IsDisabled ? "Disabled" : "Active",
                UserName = request.Username

            });
            await _ExternalUsersrepo.SaveChangesAsync();
        }


        public async Task AddExternalUsersFromExcel(ExternalUserFromExcel request, CancellationToken token = default)
        {
            if (request.Excel == null || request.Excel.Length == 0)
                throw new ArgumentException("No Excel file provided");

            using var stream = request.Excel.OpenReadStream();
            using var package = new ExcelPackage(stream);
            var worksheet = package.Workbook.Worksheets.FirstOrDefault();
            if (worksheet == null)
                throw new Exception("Excel file is empty");

            // Headers: Username | EmployeeNumber | IsDisabled
            var rowCount = worksheet.Dimension.Rows;

            // Load employees
            var employeeDict = ((await _employeerepo.GetAllAsync()).Where(e=>e.BranchId==18908))
                               .ToDictionary(e => e.EmployeeNumber, e => e.Id);

            // Load existing external users for this system
            var existingExternalUsers = (await _ExternalUsersrepo.GetAllAsync())
                                        .Where(eu => eu.ExternalSystemId == request.ExternalSystemId)
                                        .ToList();

            var newUsers = new List<ExternalUser>();

            for (int row = 2; row <= rowCount; row++)
            {
                string username = worksheet.Cells[row, 1].Text.Trim();
                if (!int.TryParse(worksheet.Cells[row, 2].Text.Trim(), out int empNumber))
                    continue;

                bool isDisabled = bool.TryParse(worksheet.Cells[row, 3].Text.Trim(), out var disabled) && disabled;

                if (!employeeDict.TryGetValue(empNumber, out var empId))
                    continue;

                // Check if user already exists for this system
                var existingUser = existingExternalUsers.FirstOrDefault(eu => eu.EmployeeId == empId);

                if (existingUser != null)
                {
                    // Update username and status
                    existingUser.UserName = username;
                    existingUser.isActive = !isDisabled;
                    existingUser.Status = isDisabled ? "Disabled" : "Active";
                }
                else
                {
                    // Add new user
                    newUsers.Add(new ExternalUser
                    {
                        Id = Guid.NewGuid(),
                        ExternalSystemId = request.ExternalSystemId,
                        EmployeeId = empId,
                        UserName = username,
                        isActive = !isDisabled,
                        Status = isDisabled ? "Disabled" : "Active"
                    });
                }
            }

            // Save new users
            if (newUsers.Any())
                await _ExternalUsersrepo.AddRangeAsync(newUsers);

            // Save all changes (including updates)
            await _ExternalUsersrepo.SaveChangesAsync();
        }

        public async Task LoadSystemsUsers(CancellationToken token = default)
        {
            var systems=await (await _repository.GetAllAsync(token)).Where(a=>
            a.AdminUserName != null && 
            a.AdminPassword != null && 
            a.LoginURL != null && 
            a.GetUsersURL != null 
            
            ).ToListAsync(token);
            foreach (var system in systems)
            {
                var users= await LoadSystemUserss(system);
                await AddExternalUsersAsync(system, users);
            }

        }

        private async Task AddExternalUsersAsync(ExternalSystem system, List<ExternalUserDTO> externalUsers)
        {
            //var employeeDict = await ((await _employeerepo.GetAllAsync()).Where(e=>e.BranchId==18908))
            //.ToDictionaryAsync(e => e.EmployeeNumber, e => e.Id);


            //var existingSet = (await _ExternalUsersrepo.GetAllAsync())
            //                  .Where(eu => eu.ExternalSystemId == system.Id)
            //                  .Select(eu => eu.EmployeeId)
            //                  .ToHashSet();

            //foreach (var extUser in externalUsers)
            //{
            //    if (!employeeDict.TryGetValue(extUser.EmployeeNumber, out var empId))
            //        continue;

            //    //// 2️⃣ Check if the external user already exists for this system
            //    //var exists = await (await _ExternalUsersrepo.GetAllAsync())
            //    //    .AnyAsync(eu => eu.EmployeeId == empId && eu.ExternalSystemId == system.Id);

            //    if (existingSet.Contains(empId)) continue;

            //    // 3️⃣ Create new ExternalUser
            //    var newExternalUser = new ExternalUser
            //    {
            //        Id = Guid.NewGuid(),
            //        ExternalSystemId = system.Id,
            //        EmployeeId = empId,
            //        UserName = extUser.Username,
            //        isActive = !extUser.IsDisabled,
            //        Status = extUser.IsDisabled ? "Disabled" : "Active"
            //    };

            //    await _ExternalUsersrepo.AddAsync(newExternalUser);
            //}
            //await _ExternalUsersrepo.SaveChangesAsync();
            var employeeDict = await ((await _employeerepo.GetAllAsync()).Where(e => e.BranchId == 18908))
        .ToDictionaryAsync(e => e.EmployeeNumber, e => e.Id);

            // Load existing external users for this system
            var existingUsers = (await _ExternalUsersrepo.GetAllAsync())
                                .Where(eu => eu.ExternalSystemId == system.Id)
                                .ToDictionary(eu => eu.EmployeeId, eu => eu); // key = EmployeeId

            foreach (var extUser in externalUsers)
            {
                if (!employeeDict.TryGetValue(extUser.EmployeeNumber, out var empId))
                    continue; // employee not found in branch

                if (existingUsers.TryGetValue(empId, out var existingExternalUser))
                {
                    // ✅ Update existing user
                    existingExternalUser.UserName = extUser.Username;
                    existingExternalUser.isActive = !extUser.IsDisabled;
                    existingExternalUser.Status = extUser.IsDisabled ? "Disabled" : "Active";
                }
                else
                {
                    // ✅ Create new external user
                    var newExternalUser = new ExternalUser
                    {
                        Id = Guid.NewGuid(),
                        ExternalSystemId = system.Id,
                        EmployeeId = empId,
                        UserName = extUser.Username,
                        isActive = !extUser.IsDisabled,
                        Status = extUser.IsDisabled ? "Disabled" : "Active"
                    };

                    await _ExternalUsersrepo.AddAsync(newExternalUser);
                }
            }

            // Save all changes (updates + new)
            await _ExternalUsersrepo.SaveChangesAsync();
        }
        private async Task<List<ExternalUserDTO>> LoadSystemUserss(ExternalSystem system)
        {
            // decrypt credentials
            var (username, password) = GetDecryptedCredentials(system);

            var service = new ExternalSystemHttpService(new HttpClient());

            var token = await service.LoginAsync(system.LoginURL!, username, password);

            var users = await service.GetAllUsersAsync(system.GetUsersURL!, token);

            return users;
        }

        private (string AdminUsername, string AdminPassword) GetDecryptedCredentials(ExternalSystem system)
        {
            return (
                _protector.Unprotect(system.AdminUserName!),
                _protector.Unprotect(system.AdminPassword!)
            );
        }

        public async Task<ICollection<systemAccount>> ByEmployee(Guid EmployeeId, CancellationToken token = default)
        {
            var systems = await _repository.GetAllAsync();
            var accounts = await (await _ExternalUsersrepo.GetAllAsync()).Where(e => e.EmployeeId == EmployeeId).ToListAsync();
            var list = new List<systemAccount>();
            foreach(var system in systems)
            {
                var acc = accounts.FirstOrDefault(A => A.ExternalSystemId == system.Id);
                list.Add(new()
                {
                    Id= acc?.Id??Guid.Empty,
                    isActive = acc?.isActive??false,
                    ExternalSystemId=system.Id,
                    UserName=acc?.UserName?? "-",
                    Status=acc?.Status ?? "-",
                    ExternalSystemName=system.Name,
                    
                });
            }
            return list;
        }
    }

    public class ExernalSystemRequest
    {
        public string name { set; get; }
        public string url {set;get;}
        public string? LoginURL { set; get; }
        public string? UsersURL { set; get; }
        public string? adminUsername {set;get;}
        public string? adminPassword { set; get; }
        public bool isAngularSystem { set; get; }
        public static ExternalSystem FromModel(ExernalSystemRequest req)
        {
            return new ExternalSystem()
            {
                LoginURL = req.LoginURL,
                URL = req.url,
                Name = req.name,
                GetUsersURL = req.UsersURL,
                isAnglarSystem = req.isAngularSystem,
            };
        }
    }
    public class ExternalLoginRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }
    public class ExternalUserDTO
    {
        public string Username { get; set; }
        public int EmployeeNumber { get; set; }
        public bool IsDisabled { get; set; }
    }

    public class ExternalUserRequest
    {
        public string Username { get; set; }
        public Guid EmployeeId { set; get; }
        public Guid ExternalSystemId { set; get; }
        public int EmployeeNumber { get; set; }
        public bool IsDisabled { get; set; }
    }
    public class ExternalUserFromExcel
    {
        
        public Guid ExternalSystemId { set; get; }
        public IFormFile Excel { set; get; }
    }

    public class ExternalSystemHttpService
    {
        private readonly HttpClient _httpClient;

        public ExternalSystemHttpService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<string> LoginAsync(string loginUrl, string username, string password)
        {
            var payload = new
            {
                Usernameoremail = username,
                loginPassword = password
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(loginUrl, content);
            response.EnsureSuccessStatusCode();

            // Example: token returned in JSON { "token": "xyz" }
            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.GetProperty("token").GetString(); // adjust depending on API
        }

        public async Task<List<ExternalUserDTO>> GetAllUsersAsync(string usersUrl, string authToken)
        {
            // attach bearer token (or cookie if required)
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authToken);

            var response = await _httpClient.GetAsync(usersUrl);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();

            // assuming JSON array [{ "username": "...", "employeeNumber": "...", "isDisabled": true }, ...]
            var users = JsonSerializer.Deserialize<List<ExternalUserDTO>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return users ?? new List<ExternalUserDTO>();
        }
    }
}
