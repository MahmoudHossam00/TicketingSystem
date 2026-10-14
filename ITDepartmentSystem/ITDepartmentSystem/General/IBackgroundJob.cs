using System.Threading.Channels;

namespace ITDepartmentSystem.General
{
    public interface IBackgroundJob
    {
        Task ExecuteAsync(IServiceProvider serviceProvider, CancellationToken token = default);
    }
    public interface IBackgroundQueue
    {
        ValueTask EnqueueAsync(IBackgroundJob job, CancellationToken token = default);
        ValueTask<IBackgroundJob> DequeueAsync(CancellationToken token);
    }
    public class SendEmailJob : IBackgroundJob
    {
        public string ToEmail { get; set; }
        public string ToName { get; set; }
        public string Subject { get; set; }
        public required string HtmlBody { get; set; }

        public List<string> To { set; get; } = [];
        public List<string> CC { set; get; } = [];
        public async Task ExecuteAsync(IServiceProvider serviceProvider,CancellationToken token=default)
        {
            var emailService = serviceProvider.GetRequiredService<IEmailService>();
            await emailService.SendAsync(new EmailRequest() { HtmlBody=HtmlBody,Subject=Subject,ToEmail=ToEmail,To=To,CC=CC,
                ToName= ToName
            },token);
        }
    }

    public class SendNotificationJob : IBackgroundJob
    {
        public string ToEmail { get; set; }
        public string ToName { get; set; }
        public string Subject { get; set; }
        public string Body { get; set; }
        public required string HtmlBody { get; set; }

        public List<string> To { set; get; } = [];
        public List<string> CC { set; get; } = [];
        public async Task ExecuteAsync(IServiceProvider serviceProvider, CancellationToken token = default)
        {
            var emailService = serviceProvider.GetRequiredService<IEmailService>();
            await emailService.SendAsync(new EmailRequest()
            {
                HtmlBody = HtmlBody,
                Subject = Subject,
                ToEmail = ToEmail,
                To = To,
                CC = CC,
                ToName = ToName
            }, token);
        }
    }

    public class BackgroundQueue : IBackgroundQueue
    {
        private readonly Channel<IBackgroundJob> _queue = Channel.CreateUnbounded<IBackgroundJob>();

        public async ValueTask EnqueueAsync(IBackgroundJob job, CancellationToken token = default)
        {
            await _queue.Writer.WriteAsync(job);
        }

        public async ValueTask<IBackgroundJob> DequeueAsync(CancellationToken token)
        {
            return await _queue.Reader.ReadAsync(token);
        }
    }

    public class BackgroundWorker : BackgroundService
    {
        private readonly IBackgroundQueue _queue;
        private readonly IServiceProvider _serviceProvider;

        public BackgroundWorker(IBackgroundQueue queue, IServiceProvider serviceProvider)
        {
            _queue = queue;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                var job = await _queue.DequeueAsync(stoppingToken);

                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    await job.ExecuteAsync(scope.ServiceProvider,stoppingToken);
                }
                catch (Exception ex)
                {
                    // log error
                }
            }
        }
    }
}
