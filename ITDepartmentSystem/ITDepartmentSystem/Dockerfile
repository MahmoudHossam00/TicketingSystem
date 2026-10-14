# =========================
# Build stage (SDK)
# =========================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY certs/kaspersky-root.cer /usr/local/share/ca-certificates/kaspersky-root.crt
RUN update-ca-certificates

COPY ["ITDepartmentSystem/ITDepartmentSystem.csproj", "ITDepartmentSystem/"]
RUN dotnet restore "./ITDepartmentSystem/ITDepartmentSystem.csproj"

COPY . .
WORKDIR "/src/ITDepartmentSystem"
RUN dotnet publish "./ITDepartmentSystem.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false


# =========================
# Runtime stage
# =========================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY certs/kaspersky-root.cer /usr/local/share/ca-certificates/kaspersky-root.crt
RUN update-ca-certificates

COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ITDepartmentSystem.dll"]
