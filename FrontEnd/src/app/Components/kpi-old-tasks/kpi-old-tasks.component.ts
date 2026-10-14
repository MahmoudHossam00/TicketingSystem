import { Component, HostBinding, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OldTaskService } from '../../Services/old-task.service';
import { CompanyService } from '../../Services/Company.service';
import { IssuetypeService } from '../../Services/Issuetype.service';
import { IssueStatusService } from '../../Services/issueStatus.service';
import { SubModuleService } from '../../Services/submodule.service';
import { ITSystemService } from '../../Services/ITsystem.servic';
import { company, issueType, Module, System } from '../../Interfaces/system';
import { issuestatus } from '../../Interfaces/issuestatus';
import { SubModule } from '../../Interfaces/submodule';
import { UserResponseDTO } from '../../Interfaces/auth';
import {
  FilterOldTaskRequest,
  OldTaskResponse,
  OldTaskType,
  OldTaskSortBy,
  SortDirection,
} from '../../Interfaces/old-task';
import { KPIViewDto } from '../../Interfaces/ticket';

@Component({
  selector: 'app-kpi-old-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kpi-old-tasks.component.html',
  styleUrl: './kpi-old-tasks.component.css',
})
export class KpiOldTasksComponent implements OnInit {
  /** When opened from route /old-tasks, add full-page chrome via host class. */
  @HostBinding('class.old-tasks-page-host')
  get hostFullPageLayout(): boolean {
    return this.isStandaloneOldTasksRoute;
  }

  get isStandaloneOldTasksRoute(): boolean {
    return this.router.url.split('?')[0].replace(/\/$/, '') === '/old-tasks';
  }
  readonly sortByOptions: { value: OldTaskSortBy; label: string }[] = [
    { value: OldTaskSortBy.CreatedAt, label: 'Created' },
    { value: OldTaskSortBy.Date, label: 'Date' },
    { value: OldTaskSortBy.OriginalSubject, label: 'Subject' },
    { value: OldTaskSortBy.Company, label: 'Company' },
    { value: OldTaskSortBy.IssueStatus, label: 'Status' },
    { value: OldTaskSortBy.Type, label: 'Type' },
  ];

  readonly sortDirOptions: { value: SortDirection; label: string }[] = [
    { value: SortDirection.Asc, label: 'Ascending' },
    { value: SortDirection.Desc, label: 'Descending' },
  ];

  companies: company[] = [];
  issueTypes: issueType[] = [];
  issueStatuses: issuestatus[] = [];
  subModules: SubModule[] = [];
  systems: System[] = [];
  modules: Module[] = [];
  users: { id: string; name: string }[] = [];

  /** Filter: 0=Project, 1=Ticket, empty = all. */
  recordType = signal<'' | '0' | '1'>('');

  fromDate = signal<string>('');
  toDate = signal<string>('');
  companyId = signal<string>('');
  issueTypeId = signal<string>('');
  relatedSubModuleId = signal<string>('');
  issueCreatorId = signal<string>('');
  issueStatusId = signal<string>('');
  search = signal<string>('');
  sortBy = signal<OldTaskSortBy>(OldTaskSortBy.Date);
  sortDirection = signal<SortDirection>(SortDirection.Desc);

  rows = signal<OldTaskResponse[]>([]);
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  currentPage = signal(1);
  totalRecords = signal(0);
  pageSize = signal(20);

  importing = signal(false);
  importMessage = signal<string | null>(null);
  importDetail = signal<string | null>(null);

  constructor(
    private oldTaskSvc: OldTaskService,
    private companySvc: CompanyService,
    private issueTypeSvc: IssuetypeService,
    private issueStatusSvc: IssueStatusService,
    private subModuleSvc: SubModuleService,
    private systemSvc: ITSystemService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadReferenceData();
  }

  private loadReferenceData(): void {
    this.systemSvc.getAllSystems().pipe(catchError(() => of([] as System[]))).subscribe((sysList) => {
      this.systems = sysList ?? [];
      const moduleCalls = this.systems.length
        ? this.systems.map((s) =>
            this.systemSvc.getSystemModules(s.id).pipe(catchError(() => of([] as Module[]))),
          )
        : [];
      const modulesFork = moduleCalls.length ? forkJoin(moduleCalls) : of([] as Module[][]);

      forkJoin({
        companies: this.companySvc.getAllcompanys().pipe(catchError(() => of([] as company[]))),
        issueTypes: this.issueTypeSvc.getAllIssueTypes().pipe(catchError(() => of([] as issueType[]))),
        issueStatuses: this.issueStatusSvc.getAllIssueStatuses().pipe(catchError(() => of([] as issuestatus[]))),
        subModules: this.subModuleSvc.getAll().pipe(catchError(() => of([] as SubModule[]))),
        moduleGroups: modulesFork,
      }).subscribe(({ companies, issueTypes, issueStatuses, subModules, moduleGroups }) => {
        this.companies = companies ?? [];
        this.issueTypes = issueTypes ?? [];
        this.issueStatuses = issueStatuses ?? [];
        this.subModules = subModules ?? [];
        this.modules = (moduleGroups as Module[][]).flat();
        this.loadPage();
      });

      if (!this.systems.length) {
        this.users = [];
        return;
      }
      const agentReq = this.systems.map((s) =>
        this.systemSvc.getSystemAgents(s.id).pipe(catchError(() => of([] as UserResponseDTO[]))),
      );
      forkJoin(agentReq).subscribe((groups) => {
        const map = new Map<string, string>();
        for (const list of groups) {
          for (const u of list ?? []) {
            map.set(u.id, u.userName || u.email || u.id);
          }
        }
        this.users = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
      });
    });
  }

  /** Project vs ticket (API `type`: 0 = project, 1 = ticket). */
  recordTypeLabel(type: number | OldTaskType | string | null | undefined): string {
    const n = type !== null && type !== undefined && type !== '' ? Number(type) : NaN;
    if (n === OldTaskType.Project || n === 0) return 'Project';
    if (n === OldTaskType.Ticket || n === 1) return 'Ticket';
    return '—';
  }

  private moduleForSubModuleId(subModuleId: string | null | undefined): Module | undefined {
    if (!subModuleId) return undefined;
    const sub = this.subModules.find((s) => s.id === subModuleId);
    if (!sub?.moduleId) return undefined;
    return this.modules.find((m) => m.id === sub.moduleId);
  }

  systemLabelForRow(r: OldTaskResponse): string {
    const mod = this.moduleForSubModuleId(r.relatedSubModuleId);
    if (!mod?.systemId) return '—';
    return this.systems.find((s) => s.id === mod.systemId)?.name ?? '—';
  }

  moduleLabelForRow(r: OldTaskResponse): string {
    const mod = this.moduleForSubModuleId(r.relatedSubModuleId);
    return mod?.name ?? '—';
  }

  subModuleLabelForRow(r: OldTaskResponse): string {
    return r.relatedSubModuleName ?? this.subModules.find((s) => s.id === r.relatedSubModuleId)?.name ?? '—';
  }

  companyLabelForRow(r: OldTaskResponse): string {
    return r.companyName ?? this.companies.find((c) => c.id === r.companyId)?.name ?? '—';
  }

  statusLabelForRow(r: OldTaskResponse): string {
    return r.issueStatusName ?? this.issueStatuses.find((s) => s.id === r.issueStatusId)?.name ?? '—';
  }

  issueTypeLabelForRow(r: OldTaskResponse): string {
    return r.issueTypeName ?? this.issueTypes.find((t) => t.id === r.issueTypeId)?.issueTypeName ?? '—';
  }

  creatorLabelForRow(r: OldTaskResponse): string {
    return r.issueCreatorName ?? this.users.find((u) => u.id === r.issueCreatorId)?.name ?? '—';
  }

  issueSolverLabelForRow(r: OldTaskResponse): string {
    return r.issueSolverName ?? this.users.find((u) => u.id === r.issueSolverId)?.name ?? '—';
  }

  /** Resolves `kpi` or legacy `KPI` from the API payload. */
  kpiForRow(r: OldTaskResponse): KPIViewDto | null {
    return r.kpi ?? r.KPI ?? r.kPI ?? null;
  }

  /** Recorded answer / value; falls back to `type` when the API only sends that. */
  kpiValueForRow(r: OldTaskResponse): string {
    const k = this.kpiForRow(r);
    if (!k) return '—';
    const v = (k.value ?? k.kpiValue)?.toString().trim();
    if (v) return v;
    const t = k.type != null ? String(k.type).trim() : '';
    return t || '—';
  }

  buildRequest(): FilterOldTaskRequest {
    return {
      pagenum: this.currentPage(),
      from: this.fromDate() || null,
      to: this.toDate() || null,
      companyId: this.companyId() || null,
      issueTypeId: this.issueTypeId() || null,
      relatedSubModuleId: this.relatedSubModuleId() || null,
      issueCreatorId: this.issueCreatorId() || null,
      issueStatusId: this.issueStatusId() || null,
      type:
        this.recordType() === ''
          ? null
          : (Number(this.recordType()) as OldTaskType),
      search: this.search().trim() || null,
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection(),
    };
  }

  loadPage(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.oldTaskSvc.getFilteredOldTasks(this.buildRequest()).subscribe({
      next: (res) => {
        console.log(res, 'res');
        this.rows.set(res?.data ?? []);
        console.log(this.rows(), 'this.rows');
        this.totalRecords.set(res?.totalRecords ?? 0);
        this.pageSize.set(res?.pageSize ?? 20);
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.totalRecords.set(0);
        this.isLoading.set(false);
        this.loadError.set('Could not load old tasks.');
      },
    });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadPage();
  }

  clearFilters(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.companyId.set('');
    this.issueTypeId.set('');
    this.relatedSubModuleId.set('');
    this.issueCreatorId.set('');
    this.issueStatusId.set('');
    this.recordType.set('');
    this.search.set('');
    this.sortBy.set(OldTaskSortBy.Date);
    this.sortDirection.set(SortDirection.Desc);
    this.currentPage.set(1);
    this.loadPage();
  }

  prevPage(): void {
    if (this.currentPage() <= 1) return;
    this.currentPage.update((p) => p - 1);
    this.loadPage();
  }

  nextPage(): void {
    if (this.currentPage() >= this.totalPages) return;
    this.currentPage.update((p) => p + 1);
    this.loadPage();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords() / (this.pageSize() || 20)));
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.fromDate() ||
      this.toDate() ||
      this.companyId() ||
      this.issueTypeId() ||
      this.relatedSubModuleId() ||
      this.issueCreatorId() ||
      this.issueStatusId() ||
      this.recordType() ||
      this.search().trim()
    );
  }

  downloadTemplate(): void {
    this.oldTaskSvc.downloadOldTasksTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'OldTasksTemplate.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.importMessage.set('Could not download template.');
        this.importDetail.set(null);
      },
    });
  }

  onExcelFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      this.importMessage.set('Please choose an Excel file (.xlsx or .xls).');
      this.importDetail.set(null);
      return;
    }
    this.runImport(file);
  }

  private runImport(file: File): void {
    this.importing.set(true);
    this.importMessage.set(null);
    this.importDetail.set(null);
    this.oldTaskSvc.importOldTasks(file).subscribe({
      next: (res) => {
        this.importing.set(false);
        this.importMessage.set(
          `Import finished: ${res.successRows} of ${res.totalRows} row(s) imported successfully.`,
        );
        const errLines = res.errors?.length
          ? res.errors.slice(0, 8).join('\n') + (res.errors.length > 8 ? '\n…' : '')
          : null;
        this.importDetail.set(errLines);
        this.currentPage.set(1);
        this.loadPage();
      },
      error: () => {
        this.importing.set(false);
        this.importMessage.set('Import failed. Check the file and try again.');
        this.importDetail.set(null);
      },
    });
  }
}
