using Microsoft.EntityFrameworkCore;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Scalar.AspNetCore;
using System.Net.Http.Headers;
using ZenHrIntegrator.Helper;
using ZenHrIntegrator.Models;
using ZenHrIntegrator.SecondContext;
using ZenHrIntegrator.Services;
using ZenHrIntegrator.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(OP => OP.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddDbContext<SecondDbContext>(OP => OP.UseSqlServer(builder.Configuration.GetConnectionString("ZenHrConnection")));
builder.Services.AddControllers();
builder.Services.AddScoped<ITokenService,TokenService>();
builder.Services.AddScoped<IHeadCountService,HeadCountService>();
builder.Services.AddScoped<IZenHrLookupService, ZenHrLookupService>();
builder.Services.AddScoped<IZenServerService, ZenServerService>();
builder.Services.AddHostedService<ScheduledWorker>();
var frontendurl = builder.Configuration["FrontEnd:BaseUrl"];
builder.Services.AddCors(op =>
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
builder.Services.Configure<ZenHrOAuthOptions>(builder.Configuration.GetSection("ZenHrOAuthOptions"));

builder.Services.AddTransient<OAuthLoggingHandler>();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("ZenHrOAuth", client =>
{
    client.BaseAddress = new Uri("https://app.zenhr.com/");
    client.DefaultRequestHeaders.Accept.Add(
        new MediaTypeWithQualityHeaderValue("application/json"));
})
.AddHttpMessageHandler<OAuthLoggingHandler>();

builder.Services.AddOpenTelemetry()
                .ConfigureResource(res => res.AddService("itdepartment"))
                .WithTracing(
                tr =>
                {
                    tr.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation();
                    tr.AddOtlpExporter();
                }
                   );
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddHttpClient();
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");   // ⬅️ هنا

app.UseAuthorization();

app.MapControllers();

app.Run();
