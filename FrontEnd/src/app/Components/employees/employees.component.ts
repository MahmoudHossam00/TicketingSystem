import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EmployeeService } from '../../Services/employee.service';
import { AddEmpProfileRequest, Department, EmployeeCache, EmpSiteData } from '../../Interfaces/employee';
import { AuthService, BasicUserDataResponse } from '../../Services/auth.service';
import { PaginatedResponse } from '../../Interfaces/general';
import { PaginationComponent } from '../shared/pagination/pagination.component';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.css',
})
export class EmployeesComponent implements OnInit, OnDestroy {
  @ViewChild('empPaginationTop') empPaginationTop?: ElementRef<HTMLElement>;

  paginatedemployees: PaginatedResponse<EmployeeCache> = {
    data: [],
    filteredCount: 0,
    page: 1,
    pageSize: 10,
    totalRecords: 0,
  };

  isLoading = signal(false);
  error = signal<string | null>(null);
  searchText = '';
  activeTab = signal<'directory' | 'landlines' | 'departments'>('directory');

  departments: Department[] = [];
  departmentsLoadError = signal<string | null>(null);
  selectedDepartmentIds = signal<number[]>([]);
  isDepartmentMenuOpen = false;
  departmentSearchText = '';

  currentPage = signal(1);

  profilesData = signal<EmpSiteData[]>([]);
  profilesLoading = signal(false);
  profilesError = signal<string | null>(null);
  profileFilterText = '';
  profileSortField: 'employeeNumber' | 'name' | 'email' | 'landLineNumber' | 'managerId' | 'id' = 'employeeNumber';
  profileSortDirection: 'asc' | 'desc' = 'asc';
  isDownloadingTemplate = signal(false);
  isUploadingExcel = signal(false);
  selectedExcelFile: File | null = null;
  isAddingProfile = signal(false);
  addProfileError = signal<string | null>(null);
  addProfileForm: AddEmpProfileRequest = {
    id: '',
    managerId: null,
    managerEmployeeNumber: null,
    email: null,
    landLineNumber: null,
  };
  employeeLookupText = '';
  managerLookupText = '';
  employeeOptions = signal<BasicUserDataResponse[]>([]);
  managerOptions = signal<BasicUserDataResponse[]>([]);
  employeeLookupLoading = signal(false);
  managerLookupLoading = signal(false);
  showEmployeeOptions = signal(false);
  showManagerOptions = signal(false);

  private searchInput$ = new Subject<string>();
  private lookupInput$ = new Subject<{ term: string; type: 'employee' | 'manager' }>();
  private subs: Subscription[] = [];
  private fetchSub?: Subscription;
  private lastFetchedQuery: string | undefined = undefined;
  private lastDepartmentFilterKey = '';

  constructor(
    private employeeService: EmployeeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.loadProfilesInsertedData(true);

    const searchSub = this.searchInput$
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.onSearchDebounced());
    const lookupSub = this.lookupInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.term === b.term && a.type === b.type)
      )
      .subscribe(({ term, type }) => this.fetchLookupUsers(term, type));

    this.subs.push(searchSub, lookupSub);
    this.onSearchDebounced();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.fetchSub?.unsubscribe();
  }

  setActiveTab(tab: 'directory' | 'landlines' | 'departments'): void {
    this.activeTab.set(tab);
    if (tab === 'landlines') {
      this.loadProfilesInsertedData(true);
    }
    if (tab === 'departments' && this.departmentsLoadError()) {
      this.loadDepartments();
    }
  }

  onSearch(value: string): void {
    this.searchText = value;
    this.searchInput$.next(value.trim());
  }

  clearSearch(): void {
    this.searchText = '';
    this.searchInput$.next('');
  }

  isDeptSelected(id: number | null | undefined): boolean {
    if (id == null) return false;
    return this.selectedDepartmentIds().includes(id);
  }

  toggleDepartment(id: number | null | undefined): void {
    if (id == null) return;
    const next = new Set(this.selectedDepartmentIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedDepartmentIds.set([...next].sort((a, b) => a - b));
    this.onDepartmentFilterChanged();
  }

  clearDepartmentFilter(): void {
    if (this.selectedDepartmentIds().length === 0) return;
    this.selectedDepartmentIds.set([]);
    this.onDepartmentFilterChanged();
  }

  toggleDepartmentMenu(): void {
    this.isDepartmentMenuOpen = !this.isDepartmentMenuOpen;
    if (this.isDepartmentMenuOpen) {
      this.departmentSearchText = '';
    }
  }

  closeDepartmentMenu(): void {
    this.isDepartmentMenuOpen = false;
    this.departmentSearchText = '';
  }

  onDepartmentMenuMouseLeave(): void {
    this.isDepartmentMenuOpen = false;
    this.departmentSearchText = '';
  }

  selectedDepartmentsSummary(): string {
    const selectedCount = this.selectedDepartmentIds().length;
    if (selectedCount === 0) return 'All departments';
    if (selectedCount === 1) {
      const selectedId = this.selectedDepartmentIds()[0];
      const selected = this.departments.find((d) => d.departmentId === selectedId);
      return selected?.departmentName || `Department ${selectedId}`;
    }
    return `${selectedCount} departments selected`;
  }

  filteredDepartments(): Department[] {
    const q = this.departmentSearchText.trim().toLowerCase();
    if (!q) return this.departments;
    return this.departments.filter((d) => {
      const name = (d.departmentName ?? '').toLowerCase();
      const id = String(d.departmentId ?? '');
      return name.includes(q) || id.includes(q);
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.empPaginationTop?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.executeFetch();
  }

  loadProfilesInsertedData(force = false): void {
    if (this.profilesLoading()) return;
    if (!force && this.profilesData().length > 0) return;

    this.profilesLoading.set(true);
    this.profilesError.set(null);
    this.employeeService.GetProfilesInsertedData().subscribe({
      next: (res) => {
        console.log('res',res)
        const data = Array.isArray(res) ? res : (res ? [res as unknown as EmpSiteData] : []);
        this.profilesData.set(data);
        this.profilesLoading.set(false);
      },
      error: () => {
        this.profilesLoading.set(false);
        console.log('Failed to load inserted employee profile data')
        this.profilesError.set('Failed to load inserted employee profile data.');
      }
    });
  }

  filteredProfiles(): EmpSiteData[] {
    const q = this.profileFilterText.trim().toLowerCase();
    const data = this.profilesData();
    if (!q) return data;

    return data.filter(p =>
      String(p.employeeNumber ?? '').toLowerCase().includes(q) ||
      String(p.name ?? '').toLowerCase().includes(q) ||
      String(p.email ?? '').toLowerCase().includes(q) ||
      String(p.managerId ?? '').toLowerCase().includes(q) ||
      String(p.landLineNumber ?? '').toLowerCase().includes(q) ||
      String(p.id ?? '').toLowerCase().includes(q)
    );
  }

  displayedProfiles(): EmpSiteData[] {
    const data = [...this.filteredProfiles()];
    const field = this.profileSortField;
    const dir = this.profileSortDirection === 'asc' ? 1 : -1;

    data.sort((a, b) => {
      const av = a[field];
      const bv = b[field];

      if (field === 'employeeNumber') {
        return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
      }

      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      return as.localeCompare(bs) * dir;
    });

    return data;
  }

  sortProfilesBy(field: 'employeeNumber' | 'name' | 'email' | 'landLineNumber' | 'managerId' | 'id'): void {
    if (this.profileSortField === field) {
      this.profileSortDirection = this.profileSortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.profileSortField = field;
    this.profileSortDirection = 'asc';
  }

  isSortField(field: 'employeeNumber' | 'name' | 'email' | 'landLineNumber' | 'managerId' | 'id'): boolean {
    return this.profileSortField === field;
  }

  downloadTemplate(): void {
    this.isDownloadingTemplate.set(true);
    this.employeeService.DownloadAddProfilesTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'add-profiles-template.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.isDownloadingTemplate.set(false);
      },
      error: () => {
        this.isDownloadingTemplate.set(false);
      }
    });
  }

  onExcelFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedExcelFile = input.files?.[0] ?? null;
  }

  uploadExcel(): void {
    if (!this.selectedExcelFile || this.isUploadingExcel()) return;

    this.isUploadingExcel.set(true);
    this.employeeService.AddProfilesByExcel(this.selectedExcelFile).subscribe({
      next: () => {
        this.isUploadingExcel.set(false);
        this.selectedExcelFile = null;
        this.loadProfilesInsertedData(true);
      },
      error: () => {
        this.isUploadingExcel.set(false);
      }
    });
  }

  addSingleProfile(): void {
    const payload: AddEmpProfileRequest = {
      id: this.addProfileForm.id.trim(),
      managerId: this.addProfileForm.managerId?.trim() || null,
      managerEmployeeNumber: this.addProfileForm.managerEmployeeNumber ?? null,
      email: this.addProfileForm.email?.trim() || null,
      landLineNumber: this.addProfileForm.landLineNumber?.trim() || null,
    };

    if (!payload.id) {
      this.addProfileError.set('Employee ID is required.');
      return;
    }

    this.addProfileError.set(null);
    this.isAddingProfile.set(true);
    this.employeeService.AddProfile(payload).subscribe({
      next: () => {
        this.isAddingProfile.set(false);
        this.addProfileForm = {
          id: '',
          managerId: null,
          managerEmployeeNumber: null,
          email: null,
          landLineNumber: null,
        };
        this.employeeLookupText = '';
        this.managerLookupText = '';
        this.employeeOptions.set([]);
        this.managerOptions.set([]);
        this.showEmployeeOptions.set(false);
        this.showManagerOptions.set(false);
        this.loadProfilesInsertedData(true);
      },
      error: () => {
        this.isAddingProfile.set(false);
        this.addProfileError.set('Failed to add employee profile.');
      }
    });
  }

  initials(emp: EmployeeCache): string {
    return (emp.nameEn ?? '?').trim().charAt(0).toUpperCase();
  }

  displayEmail(emp: EmployeeCache): string {
    return emp.email ?? emp.manuallyAddedEmail ?? '-';
  }

  onEmployeeLookupInput(value: string): void {
    this.employeeLookupText = value;
    this.addProfileForm.id = '';
    this.showEmployeeOptions.set(true);
    this.lookupInput$.next({ term: value.trim(), type: 'employee' });
  }

  onManagerLookupInput(value: string): void {
    this.managerLookupText = value;
    this.addProfileForm.managerId = null;
    this.addProfileForm.managerEmployeeNumber = null;
    this.showManagerOptions.set(true);
    this.lookupInput$.next({ term: value.trim(), type: 'manager' });
  }

  selectLookupUser(user: BasicUserDataResponse, type: 'employee' | 'manager'): void {
    const label = this.lookupLabel(user);
    if (type === 'employee') {
      this.addProfileForm.id = user.employeeId;
      this.employeeLookupText = label;
      this.employeeOptions.set([]);
      this.showEmployeeOptions.set(false);
      return;
    }
    this.addProfileForm.managerId = user.employeeId;
    this.addProfileForm.managerEmployeeNumber = user.employeeNumber;
    this.managerLookupText = label;
    this.managerOptions.set([]);
    this.showManagerOptions.set(false);
  }

  lookupLabel(user: BasicUserDataResponse): string {
    const fullName = user.employeeName?.trim() || user.userName?.trim() || 'Unknown';
    return `${fullName} (#${user.employeeNumber})`;
  }

  hideLookupOptions(type: 'employee' | 'manager'): void {
    setTimeout(() => {
      if (type === 'employee') {
        this.showEmployeeOptions.set(false);
      } else {
        this.showManagerOptions.set(false);
      }
    }, 120);
  }

  paginationTotalCount = signal<number>(0);
  hasMultiplePages = signal<boolean>(false);

  loadDepartments(): void {
    this.employeeService.getAllDepartments().subscribe({
      next: (list) => {
        this.departments = [...list].sort((a, b) => {
          const an = (a.departmentName ?? '').localeCompare(b.departmentName ?? '', undefined, {
            sensitivity: 'base',
          });
          if (an !== 0) return an;
          return (a.departmentId ?? 0) - (b.departmentId ?? 0);
        });
        this.departmentsLoadError.set(null);
      },
      error: () => {
        this.departments = [];
        this.departmentsLoadError.set('Could not load department list.');
      },
    });
  }

  private onSearchDebounced(): void {
    const q = this.searchText.trim();
    if (this.lastFetchedQuery !== q) {
      this.lastFetchedQuery = q;
      this.currentPage.set(1);
    }
    this.executeFetch();
  }

  private departmentFilterKey(): string {
    return [...this.selectedDepartmentIds()].sort((a, b) => a - b).join(',');
  }

  private onDepartmentFilterChanged(): void {
    const key = this.departmentFilterKey();
    if (key !== this.lastDepartmentFilterKey) {
      this.lastDepartmentFilterKey = key;
      this.currentPage.set(1);
    }
    this.executeFetch();
  }

  private executeFetch(): void {
    const query = this.lastFetchedQuery ?? '';
    const page = this.currentPage();
    const deptIds = this.selectedDepartmentIds();
    const deptParam = deptIds.length > 0 ? deptIds : undefined;

    this.isLoading.set(true);
    this.error.set(null);
    this.fetchSub?.unsubscribe();

    this.fetchSub = this.employeeService.getFiltered(query, page, deptParam).subscribe({
      next: (data) => {
        this.paginatedemployees = data;
        if (data.page != null && data.page > 0) {
          this.currentPage.set(data.page);
        }
        this.isLoading.set(false);
        const pageSize = data.pageSize ?? this.paginatedemployees.pageSize;
        this.hasMultiplePages.set((data.totalRecords ?? 0) > pageSize);
        this.paginationTotalCount.set(data.totalRecords ?? 0);
      },
      error: () => {
        this.error.set('Failed to load employees. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  private fetchLookupUsers(query: string, type: 'employee' | 'manager'): void {
    const term = query.trim();
    if (!term) {
      if (type === 'employee') {
        this.employeeOptions.set([]);
        this.employeeLookupLoading.set(false);
      } else {
        this.managerOptions.set([]);
        this.managerLookupLoading.set(false);
      }
      return;
    }

    if (type === 'employee') {
      this.employeeLookupLoading.set(true);
    } else {
      this.managerLookupLoading.set(true);
    }

    this.authService.getCompleteUsersBasicData({ filter: term, page: 1 }).subscribe({
      next: (res) => {
        const items = res?.data ?? [];
        if (type === 'employee') {
          this.employeeOptions.set(items);
          this.employeeLookupLoading.set(false);
        } else {
          this.managerOptions.set(items);
          this.managerLookupLoading.set(false);
        }
      },
      error: () => {
        if (type === 'employee') {
          this.employeeOptions.set([]);
          this.employeeLookupLoading.set(false);
        } else {
          this.managerOptions.set([]);
          this.managerLookupLoading.set(false);
        }
      },
    });
  }
}
