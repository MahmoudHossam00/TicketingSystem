import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ticketService, TicketTaskResponse } from '../../Services/ticket.service';
import { ProjectService } from '../../Services/project.service';
import { ITSystemService } from '../../Services/ITsystem.servic';
import { createkpirequest, fixedKPI, Module, System, company, issueType } from '../../Interfaces/system';
import { filterKPITaskReqeust } from '../../Interfaces/kpitasks';
import { projecttasksubtaskresponse, TasksService } from '../../Services/tasks.service';
import { fixedKPIService } from '../../Services/KPIMasterData.service';
import { UserResponseDTO } from '../../Interfaces/auth';
import { CompanyService } from '../../Services/Company.service';
import { IssuetypeService } from '../../Services/Issuetype.service';
import { IssueStatusService } from '../../Services/issueStatus.service';
import { issuestatus } from '../../Interfaces/issuestatus';
import { SubModuleService } from '../../Services/submodule.service';
import { SubModule } from '../../Interfaces/submodule';
import { KpiOldTasksComponent } from '../kpi-old-tasks/kpi-old-tasks.component';
import { AuthService } from '../../Services/auth.service';

type MainTab = 'tickets' | 'tasks' | 'both' | 'oldTasks';
type HasKpiFilter = 'all' | 'with' | 'without';
type CreateKpiTarget =
  | { kind: 'ticket'; id: string; label: string }
  | { kind: 'task'; id: string; label: string };
type CombinedKpiRow =
  | { kind: 'ticket'; dateValue: number; row: TicketTaskResponse }
  | { kind: 'task'; dateValue: number; row: projecttasksubtaskresponse };

@Component({
  selector: 'app-kpi-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, KpiOldTasksComponent],
  templateUrl: './kpi-tickets.component.html',
  styleUrl: './kpi-tickets.component.css',
})
export class KpiTicketsComponent implements OnInit {
  activeMainTab = signal<MainTab>('tickets');
  systems: System[] = [];
  users: { id: string; name: string }[] = [];
  companies: company[] = [];
  issueTypes: issueType[] = [];
  issueStatuses: issuestatus[] = [];
  modules: Module[] = [];
  subModules: SubModule[] = [];
  selectedSystemIds = signal<string[]>([]);
  selectedUserIds = signal<string[]>([]);
  systemDropdownOpen = signal(false);
  userDropdownOpen = signal(false);
  hasKpiFilter = signal<HasKpiFilter>('all');
  fromDate = signal<string>('');
  toDate = signal<string>('');

  ticketsRows = signal<TicketTaskResponse[]>([]);
  tasksRows = signal<projecttasksubtaskresponse[]>([]);
  combinedRows = signal<CombinedKpiRow[]>([]);
  isLoading = signal(false);
  loadError = signal<string | null>(null);

  currentPage = signal(1);
  totalRecords = signal(0);
  combinedTicketTotal = signal(0);
  combinedTaskTotal = signal(0);
  readonly pageSize = 50;
  fixedKPIs: fixedKPI[] = [];
  createKpiModal = signal<CreateKpiTarget | null>(null);
  useFixedKpi = signal(false);
  selectedFixedKpiId = signal('');
  createKpiError = signal<string | null>(null);
  creatingKpi = signal(false);

  /** Old tasks (Excel) tab: admins only; route is still protected by AdminOrMasterGuard. */
  readonly isAdminUser: boolean;

  constructor(
    private ticketSvc: ticketService,
    private projectSvc: ProjectService,
    private systemSvc: ITSystemService,
    private companySvc: CompanyService,
    private issueTypeSvc: IssuetypeService,
    private issueStatusSvc: IssueStatusService,
    private subModuleSvc: SubModuleService,
    private fixedKpiSvc: fixedKPIService,
    private tasksSvc: TasksService,
    private router: Router,
    auth: AuthService,
  ) {
    this.isAdminUser = auth.isAdmin();
  }

  ngOnInit(): void {
    this.loadReferenceData();
    this.systemSvc.getAllSystems().subscribe((list) => {
      this.systems = list ?? [];
      this.loadModulesForSystems();
      this.loadUsersFromSelectedSystems();
    });
    this.fixedKpiSvc.getAllfixedKPIs().subscribe((rows) => {
      this.fixedKPIs = rows ?? [];
    });
    this.loadCurrentTab();
  }

  private loadReferenceData(): void {
    forkJoin({
      companies: this.companySvc.getAllcompanys().pipe(catchError(() => of([] as company[]))),
      issueTypes: this.issueTypeSvc.getAllIssueTypes().pipe(catchError(() => of([] as issueType[]))),
      issueStatuses: this.issueStatusSvc.getAllIssueStatuses().pipe(catchError(() => of([] as issuestatus[]))),
      subModules: this.subModuleSvc.getAll().pipe(catchError(() => of([] as SubModule[]))),
    }).subscribe(({ companies, issueTypes, issueStatuses, subModules }) => {
      this.companies = companies ?? [];
      this.issueTypes = issueTypes ?? [];
      this.issueStatuses = issueStatuses ?? [];
      this.subModules = subModules ?? [];
    });
  }

  private loadModulesForSystems(): void {
    if (!this.systems.length) {
      this.modules = [];
      return;
    }

    forkJoin(
      this.systems.map((system) =>
        this.systemSvc.getSystemModules(system.id).pipe(catchError(() => of([] as Module[])))
      )
    ).subscribe((groups) => {
      this.modules = groups.flat();
    });
  }

  switchMainTab(tab: MainTab): void {
    if (this.activeMainTab() === tab) return;
    this.activeMainTab.set(tab);
    this.currentPage.set(1);
    if (tab !== 'oldTasks') {
      this.loadCurrentTab();
    }
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadCurrentTab();
  }

  clearFilters(): void {
    this.selectedSystemIds.set([]);
    this.selectedUserIds.set([]);
    this.systemDropdownOpen.set(false);
    this.userDropdownOpen.set(false);
    this.hasKpiFilter.set('all');
    this.fromDate.set('');
    this.toDate.set('');
    this.currentPage.set(1);
    this.loadUsersFromSelectedSystems();
    this.loadCurrentTab();
  }

  onSelectedSystemsChange(value: string[] | string): void {
    const next = this.normalizeMultiSelect(value);
    this.selectedSystemIds.set(next);
    this.loadUsersFromSelectedSystems();
    this.applyFilters();
  }

  onSelectedUsersChange(value: string[] | string): void {
    this.selectedUserIds.set(this.normalizeMultiSelect(value));
    this.applyFilters();
  }

  private loadCurrentTab(): void {
    if (this.activeMainTab() === 'oldTasks') return;
    if (this.activeMainTab() === 'tickets') this.loadTicketsPage();
    else if (this.activeMainTab() === 'tasks') this.loadTasksPage();
    else this.loadCombinedPage();
  }

  private buildFilter(): filterKPITaskReqeust {
    const has =
      this.hasKpiFilter() === 'with' ? true :
      this.hasKpiFilter() === 'without' ? false :
      undefined;
    return {
      userIds: this.selectedUserIds().length ? [...this.selectedUserIds()] : undefined,
      systemIds: this.selectedSystemIds().length ? [...this.selectedSystemIds()] : undefined,
      hasKpi: has,
      from: this.fromDate() ? this.buildDateBoundary(this.fromDate(), false) : undefined,
      to: this.toDate() ? this.buildDateBoundary(this.toDate(), true) : undefined,
      page: this.currentPage(),
    };
  }

  private buildDateBoundary(value: string, endOfDay: boolean): Date {
    const [year, month, day] = value.split('-').map(Number);
    if (endOfDay) return new Date(year, month - 1, day, 23, 59, 59, 999);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private rowDateValue(value: Date | string | null | undefined): number {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(value);
    const time = date.getTime();
    return Number.isFinite(time) ? time : 0;
  }

  private normalizeMultiSelect(value: string[] | string | null | undefined): string[] {
    if (Array.isArray(value)) return [...new Set(value.filter(Boolean))];
    return value ? [value] : [];
  }

  private loadUsersFromSelectedSystems(): void {
    const selectedSystems = this.selectedSystemIds();
    const sourceSystems = selectedSystems.length ? selectedSystems : this.systems.map((s) => s.id);
    if (!sourceSystems.length) {
      this.users = [];
      this.selectedUserIds.set([]);
      return;
    }

    const requests = sourceSystems.map((id) =>
      this.systemSvc.getSystemAgents(id)
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        const map = new Map<string, string>();
        for (const list of responses as UserResponseDTO[][]) {
          for (const user of list ?? []) {
            const display = user.userName || user.email || user.id;
            map.set(user.id, display);
          }
        }
        this.users = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
        const allowed = new Set(this.users.map((u) => u.id));
        this.selectedUserIds.set(this.selectedUserIds().filter((id) => allowed.has(id)));
      },
      error: () => {
        this.users = [];
        this.selectedUserIds.set([]);
      },
    });
  }

  toggleSystemDropdown(event?: Event): void {
    event?.stopPropagation();
    const next = !this.systemDropdownOpen();
    this.systemDropdownOpen.set(next);
    if (next) this.userDropdownOpen.set(false);
  }

  toggleUserDropdown(event?: Event): void {
    event?.stopPropagation();
    const next = !this.userDropdownOpen();
    this.userDropdownOpen.set(next);
    if (next) this.systemDropdownOpen.set(false);
  }

  isSystemSelected(id: string): boolean {
    return this.selectedSystemIds().includes(id);
  }

  isUserSelected(id: string): boolean {
    return this.selectedUserIds().includes(id);
  }

  toggleSystemSelection(id: string, event?: Event): void {
    event?.stopPropagation();
    const set = new Set(this.selectedSystemIds());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.selectedSystemIds.set(Array.from(set));
    this.loadUsersFromSelectedSystems();
    this.applyFilters();
  }

  toggleUserSelection(id: string, event?: Event): void {
    event?.stopPropagation();
    const set = new Set(this.selectedUserIds());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.selectedUserIds.set(Array.from(set));
    this.applyFilters();
  }

  systemSelectionLabel(): string {
    const selected = this.selectedSystemIds();
    if (!selected.length) return 'All systems';
    if (selected.length === 1) {
      return this.systems.find((s) => s.id === selected[0])?.name ?? '1 selected';
    }
    return `${selected.length} systems selected`;
  }

  userSelectionLabel(): string {
    const selected = this.selectedUserIds();
    if (!selected.length) return 'All users';
    if (selected.length === 1) {
      return this.users.find((u) => u.id === selected[0])?.name ?? '1 selected';
    }
    return `${selected.length} users selected`;
  }

  @HostListener('document:click')
  closeFilterDropdowns(): void {
    this.systemDropdownOpen.set(false);
    this.userDropdownOpen.set(false);
  }

  private loadTicketsPage(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.ticketSvc.getKPIs(this.buildFilter()).subscribe({
      next: (res) => {
        this.ticketsRows.set(res?.data ?? []);
        this.totalRecords.set(res?.totalRecords ?? 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.ticketsRows.set([]);
        this.totalRecords.set(0);
        this.isLoading.set(false);
        this.loadError.set('Could not load ticket KPI rows.');
      },
    });
  }

  private loadTasksPage(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.tasksSvc.getKPIs(this.buildFilter()).subscribe({
      next: (res) => {
        this.tasksRows.set(res?.data ?? []);
        this.totalRecords.set(res?.totalRecords ?? 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.tasksRows.set([]);
        this.totalRecords.set(0);
        this.isLoading.set(false);
        this.loadError.set('Could not load task KPI rows.');
      },
    });
  }

  private loadCombinedPage(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    const filter = this.buildFilter();
    forkJoin({
      tickets: this.ticketSvc.getKPIs(filter).pipe(catchError(() => of(null))),
      tasks: this.tasksSvc.getKPIs(filter).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ tickets, tasks }) => {
        const ticketRows = tickets?.data ?? [];
        const taskRows = tasks?.data ?? [];
        this.ticketsRows.set(ticketRows);
        this.tasksRows.set(taskRows);
        const merged: CombinedKpiRow[] = [
          ...ticketRows.map((row) => ({
            kind: 'ticket' as const,
            row,
            dateValue: this.rowDateValue(row.date),
          })),
          ...taskRows.map((row) => ({
            kind: 'task' as const,
            row,
            dateValue: this.rowDateValue(row.date),
          })),
        ].sort((a, b) => b.dateValue - a.dateValue);
        this.combinedRows.set(merged);
        const ticketTotal = tickets?.totalRecords ?? 0;
        const taskTotal = tasks?.totalRecords ?? 0;
        this.combinedTicketTotal.set(ticketTotal);
        this.combinedTaskTotal.set(taskTotal);
        this.totalRecords.set(ticketTotal + taskTotal);
        this.isLoading.set(false);
        if (!tickets && !tasks) {
          this.loadError.set('Could not load ticket or task KPI rows.');
        }
      },
      error: () => {
        this.ticketsRows.set([]);
        this.tasksRows.set([]);
        this.combinedRows.set([]);
        this.combinedTicketTotal.set(0);
        this.combinedTaskTotal.set(0);
        this.totalRecords.set(0);
        this.isLoading.set(false);
        this.loadError.set('Could not load ticket or task KPI rows.');
      },
    });
  }

  prevPage(): void {
    if (this.currentPage() <= 1) return;
    this.currentPage.update((p) => p - 1);
    this.loadCurrentTab();
  }

  nextPage(): void {
    if (this.currentPage() >= this.totalPages) return;
    this.currentPage.update((p) => p + 1);
    this.loadCurrentTab();
  }

  get totalPages(): number {
    if (this.activeMainTab() === 'both') {
      const ticketPages = Math.ceil(this.combinedTicketTotal() / this.pageSize);
      const taskPages = Math.ceil(this.combinedTaskTotal() / this.pageSize);
      return Math.max(1, ticketPages, taskPages);
    }
    return Math.max(1, Math.ceil(this.totalRecords() / this.pageSize));
  }

  kpiLabel(kpi?: { kpiName?: string }): string {
    return kpi?.kpiName || '—';
  }

  ticketNumericLabel(row: TicketTaskResponse): string {
    return (row.ticketNumericId ?? row.numericId)?.toString() || row.ticketId || '—';
  }

  ticketSubjectLabel(row: TicketTaskResponse): string {
    return row.subject || row.description || row.ticketDescription || '—';
  }

  ticketUserLabel(row: TicketTaskResponse): string {

    return row.assignedEmployee || row.userName || row.userId || '—';
  }

  ticketRaisedByLabel(row: TicketTaskResponse): string {
    return row.employee || '—';
  }

  ticketCompanyLabel(row: TicketTaskResponse): string {
    return this.companies.find((c) => c.id === row.companyId)?.name || '—';
  }

  ticketIssueTypeLabel(row: TicketTaskResponse): string {
    return this.issueTypes.find((t) => t.id === row.typeId)?.issueTypeName || '—';
  }

  ticketIssueStatusLabel(row: TicketTaskResponse): string {
    console.log(row.issueStatusId,'issueStatusId');
    console.log(this.issueStatuses,'issueStatuses');
    return this.issueStatuses.find((s) => s.id === row.issueStatusId)?.name || '—';
  }

  ticketRelatedSubModuleLabel(row: TicketTaskResponse): string {
    return this.subModules.find((s) => s.id === row.relatedSubModuleId)?.name || '—';
  }

  ticketRelatedModuleLabel(row: TicketTaskResponse): string {
    const moduleId = this.subModules.find((s) => s.id === row.relatedSubModuleId)?.moduleId;
    return this.modules.find((m) => m.id === moduleId)?.name || '—';
  }

  ticketRelatedSystemLabel(row: TicketTaskResponse): string {
    const moduleId = this.subModules.find((s) => s.id === row.relatedSubModuleId)?.moduleId;
    const systemId = this.modules.find((m) => m.id === moduleId)?.systemId;
    return this.systems.find((s) => s.id === systemId)?.name || '—';
  }

  hasKpi(kpi?: unknown): boolean {
    return !!kpi;
  }

  viewTicket(ticketId: string): void { this.router.navigate(['/ticketdetails', ticketId]); }
  viewTask(taskId: string): void { this.router.navigate(['/taskdetails', taskId]); }

  get hasActiveFilters(): boolean {
    return !!(
      this.selectedSystemIds().length ||
      this.selectedUserIds().length ||
      this.hasKpiFilter() !== 'all' ||
      this.fromDate() ||
      this.toDate()
    );
  }

  openCreateKpiForTicket(row: TicketTaskResponse): void {
    if (this.hasKpi(row.kpi)) return;
    this.useFixedKpi.set(false);
    this.selectedFixedKpiId.set(this.fixedKPIs[0]?.id ?? '');
    this.createKpiError.set(null);
    this.createKpiModal.set({
      kind: 'ticket',
      id: row.id,
      label: row.description || row.ticketId,
    });
  }

  openCreateKpiForTask(row: projecttasksubtaskresponse): void {
    if (this.hasKpi(row.kpi)) return;
    this.useFixedKpi.set(false);
    this.selectedFixedKpiId.set(this.fixedKPIs[0]?.id ?? '');
    this.createKpiError.set(null);
    this.createKpiModal.set({
      kind: 'task',
      id: row.id,
      label: row.description || row.projectTaskId,
    });
  }

  closeCreateKpiModal(): void {
    this.createKpiModal.set(null);
    this.createKpiError.set(null);
    this.creatingKpi.set(false);
  }

  submitCreateKpi(): void {
    const target = this.createKpiModal();
    if (!target) return;
    const req: createkpirequest = {};
    if (target.kind === 'ticket') req.ticketTaskId = target.id;
    else req.taskId = target.id;

    if (this.useFixedKpi()) {
      const fixedId = this.selectedFixedKpiId();
      if (!fixedId) {
        this.createKpiError.set('Please select a fixed KPI, or turn it off.');
        return;
      }
      req.fixedKPIId = fixedId;
    }

    this.creatingKpi.set(true);
    this.createKpiError.set(null);
    this.fixedKpiSvc.CreateKPI(req).subscribe({
      next: () => {
        this.creatingKpi.set(false);
        this.closeCreateKpiModal();
        this.loadCurrentTab();
      },
      error: () => {
        this.creatingKpi.set(false);
        this.createKpiError.set('Failed to create KPI.');
      },
    });
  }
}
