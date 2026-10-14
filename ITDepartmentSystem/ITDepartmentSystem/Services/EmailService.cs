using Microsoft.Extensions.Options;
using MimeKit;
using System.Net;
using System.Net.Mail;

namespace ITDepartmentSystem.Services
{
    public class EmailService : IEmailService
    {
        private readonly MailSettings _settings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptionsMonitor<MailSettings> settings, ILogger<EmailService> logger)
        {
            _settings = settings.CurrentValue;
            _logger = logger;
        }

        public async Task SendAsync(EmailRequest request, CancellationToken token = default)
        {
            var message = new MimeMessage();

            var mail = new MailMessage
            {
                From = new MailAddress(_settings.Email, _settings.DisplayName),
                Subject = request.Subject,
                Body = request.HtmlBody,
                IsBodyHtml = true
            };
            // ✅ DisplayName appears to recipients
            //message.From.Add(new MailboxAddress(_settings.DisplayName, _settings.Email));

            mail.To.Add(request.ToEmail);
            foreach(var to in request.To)
            {
                mail.To.Add(to);
            }
            foreach (var cc in request.CC)
            {
                mail.To.Add(cc);
            }
            mail.Subject = request.Subject;
            using var smtp = new SmtpClient
            {
                Host = _settings.Host,
                Port = _settings.Port,
                EnableSsl = true,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(_settings.Email, _settings.Password)
            };
            smtp.EnableSsl = true;
            smtp.Timeout = 10000;


            try
            {
                await smtp.SendMailAsync(mail);
                _logger.LogInformation("Email sent to {To} with subject {Subject}", request.ToEmail, request.Subject);

            }
            catch (Exception ex)
            {
                Console.WriteLine($"SMTP Error: {ex.Message}");
            }

            //var builder = new BodyBuilder
            //{
            //    HtmlBody = request.HtmlBody
            //};

            //foreach (var (content, fileName, contentType) in request.Attachments)
            //{
            //    builder.Attachments.Add(fileName, content, ContentType.Parse(contentType));
            //}

            //message.Body = builder.ToMessageBody();

            //using var client = new SmtpClient();

            //// optional: useful to avoid old SSL issues
            //// client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            //var secure = _settings.UseSsl
            //    ? SecureSocketOptions.SslOnConnect      // Port 465
            //    : SecureSocketOptions.StartTlsWhenAvailable; // Port 587 typically

            //await client.ConnectAsync(_settings.Host, _settings.Port, secure, token);

            //// if your server requires it
            //await client.AuthenticateAsync(_settings.Email, _settings.Password, token);

            //await client.SendAsync(message, token);
            //await client.DisconnectAsync(true, token);

            _logger.LogInformation("Email sent to {To} with subject {Subject}", request.ToEmail, request.Subject);
        }
    }
}
