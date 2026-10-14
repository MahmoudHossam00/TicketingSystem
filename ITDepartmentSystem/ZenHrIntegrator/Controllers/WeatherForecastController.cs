using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using ZenHrIntegrator.Models;

namespace ZenHrIntegrator.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class WeatherForecastController (AppDbContext context): ControllerBase
    {

    //    [HttpGet("get")]
    //    public async Task<IActionResult> Get()
    //    {

    //        var url = "https://app.zenhr.com/api/v3/branches";
    //        var token = "eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwcC56ZW5oci5jb20iLCJhcHAiOiJDUk0gQVBJIEludGVncmF0aW9uIiwiYXBwX2lkIjoyMjcsImlhdCI6MTc2ODk4NTkzMiwiYXVkIjoibi1XTEZObXRidEY5SEVDM0l5VHRVZFAwWVUxczZKOUpRbDhfVVZaeEtmTSIsImp0aSI6IjNlNTFhYThmLWRlMWYtNGE1Mi1hODM1LTFkNWY3N2I1YTJjZSIsInN1YiI6NjUyODE4LCJzY29wZXMiOlsicmVhZDpicmFuY2giLCJyZWFkOmVtcGxveWVlIiwicmVhZDpwcm9mZXNzaW9uYWxfaW5mbyIsInJlYWQ6dGltZW9mZl90cmFuc2FjdGlvbiIsInJlYWQ6dGltZW9mZl90cmFuc2FjdGlvbl9yZXF1ZXN0IiwicmVhZDp0aW1lb2ZmIl0sInJlc291cmNlIjp7InR5cGUiOiJDb21wYW55IiwiaWQiOjEyOTg0fSwicHJvcHMiOnsiYWNjZXNzZWRfYnJhbmNoZXNfaWRzIjpbXSwiY29tcGFueV9pZCI6MTI5ODQsImJyYW5jaF9pZCI6bnVsbCwidXNlcl9pZCI6bnVsbCwiZW1wbG95ZWVfaWQiOm51bGwsIm5hbWUiOiJGUEkgR3JvdXAiLCJlbWFpbCI6bnVsbCwiY29uZmlybWVkX2F0IjpudWxsLCJ1bmxvY2tfdG9rZW4iOm51bGwsImFjdGl2ZSI6dHJ1ZSwiZGV2aWNlX2lkIjpudWxsLCJob21lX2NvdW50cnkiOm51bGx9LCJleHAiOjE3Njg5ODk1MzJ9.ZVL9g_opQhdAKOikO6N5iZIqgtpYOUzAnVqfYBY3PoLNDtEKWwSYtOOUXkdTF9gtNUAOd_EMWU53ie6m8PnWl39d4ZWjbd47OAIZwbKOwBTNZCKb93VDDH1QXv_DtJqGTr8Ncj-bqiMgjP9w5PBM2QMhdU9FHQSJCyir_D6JFdD1MtQ92F0c2sBwtotd-scIW5u636GXOKfOIxstgK_73adunP5MAn5k0vhn0uHoI8xcA5ME_3KnS1U3F9kPxv2eK3rWa01TzV7I1trZ3NnTsrJcEJnxnZimJPMsXnmh7MbFDLUYBZ_P74RHE3qmaZjzg_vKizo60oGU6wcDNFGvhg"; // full token

    //        using var request = new HttpRequestMessage(HttpMethod.Get, url);

    //        // EXACT headers
    //        request.Headers.TryAddWithoutValidation("Accept", "application/json");
    //        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");




    //        var response = await httpclient.SendAsync(request);
    //        var responsebody = await response.Content.ReadAsStringAsync();
    //        using var jsonDoc = JsonDocument.Parse(responsebody);

    //        var ids = new List<int>();

    //        foreach (var item in jsonDoc.RootElement.GetProperty("data").EnumerateArray())
    //        {
    //            ids.Add(item.GetProperty("id").GetInt32());
    //        }

    //        //Dictionary<int, List<int>> branchemployeedictionary = new();
    //        var employeeList = new List<EmployeeInfo>(); // List to hold the employee info

    //        foreach (var id in ids)
    //        {
    //            int page = 1;
    //            int totalnumberofpages = 1;
    //            while (page <= totalnumberofpages)
    //            {
    //                var url2 = $"https://app.zenhr.com/api/v3/branches/{id}/employees?limit=25&page={page++}&include[]=employee.professional_datum";
    //                using var request2 = new HttpRequestMessage(HttpMethod.Get, url2);

    //                // EXACT headers
    //                request2.Headers.TryAddWithoutValidation("Accept", "application/json");
    //                request2.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");
    //                response = await httpclient.SendAsync(request2);
    //                responsebody = await response.Content.ReadAsStringAsync();
    //                using var jsonDoc2 = JsonDocument.Parse(responsebody);
    //                totalnumberofpages = jsonDoc2.RootElement.GetProperty("pagination").GetProperty("total_pages").GetInt32();


    //                foreach (var item in jsonDoc2.RootElement.GetProperty("data").EnumerateArray())
    //                {
    //                    var employee = new EmployeeInfo();

    //                    employee.EnglishName = item.GetProperty("user").GetProperty("name").GetProperty("en").GetProperty("first_name").GetString() + " " +
    //                        item.GetProperty("user").GetProperty("name").GetProperty("en").GetProperty("second_name").GetString() + " " +
    //                        item.GetProperty("user").GetProperty("name").GetProperty("en").GetProperty("third_name").GetString() + " " +
    //                    item.GetProperty("user").GetProperty("name").GetProperty("en").GetProperty("last_name").GetString();

    //                    employee.ArabicName = item.GetProperty("user").GetProperty("name").GetProperty("ar").GetProperty("first_name").GetString() + " " +
    //                        item.GetProperty("user").GetProperty("name").GetProperty("ar").GetProperty("second_name").GetString() + " " +
    //                        item.GetProperty("user").GetProperty("name").GetProperty("ar").GetProperty("third_name").GetString() + " " +
    //                    item.GetProperty("user").GetProperty("name").GetProperty("ar").GetProperty("last_name").GetString();

    //                    employee.EmploymentNumber = item.GetProperty("employment_number").GetString();
    //                    employee.Branch_Id = item.GetProperty("branch").GetProperty("id").GetInt32();
    //                    employee.Active = item.GetProperty("active").GetBoolean();
    //                    if (item.TryGetProperty("termination_date", out var terminationDateElement) && terminationDateElement.ValueKind != JsonValueKind.Null)
    //                    {
    //                        // Try to get the DateTime value from the element
    //                        if (terminationDateElement.TryGetDateTime(out var terminationDate))
    //                        {
    //                            employee.TerminationDate = terminationDate;
    //                        }
    //                        else
    //                        {
    //                            // If the date could not be parsed, handle appropriately, maybe log it
    //                            employee.TerminationDate = null;
    //                        }
    //                    }
    //                    else
    //                    {
    //                        // If the "termination_date" property doesn't exist or is null, handle it here
    //                        employee.TerminationDate = null;
    //                    }
    //                    try
    //                    {
    //                        employee.DepartmentId = item.GetProperty("professional_datum").GetProperty("department").GetProperty("id").GetInt32();
    //                        employee.DepartmentName = item.GetProperty("professional_datum").GetProperty("department").GetProperty("name").GetString();
    //                        employee.Position = item.GetProperty("professional_datum").GetProperty("position").GetProperty("name").GetString();
    //                    }
    //                    catch (Exception ex)
    //                    {
    //                        Console.WriteLine(item.ToString());
    //                        employee.DepartmentId = 0;
    //                        employee.DepartmentName = "No Department";
    //                        employee.Position = "None";
    //                    }



    //                    employeeList.Add(employee);
    //                }
    //            }
    //        }
    //        var x = employeeList.Count();
    //        return Ok(employeeList);
    //    }
    //}

}
}
