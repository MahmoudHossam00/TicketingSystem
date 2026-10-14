namespace ITDepartmentSystem.Services.IServices
{
    public interface IEmailService
    {
        Task SendAsync(EmailRequest request, CancellationToken token = default);
    }
}
