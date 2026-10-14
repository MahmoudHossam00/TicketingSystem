using System.Threading.Channels;

namespace ITDepartmentSystem.Services.IServices
{
    public interface IBackgroundTaskQueue
    {
        ValueTask QueueAsync(Func<IServiceProvider, CancellationToken, Task> workItem);
        ValueTask<Func<IServiceProvider, CancellationToken, Task>> DequeueAsync(CancellationToken cancellationToken);
    }
    public sealed class BackgroundTaskQueue : IBackgroundTaskQueue
    {
        private readonly Channel<Func<IServiceProvider, CancellationToken, Task>> _queue =
            Channel.CreateUnbounded<Func<IServiceProvider, CancellationToken, Task>>(
                new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });

        public ValueTask QueueAsync(Func<IServiceProvider, CancellationToken, Task> workItem)
        {
            if (workItem is null) throw new ArgumentNullException(nameof(workItem));
            return _queue.Writer.WriteAsync(workItem);
        }

        public ValueTask<Func<IServiceProvider, CancellationToken, Task>> DequeueAsync(CancellationToken cancellationToken)
            => _queue.Reader.ReadAsync(cancellationToken);
    }


    public sealed class QueuedHostedService : BackgroundService
    {
        private readonly IBackgroundTaskQueue _queue;
        private readonly IServiceProvider _sp;
        private readonly ILogger<QueuedHostedService> _logger;

        public QueuedHostedService(IBackgroundTaskQueue queue, IServiceProvider sp, ILogger<QueuedHostedService> logger)
        {
            _queue = queue;
            _sp = sp;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("QueuedHostedService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                var workItem = await _queue.DequeueAsync(stoppingToken);

                try
                {
                    // new DI scope for each job (important)
                    using var scope = _sp.CreateScope();
                    await workItem(scope.ServiceProvider, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Background job failed. Message: {Message}, Inner: {Inner}",
                        ex.Message,
                        ex.InnerException?.Message);
                }
            }

            _logger.LogInformation("QueuedHostedService stopped.");
        }
    }
}
