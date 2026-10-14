namespace ITDepartmentSystem.BackGroundServices
{
    public class EmployeeSyncWorker(
    IServiceProvider sp,
    ILogger<EmployeeSyncWorker> logger,
    IConfiguration cfg) : BackgroundService
    {
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var intervalMin = cfg.GetValue<int>("EmployeeSync:IntervalMinutes", 360);
            var interval = TimeSpan.FromMinutes(intervalMin);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = sp.CreateScope();
                    var svc = scope.ServiceProvider.GetRequiredService<EmployeeSyncService>();
                    await svc.SyncAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Employee sync failed");
                }

                await Task.Delay(interval, stoppingToken);
            }
        }
    }
}
