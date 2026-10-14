using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace ITDepartmentSystem.OpenApi.Transformers
{
    public class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer, IOpenApiOperationTransformer
    {
        private const string SchemeId = JwtBearerDefaults.AuthenticationScheme;

        public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
        {
            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();

            

            document.Components.SecuritySchemes[SchemeId] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Enter JWT Bearer token",
                Name = "Authorization",
                
            };

            return Task.CompletedTask;
        }

        public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
        {
            var hasAuthorize = context.Description.ActionDescriptor.EndpointMetadata
                .OfType<IAuthorizeData>()
                .Any();

            var hasAllowAnonymous = context.Description.ActionDescriptor.EndpointMetadata
                .OfType<IAllowAnonymous>()
                .Any();

            if (hasAuthorize && !hasAllowAnonymous)
            {
                operation.Security ??= new List<OpenApiSecurityRequirement>();

                var requirement = new OpenApiSecurityRequirement();
                requirement.Add(
                new OpenApiSecuritySchemeReference(SchemeId),
                new List<string>()
            );
                operation.Security.Add(requirement);
            }

            return Task.CompletedTask;
        }
    }
}
