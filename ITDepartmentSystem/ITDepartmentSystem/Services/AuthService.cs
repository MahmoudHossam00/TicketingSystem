
using DocumentFormat.OpenXml.Spreadsheet;
using ITDepartmentSystem.General;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace ITDepartmentSystem.Services
{
    public class AuthService(
        INotEntityGenericRepository<UserSession> usersessions,
        IGenericRepository<AppPermission> permissions,
        JwtTokenProvider jwtprovider,
        UserManager<AppUser> userManager,
        IOptionsMonitor<JWTConfiguration> jwtconfiguration,
        RoleManager<IdentityRoleWithPermission> roleManager,
                IHttpContextAccessor httpContextAccessor,
                INotificationService notificationService,
                IBackgroundQueue _backgroundQueue
                
        ) : IAuthService
    {
        private ClaimsPrincipal User =>
httpContextAccessor.HttpContext?.User
?? throw new BusinessRuleException("Unauthorized", StatusCodes.Status401Unauthorized);
        private string GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub"); // JWT fallback

            if (id == null)
                throw new BusinessRuleException("User ID not found in token", StatusCodes.Status401Unauthorized);

            return id;
        }
        public async Task AddPermissionToRole(UpdateRole request)
        {
            var role = await roleManager.Roles.FirstOrDefaultAsync(r => r.Id == request.RoleId.ToString() || r.Name == request.RoleName);
            if (role == null)
            {
                throw new BusinessRuleException("Role does not exist", StatusCodes.Status404NotFound);

            }
            role.Permissions.Clear();
            //role.Permissions = request.Permissions;
            var perm=await (await permissions.GetAllAsync()).Where(p => request.Permissions.Contains(p.Id)).ToListAsync();
            role.Permissions.AddRange(perm);
            await roleManager.UpdateAsync(role);
        }

        public async Task AddRole(AddRoleRequest request)
        {
            var user = (await userManager.FindByIdAsync(request.UserId.ToString())) ??
                (await userManager.FindByNameAsync(request.UserName?.ToString()??""));
            if(user == null)
            {
                throw new BusinessRuleException("User does not exist", StatusCodes.Status404NotFound);
            }
            var role = await roleManager.Roles.FirstOrDefaultAsync(r => r.Id == request.RoleId.ToString() || r.Name == request.RoleName);
            if (role==null)
            {
                throw new BusinessRuleException("Role does not exist", StatusCodes.Status404NotFound);

            }
            await userManager.AddToRoleAsync(user, role.Name??role.Id);
        }
        public async Task Revoke(string refreshToken, CancellationToken ct)
        {
            var hash = JwtTokenProvider.Sha256(refreshToken);

            var session = await (await usersessions.GetAllAsync(ct))
                .FirstOrDefaultAsync(s => s.RefreshTokenHash == hash, ct);

            if (session == null) return;

            if (session.RevokedAt == null)
            {
                session.RevokedAt = DateTime.Now;
                await usersessions.SaveChangesAsync();
            }
        }
        public async Task<TokenResponse> Refresh(string refreshToken, string? userAgent, string? ip, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                throw new BusinessRuleException("Refresh token is required", StatusCodes.Status401Unauthorized);

            var oldHash = JwtTokenProvider.Sha256(refreshToken);

            // لازم GetAllAsync يرجع IQueryable (زي اللي عندك في repo) عشان نقدر Include
            var session = await (await usersessions.GetAllAsync(ct))
                .Include(s => s.User)
                .ThenInclude(u => u.Employee)
                .FirstOrDefaultAsync(s => s.RefreshTokenHash == oldHash, ct);

            if (session == null)
                throw new BusinessRuleException("Invalid refresh token", StatusCodes.Status401Unauthorized);

            // لو revoked أو expired
            if (!session.IsActive)
                throw new BusinessRuleException("Refresh token expired or revoked", StatusCodes.Status401Unauthorized);

            var user = session.User;

            // Build GenerateTokenRequest
            var generateTokenRequest = new GenerateTokenRequest
            {
                Id = user.Id,
                EmployeeNumber = user.Employee?.EmployeeNumber ?? 0,
                Email = user.Email,
                EmployeeId = user.Employee.Id,
                UserName = user.UserName,
                Picture = user.Picture,
                firstLogin = !user.ChangedHisOwnPassword,


            };


            generateTokenRequest.Roles = (await userManager.GetRolesAsync(user)).ToList();

            var permissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var roleName in generateTokenRequest.Roles)
            {
                var role = await roleManager.FindByNameAsync(roleName);
                if (role?.Permissions != null)
                    foreach (var p in role.Permissions) permissions.Add(p.Key);
            }
            generateTokenRequest.Permissions = permissions.ToList();

            // ✅ New Access Token
            var ret = jwtprovider.GenerateJwtToken(generateTokenRequest);

            // ✅ Rotate Refresh Token
            var newRefresh = JwtTokenProvider.GenerateRefreshToken();
            var newHash = JwtTokenProvider.Sha256(newRefresh);


            // revoke old
            session.RevokedAt = DateTime.Now;
            session.ReplacedByTokenHash = newHash;
            session.LastUsedAt = DateTime.Now;

            // create new session row
            await usersessions.AddAsync(new UserSession
            {
                UserId = user.Id,
                RefreshTokenHash = newHash,
                ExpiresAt = DateTime.Now.AddMinutes(jwtconfiguration.CurrentValue.RefreshMinutes),
                UserAgent = userAgent,
                IpAddress = ip,
                CreatedAt = DateTime.Now   // <-- add this

            });
            var oldSessions = await (await usersessions.GetAllAsync(ct))
            .Where(s => s.UserId == user.Id && s.ExpiresAt < DateTime.Now)
            .ToListAsync(ct);
            usersessions.RemoveRange(oldSessions);

            await usersessions.SaveChangesAsync();

            ret.RefreshToken = newRefresh;
            return ret;
        }
        public async Task<PaginatedResponse<BasicUserDataResponse>> GetAllUsersBasicData(FilterDataRequest filterReq, CancellationToken token)
        {
            var entities = userManager.Users.AsQueryable();
                //var entities = await repo.GetAllAsync(token);
            if (filterReq.filter != null)
            {
                entities = entities.Where(e =>
                                    EF.Functions.Like(e.UserName, $"%{filterReq.filter}%") ||
                                    EF.Functions.Like(e.Employee.EmployeeNumber.ToString(), $"%{filterReq.filter}%") ||
                                    EF.Functions.Like(e.Employee.NameEn, $"%{filterReq.filter}%") ||
                                    EF.Functions.Like(e.Employee.NameAr, $"%{filterReq.filter}%") 
                                    //EF.Functions.Like(e.EmployeeNumber.ToString(), $"%{filterReq.filter}%")
                                );

            }
            ;
            if (filterReq.departmentIDS != null && filterReq.departmentIDS.Count() > 0)
            {
                entities = entities.Where(e => e.Employee.DepartmentId.HasValue && filterReq.departmentIDS.Contains(e.Employee.DepartmentId.Value));
            }
            var totalRecords = entities.Count();
            entities = entities.Skip(50 * (filterReq.page-1)).Take(50);
            var data = await entities.Include(e=>e.Employee).Select(e=>new BasicUserDataResponse(e.Id,e.UserName,e.Employee.NameEn,e.Employee.EmployeeNumber) ).ToListAsync();
            return new PaginatedResponse<BasicUserDataResponse>()
            {
                Data = data,
                FilteredCount = data.Count(),
                Page = filterReq.page,
                PageSize = 50,
                TotalRecords = totalRecords
            };
        }

        public async Task CreateAccount(CreateAccountRequest request)
        {
            //var user = await userManager.FindByEmailAsync(request.Email);
                
            if (await userManager.FindByNameAsync(request.UserName) != null )
            {
                throw new BusinessRuleException("Username already exists", StatusCodes.Status401Unauthorized);
            }
            if (await userManager.FindByEmailAsync(request.Email??"") != null)
            {
                throw new BusinessRuleException("Email already exists", StatusCodes.Status401Unauthorized);
            }
            var perms = await (await permissions.GetAllAsync()).Where(p => request.Permissions.Contains(p.Id)).ToListAsync();
            var Creationuser = new AppUser()
            {
                Email = request.Email,
                UserName = request.UserName,
                EmployeeNumber = request.EmployeeId,
                Permissions= perms,
            };
            var result=await userManager.CreateAsync(Creationuser,request.Password);
            if(!result.Succeeded)
            {
                throw new Exception();
            }

            await userManager.AddToRolesAsync(Creationuser, request.Roles);
            await notificationService.SaveNotification(new()
            {
                Text="Welcome To the FPI IT Department Website, we wish u a wonderful stay",
                Type= notificationType.General,
                UserId = [Creationuser.Id]
            });
            if (Creationuser.Email !=null )
            {
                var sendemailjob = new SendEmailJob()
                {
                    HtmlBody = "Welcome to IT Department system",
                    Subject = "New User",
                    ToEmail = Creationuser.Email,
                    ToName = Creationuser.UserName
                };
                await _backgroundQueue.EnqueueAsync(sendemailjob);
            }
        }

        public async Task CreateRole(CreateRole Request)
        {
            var perms = await (await permissions.GetAllAsync()).Where(p => Request.Permissions.Contains(p.Id)).ToListAsync();

            var role = new IdentityRoleWithPermission()
            {
                Name = Request.RoleName,
                Permissions = perms
            };
            var result=await roleManager.CreateAsync(role);
            if (result.Succeeded)
            {
                return;
            }
            throw new Exception();
        }

        public async Task<Dictionary<string, string>> GetAllRoles()
        {
            return (await roleManager.Roles
                    .AsNoTracking()
                    .ToDictionaryAsync(
                        r => r.Id,     // key
                        r => r.Name!   // value
                    ));
        }
        public async Task<Dictionary<string, string>> GetAllUsers()
        {
            return (await userManager.Users
                    .AsNoTracking()
                    .ToDictionaryAsync(
                        r => r.Id,     // key
                        r => r.UserName!   // value
                    ));
        }
        public async Task<List<string>> GetUserRoles(Guid id )
        {
            return ((await userManager.GetRolesAsync(await userManager.FindByIdAsync(id.ToString()))).ToList());
                    
                    
        }

        public async Task<TokenResponse> Login(LoginToAccountRequest request)
        {
            var users = await userManager.Users.ToListAsync();
            var user = await userManager.Users
            .Include(u => u.Employee)                // ✅ load Employee navigation
            .FirstOrDefaultAsync(u =>
                u.Email == request.UserNameOrEmail || u.UserName == request.UserNameOrEmail);
                //,
                //token);

            if (user == null || !await userManager.CheckPasswordAsync(user, request.Password))
                throw new BusinessRuleException("Invalid Username Or Password", StatusCodes.Status401Unauthorized);

            var GenerateTokenRequest = new GenerateTokenRequest
            {
                Id = user.Id,
                EmployeeNumber = user.Employee?.EmployeeNumber ?? 0,
                Email = user.Email,
                EmployeeId = user.Employee.Id,          // ✅ if EmployeeId is Guid
                UserName = user.UserName,
                Picture=user.Picture,
                firstLogin = !user.ChangedHisOwnPassword
            };
            GenerateTokenRequest.Roles =(await userManager.GetRolesAsync(user)).ToList();

            var permissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var roleName in GenerateTokenRequest.Roles)
            {
                var role = await roleManager.FindByNameAsync(roleName); // returns IdentityRoleWithPermission
                if (role?.Permissions != null)
                {
                    foreach (var p in role.Permissions)
                        permissions.Add(p.Key);
                }
            }
            GenerateTokenRequest.Permissions = permissions.ToList();

            user.LastLogin = DateTime.Now;
            //var token = jwtprovider.GenerateJwtToken(g);

            // ✅ refresh token + save session
            var refresh = JwtTokenProvider.GenerateRefreshToken();
            var refreshHash = JwtTokenProvider.Sha256(refresh);
            var userAgent = httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString();
            var ipAddress = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
            await usersessions.AddAsync(new UserSession
            {
                UserId = user.Id, // لو user.Id Guid مباشرة: UserId = user.Id
                RefreshTokenHash = refreshHash,
                ExpiresAt = DateTime.Now.AddMinutes(jwtconfiguration.CurrentValue.RefreshMinutes),
                UserAgent = userAgent, // هنملاها من controller
                IpAddress = ipAddress,
                CreatedAt=DateTime.Now,
                
            });
            var oldSessions = await (await usersessions
            .Where(s => s.UserId == user.Id && s.ExpiresAt < DateTime.Now))
            .ToListAsync();
            usersessions.RemoveRange(oldSessions);
            await usersessions.SaveChangesAsync();
            var ret = jwtprovider.GenerateJwtToken(GenerateTokenRequest);
            ret.RefreshToken = refresh;   // ✅ رجّع الـ refresh مع الريسبونس

            return ret;
        }

        public async Task AddPicture(string USERId, IFormFile picture)
        {
           var user= await userManager.FindByIdAsync(USERId);
            if(user is null)
            {
                throw new BusinessRuleException("user does not exist", StatusCodes.Status404NotFound);
            }
            user.Picture = await picture.Save(new() { });
            await userManager.UpdateAsync(user);
            return;
        }
        public async Task ChangeMyPicture( IFormFile picture)
        {
            var USERId = GetUserId();
            var user = await userManager.FindByIdAsync(USERId);
            if (user is null)
            {
                throw new BusinessRuleException("user does not exist", StatusCodes.Status404NotFound);
            }
            user.Picture = await picture.Save(new() { });
            await userManager.UpdateAsync(user);
            return;
        }

        public async Task<UserResponse> GetUserDetails(Guid EmployeeNumber, CancellationToken ct)
        {
            var user = await userManager.Users.Where(u=>u.EmployeeNumber== EmployeeNumber).FirstOrDefaultAsync();
            if (user is null)
            {
                throw new BusinessRuleException("user does not exist", StatusCodes.Status404NotFound);
            }
            //user.Picture = await picture.Save(new() { });
            
            return UserResponse.FromModel(user);
        }
        public async Task<string> GetMyPicture(CancellationToken ct)
        {
            var userid = GetUserId();
            var user = await userManager.FindByIdAsync(userid);
            if (user is null)
            {
                throw new BusinessRuleException("user does not exist", StatusCodes.Status404NotFound);
            }
            if(user.Picture==null)
            {
                return null;
            }
            //user.Picture = await picture.Save(new() { });
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), FileSettings.FilesPath, user.Picture);

            return filePath;
        }

        public async Task<UserResponse> GetUserDetails(string userId, CancellationToken ct)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                throw new BusinessRuleException("user does not exist", StatusCodes.Status404NotFound);
            }
            //user.Picture = await picture.Save(new() { });

            return UserResponse.FromModel(user);
        }

        public async Task<ICollection<DataUserResponse>> AllUsersWithEmployeeData(CancellationToken ct)
        {
            var users = userManager.Users.Include(u=>u.Employee).Select(DataUserResponse.FromModel);
            //if (user is null)
            //{
            //    throw new BusinessRuleException("user does not exist", StatusCodes.Status404NotFound);
            //}
            ////user.Picture = await picture.Save(new() { });

            return users.ToList();
        }
    }

  
}
