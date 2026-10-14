import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { createticketTaskRequest, projecttasksubtaskresponse, TasksService } from '../../Services/tasks.service';
import { ProjectService } from '../../Services/project.service';
import { IssueStatusService } from '../../Services/issueStatus.service';
import { AuthService } from '../../Services/auth.service';
import { TaskResponse } from '../../Interfaces/Projecttasks';
import { IssuePriority, ProjectResponse } from '../../Interfaces/project';
import { assignhistories, issuestatus, issuestatushistory } from '../../Interfaces/issuestatus';
import { fixedKPI } from '../../Interfaces/system';
import { Environment } from '../../base/environment';
import { TaskChatComponentComponent } from '../task-chat-component/task-chat-component.component';
import { AgentResponseWithTasksNumberDTO, ITSystemService } from '../../Services/ITsystem.servic';
import { fixedKPIService } from '../../Services/KPIMasterData.service';
import { SubModuleService } from '../../Services/submodule.service';

@Component({
  selector: 'app-taskdetails',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TaskChatComponentComponent],
  templateUrl: './taskdetails.component.html',
  styleUrl: './taskdetails.component.css',
})
export class TaskdetailsComponent implements OnInit {
  task: TaskResponse | null = null;
  taskId: string | null = null;
  project: ProjectResponse | null = null;
  isLoading = true;
  baseUrl = `${Environment.baseUrl}Tasks/`;

  IssuePriority = IssuePriority;

  notes: string[] = [];
  note = '';
  subTasks: projecttasksubtaskresponse[] = [];
  subTaskDescription = '';
  subTaskDate = '';
  creatingSubTask = signal(false);
  subTaskKpiBusyId = signal<string | null>(null);
  subTaskKpiModal = signal<projecttasksubtaskresponse | null>(null);
  subTaskUseFixedKpi = signal(false);
  subTaskFixedKpis = signal<fixedKPI[]>([]);
  subTaskFixedKpisLoading = signal(false);
  subTaskSelectedFixedKpiId = signal('');
  subTaskKpiModalError = signal<string | null>(null);
  subTaskSupervisorAccessById = signal<Record<string, boolean>>({});
  subTaskError = signal<string | null>(null);
  subTaskSuccess = signal<string | null>(null);

  statuses: issuestatus[] = [];
  currentStatus = signal<issuestatus | null>(null);
  selectedStatusId = signal<string | null>(null);

  statusHistory: issuestatushistory[] = [];
  assignHistories: assignhistories[] = [];
  currentAssignHistory = signal<assignhistories | null>(null);

  appUsers: { id: string; name: string }[] = [];
  assignableAgentsWithLoad = signal<AgentResponseWithTasksNumberDTO[]>([]);
  derivedProjectSystemId = signal<string | null>(null);
  selectedUserId = signal<string | null>(null);
  agentSearch = signal('');

  canManage = signal(false);

  showStatusModal = signal(false);
  showAssignModal = signal(false);
  showStatusHistoryModal = signal(false);
  showAssignHistoryModal = signal(false);
  statusSearch = signal('');

  applyingStatus = signal(false);
  applyingAssign = signal(false);

  uploadError = signal<string | null>(null);
  uploading = signal(false);

  constructor(
    private tasksSvc: TasksService,
    private projectSvc: ProjectService,
    private statusSvc: IssueStatusService,
    private auth: AuthService,
    private systemSvc: ITSystemService,
    private fixedKpiService: fixedKPIService,
    private subModuleSvc: SubModuleService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.auth.getAllUsers().subscribe(dict => {
      this.appUsers = Object.entries(dict).map(([id, name]) => ({ id, name: name as string }));
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.taskId = id;
      this.resetState();
      this.loadTask(id);
    });
  }

  private resetState(): void {
    this.task = null;
    this.project = null;
    this.notes = [];
    this.note = '';
    this.subTasks = [];
    this.subTaskDescription = '';
    this.subTaskDate = '';
    this.creatingSubTask.set(false);
    this.subTaskKpiBusyId.set(null);
    this.subTaskKpiModal.set(null);
    this.subTaskUseFixedKpi.set(false);
    this.subTaskSelectedFixedKpiId.set('');
    this.subTaskKpiModalError.set(null);
    this.subTaskSupervisorAccessById.set({});
    this.subTaskError.set(null);
    this.subTaskSuccess.set(null);
    this.statuses = [];
    this.statusHistory = [];
    this.assignHistories = [];
    this.currentStatus.set(null);
    this.selectedStatusId.set(null);
    this.currentAssignHistory.set(null);
    this.selectedUserId.set(null);
    this.assignableAgentsWithLoad.set([]);
    this.derivedProjectSystemId.set(null);
    this.canManage.set(false);
    this.isLoading = true;
    this.uploadError.set(null);
  }

  private loadTask(id: string): void {
    this.isLoading = true;
    this.tasksSvc
      .getById(id)
      .pipe(
        catchError(() => of(null as TaskResponse | null)),
        switchMap(task => {
          if (!task) return of(null);
          return forkJoin({
            notes: this.tasksSvc.getPrivateNotes(id).pipe(catchError(() => of([] as string[]))),
            issueStatuses: this.statusSvc.getAllIssueStatuses().pipe(catchError(() => of([] as issuestatus[]))),
            statusHistory: this.tasksSvc.getStatuses(id).pipe(catchError(() => of([] as issuestatushistory[]))),
            assignHistories: this.tasksSvc.getAssignHistories(id).pipe(catchError(() => of([] as assignhistories[]))),
            project: this.projectSvc.getById(task.projectId).pipe(catchError(() => of(null))),

          }).pipe(map(extra => ({ task, ...extra })));
        }),
      )
      .subscribe(result => {
        this.isLoading = false;
        if (!result) {
          this.task = null;
          return;
        }
        const { task, notes, issueStatuses, statusHistory, assignHistories, project } = result;
        this.task = task;
        this.project = project;
        this.resolveProjectSystemId(project);
        this.notes = notes ?? [];
        this.statuses = issueStatuses ?? [];
        this.statusHistory = statusHistory ?? [];
        this.assignHistories = assignHistories ?? [];
        this.currentStatus.set(this.statuses.find(s => s.id === task.currentStatusId) ?? null);
        this.selectedStatusId.set(task.currentStatusId ?? null);

        const ah = assignHistories ?? [];
        this.currentAssignHistory.set(ah.length ? ah[ah.length - 1] : null);
        this.selectedUserId.set(this.currentAssignHistory()?.userId ?? task.userId);

        const uid = this.auth.getUserId();
        const owner = project?.userId;
        this.canManage.set(
          !!uid &&
            (uid === task.userId || uid === owner || this.auth.isAdmin() || this.auth.isMaster()),
        );
        this.loadSubTasks();
      });
  }

  private resolveProjectSystemId(project: ProjectResponse | null): void {
    const relatedSubmoduleId = project?.relatedSubModuleId;
    if (!relatedSubmoduleId) {
      this.derivedProjectSystemId.set(null);
      this.loadAssignableAgents(null);
      return;
    }

    this.subModuleSvc.getById(relatedSubmoduleId).pipe(
      switchMap((subModule) => {
        const moduleId = subModule?.moduleId;
        if (!moduleId) return of(null);
        return this.systemSvc.getAllSystems().pipe(
          switchMap((systems) => {
            if (!systems?.length) return of(null);
            return forkJoin(
              systems.map((system) =>
                this.systemSvc.getSystemModules(system.id).pipe(
                  map((mods) => (mods ?? []).some((m) => m.id === moduleId) ? system.id : null),
                  catchError(() => of(null)),
                ),
              ),
            ).pipe(
              map((ids) => ids.find((id) => !!id) ?? null),
            );
          }),
        );
      }),
      catchError(() => of(null)),
    ).subscribe((systemId) => {
      this.derivedProjectSystemId.set(systemId);
      this.loadAssignableAgents(systemId);
      this.loadSubTaskSupervisorAccess();
      this.getSystemSupervisors();
    });
  }

  private loadAssignableAgents(systemId?: string | null): void {
    if (!systemId) {
      this.assignableAgentsWithLoad.set([]);
      return;
    }
    this.systemSvc.getSystemAgentsWithTasksNumber(systemId).subscribe({
      next: agents => {
        this.assignableAgentsWithLoad.set(Array.isArray(agents) ? agents : []);
      },
      error: () => {
        this.assignableAgentsWithLoad.set([]);
      },
    });
  }

  loadSubTasks(): void {
    if (!this.task?.id) return;
    this.tasksSvc.MysubTasks(this.task.id).subscribe({
      next: (tasks) => {
        this.subTasks = Array.isArray(tasks) ? tasks : [];
        this.loadSubTaskSupervisorAccess();
      },
      error: () => {
        this.subTaskError.set('Failed to load subtasks.');
      },
    });
  }

  private loadSubTaskSupervisorAccess(): void {
    const systemId = this.derivedProjectSystemId();
    const currentUserId = this.auth.getUserId();
    const rows = this.subTasks ?? [];

    if (!systemId || !currentUserId || !rows.length) {
      this.subTaskSupervisorAccessById.set({});
      return;
    }

    const requests = rows.map((subTask) => {
      if (!subTask?.id || !subTask?.userId) {
        return of({ subTaskId: subTask?.id ?? '', canManage: false });
      }
      return this.systemSvc.getagentsupervisor(systemId, subTask.userId).pipe(
        map((supervisorId) => ({
          subTaskId: subTask.id,
          canManage: (supervisorId.id ?? '').toLowerCase() === currentUserId.toLowerCase(),
        })),
        catchError(() => of({ subTaskId: subTask.id, canManage: false })),
      );
    });

    forkJoin(requests).subscribe((result) => {
      const accessMap: Record<string, boolean> = {};
      for (const entry of result) {
        if (!entry.subTaskId) continue;
        accessMap[entry.subTaskId] = entry.canManage;
      }
      this.subTaskSupervisorAccessById.set(accessMap);
    });
  }


  canCreateSubTask(): boolean {
    const uid = this.auth.getUserId();
    if (!uid || !this.task) return false;
    return uid === this.task.userId ;
  }

  canViewSubTasks(): boolean {
    const uid = this.auth.getUserId();
    const isAgent = this.assignableAgentsWithLoad().some(a => a.userdataresponse.userId === uid);
    if (!uid || !this.task) return false;
    return  isAgent; //|| uid === this.project?.userId;
  }

  createSubTask(): void {
    if (!this.task?.id || !this.canCreateSubTask()) return;
    const description = this.subTaskDescription.trim();
    if (!description || !this.subTaskDate) return;

    this.creatingSubTask.set(true);
    this.subTaskError.set(null);
    this.subTaskSuccess.set(null);

    const payload: createticketTaskRequest = {
      description,
      date: new Date(this.subTaskDate),
    };

    this.tasksSvc.createsubtask(this.task.id, payload).subscribe({
      next: () => {
        this.subTaskDescription = '';
        this.subTaskDate = '';
        this.subTaskSuccess.set('Subtask added successfully.');
        this.loadSubTasks();
      },
      error: () => {
        this.subTaskError.set('Failed to add subtask. Please try again.');
        this.creatingSubTask.set(false);
      },
      complete: () => {
        this.creatingSubTask.set(false);
      },
    });
  }

  subTaskUserLabel(t: projecttasksubtaskresponse): string {
    const uid = this.auth.getUserId();
    if (uid && t.userId === uid) return 'You';
    return t.userName || this.appUsers.find(u => u.id === t.userId)?.name || t.userId || '—';
  }

  canManageSubTaskKpi(subTask: projecttasksubtaskresponse): boolean {
    if (!subTask?.id) return false;
    return this.isRelatedToTask(subTask);
  }

  subTaskKpiName(t: projecttasksubtaskresponse): string {
    return t.kpi?.kpiName || '—';
  }
  systemsupervisors=signal<Record<string, string>>({});
  getSystemSupervisors() {
    this.systemSvc.getSystemSupervisors(this.derivedProjectSystemId()!).subscribe((agents) => {
      this.systemsupervisors.set(agents);
    });
  }


  isRelatedToTask(task: projecttasksubtaskresponse): boolean {

    const supervisorId = this.systemsupervisors()[task.userId];
    const currentuserId = this.auth.getUserId();
    return task?.userId === currentuserId || supervisorId === currentuserId;
  }

  openSubTaskKpiModalPrompt(t: projecttasksubtaskresponse): void {
    if (!t?.id || !!t.kpi || !this.canManageSubTaskKpi(t)) return;
    this.subTaskUseFixedKpi.set(false);
    this.subTaskSelectedFixedKpiId.set(this.subTaskFixedKpis()[0]?.id ?? '');
    this.subTaskKpiModalError.set(null);
    this.subTaskKpiModal.set(t);
    this.ensureSubTaskFixedKpisLoaded();
  }

  closeSubTaskKpiModalPrompt(): void {
    this.subTaskKpiModal.set(null);
    this.subTaskUseFixedKpi.set(false);
    this.subTaskKpiModalError.set(null);
  }

  private ensureSubTaskFixedKpisLoaded(): void {
    if (this.subTaskFixedKpis().length || this.subTaskFixedKpisLoading()) return;
    this.subTaskFixedKpisLoading.set(true);
    this.fixedKpiService.getAllfixedKPIs().subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.subTaskFixedKpis.set(list);
        if (!this.subTaskSelectedFixedKpiId() && list.length) {
          this.subTaskSelectedFixedKpiId.set(list[0].id);
        }
      },
      error: () => {
        this.subTaskKpiModalError.set('Failed to load fixed KPIs.');
      },
      complete: () => {
        this.subTaskFixedKpisLoading.set(false);
      },
    });
  }

  submitSubTaskKpi(): void {
    const t = this.subTaskKpiModal();
    if (!t?.id || !!t.kpi || !this.canManageSubTaskKpi(t)) return;
    const req: { taskId: string; fixedKPIId?: string } = { taskId: t.id };
    if (this.subTaskUseFixedKpi()) {
      const fixedId = this.subTaskSelectedFixedKpiId();
      if (!fixedId) {
        this.subTaskKpiModalError.set('Please select a fixed KPI, or choose No.');
        return;
      }
      req.fixedKPIId = fixedId;
    }
    this.subTaskKpiBusyId.set(t.id);
    this.subTaskError.set(null);
    this.subTaskKpiModalError.set(null);
    this.fixedKpiService.CreateKPI(req).subscribe({
      next: () => {
        this.subTaskSuccess.set('KPI linked to subtask.');
        this.closeSubTaskKpiModalPrompt();
        this.loadSubTasks();
      },
      error: () => {
        this.subTaskError.set('Failed to link KPI to subtask.');
        this.subTaskKpiModalError.set('Failed to link KPI to subtask.');
      },
      complete: () => {
        this.subTaskKpiBusyId.set(null);
      },
    });
  }

  getFileName(path: string): string {
    return path.split('/').pop() ?? path;
  }

  /** Same download URL for task `Attachments` and `AssignedAttachments` (API allows both). */
  taskAttachmentHref(taskId: string, storagePath: string): string {
    return `${this.baseUrl}${taskId}/files/${this.getFileName(storagePath)}`;
  }

  /** Task assignee: prefer API `userName`, else name from user directory. */
  taskAssigneeLabel(task: TaskResponse | null): string {
    if (!task) return '—';
    const direct = (task.userName ?? '').trim();
    if (direct) return direct;
    const fromUsers = this.appUsers.find(u => u.id === task.userId)?.name?.trim();
    if (fromUsers) return fromUsers;
    return (task.userId ?? '').trim() || '—';
  }

  /** Assign-history row display name. */
  assignHistoryUserLabel(a: assignhistories | null | undefined): string {
    if (!a) return '—';
    const direct = (a.userName ?? '').trim();
    if (direct) return direct;
    const fromUsers = this.appUsers.find(u => u.id === a.userId)?.name?.trim();
    if (fromUsers) return fromUsers;
    return (a.userId ?? '').trim() || '—';
  }

  priorityLabel(p: number | undefined): string {
    if (p === undefined || p === null) return '—';
    return IssuePriority[p] ?? '—';
  }

  addPrivateNote(): void {
    if (!this.note.trim() || !this.task) return;
    const text = this.note.trim();
    this.tasksSvc.addPrivateNote(this.task.id, { name: text }).subscribe({
      next: () => {
        this.notes = [...this.notes, text];
        this.note = '';
      },
    });
  }

  openStatusModal(): void {
    this.statusSearch.set('');
    this.selectedStatusId.set(this.task?.currentStatusId ?? null);
    this.showStatusModal.set(true);
  }

  closeStatusModal(): void {
    this.showStatusModal.set(false);
  }

  filteredStatuses(): issuestatus[] {
    const q = this.statusSearch().trim().toLowerCase();
    return this.statuses.filter(s => !q || s.name.toLowerCase().includes(q));
  }

  pickStatus(id: string): void {
    this.selectedStatusId.set(id);
  }

  applyStatus(): void {
    const t = this.task;
    const sid = this.selectedStatusId();
    if (!t || !sid) return;
    this.applyingStatus.set(true);
    this.tasksSvc.changeStatus(t.id, sid).subscribe({
      next: () => {
        this.applyingStatus.set(false);
        this.task = { ...t, currentStatusId: sid };
        this.currentStatus.set(this.statuses.find(s => s.id === sid) ?? null);
        this.reloadStatusHistory();
        this.closeStatusModal();
      },
      error: () => this.applyingStatus.set(false),
    });
  }

  private reloadStatusHistory(): void {
    const id = this.task?.id;
    if (!id) return;
    this.tasksSvc.getStatuses(id).subscribe({
      next: h => (this.statusHistory = h ?? []),
    });
  }

  openAssignModal(): void {
    this.agentSearch.set('');
    this.showAssignModal.set(true);
  }

  closeAssignModal(): void {
    this.showAssignModal.set(false);
  }

  filteredAgents(): AgentResponseWithTasksNumberDTO[] {
    const q = this.agentSearch().trim().toLowerCase();
    const list = this.assignableAgentsWithLoad();
    if (!q) return list;
    return list.filter(a => {
      const u = a.userdataresponse;
      const name = (u?.employeeName || u?.userName || '').toLowerCase();
      const userName = (u?.userName || '').toLowerCase();
      const num = String(u?.employeeNumber ?? '').toLowerCase();
      const id = (u?.userId || '').toLowerCase();
      return name.includes(q) || userName.includes(q) || num.includes(q) || id.includes(q);
    });
  }

  pickAgent(id: string): void {
    this.selectedUserId.set(id);
  }

  assignModalAgentLabel(agent: AgentResponseWithTasksNumberDTO): string {
    const u = agent.userdataresponse;
    return u.employeeName || u.userName || u.userId || '—';
  }

  applyAssign(): void {
    const t = this.task;
    const uid = this.selectedUserId();
    if (!t || !uid) return;
    this.applyingAssign.set(true);
    this.tasksSvc.reAssign(t.id, uid).subscribe({
      next: () => {
        this.applyingAssign.set(false);
        this.tasksSvc.getAssignHistories(t.id).subscribe({
          next: list => {
            this.assignHistories = list ?? [];
            this.currentAssignHistory.set(
              this.assignHistories.length ? this.assignHistories[this.assignHistories.length - 1] : null,
            );
          },
        });
        this.tasksSvc.getById(t.id).subscribe(updated => {
          this.task = updated;
        });
        this.closeAssignModal();
      },
      error: () => this.applyingAssign.set(false),
    });
  }

  openStatusHistoryModal(): void {
    this.reloadStatusHistory();
    this.showStatusHistoryModal.set(true);
  }

  closeStatusHistoryModal(): void {
    this.showStatusHistoryModal.set(false);
  }

  openAssignHistoryModal(): void {
    this.showAssignHistoryModal.set(true);
  }

  closeAssignHistoryModal(): void {
    this.showAssignHistoryModal.set(false);
  }

  deleteTask(): void {
    if (!this.task || !confirm('Delete this task permanently?')) return;
    const pid = this.task.projectId;
    this.tasksSvc.delete(this.task.id).subscribe({
      next: () => this.router.navigate(['/projectdetails', pid]),
    });
  }

  onUploadAttachments(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!files.length || !this.task) return;
    this.uploadError.set(null);
    this.uploading.set(true);
    this.tasksSvc.uploadAttachments(this.task.id, files).subscribe({
      next: () => {
        this.uploading.set(false);
        this.tasksSvc.getById(this.task!.id).subscribe(t => (this.task = t));
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set('Upload failed.');
      },
    });
  }

  projectOwnerUserId(): string {
    return this.project?.userId ?? '';
  }
}
