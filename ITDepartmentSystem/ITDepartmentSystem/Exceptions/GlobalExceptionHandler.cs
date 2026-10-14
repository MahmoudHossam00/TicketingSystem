using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace ITDepartmentSystem.Exceptions
{
    public class GlobalExceptionHandler(IProblemDetailsService problemDetailsService) : IExceptionHandler
    {
        public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
        {
            httpContext.Response.StatusCode = exception switch
            {
                ValidationException => StatusCodes.Status400BadRequest,
                BusinessRuleException br => br.StatusCode,
                NotImplementedException NE=>StatusCodes.Status404NotFound,
                _ => StatusCodes.Status500InternalServerError
            };

            return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
            {
                HttpContext = httpContext,
                Exception = exception,
                ProblemDetails = new ProblemDetails
                {
                    Type = exception.GetType().Name,
                    Title = "Error has occured",
                    Detail = exception.Message
                }
            });
        }
    }
}
