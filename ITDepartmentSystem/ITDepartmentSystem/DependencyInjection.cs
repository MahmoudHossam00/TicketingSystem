using Asp.Versioning;
using FluentValidation;
using FluentValidation.AspNetCore;
using ITDepartmentCompany.Services;
using ITDepartmentCompany.Services.IServices;
using ITDepartmentSystem.BackGroundServices;
using ITDepartmentSystem.Clients;
using ITDepartmentSystem.Data;
using ITDepartmentSystem.General;
using ITDepartmentSystem.Helpers.ITDepartmentSystem.Helper;
using ITDepartmentSystem.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using System.Text;
using System.Threading.RateLimiting;

namespace ITDepartmentSystem
{
    //public class ThreadPoolStressWorker : BackgroundService
    //{
    //    private readonly ILogger<ThreadPoolStressWorker> _logger;

    //    public ThreadPoolStressWorker(ILogger<ThreadPoolStressWorker> logger)
    //    {
    //        _logger = logger;
    //    }

    //    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    //    {
    //        _logger.LogInformation("Stress worker started");

    //        while (!stoppingToken.IsCancellationRequested)
    //        {
    //            // Simulate heavy blocking work
    //            await Task.Run(() =>
    //            {
    //                Thread.Sleep(5000); // ❗ BLOCKING ON PURPOSE
    //            });

    //            _logger.LogInformation("Stress cycle completed");
    //        }
    //    }
    //}
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
        {
            var logDbConn = configuration.GetConnectionString("LogDb");
            DbBootstrapper.EnsureDatabaseExists(logDbConn!);


            services.AddCustomProblemDetails()
               .AddCustomCors(configuration)
               .AddBusinessServices()
               .AddAuthManager(configuration)
               .AddForwardedHeaders()
               .AddCustomApiVersioning()
               .AddApiDocumentation()
               .AddClients(configuration)
               .AddExceptionHandling()
               .AddSignalRconfig()
               //.AddControllerWithJsonConfiguration()
               .ConfigureJSON(configuration)
               .AddValidation()
               .AddHttpAccessor()
               .AddTheControllers()
               .AddAutoMapperProfiles()
               .AddOpenTelemetryFunctions()
               .AddDatabase(configuration)
               .AddJwtAuthentication(configuration)
               .AddAuthorizationPolicies()
               .AddCaching(configuration)
               .AddRateLimiting();

            return services;
        }
        public static IServiceCollection AddClients(this IServiceCollection services,IConfiguration configuration)
        {
            services.AddHttpClient<EmployeeDirectoryClient>(client =>
            {
                client.BaseAddress = new Uri(configuration["EmployeeDirectory:BaseUrl"]!);
                client.Timeout = TimeSpan.FromSeconds(30);
            });
            return services;
        }
        public static IServiceCollection AddAutoMapperProfiles(this IServiceCollection services)
        {
            services.AddAutoMapper(cfg => {
                // optionally add additional config here
            }, typeof(MappingProfile).Assembly);
            return services;
        }
        public static IServiceCollection AddSignalRconfig(this IServiceCollection services)
        {
            services.AddSignalR(options =>
            {
                options.AddFilter<HubExceptionFilter>();
                options.EnableDetailedErrors = true;

            });
            return services;
        }
        public static IServiceCollection AddOpenTelemetryFunctions(this IServiceCollection services)
        {
            services.AddOpenTelemetry()
                .ConfigureResource(res => res.AddService("itdepartment"))
                .WithTracing(
                tr =>
                {
                    tr.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation();
                    tr.AddOtlpExporter();
                }
                   );
            return services;
        }
        public static IServiceCollection AddDataProtection(this IServiceCollection services, IConfiguration configuration)
        {
            var keyPath = Path.Combine(AppContext.BaseDirectory, "DataProtectionKeys");
            services.AddDataProtection()
                .PersistKeysToFileSystem(new DirectoryInfo(keyPath))
                .SetApplicationName("ITDepartmentSystem");
            return services;
        }

        public static IServiceCollection AddCustomCors(this IServiceCollection services, IConfiguration configuration)
        {
            var frontendurl = configuration["FrontEnd:BaseUrl"];
            services.AddCors(op=>
            op.AddPolicy("AllowFrontend", op =>
            {
                op.WithOrigins(frontendurl, "http://10.10.10.152:4200", "http://localhost:4200", "https://10.10.10.152:4432")
                 .AllowAnyHeader()
                .AllowCredentials()
                .AllowAnyMethod()
                //.AllowCredentials()
                .SetIsOriginAllowedToAllowWildcardSubdomains()
                .WithExposedHeaders("Content-Disposition", "Content-Length", "Content-Type");
                //.AllowCredentials().
            })
            );
            return services;
        }
        public static IServiceCollection AddAuthManager(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddIdentity<AppUser, IdentityRoleWithPermission>()
                .AddEntityFrameworkStores<AppDbContext>()
                .AddDefaultTokenProviders();

            services.Configure<IdentityOptions>(options =>
            {
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 6;
                options.Password.RequiredUniqueChars = 1;
                options.User.RequireUniqueEmail = false;
            });

            return services;
        }
        public static IServiceCollection AddCaching(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddStackExchangeRedisCache(
                op =>
                {
                    op.InstanceName = "ITDepartmentSystem";
                    op.Configuration = configuration.GetConnectionString("Redis");
                });
            services.AddHybridCache(op =>
            {
                op.DefaultEntryOptions = new()
                {
                    LocalCacheExpiration = TimeSpan.FromSeconds(10),
                    Expiration = TimeSpan.FromMinutes(30),
                };
            });
            return services;
        }


        public static class DbBootstrapper
        {
            public static void EnsureDatabaseExists(string connectionString)
            {
                var csb = new SqlConnectionStringBuilder(connectionString);
                var databaseName = csb.InitialCatalog;

                // connect to master
                csb.InitialCatalog = "master";

                using var conn = new SqlConnection(csb.ConnectionString);
                conn.Open();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = $@"
                IF DB_ID(N'{databaseName}') IS NULL
                BEGIN
                    CREATE DATABASE [{databaseName}];
                END";
                cmd.ExecuteNonQuery();
            }
        }
        public static IServiceCollection AddRateLimiting(this IServiceCollection services)
        {
            services.AddRateLimiter(op =>
            {
                op.AddPolicy("APIPolicy", context => RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context?.User?.Identity?.Name ?? "Anonymous",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = 1000,
                        Window = TimeSpan.FromMinutes(1)
                    }
                    ));
                op.AddPolicy("IPpolice", context => RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: context?.Connection?.RemoteIpAddress?.ToString() ?? "Anonymous",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = 1000,
                        Window = TimeSpan.FromMinutes(1)
                    }
                    ));
            });
            return services;
        }
        public static IServiceCollection AddTheControllers(this IServiceCollection services)
        {
            services.AddControllers();
            return services;
        }

        public static IServiceCollection AddForwardedHeaders(this IServiceCollection services)
        {
            services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

                // IMPORTANT: in locked-down setups, specify KnownProxies / KnownNetworks instead of clearing.
                // options.KnownProxies.Add(IPAddress.Parse("10.0.0.10"));
                // options.KnownNetworks.Add(new IPNetwork(IPAddress.Parse("10.0.0.0"), 8));
                // Trust everything (OK inside private Docker network)
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });

            return services;
        }
        public static IServiceCollection ConfigureJSON(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<JWTConfiguration>(configuration.GetSection("JwtSettings"));
            services.Configure<MailSettings>(configuration.GetSection("MailSettings"));

            return services;

        }

        public static IServiceCollection AddHttpAccessor(this IServiceCollection services)
        {
            services.AddHttpContextAccessor();

            return services;
        }
        public static IServiceCollection AddCustomProblemDetails(this IServiceCollection services)
        {
            services.AddProblemDetails(options =>
            {
                options.CustomizeProblemDetails = (context) =>
                {
                    context.ProblemDetails.Instance = $"{context.HttpContext.Request.Method} {context.HttpContext.Request.Path}";
                    context.ProblemDetails.Extensions.Add("requestId", context.HttpContext.TraceIdentifier);
                };
            });

            return services;
        }
        public static IServiceCollection AddCustomApiVersioning(this IServiceCollection services)
        {
                 services.AddApiVersioning(options =>
                 {
                     options.DefaultApiVersion = new ApiVersion(1, 0);
                     options.AssumeDefaultVersionWhenUnspecified = true;
                     options.ReportApiVersions = true;

                     // ✅ Read version from header
                     options.ApiVersionReader = new HeaderApiVersionReader("X-API-Version");
                 })
            //.AddMvc()
            .AddApiExplorer(options =>
            {
                options.GroupNameFormat = "'v'VVV";
                options.SubstituteApiVersionInUrl = false; // no URL version
            });


            return services;
        }

        public static IServiceCollection AddApiDocumentation(this IServiceCollection services)
        {
            string[] versions = ["v1"];

            foreach (var version in versions)
            {
                services.AddOpenApi(version, options =>
                {
                    // Versioning config
                    options.AddDocumentTransformer<VersionInfoTransformer>();

                    // Security Scheme config

                    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
                    options.AddOperationTransformer<BearerSecuritySchemeTransformer>();
                });
            }
            return services;
        }
        public static IServiceCollection AddExceptionHandling(this IServiceCollection services)
        {
            services.AddExceptionHandler<GlobalExceptionHandler>();
            return services;
        }
        public static IServiceCollection AddValidation(this IServiceCollection services)
        {
            services.AddFluentValidationAutoValidation();
            services.AddValidatorsFromAssemblyContaining<StringValidation>();
            return services;
        }

        public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection") ?? "Data Source = app.db";

            services.AddDbContext<AppDbContext>((sp, options) =>
            {
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"))
                //.UseLazyLoadingProxies()
                ;
                //options.EnableSensitiveDataLogging(); // 👈 shows parameters

                //options.LogTo(Console.WriteLine); // 👈 logs SQL queries
                options.AddInterceptors(
                    sp.GetRequiredService<AuditSaveChangesInterceptor>());
            });

            return services;
        }

        public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var jwtSettings = configuration.GetSection("JwtSettings");

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            }).AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true, // TODO: Set to true in production
                    ClockSkew = TimeSpan.Zero,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings["Issuer"],
                    ValidAudience = jwtSettings["Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!)
                    )
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];

                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) &&
                            (path.StartsWithSegments("/ticketChatHub")
                            || path.StartsWithSegments("/projectChatHub")
                            || path.StartsWithSegments("/taskChatHub")
                            || path.StartsWithSegments("/userChatHub")
                            || path.StartsWithSegments("/communicationHub")
                            || path.StartsWithSegments("/notificationHub")
                            ))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    }
                };
            });

            return services;
        }

        public static IServiceCollection AddAuthorizationPolicies(this IServiceCollection services)
        {
            services.AddAuthorization(options =>
            {
                // Project Management Permissions
                //AddSurveyPolicies(options);
                AddAllPolicies(options);
                // Task Management Permissions
                //AddSurveyTemplatePolicies(options);
            });

            return services;
        }


        public static IServiceCollection AddBusinessServices(this IServiceCollection services)
        {
            services.AddScoped<JwtTokenProvider>();
            services.AddScoped<IAuthService,AuthService>();
            services.AddScoped<IEmployeeService, EmployeeService>();
            services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();

            services.AddSingleton<IBackgroundQueue, BackgroundQueue>();
            services.AddHostedService<BackgroundWorker>();

            services.AddSingleton<IUserIdProvider, CustomUserIdProvider>();
            services.AddSingleton<IEmailService, EmailService>();
            services.AddHostedService<QueuedHostedService>();
            services.AddScoped<AuditSaveChangesInterceptor>();



            services.AddScoped<EmployeeSyncService>();
            services.AddHostedService<EmployeeSyncWorker>();


            services.AddSingleton<UserIdEnricher>(); // register your enricher
            services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
            services.AddScoped(typeof(INotEntityGenericRepository<>), typeof(NotEntityGenericRepository<>));


            services.AddScoped<ISystemService,SystemService>();
            services.AddScoped<ISubModuleService, SubModuleService>();
            services.AddScoped<IIsueStatusService, IssueStatusService>();
            services.AddScoped<ISubModuleService, SubModuleService>();
            services.AddScoped<ICompanyService, CompanyService>();
            services.AddScoped<IIssueTypeService, IssueTypeService>();
            services.AddScoped<ITicketService, TicketService>();
            services.AddScoped<IExternalSystemService, ExternalSystemService>();
            services.AddScoped<IFixedKPIService, FixedKPIService>();
            services.AddScoped<IProjectService, ProjectService>();
            services.AddScoped<ITaskService, TaskService>();
            services.AddScoped<INotificationService, NotificationService>();
            services.AddScoped<IUserMessageService, UserMessageService>();
            services.AddScoped<IArticleService, ArticleService>();

            services.AddHostedService<ScheduledWorker>();


            //services.AddHostedService<ThreadPoolStressWorker>();
            //services.AddHostedService<ThreadPoolStressWorker>();
            //services.AddHostedService<ThreadPoolStressWorker>();
            //services.AddHostedService<ThreadPoolStressWorker>();
            //services.AddHostedService<ThreadPoolStressWorker>();
            return services;
        }


        private static void AddAllPolicies(AuthorizationOptions options)
        {
            foreach(var perm in PermissionCatalog.GetAll())
            {
                options.AddPolicy(perm.Key,
                policy => policy.RequireClaim("permission", perm.Key));
            }
        }
        //private static void AddSurveyTemplatePolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.SurveyTemplate.Create,
        //        policy => policy.RequireClaim("permission", Permission.SurveyTemplate.Create));
        //    options.AddPolicy(Permission.SurveyTemplate.Read,
        //        policy => policy.RequireClaim("permission", Permission.SurveyTemplate.Read));
        //    options.AddPolicy(Permission.SurveyTemplate.Update,
        //        policy => policy.RequireClaim("permission", Permission.SurveyTemplate.Update));
        //    options.AddPolicy(Permission.SurveyTemplate.Delete,
        //        policy => policy.RequireClaim("permission", Permission.SurveyTemplate.Delete));
        //    //options.AddPolicy(Permission.SurveyTemplate.ManageBudget,
        //    //    policy => policy.RequireClaim("permission", Permission.SurveyTemplate.ManageBudget));
        //}

        //private static void AddSurveyPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.Survey.Create,
        //        policy => policy.RequireClaim("permission", Permission.Survey.Create));
        //    options.AddPolicy(Permission.Survey.Read,
        //        policy => policy.RequireClaim("permission", Permission.Survey.Read));
        //    options.AddPolicy(Permission.Survey.Update,
        //        policy => policy.RequireClaim("permission", Permission.Survey.Update));
        //    options.AddPolicy(Permission.Survey.Delete,
        //        policy => policy.RequireClaim("permission", Permission.Survey.Delete));
        //    //options.AddPolicy(Permission.Survey.AssignUser,
        //    //    policy => policy.RequireClaim("permission", Permission.Survey.AssignUser));
        //    //options.AddPolicy(Permission.Survey.UpdateStatus,
        //    //    policy => policy.RequireClaim("permission", Permission.Survey.UpdateStatus));
        //    //options.AddPolicy(Permission.Survey.Comment,
        //    //    policy => policy.RequireClaim("permission", Permission.Survey.Comment));
        //}
        //public static void AddAllPolicies(AuthorizationOptions options)
        //{
        //    AddSurveyPolicies(options);
        //    AddSurveyDepartmentPolicies(options);
        //    AddSurveyQuestionPolicies(options);
        //    AddSurveyTemplatePolicies(options);
        //    AddTemplateSurveyQuestionPolicies(options);
        //    AddAnsweredSurveyPolicies(options);
        //    AddEvaluatingEmployeePolicies(options);
        //    AddEmployeePolicies(options);
        //    AddDepartmentPolicies(options);
        //    AddCompetencyPolicies(options);
        //    AddCompetencyTemplatePolicies(options);
        //    AddFixedCompetencyPolicies(options);
        //    AddFixedQuestionPolicies(options);
        //    AddAppUserPolicies(options);
        //}
        //private static void AddSurveyTemplatePolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.SurveyTemplate.Create,
        //        policy => policy.RequireClaim("permission", Permission.SurveyTemplate.Create));
        //    options.AddPolicy(Permission.SurveyTemplate.Read,
        //        policy => policy.RequireClaim("permission", Permission.SurveyTemplate.Read));
        //    options.AddPolicy(Permission.SurveyTemplate.Update,
        //        policy => policy.RequireClaim("permission", Permission.SurveyTemplate.Update));
        //    options.AddPolicy(Permission.SurveyTemplate.Delete,
        //        policy => policy.RequireClaim("permission", Permission.SurveyTemplate.Delete));
        //}

        //private static void AddSurveyPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.Survey.Create,
        //        policy => policy.RequireClaim("permission", Permission.Survey.Create));
        //    options.AddPolicy(Permission.Survey.Read,
        //        policy => policy.RequireClaim("permission", Permission.Survey.Read));
        //    options.AddPolicy(Permission.Survey.Update,
        //        policy => policy.RequireClaim("permission", Permission.Survey.Update));
        //    options.AddPolicy(Permission.Survey.Delete,
        //        policy => policy.RequireClaim("permission", Permission.Survey.Delete));
        //}

        //private static void AddSurveyDepartmentPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.SurveyDepartment.Create,
        //        policy => policy.RequireClaim("permission", Permission.SurveyDepartment.Create));
        //    options.AddPolicy(Permission.SurveyDepartment.Read,
        //        policy => policy.RequireClaim("permission", Permission.SurveyDepartment.Read));
        //    options.AddPolicy(Permission.SurveyDepartment.Update,
        //        policy => policy.RequireClaim("permission", Permission.SurveyDepartment.Update));
        //    options.AddPolicy(Permission.SurveyDepartment.Delete,
        //        policy => policy.RequireClaim("permission", Permission.SurveyDepartment.Delete));
        //}

        //private static void AddSurveyQuestionPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.SurveyQuestion.Create,
        //        policy => policy.RequireClaim("permission", Permission.SurveyQuestion.Create));
        //    options.AddPolicy(Permission.SurveyQuestion.Read,
        //        policy => policy.RequireClaim("permission", Permission.SurveyQuestion.Read));
        //    options.AddPolicy(Permission.SurveyQuestion.Update,
        //        policy => policy.RequireClaim("permission", Permission.SurveyQuestion.Update));
        //    options.AddPolicy(Permission.SurveyQuestion.Delete,
        //        policy => policy.RequireClaim("permission", Permission.SurveyQuestion.Delete));
        //}

        //private static void AddTemplateSurveyQuestionPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.TemplateSurveyQuestion.Create,
        //        policy => policy.RequireClaim("permission", Permission.TemplateSurveyQuestion.Create));
        //    options.AddPolicy(Permission.TemplateSurveyQuestion.Read,
        //        policy => policy.RequireClaim("permission", Permission.TemplateSurveyQuestion.Read));
        //    options.AddPolicy(Permission.TemplateSurveyQuestion.Update,
        //        policy => policy.RequireClaim("permission", Permission.TemplateSurveyQuestion.Update));
        //    options.AddPolicy(Permission.TemplateSurveyQuestion.Delete,
        //        policy => policy.RequireClaim("permission", Permission.TemplateSurveyQuestion.Delete));
        //}

        //private static void AddAnsweredSurveyPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.AnsweredSurvey.Create,
        //        policy => policy.RequireClaim("permission", Permission.AnsweredSurvey.Create));
        //    options.AddPolicy(Permission.AnsweredSurvey.Read,
        //        policy => policy.RequireClaim("permission", Permission.AnsweredSurvey.Read));
        //    options.AddPolicy(Permission.AnsweredSurvey.Update,
        //        policy => policy.RequireClaim("permission", Permission.AnsweredSurvey.Update));
        //    options.AddPolicy(Permission.AnsweredSurvey.Delete,
        //        policy => policy.RequireClaim("permission", Permission.AnsweredSurvey.Delete));
        //}

        //private static void AddEvaluatingEmployeePolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.EvaluatingEmployee.Create,
        //        policy => policy.RequireClaim("permission", Permission.EvaluatingEmployee.Create));
        //    options.AddPolicy(Permission.EvaluatingEmployee.Read,
        //        policy => policy.RequireClaim("permission", Permission.EvaluatingEmployee.Read));
        //    options.AddPolicy(Permission.EvaluatingEmployee.Update,
        //        policy => policy.RequireClaim("permission", Permission.EvaluatingEmployee.Update));
        //    options.AddPolicy(Permission.EvaluatingEmployee.Delete,
        //        policy => policy.RequireClaim("permission", Permission.EvaluatingEmployee.Delete));
        //}

        //private static void AddEmployeePolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.Employee.Create,
        //        policy => policy.RequireClaim("permission", Permission.Employee.Create));
        //    options.AddPolicy(Permission.Employee.Read,
        //        policy => policy.RequireClaim("permission", Permission.Employee.Read));
        //    options.AddPolicy(Permission.Employee.Update,
        //        policy => policy.RequireClaim("permission", Permission.Employee.Update));
        //    options.AddPolicy(Permission.Employee.Delete,
        //        policy => policy.RequireClaim("permission", Permission.Employee.Delete));
        //}

        //private static void AddDepartmentPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.Department.Create,
        //        policy => policy.RequireClaim("permission", Permission.Department.Create));
        //    options.AddPolicy(Permission.Department.Read,
        //        policy => policy.RequireClaim("permission", Permission.Department.Read));
        //    options.AddPolicy(Permission.Department.Update,
        //        policy => policy.RequireClaim("permission", Permission.Department.Update));
        //    options.AddPolicy(Permission.Department.Delete,
        //        policy => policy.RequireClaim("permission", Permission.Department.Delete));
        //}

        //private static void AddCompetencyPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.Competency.Create,
        //        policy => policy.RequireClaim("permission", Permission.Competency.Create));
        //    options.AddPolicy(Permission.Competency.Read,
        //        policy => policy.RequireClaim("permission", Permission.Competency.Read));
        //    options.AddPolicy(Permission.Competency.Update,
        //        policy => policy.RequireClaim("permission", Permission.Competency.Update));
        //    options.AddPolicy(Permission.Competency.Delete,
        //        policy => policy.RequireClaim("permission", Permission.Competency.Delete));
        //}

        //private static void AddCompetencyTemplatePolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.CompetencyTemplate.Create,
        //        policy => policy.RequireClaim("permission", Permission.CompetencyTemplate.Create));
        //    options.AddPolicy(Permission.CompetencyTemplate.Read,
        //        policy => policy.RequireClaim("permission", Permission.CompetencyTemplate.Read));
        //    options.AddPolicy(Permission.CompetencyTemplate.Update,
        //        policy => policy.RequireClaim("permission", Permission.CompetencyTemplate.Update));
        //    options.AddPolicy(Permission.CompetencyTemplate.Delete,
        //        policy => policy.RequireClaim("permission", Permission.CompetencyTemplate.Delete));
        //}

        //private static void AddFixedCompetencyPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.FixedCompetency.Create,
        //        policy => policy.RequireClaim("permission", Permission.FixedCompetency.Create));
        //    options.AddPolicy(Permission.FixedCompetency.Read,
        //        policy => policy.RequireClaim("permission", Permission.FixedCompetency.Read));
        //    options.AddPolicy(Permission.FixedCompetency.Update,
        //        policy => policy.RequireClaim("permission", Permission.FixedCompetency.Update));
        //    options.AddPolicy(Permission.FixedCompetency.Delete,
        //        policy => policy.RequireClaim("permission", Permission.FixedCompetency.Delete));
        //}

        //private static void AddFixedQuestionPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.FixedQuestion.Create,
        //        policy => policy.RequireClaim("permission", Permission.FixedQuestion.Create));
        //    options.AddPolicy(Permission.FixedQuestion.Read,
        //        policy => policy.RequireClaim("permission", Permission.FixedQuestion.Read));
        //    options.AddPolicy(Permission.FixedQuestion.Update,
        //        policy => policy.RequireClaim("permission", Permission.FixedQuestion.Update));
        //    options.AddPolicy(Permission.FixedQuestion.Delete,
        //        policy => policy.RequireClaim("permission", Permission.FixedQuestion.Delete));
        //}

        //private static void AddAppUserPolicies(AuthorizationOptions options)
        //{
        //    options.AddPolicy(Permission.AppUser.Create,
        //        policy => policy.RequireClaim("permission", Permission.AppUser.Create));
        //    options.AddPolicy(Permission.AppUser.Read,
        //        policy => policy.RequireClaim("permission", Permission.AppUser.Read));
        //    options.AddPolicy(Permission.AppUser.Update,
        //        policy => policy.RequireClaim("permission", Permission.AppUser.Update));
        //    options.AddPolicy(Permission.AppUser.Delete,
        //        policy => policy.RequireClaim("permission", Permission.AppUser.Delete));
        //}
    }
}
