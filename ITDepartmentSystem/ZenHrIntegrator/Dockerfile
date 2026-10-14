FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# --- TRUST KASPERSKY ROOT (required for dotnet restore) ---
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Put your exported cert here: D:\Projects\ITDepartment\ITDepartmentSystem\certs\kaspersky-root.cer
COPY certs/kaspersky-root.cer /usr/local/share/ca-certificates/kaspersky-root.crt
RUN update-ca-certificates
# ----------------------------------------------------------

COPY ["ZenHrIntegrator/ZenHrIntegrator.csproj", "ZenHrIntegrator/"]
RUN dotnet restore "./ZenHrIntegrator/ZenHrIntegrator.csproj"

COPY . .
WORKDIR "/src/ZenHrIntegrator"
RUN dotnet publish "./ZenHrIntegrator.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# OPTIONAL: trust cert at runtime too (ZenHR HTTPS calls)
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY certs/kaspersky-root.cer /usr/local/share/ca-certificates/kaspersky-root.crt
RUN update-ca-certificates

COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "ZenHrIntegrator.dll"]
