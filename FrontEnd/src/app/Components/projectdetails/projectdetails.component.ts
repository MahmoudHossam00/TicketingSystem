import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProjectService } from '../../Services/project.service';
import { IssueStatusService } from '../../Services/issueStatus.service';
import { ITSystemService } from '../../Services/ITsystem.servic';
import { SubModuleService } from '../../Services/submodule.service';
import { AuthService } from '../../Services/auth.service';
import { EmployeeService } from '../../Services/employee.service';
import { IssuePriority, ProjectResponse } from '../../Interfaces/project';
import { CreateTaskRequest, TaskResponse } from '../../Interfaces/Projecttasks';
import { issuestatus } from '../../Interfaces/issuestatus';
import { Module, System } from '../../Interfaces/system';
import { Environment } from '../../base/environment';
import { UserResponseDTO } from '../../Interfaces/auth';
import { ProjectChatComponentComponent } from '../project-chat-component/project-chat-component.component';
import { projecttasksubtaskresponse, TasksService } from '../../Services/tasks.service';
import { SubModule } from '../../Interfaces/submodule';
import { EmployeeCache } from '../../Interfaces/employee';

@Component({
  selector: 'app-projectdetails',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ProjectChatComponentComponent],
  templateUrl: './projectdetails.component.html',
  styleUrl: './projectdetails.component.css',
})
export class ProjectdetailsComponent implements OnInit, OnDestroy {
  project: ProjectResponse | null = null;
  projectId: string | null = null;
  isLoading = true;
  baseUrl = `${Environment.baseUrl}Project/`;

  IssuePriority = IssuePriority;

  systems = signal<System[]>([]);
  modules = signal<Module[]>([]);
  subModules = signal<SubModule[]>([]);
  statuses: issuestatus[] = [];
  currentStatus = signal<issuestatus | null>(null);
  selectedStatusId = signal<string | null>(null);
  derivedSystemId = signal<string | null>(null);

  notes: string[] = [];
  note = '';

  kpis: projecttasksubtaskresponse[] = [];

  tasks = signal<TaskResponse[]>([]);

  /** Main column: project overview vs tasks. */
  mainSectionTab = signal<'overview' | 'tasks'>('overview');
  /** Collapsible “add task” form (Tasks tab). */
  taskFormExpanded = signal(false);
  savingTask = signal(false);
  taskFormError = signal<string | null>(null);

  taskDescription = '';
  taskStartDate = '';
  taskEndDate = '';
  taskStatusId = '';
  taskPrioritySelect = '';
  /** Selected assignee (`CreateTaskRequest.userId`) — must be a system agent for the project’s system. */
  taskAssigneeUserId = '';
  taskAssigneeSearch = '';
  taskBlockingEmployeeId = '';
  taskBlockingSearch = '';
  taskBlockingEmployeeName = '';
  taskAgents = signal<UserResponseDTO[]>([]);
  loadingTaskAgents = signal(false);
  taskBlockingResults = signal<EmployeeCache[]>([]);
  loadingTaskBlockingResults = signal(false);
  showTaskBlockingResults = signal(false);
  /** True when the signed-in user is in `taskAgents` (same API as assignee list). */
  currentUserIsSystemAgent = signal(false);

  taskFiles: File[] = [];

  canManage = signal(false);

  showStatusModal = signal(false);
  statusSearch = signal('');
  applyingStatus = signal(false);
  togglingClosed = signal(false);
  private blockingEmployeeSearch$ = new Subject<string>();
  private subs: Subscription[] = [];

  constructor(
    private projectSvc: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private statusSvc: IssueStatusService,
    private systemSvc: ITSystemService,
    private subModuleSvc: SubModuleService,
    private tasksSvc:TasksService,
    private auth: AuthService,
    private employeeSvc: EmployeeService,
  ) {}

  ngOnInit(): void {
    const blockingSearchSub = this.blockingEmployeeSearch$
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((term) => this.fetchBlockingEmployees(term));
    this.subs.push(blockingSearchSub);

    this.systemSvc.getAllSystems().subscribe(systems => {
      this.systems.set(systems ?? []);
      this.loadLookupDataForDetails();
    });
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.projectId = id;
      this.resetState();
      this.loadProject(id);
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private resetState(): void {
    this.project = null;
    this.notes = [];
    this.kpis = [];
    this.tasks.set([]);
    this.note = '';
    this.statuses = [];
    this.currentStatus.set(null);
    this.selectedStatusId.set(null);
    this.derivedSystemId.set(null);
    this.canManage.set(false);
    this.isLoading = true;
    this.mainSectionTab.set('overview');
    this.taskFormExpanded.set(false);
    this.taskAgents.set([]);
    this.loadingTaskAgents.set(false);
    this.currentUserIsSystemAgent.set(false);
    this.resetTaskFormFields();
  }

  private loadProject(id: string): void {
    this.isLoading = true;
    forkJoin({
      project: this.projectSvc.getById(id).pipe(catchError(() => of(null))),
      notes: this.projectSvc.getPrivateNotes(id).pipe(catchError(() => of([] as string[]))),
      tasks: this.projectSvc.getProjectTasks(id).pipe(catchError(() => of([] as TaskResponse[]))),
      statuses: this.statusSvc.getAllIssueStatuses().pipe(catchError(() => of([] as issuestatus[]))),
    }).subscribe({
      next: ({ project, notes, tasks, statuses }) => {
        if (!project) {
          this.project = null;
          this.isLoading = false;
          return;
        }
        this.project = project;
        this.notes = notes ?? [];
        this.tasks.set(tasks ?? []);
        this.refreshDerivedProjectContext(tasks ?? []);
        this.statuses = statuses ?? [];
        this.currentStatus.set(
          this.statuses.find(s => s.id === project.currentStatusId) ?? null,
        );
        this.selectedStatusId.set(project.currentStatusId ?? null);
        const uid = this.auth.getUserId();
        this.canManage.set(
          !!uid &&
            (uid === project.userId || this.auth.isAdmin() || this.auth.isMaster()),
        );
        this.prefillTaskDatesFromProject(project);
        this.isLoading = false;
      },
      error: () => {
        this.project = null;
        this.isLoading = false;
      },
    });
  }

  private loadLookupDataForDetails(): void {
    const systems = this.systems();
    if (!systems.length) {
      this.modules.set([]);
      this.subModules.set([]);
      return;
    }

    forkJoin({
      modulesBySystem: forkJoin(
        systems.map((s) =>
          this.systemSvc.getSystemModules(s.id).pipe(catchError(() => of([] as Module[]))),
        ),
      ),
      subModules: this.subModuleSvc.getAll().pipe(catchError(() => of([] as SubModule[]))),
    }).subscribe(({ modulesBySystem, subModules }) => {
      this.modules.set((modulesBySystem ?? []).flat());
      this.subModules.set(subModules ?? []);
      this.refreshDerivedProjectContext(this.tasks());
    });
  }

  private moduleIdFromSubmodule(relatedSubmoduleId: string | undefined): string | null {
    if (!relatedSubmoduleId) return null;
    return this.subModules().find(sm => sm.id === relatedSubmoduleId)?.moduleId ?? null;
  }

  moduleNameFromSubmodule(relatedSubmoduleId: string | undefined): string {
    const moduleId = this.moduleIdFromSubmodule(relatedSubmoduleId);
    if (!moduleId) return '—';
    return this.modules().find(m => m.id === moduleId)?.name ?? '—';
  }

  subModuleName(relatedSubmoduleId: string | undefined): string {
    if (!relatedSubmoduleId) return '—';
    return this.subModules().find(sm => sm.id === relatedSubmoduleId)?.name ?? '—';
  }

  private resolveSystemIdFromSubmodule(relatedSubmoduleId: string | undefined): string | null {
    const moduleId = this.moduleIdFromSubmodule(relatedSubmoduleId);
    if (!moduleId) return null;
    return this.modules().find(m => m.id === moduleId)?.systemId ?? null;
  }

  systemNameFromSubmodule(relatedSubmoduleId: string | undefined): string {
    const systemId = this.resolveSystemIdFromSubmodule(relatedSubmoduleId);
    if (!systemId) return '—';
    return this.systemName(systemId);
  }

  private refreshDerivedProjectContext(tasks: TaskResponse[]): void {
    const project = this.project;
    if (!project) return;
    const systemId = this.resolveSystemIdFromSubmodule(project.relatedSubModuleId);
    this.derivedSystemId.set(systemId);
    if (systemId) {
      this.loadProjectKpis(systemId, tasks ?? []);
      this.loadTaskAgents(systemId);
    } else {
      this.kpis = [];
      this.taskAgents.set([]);
      this.currentUserIsSystemAgent.set(false);
    }
  }

  private loadProjectKpis(systemId: string, tasks: TaskResponse[]): void {
    const taskIds = new Set((tasks ?? []).map(t => t.id));
    if (!systemId || taskIds.size === 0) {
      this.kpis = [];
      return;
    }

    const collected: projecttasksubtaskresponse[] = [];
    const seenTaskIds = new Set<string>();

    const fetchPage = (page: number) => {
      this.tasksSvc.getKPIs({
        systemIds: [systemId],
        hasKpi: true,
        page,
      }).subscribe({
        next: (res: { data: projecttasksubtaskresponse[]; totalRecords: number }) => {
          const rows = (res?.data ?? []).filter((r: projecttasksubtaskresponse) => taskIds.has(r.projectTaskId) && !!r.kpi);
          for (const row of rows) {
            if (seenTaskIds.has(row.projectTaskId)) continue;
            seenTaskIds.add(row.projectTaskId);
            collected.push(row);
          }
          const totalPages = Math.max(1, Math.ceil((res?.totalRecords ?? 0) / 50));
          if (page < totalPages) {
            fetchPage(page + 1);
          } else {
            this.kpis = collected;
          }
        },
        error: () => {
          this.kpis = collected;
        },
      });
    };

    fetchPage(1);
  }

  systemName(id: string): string {
    return this.systems().find(s => s.id === id)?.name ?? id;
  }

  priorityLabel(p: number | undefined): string {
    if (p === undefined || p === null) return '—';
    return IssuePriority[p] ?? '—';
  }

  setMainTab(tab: 'overview' | 'tasks'): void {
    this.mainSectionTab.set(tab);
  }

  /** Create tasks: project open + current user is a system agent for the project’s system. */
  canCreateProjectTasks(): boolean {
    const p = this.project;
    return !!p && !p.isClosed && this.currentUserIsSystemAgent();
  }

  toggleTaskForm(): void {
    if (!this.canCreateProjectTasks()) {
      this.taskFormExpanded.set(false);
      return;
    }
    this.taskFormExpanded.update(v => !v);
    if (this.taskFormExpanded()) {
      this.taskFormError.set(null);
      const p = this.project;
      if (p && !this.taskStartDate) this.prefillTaskDatesFromProject(p);
      const systemId = this.derivedSystemId();
      if (systemId) this.loadTaskAgents(systemId);
      this.prefillTaskAssigneeIfEmpty();
    }
  }

  /** Loads agents allowed for the project’s IT system (`System/{id}/agents`). */
  loadTaskAgents(systemId: string): void {
    if (!systemId) {
      this.taskAgents.set([]);
      this.currentUserIsSystemAgent.set(false);
      return;
    }
    this.loadingTaskAgents.set(true);
    this.systemSvc.getSystemAgents(systemId).subscribe({
      next: agents => {
        this.taskAgents.set(agents ?? []);
        this.loadingTaskAgents.set(false);
        this.refreshCurrentUserIsSystemAgent();
        this.prefillTaskAssigneeIfEmpty();
      },
      error: () => {
        this.taskAgents.set([]);
        this.loadingTaskAgents.set(false);
        this.currentUserIsSystemAgent.set(false);
      },
    });
  }

  private refreshCurrentUserIsSystemAgent(): void {
    const me = this.auth.getUserId();
    if (!me) {
      this.currentUserIsSystemAgent.set(false);
      return;
    }
    this.currentUserIsSystemAgent.set(this.taskAgents().some(a => a.id === me));
  }

  /** Default assignee: current user if they are an agent, else first agent in the list. */
  private prefillTaskAssigneeIfEmpty(): void {
    if (this.taskAssigneeUserId) return;
    const agents = this.taskAgents();
    if (!agents.length) return;
    const me = this.auth.getUserId();
    if (me && agents.some(a => a.id === me)) {
      this.taskAssigneeUserId = me;
    } else {
      this.taskAssigneeUserId = agents[0].id;
    }
  }

  agentDisplayName(a: UserResponseDTO): string {
    const parts = [a.employeeName || a.userName || a.email || a.id];
    if (a.employeeNumber != null) parts.push(`#${a.employeeNumber}`);
    if (a.userName && a.employeeName && a.userName !== a.employeeName) {
      parts.push(`@${a.userName}`);
    }
    return parts.filter(Boolean).join(' · ');
  }

  filteredTaskAgentsForCreate(kind: 'assignee' | 'blocking' = 'assignee'): UserResponseDTO[] {
    const q = (kind === 'assignee' ? this.taskAssigneeSearch : this.taskBlockingSearch).trim().toLowerCase();
    const list = this.taskAgents();
    if (!q) return list;
    return list.filter(a => {
      const employeeName = (a.employeeName ?? '').toLowerCase();
      const userName = (a.userName ?? '').toLowerCase();
      const mail = (a.email ?? '').toLowerCase();
      const num = String(a.employeeNumber ?? '').toLowerCase();
      const id = (a.id ?? '').toLowerCase();
      return employeeName.includes(q) || userName.includes(q) || mail.includes(q) || num.includes(q) || id.includes(q);
    });
  }

  /** Assignee line in task cards: API `userName`, else system agent profile, else id. */
  taskAssigneeLabel(task: TaskResponse): string {
    const direct = (task.userName ?? '').trim();
    if (direct) return direct;
    const agent = this.taskAgents().find(x => x.id === task.userId);
    const fromAgent = (agent?.userName ?? '').trim() || (agent?.email ?? '').trim();
    if (fromAgent) return fromAgent;
    return (task.userId ?? '').trim() || '—';
  }

  private prefillTaskDatesFromProject(project: ProjectResponse): void {
    const s = this.toInputDate(project.startDate);
    const e = this.toInputDate(project.endDate);
    if (!this.taskStartDate) this.taskStartDate = s;
    if (!this.taskEndDate) this.taskEndDate = e;
    if (!this.taskStatusId && project.currentStatusId) {
      this.taskStatusId = project.currentStatusId;
    }
  }

  /** Normalize API / Date to `yyyy-MM-dd` for `<input type="date">`. */
  private toInputDate(value: string | Date | undefined): string {
    if (value == null) return this.todayYmd();
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return this.todayYmd();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private todayYmd(): string {
    return this.toInputDate(new Date());
  }

  private dateFromYmd(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(v => parseInt(v, 10));
    if (!y || !m || !d) return new Date(ymd);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  private resetTaskFormFields(): void {
    this.taskDescription = '';
    this.taskStartDate = '';
    this.taskEndDate = '';
    this.taskStatusId = '';
    this.taskPrioritySelect = '';
    this.taskAssigneeUserId = '';
    this.taskAssigneeSearch = '';
    this.taskBlockingEmployeeId = '';
    this.taskBlockingSearch = '';
    this.taskBlockingEmployeeName = '';
    this.taskBlockingResults.set([]);
    this.loadingTaskBlockingResults.set(false);
    this.showTaskBlockingResults.set(false);
    this.taskFiles = [];
    this.taskFormError.set(null);
    this.prefillTaskAssigneeIfEmpty();
  }

  onTaskFilesChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.taskFiles = input.files ? Array.from(input.files) : [];
  }

  taskStatusName(id: string | undefined): string {
    if (!id) return '—';
    return this.statuses.find(s => s.id === id)?.name ?? '—';
  }

  taskStatusColor(id: string | undefined): string {
    if (!id) return '#94a3b8';
    return this.statuses.find(s => s.id === id)?.color ?? '#94a3b8';
  }

  taskAttachmentHref(task: TaskResponse, path: string): string {
    const name = this.getFileName(path);
    return `${Environment.baseUrl}Tasks/${task.id}/files/${encodeURIComponent(name)}`;
  }

  reloadTasks(): void {
    const id = this.projectId;
    if (!id) return;
    this.projectSvc.getProjectTasks(id).subscribe({
      next: list => {
        this.tasks.set(list ?? []);
        const systemId = this.derivedSystemId();
        if (systemId) {
          this.loadProjectKpis(systemId, list ?? []);
        }
        console.log("this.tasks()",this.tasks());
        
        console.log("list",list);
        }
      ,

    });
  }

  submitTask(): void {
    const pid = this.project?.id;
    if (!pid) return;

    if (this.project?.isClosed) {
      this.taskFormError.set('This project is closed — you cannot create tasks.');
      return;
    }
    if (!this.currentUserIsSystemAgent()) {
      this.taskFormError.set('Only system agents for this project can create tasks.');
      return;
    }

    const desc = this.taskDescription.trim();
    if (!desc || !this.taskStartDate || !this.taskEndDate) {
      this.taskFormError.set('Description, start date, and end date are required.');
      return;
    }

    const assigneeId = this.taskAssigneeUserId.trim();
    if (!assigneeId) {
      this.taskFormError.set('Select an assignee from the system agents list.');
      return;
    }
    if (!this.taskAgents().some(a => a.id === assigneeId)) {
      this.taskFormError.set('Selected user is not a valid agent for this project’s system.');
      return;
    }
    const blockingId = this.taskBlockingEmployeeId.trim();

    const start = this.dateFromYmd(this.taskStartDate);
    const end = this.dateFromYmd(this.taskEndDate);
    if (end.getTime() < start.getTime()) {
      this.taskFormError.set('End date must be on or after start date.');
      return;
    }

    this.taskFormError.set(null);
    this.savingTask.set(true);

    const body: CreateTaskRequest = {
      userId: assigneeId,
      description: desc,
      startDate: start,
      endDate: end,
    };
    if (this.taskStatusId) body.currentStatusId = this.taskStatusId;
    if (this.taskPrioritySelect !== '') {
      body.priority = Number(this.taskPrioritySelect) as IssuePriority;
    }
    if (blockingId) {
      body.blockingEmployeeId = blockingId;
    }
    if (this.taskFiles.length) body.attachments = this.taskFiles;

    this.projectSvc.addTask(pid, body).subscribe({
      next: () => {
        this.savingTask.set(false);
        this.resetTaskFormFields();
        this.taskFormExpanded.set(false);
        this.reloadTasks();
      },
      error: () => {
        this.savingTask.set(false);
        this.taskFormError.set('Could not create task. Please try again.');
      },
    });
  }

  onTaskBlockingSearchInput(value: string): void {
    this.taskBlockingSearch = value;
    this.taskBlockingEmployeeId = '';
    this.taskBlockingEmployeeName = '';
    this.showTaskBlockingResults.set(true);
    this.blockingEmployeeSearch$.next(value.trim());
  }

  hideTaskBlockingResults(): void {
    setTimeout(() => this.showTaskBlockingResults.set(false), 120);
  }

  selectTaskBlockingEmployee(emp: EmployeeCache): void {
    this.taskBlockingEmployeeId = emp.id;
    this.taskBlockingEmployeeName = this.taskBlockingEmployeeLabel(emp);
    this.taskBlockingSearch = this.taskBlockingEmployeeName;
    this.taskBlockingResults.set([]);
    this.showTaskBlockingResults.set(false);
  }

  taskBlockingEmployeeLabel(emp: EmployeeCache): string {
    const name = (emp.nameEn ?? emp.nameAr ?? '').trim() || emp.id;
    const num = emp.employeeNumber != null ? `#${emp.employeeNumber}` : '';
    return [name, num].filter(Boolean).join(' · ');
  }

  private fetchBlockingEmployees(term: string): void {
    if (!term) {
      this.taskBlockingResults.set([]);
      this.loadingTaskBlockingResults.set(false);
      return;
    }

    this.loadingTaskBlockingResults.set(true);
    this.employeeSvc.getFiltered(term, 1).subscribe({
      next: (res) => {
        this.taskBlockingResults.set((res?.data ?? []).slice(0, 20));
        this.loadingTaskBlockingResults.set(false);
      },
      error: () => {
        this.taskBlockingResults.set([]);
        this.loadingTaskBlockingResults.set(false);
      },
    });
  }

  getFileName(path: string): string {
    return path.split('/').pop() ?? path;
  }

  addPrivateNote(): void {
    if (!this.note.trim() || !this.project) return;
    const text = this.note.trim();
    this.projectSvc.addPrivateNote(this.project.id, text).subscribe({
      next: () => {
        this.notes = [...this.notes, text];
        this.note = '';
      },
    });
  }

  openStatusModal(): void {
    this.statusSearch.set('');
    this.selectedStatusId.set(this.project?.currentStatusId ?? null);
    this.showStatusModal.set(true);
  }

  closeStatusModal(): void {
    this.showStatusModal.set(false);
  }

  pickStatus(id: string): void {
    this.selectedStatusId.set(id);
  }

  filteredStatuses(): issuestatus[] {
    const q = this.statusSearch().trim().toLowerCase();
    return this.statuses.filter(
      s => !q || s.name.toLowerCase().includes(q),
    );
  }

  applyStatus(): void {
    const p = this.project;
    const sid = this.selectedStatusId();
    if (!p || !sid) return;
    this.applyingStatus.set(true);
    this.projectSvc.changeStatus(p.id, sid).subscribe({
      next: () => {
        this.applyingStatus.set(false);
        this.project = { ...p, currentStatusId: sid };
        this.currentStatus.set(this.statuses.find(s => s.id === sid) ?? null);
        this.closeStatusModal();
      },
      error: () => this.applyingStatus.set(false),
    });
  }

  deleteProject(): void {
    if (!this.project || !confirm('Delete this project permanently?')) return;
    this.projectSvc.delete(this.project.id).subscribe({
      next: () => this.router.navigate(['/projects']),
    });
  }

  toggleProjectClosed(): void {
    const p = this.project;
    if (!p) return;
    this.togglingClosed.set(true);
    this.projectSvc.ToggleProjectClosed(p.id).subscribe({
      next: () => {
        this.project = { ...p, isClosed: !p.isClosed };
        this.togglingClosed.set(false);
      },
      error: () => this.togglingClosed.set(false),
    });
  }

}
