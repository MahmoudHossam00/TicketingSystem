# IT Department Ticketing & Work Management Platform

A configurable internal service management and work management platform for IT teams, bringing together **support tickets, projects, task tracking, communication, KPIs, reporting, and knowledge sharing**.

The platform organizes requests around systems, modules, and submodules, with role-based access and administrator-defined workflows.

## Key Features

### 1. Configurable systems and access
- Administrators create and manage supported systems.
- **Public systems** are visible to authorized regular users; **private systems** are restricted to administrators and assigned system agents.
- Agents are assigned to individual systems.
- Visibility can be controlled at the system, module, and submodule levels.

**Classification:** `System → Module → Submodule`

For example: `FPI Internal Applications → CAPA Tracker → Create New User`.

### 2. Dynamic ticket forms
- Request forms change based on the selected submodule.
- Administrators can configure optional or required questions.
- Supported question types include text, single choice, and multiple choice.
- Additional closing questions can be required before an agent closes a ticket.
- Requests may include a subject, formatted description, attachments, priority, and To/CC recipients.

### 3. Ticket workflow and assignment
- Automatically routes new tickets to agents assigned to the relevant system and sends email and in-app notifications.
- Tickets record requester, recipients, classification, answers, priority, status, and unique identifier.
- Agents can assign a ticket to a responsible person, search by name, email, or employee number, and review workload.
- Status and assignment histories help keep the lifecycle traceable.
- Private notes provide an internal space for team coordination.

### 4. Ticket communication
- Live chat between requesters and agents.
- Structured replies linked to ticket email correspondence.
- Supports To/CC recipients, images, screenshots, attachments, and knowledge articles.
- Keeps ticket communication associated with the corresponding request.

### 5. Ticket views and filters
Dedicated views for **All Tickets**, **My Tickets**, **My Opened**, and **Not Assigned**.

Search and filter by requester, assignee, system, status, date range, and text. Access permissions determine which tickets a user can see; status counters provide a quick overview of workload.

### 6. Projects and task management
Manage planned IT work separately from support tickets.

- Project owner, department, system, responsible agent, priority, status, and schedule.
- Tasks assigned to agents within the project system.
- Project-specific discussions and private notes.

### 7. KPI tracking and reporting
- Tracks work performed through tickets and project tasks.
- Filter KPI data by system, user, department, date, KPI status, and fixed KPI.
- Create or update KPI records in bulk.
- Export results to Excel.

### 8. Knowledge base
Create system-specific user guides, documentation, and procedures.

- Rich content with sections, documents, PDFs, images, and videos.
- Target articles to relevant users or departments.
- Help users resolve recurring issues before raising a ticket.

### 9. Messaging and collaboration
- Direct messaging between platform users.
- Dedicated conversation areas for tickets, tasks, and projects.

### 10. Configurable master data
Administrators can manage:
- Issue statuses, colors, and whether a status counts as finished.
- Issue types.
- Companies and related entities.
- Other system-specific categories and configurations.

These settings can be changed without modifying application code.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Backend | .NET / ASP.NET Core |
| Frontend | Angular |
| Version control | Git and GitHub |

> Exact runtime versions, database provider, authentication configuration, and third-party integrations should be verified in the source code before documenting deployment requirements.

## Repository Structure

```text
ITDepartment/
├── FrontEnd/              # Angular web application
├── ITDepartmentSystem/    # .NET backend solution and services
├── .gitignore
└── README.md
```

The backend and frontend share one repository, while remaining separate applications.

## Getting Started (Development)

### Prerequisites
- .NET SDK compatible with the backend project's target framework.
- Node.js and npm compatible with the frontend project's Angular version.
- Any required database and integrations configured for your environment.

### Backend
From the repository root, find the correct backend `.csproj` or `.sln` within `ITDepartmentSystem/`. Restore and run the appropriate startup project, for example:

```powershell
dotnet restore "ITDepartmentSystem/<PathToSolutionOrProject>"
dotnet run --project "ITDepartmentSystem/<PathToStartupProject.csproj>"
```

Replace the placeholders with paths from your checkout.

### Frontend

```powershell
cd FrontEnd
npm install
npm start
```

The actual development command may differ; confirm scripts in `FrontEnd/package.json`. Set the frontend API URL according to your environment.

## Configuration and Security

Real environment settings are intentionally excluded from source control.

Ignored files include:
- `appsettings.json` and `appsettings.*.json`
- `.env` files and private certificates/keys
- .NET build output (`bin/`, `obj/`)
- Angular dependencies and build output (`node_modules/`, `dist/`)

**Do not commit database connection strings, passwords, API keys, certificates, or production settings.** Configure these outside Git using approved deployment secrets or environment-specific settings. For shared setup documentation, use sanitized example configuration files containing placeholders only.

> Client-side Angular configuration is visible in the browser. Never put secrets in frontend source files or build-time environment files.

## Development Workflow

From the repository root:

```powershell
git status
git add .
git commit -m "Describe your changes"
git push origin main
```

Review staged changes before each commit, especially configuration files and generated artifacts.

## Purpose

The platform is designed as a flexible internal solution rather than a fixed off-the-shelf ticketing product. Its source code and configurable business rules allow IT teams to adapt workflows as organizational needs evolve.

---

*Project feature descriptions are based on the **IT Ticketing Platform Project Overview** presentation. Detailed local setup and deployment instructions should be completed after validating the application source and environment requirements.*
