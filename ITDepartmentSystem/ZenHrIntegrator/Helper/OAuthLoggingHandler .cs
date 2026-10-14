using Serilog;

namespace ZenHrIntegrator.Helper
{
    public class OAuthLoggingHandler : DelegatingHandler
    {
        private readonly Serilog.ILogger _logger;

        public OAuthLoggingHandler()
        {
            _logger = new LoggerConfiguration()
                .WriteTo.File(
                    "Logs/zenhr-oauth-.log",
                    rollingInterval: RollingInterval.Day
                )
                .CreateLogger();
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var requestBody = request.Content != null
                ? await request.Content.ReadAsStringAsync()
                : string.Empty;

            _logger.Information(
                "➡️ REQUEST {Method} {Url}\nHeaders: {Headers}\nBody: {Body}",
                request.Method,
                request.RequestUri,
                request.Headers.ToString(),
                requestBody
                //SensitiveDataMasker.MaskJson(requestBody)
            );

            try
            {
                var response = await base.SendAsync(request, cancellationToken);

                var responseBody = response.Content != null
                    ? await response.Content.ReadAsStringAsync()
                    : string.Empty;

                _logger.Information(
                    "⬅️ RESPONSE {StatusCode}\nBody: {Body}",
                    response.StatusCode,
                    responseBody
                    //SensitiveDataMasker.MaskJson(responseBody)
                );

                return response;
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "❌ OAuth request failed");
                throw;
            }
        }
    }

}
