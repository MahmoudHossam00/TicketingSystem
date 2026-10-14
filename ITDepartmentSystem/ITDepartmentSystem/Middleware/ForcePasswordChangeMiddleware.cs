using Microsoft.AspNetCore.Identity;

namespace ITDepartmentSystem.Middleware
{
    public class ForcePasswordChangeMiddleware
    {
        private readonly RequestDelegate _next;

        public ForcePasswordChangeMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, UserManager<AppUser> userManager)
        {
            // Skip if user is not authenticated
            if (context.User.Identity?.IsAuthenticated != true)
            {
                await _next(context);
                return;
            }

            // Skip the change password endpoint itself
            var path = context.Request.Path.Value?.ToLower();
            if (path != null && (path.Contains("/changemypassword") || path.Contains("/getmypicture")))
            {
                await _next(context);
                return;
            }

            // Get the user
            var user = await userManager.GetUserAsync(context.User);
            if (user != null && !user.ChangedHisOwnPassword) // your flag property
            {
                // block access
                throw new BusinessRuleException("You must change your password before accessing this endpoint.", StatusCodes.Status403Forbidden);
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsync("You must change your password before accessing this endpoint.");
                return;
            }

            await _next(context);
        }
    }
}
