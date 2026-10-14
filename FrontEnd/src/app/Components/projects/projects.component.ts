import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../Services/project.service';
import { ITSystemService } from '../../Services/ITsystem.servic';
import { IssueStatusService } from '../../Services/issueStatus.service';
import { SubModuleService } from '../../Services/submodule.service';
import {
  CreateProjectRequest,
  FilterProjectRequest,
  IssuePriority,
  ProjectResponse,
} from '../../Interfaces/project';
import { Module, System } from '../../Interfaces/system';
import { issuestatus } from '../../Interfaces/issuestatus';
import { PaginatedResponse } from '../../Interfaces/general';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import { SubModule } from '../../Interfaces/submodule';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent implements OnInit {
  @ViewChild('projPaginationTop') projPaginationTop?: ElementRef<HTMLElement>;

  systems = signal<System[]>([]);
  allModules = signal<Module[]>([]);
  allSubModules = signal<SubModule[]>([]);
  createModules = signal<Module[]>([]);
  createSubModules = signal<SubModule[]>([]);
  issueStatuses = signal<issuestatus[]>([]);

  /** Last paged API result (list + totals). */
  pageState = signal<PaginatedResponse<ProjectResponse> | null>(null);

  isLoading = signal(false);
  listError = signal<string | null>(null);

  filterSystemId = signal('');
  filterStatusId = signal('');
  onlyMyProjects = signal(true);

  /** 1-based page; sent to `getAllFiltered` */
  currentPage = signal(1);

  showCreateModal = signal(false);
  showDeleteModal = signal(false);
  projectToDelete: ProjectResponse | null = null;

  createDescription = '';
  createStartDate = '';
  createEndDate = '';
  createSystemId = '';
  createModuleId = '';
  createRelatedSubModuleId = '';
  /** Empty string = omit priority on create */
  createPrioritySelect = '';
  createStatusId = '';
  createFiles: File[] = [];
  savingCreate = signal(false);
  createError = signal<string | null>(null);

  deleting = signal(false);
  deleteError = signal<string | null>(null);

  /** Project id currently calling ToggleProjectClosed (disables that row’s control). */
  togglingClosedId = signal<string | null>(null);
  toggleClosedError = signal<string | null>(null);

  readonly IssuePriority = IssuePriority;

  constructor(
    private projectSvc: ProjectService,
    private systemSvc: ITSystemService,
    private subModuleSvc: SubModuleService,
    private statusSvc: IssueStatusService,
  ) {}

  ngOnInit(): void {
    this.statusSvc.getAllIssueStatuses().subscribe(s => this.issueStatuses.set(s));
    this.systemSvc.getAllSystems().subscribe(systems => {
      this.systems.set(systems ?? []);
      this.loadAllProjectLookups();
      this.loadProjects();
    });
  }

  private loadAllProjectLookups(): void {
    const systems = this.systems();
    if (!systems.length) {
      this.allModules.set([]);
      this.allSubModules.set([]);
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
      this.allModules.set((modulesBySystem ?? []).flat());
      this.allSubModules.set(subModules ?? []);
    });
  }

  private buildFilter(): FilterProjectRequest {
    const f: FilterProjectRequest = {
      onlyMyProjects: this.onlyMyProjects(),
    };
    const sys = this.filterSystemId();
    const st = this.filterStatusId();
    if (sys) f.systemId = sys;
    if (st) f.issueStatusId = st;
    return f;
  }

  /**
   * Total rows for the pager and “X projects total”.
   * This API sets `filteredCount` to the current page length; `totalRecords` is the full match count.
   */
  get paginationTotalCount(): number {
    const p = this.pageState();
    if (!p) return 0;
    const total = p.totalRecords ?? 0;
    if (total > 0) return total;
    return p.filteredCount ?? 0;
  }

  get hasMultiplePages(): boolean {
    const p = this.pageState();
    if (!p) return false;
    const size = Math.max(1, p.pageSize || 10);
    return this.paginationTotalCount > size;
  }

  loadProjects(): void {
    
    this.isLoading.set(true);
    this.listError.set(null);
    this.projectSvc.getAllFiltered(this.buildFilter(), this.currentPage()).subscribe({
      next: data => {
        this.pageState.set(data);
        if (data.page != null && data.page > 0) {
          this.currentPage.set(data.page);
        }
        this.isLoading.set(false);
        console.log(this.pageState(),'pageState');
        console.log(data,'data');
      },
      error: () => {
        this.listError.set('Could not load projects.');
        this.isLoading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadProjects();
  }

  toggleMyProjects(): void {
    this.onlyMyProjects.set(!this.onlyMyProjects());
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.projPaginationTop?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.loadProjects();
  }

  openCreateModal(): void {
    this.createError.set(null);
    this.createDescription = '';
    this.createStartDate = this.todayIso();
    this.createEndDate = this.todayIso();
    this.createSystemId = this.systems()[0]?.id ?? '';
    this.createModuleId = '';
    this.createRelatedSubModuleId = '';
    this.createModules.set([]);
    this.createSubModules.set([]);
    if (this.createSystemId) {
      this.onCreateSystemChange(this.createSystemId);
    }
    this.createPrioritySelect = '';
    this.createStatusId = '';
    this.createFiles = [];
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  onCreateFilesChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.createFiles = input.files ? Array.from(input.files) : [];
  }

  onCreateSystemChange(systemId: string): void {
    this.createSystemId = systemId;
    this.createModuleId = '';
    this.createRelatedSubModuleId = '';
    this.createModules.set([]);
    this.createSubModules.set([]);
    if (!systemId) return;

    this.systemSvc.getSystemModules(systemId).subscribe({
      next: (mods) => this.createModules.set(mods ?? []),
      error: () => this.createModules.set([]),
    });
  }

  onCreateModuleChange(moduleId: string): void {
    this.createModuleId = moduleId;
    this.createRelatedSubModuleId = '';
    this.createSubModules.set([]);
    if (!moduleId) return;

    this.subModuleSvc.getbyModuleId(moduleId).subscribe({
      next: (subs) => this.createSubModules.set(subs ?? []),
      error: () => this.createSubModules.set([]),
    });
  }

  submitCreate(): void {
    const desc = this.createDescription.trim();
    if (!desc || !this.createStartDate || !this.createEndDate || !this.createRelatedSubModuleId) {
      this.createError.set('Description, related submodule, start date, and end date are required.');
      return;
    }
    this.createError.set(null);
    this.savingCreate.set(true);

    const body: CreateProjectRequest = {
      description: desc,
      startDate: this.createStartDate,
      endDate: this.createEndDate,
      relatedSubModuleId: this.createRelatedSubModuleId,
    };
    if (this.createPrioritySelect !== '') {
      body.priority = Number(this.createPrioritySelect) as IssuePriority;
    }
    if (this.createStatusId) body.currentStatusId = this.createStatusId;
    if (this.createFiles.length) body.attachments = this.createFiles;

    this.projectSvc.create(body).subscribe({
      next: () => {
        this.savingCreate.set(false);
        this.closeCreateModal();
        this.currentPage.set(1);
        this.loadProjects();
      },
      error: () => {
        this.savingCreate.set(false);
        this.createError.set('Could not create project. Please try again.');
      },
    });
  }

  openDeleteModal(p: ProjectResponse): void {
    this.deleteError.set(null);
    this.projectToDelete = p;
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.projectToDelete = null;
  }

  confirmDelete(): void {
    const p = this.projectToDelete;
    if (!p) return;
    this.deleteError.set(null);
    this.deleting.set(true);
    this.projectSvc.delete(p.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadProjects();
      },
      error: () => {
        this.deleting.set(false);
        this.deleteError.set('Could not delete project.');
      },
    });
  }

  toggleProjectClosed(p: ProjectResponse, ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.toggleClosedError.set(null);
    this.togglingClosedId.set(p.id);
    this.projectSvc.ToggleProjectClosed(p.id).subscribe({
      next: () => {
        const state = this.pageState();
        if (state?.data?.length) {
          const data = state.data.map(row =>
            row.id === p.id ? { ...row, isClosed: !row.isClosed } : row,
          );
          this.pageState.set({ ...state, data });
        }
        this.toggleClosedError.set(null);
        this.togglingClosedId.set(null);
      },
      error: () => {
        this.togglingClosedId.set(null);
        this.toggleClosedError.set('Could not update closed state. Try again.');
      },
    });
  }

  private moduleIdFromSubModule(relatedSubmoduleId: string | undefined): string | null {
    if (!relatedSubmoduleId) return null;
    return this.allSubModules().find(sm => sm.id === relatedSubmoduleId)?.moduleId ?? null;
  }

  subModuleName(relatedSubmoduleId: string | undefined): string {
    if (!relatedSubmoduleId) return '—';
    return this.allSubModules().find(sm => sm.id === relatedSubmoduleId)?.name ?? '—';
  }

  moduleNameFromSubModule(relatedSubmoduleId: string | undefined): string {
    const moduleId = this.moduleIdFromSubModule(relatedSubmoduleId);
    if (!moduleId) return '—';
    return this.allModules().find(m => m.id === moduleId)?.name ?? '—';
  }

  systemNameFromSubModule(relatedSubmoduleId: string | undefined): string {
    const moduleId = this.moduleIdFromSubModule(relatedSubmoduleId);
    if (!moduleId) return '—';
    const systemId = this.allModules().find(m => m.id === moduleId)?.systemId;
    if (!systemId) return '—';
    return this.systems().find(s => s.id === systemId)?.name ?? '—';
  }

  statusName(id: string | undefined): string {
    if (!id) return '—';
    return this.issueStatuses().find(s => s.id === id)?.name ?? '—';
  }

  statusColor(id: string | undefined): string {
    if (!id) return '#94a3b8';
    return this.issueStatuses().find(s => s.id === id)?.color ?? '#94a3b8';
  }

  priorityLabel(p: number | undefined): string {
    if (p === undefined || p === null) return '—';
    return IssuePriority[p] ?? '—';
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
