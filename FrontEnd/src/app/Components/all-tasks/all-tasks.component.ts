import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TasksService } from '../../Services/tasks.service';
import { TaskResponse } from '../../Interfaces/Projecttasks';
import { IssuePriority } from '../../Interfaces/project';
import { FilterTaskRequest } from '../../Interfaces/ticket';
import { IssueStatusService } from '../../Services/issueStatus.service';
import { issuestatus } from '../../Interfaces/issuestatus';
import { ITSystemService } from '../../Services/ITsystem.servic';
import { System } from '../../Interfaces/system';

type TaskTabKey = 'all' | 'assigned' | 'responsible';

@Component({
  selector: 'app-all-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './all-tasks.component.html',
  styleUrl: './all-tasks.component.css',
})
export class AllTasksComponent implements OnInit {
  tasks: TaskResponse[] = [];
  issueStatuses: issuestatus[] = [];
  systems: System[] = [];

  isLoading = false;
  loadError: string | null = null;

  activeTab = signal<TaskTabKey>('all');
  filterSystemId = signal<string>('');
  filterStatusId = signal<string>('');
  filterFromDate = signal<string>('');
  filterToDate = signal<string>('');
  currentPage = signal(1);

  totalRecords = 0;
  pageSize = 50;

  readonly TABS: { key: TaskTabKey; label: string }[] = [
    { key: 'all', label: 'All tasks' },
    { key: 'assigned', label: 'Assigned to me' },
    { key: 'responsible', label: "I'm responsible" },
  ];

  IssuePriority = IssuePriority;

  constructor(
    private tasksSvc: TasksService,
    private router: Router,
    private issueStatusSvc: IssueStatusService,
    private systemSvc: ITSystemService,
  ) {}

  ngOnInit(): void {
    this.issueStatusSvc.getAllIssueStatuses().subscribe(s => (this.issueStatuses = s));
    this.systemSvc.getAllSystems().subscribe(s => (this.systems = s));
    this.loadTasks();
  }

  get totalPages(): number {
    if (this.pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  setTab(tab: TaskTabKey): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadTasks();
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadTasks();
  }

  clearFilters(): void {
    this.filterSystemId.set('');
    this.filterStatusId.set('');
    this.filterFromDate.set('');
    this.filterToDate.set('');
    this.currentPage.set(1);
    this.loadTasks();
  }

  prevPage(): void {
    if (this.currentPage() <= 1) return;
    this.currentPage.update(p => p - 1);
    this.loadTasks();
  }

  nextPage(): void {
    if (this.currentPage() >= this.totalPages) return;
    this.currentPage.update(p => p + 1);
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading = true;
    this.loadError = null;
    const tab = this.activeTab();

    const filter: FilterTaskRequest = {
      systemId: this.filterSystemId() || undefined,
      issueStatusId: this.filterStatusId() || undefined,
      onlyAssignedTasks: tab === 'assigned' ? true : undefined,
      onlyResponsibleTasks: tab === 'responsible' ? true : undefined,
      from: this.filterFromDate() ? new Date(`${this.filterFromDate()}T00:00:00`) : undefined,
      to: this.filterToDate() ? new Date(`${this.filterToDate()}T23:59:59`) : undefined,
      pagenum: this.currentPage(),
    };

    this.tasksSvc.getPaged(filter).subscribe({
      next: res => {
        this.tasks = res.data ?? [];
        this.totalRecords = res.totalRecords ?? 0;
        this.pageSize = res.pageSize > 0 ? res.pageSize : 50;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.tasks = [];
        this.totalRecords = 0;
        this.loadError =
          err.status === 403
            ? 'Administrator access is required to view this list.'
            : 'Could not load tasks.';
      },
    });
  }

  getStatusName(id: string | undefined): string {
    if (!id) return '—';
    return this.issueStatuses.find(s => s.id === id)?.name ?? '—';
  }

  getStatusColor(id: string | undefined): string {
    if (!id) return '#94a3b8';
    return this.issueStatuses.find(s => s.id === id)?.color ?? '#94a3b8';
  }

  getPriorityLabel(p: number | undefined): string {
    if (p === undefined || p === null) return '—';
    return IssuePriority[p] ?? '—';
  }

  viewTask(id: string, ev?: Event): void {
    ev?.stopPropagation();
    this.router.navigate(['/taskdetails', id]);
  }

  viewProject(projectId: string, ev: Event): void {
    ev.stopPropagation();
    this.router.navigate(['/projectdetails', projectId]);
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterSystemId() || this.filterStatusId() || this.filterFromDate() || this.filterToDate());
  }
}
