using ITDepartmentSystem.OtherSystems.HeadCount;

namespace ITDepartmentSystem.Clients
{
    public class EmployeeDirectoryClient(HttpClient http)
    {
        public async Task<List<EmployeeFullDto>> GetChanges(DateTime since, CancellationToken ct = default)
        {
            try
            {
                var url = $"api/EmployeeCount/since/{Uri.EscapeDataString(since.ToUniversalTime().ToString("O"))}";
                var request = new HttpRequestMessage(HttpMethod.Get, url);

                // 👇 هنا تقدر تشوف كل حاجة
                // request.Method
                // request.RequestUri
                // request.Headers

                var fullUri = new Uri(http.BaseAddress!, url);

                Console.WriteLine($"HTTP REQUEST => {request.Method} {fullUri}");

                var response = await http.SendAsync(request, ct);

                response.EnsureSuccessStatusCode();

                return await response.Content.ReadFromJsonAsync<List<EmployeeFullDto>>(cancellationToken: ct) ?? new();
            }
            catch (Exception ex)
            {
                throw new Exception();
            }
        }

        public async Task<List<EmployeeFullDto>> GetAll(CancellationToken ct = default)
        {
            return await http.GetFromJsonAsync<List<EmployeeFullDto>>("api/EmployeeCount", ct) ?? new();
        }
    }
}
