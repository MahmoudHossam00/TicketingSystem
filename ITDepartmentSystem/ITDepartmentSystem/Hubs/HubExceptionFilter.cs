namespace ITDepartmentSystem.Hubs
{
    using Microsoft.AspNetCore.SignalR;
    using Microsoft.Extensions.Logging;

    public class HubExceptionFilter : IHubFilter
    {
        private readonly ILogger<HubExceptionFilter> _logger;

        public HubExceptionFilter(ILogger<HubExceptionFilter> logger)
        {
            _logger = logger;
        }

        public async ValueTask<object?> InvokeMethodAsync(
            HubInvocationContext invocationContext,
            Func<HubInvocationContext, ValueTask<object?>> next)
        {
            try
            {
                return await next(invocationContext);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "SignalR error in Hub {Hub}, Method {Method}, User {User}",
                    invocationContext.Hub.GetType().Name,
                    invocationContext.HubMethodName,
                    invocationContext.Context.UserIdentifier);

                throw; // IMPORTANT: rethrow so client still sees it
            }
        }
    }
}
