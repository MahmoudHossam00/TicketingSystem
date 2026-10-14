using ITDepartmentSystem;
using ITDepartmentSystem.Hubs;
using ITDepartmentSystem.Middleware;
using OfficeOpenXml;
using Scalar.AspNetCore;
using Serilog;
using System.Diagnostics;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddApplicationServices(builder.Configuration);

ExcelPackage.License.SetNonCommercialPersonal("Mahmoud");

builder.Host.UseSerilog((ctx, services, log) =>
{
    log.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext()
       .Enrich.With(services.GetRequiredService<UserIdEnricher>());

    // ✅ Add console only if there is a console
    if (Environment.UserInteractive)
        log.WriteTo.Console();
});


var app = builder.Build();
app.UseForwardedHeaders();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseHsts();
}

// 2) forwarded headers

// 3) exception handling
app.UseExceptionHandler();
app.UseStatusCodePages();

app.UseStaticFiles();
// 4) https
//app.UseHttpsRedirection();
var corsPolicies = builder.Services
    .Where(s => s.ServiceType.Name.Contains("Cors"));

Console.WriteLine("CORS services registered:");
foreach (var service in corsPolicies)
{
    Console.WriteLine($"- {service.ServiceType}");
}
// 5) routing  ⬅️⬅️⬅️ مهم جدًا
app.UseRouting();
//app.Use(async (context, next) =>
//{
//    Console.WriteLine("---- Incoming Request ----");
//    Console.WriteLine($"Method: {context.Request.Method}");
//    Console.WriteLine($"Path: {context.Request.Path}");
//    Console.WriteLine($"Origin: {context.Request.Headers["Origin"]}");
//    Console.WriteLine($"Access-Control-Request-Method: {context.Request.Headers["Access-Control-Request-Method"]}");
//    Console.WriteLine($"Access-Control-Request-Headers: {context.Request.Headers["Access-Control-Request-Headers"]}");

//    await next();

//    Console.WriteLine("---- Response ----");
//    Console.WriteLine($"Status Code: {context.Response.StatusCode}");
//    Console.WriteLine($"Access-Control-Allow-Origin: {context.Response.Headers["Access-Control-Allow-Origin"]}");
//    Console.WriteLine($"Access-Control-Allow-Methods: {context.Response.Headers["Access-Control-Allow-Methods"]}");
//    Console.WriteLine($"Access-Control-Allow-Headers: {context.Response.Headers["Access-Control-Allow-Headers"]}");
//    Console.WriteLine("--------------------------");
//});
app.Use(async (ctx, next) =>
{
    var sw = Stopwatch.StartNew();

    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = ctx.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("RequestLogger");

        logger.LogError(ex, "FAILED {Path}", ctx.Request.Path);
        throw;
    }
    finally
    {
        sw.Stop();

        var logger = ctx.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("RequestLogger");

        logger.LogInformation(
            "END {Path} {StatusCode} {Time}ms",
            ctx.Request.Path,
            ctx.Response.StatusCode,
            sw.ElapsedMilliseconds);
    }
});
app.UseCors("AllowFrontend");   // ⬅️ هنا

app.UseAuthentication();
//app.UseMiddleware<ForcePasswordChangeMiddleware>();

app.UseAuthorization();


app.UseRateLimiter();

app.MapControllers();
app.MapHub<TicketChatHub>("/ticketChatHub");
app.MapHub<ProjectChatHub>("/projectChatHub");
app.MapHub<TaskChatHub>("/taskChatHub");
app.MapHub<UserChatHub>("/userChatHub");
app.MapHub<CommunicationHub>("/communicationHub");
app.MapHub<NotificationHub>("/notificationHub");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Project API V1");
        //options.SwaggerEndpoint("/openapi/v2.json", "Project API V2");

        options.EnableDeepLinking();
        options.DisplayRequestDuration();
        options.EnableFilter();
    });

    app.MapScalarApiReference();
}

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await AppDbContextInitializer.InitializeAsync(context);
}

app.Run();
