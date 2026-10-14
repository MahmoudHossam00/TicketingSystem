using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ZenHrIntegrator.Services.Interfaces;

namespace ZenHrIntegrator.Helper
{
    public class ScheduledWorker : BackgroundService
    {
        private readonly ILogger<ScheduledWorker> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromDays(1);
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly string _logFile = Path.Combine(AppContext.BaseDirectory, "ScheduledWorker.log");

        public ScheduledWorker(ILogger<ScheduledWorker> logger, IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            Log("ScheduledWorker started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    Log("Starting scheduled task");
                    await RunYourTaskAsync();
                    Log("Scheduled task completed");
                }
                catch (Exception ex)
                {
                    Log($"Error occurred: {ex}");
                }

                Log($"Waiting for next run in {_interval}");
                await Task.Delay(_interval, stoppingToken);
            }

            Log("ScheduledWorker stopping");
        }

        private async Task RunYourTaskAsync()
        {
            using var scope = _scopeFactory.CreateScope();

            var headCountService = scope.ServiceProvider.GetRequiredService<IHeadCountService>();
            Log("Starting HeadCountService.UpdateEmployeesAsync");
            await headCountService.UpdateEmployeesAsync();
            Log("Completed HeadCountService.UpdateEmployeesAsync");

            var zenServerService = scope.ServiceProvider.GetRequiredService<IZenServerService>();
            Log("Starting ZenServerService.IntegrateEmployeesBranches");
            await zenServerService.IntegrateEmployeesBranches();
            Log("Completed ZenServerService.IntegrateEmployeesBranches");
        }

        private void Log(string message)
        {
            var logMessage = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} - {message}";

            // Console
            _logger.LogInformation(logMessage);

            // File
            try
            {
                File.AppendAllText(_logFile, logMessage + Environment.NewLine);
            }
            catch
            {
                File.AppendAllText(_logFile, "failed something occured error code 5151");
            }
        }
    }
}