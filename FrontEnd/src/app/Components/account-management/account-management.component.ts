import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../Services/auth.service';
import { EmployeeService } from '../../Services/employee.service';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, of, takeUntil, Subject } from 'rxjs';
import {
  CreateAccountRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  AddRoleRequest,
  RolesDictionary,
  UsersDictionary,
  Employee
} from '../../Interfaces/auth';

type TabType = 'createAccount' | 'createRole' | 'updateRole' | 'addRoleToUser' | 'viewRoles' | 'viewEmployees' | 'addUserPicture';

// Permission structure matching C# Permission class
interface PermissionCategory {
  name: string;
  permissions: { key: string; value: string; label: string }[];
}

const PERMISSIONS: PermissionCategory[] = [
  {
    name: 'Survey',
    permissions: [
      { key: 'Create', value: 'survey:create', label: 'Create Survey' },
      { key: 'Read', value: 'survey:read', label: 'Read Survey' },
      { key: 'Update', value: 'survey:update', label: 'Update Survey' },
      { key: 'Delete', value: 'survey:delete', label: 'Delete Survey' }
    ]
  },
  {
    name: 'Survey Department',
    permissions: [
      { key: 'Create', value: 'surveydepartment:create', label: 'Create Survey Department' },
      { key: 'Read', value: 'surveydepartment:read', label: 'Read Survey Department' },
      { key: 'Update', value: 'surveydepartment:update', label: 'Update Survey Department' },
      { key: 'Delete', value: 'surveydepartment:delete', label: 'Delete Survey Department' }
    ]
  },
  {
    name: 'Survey Question',
    permissions: [
      { key: 'Create', value: 'surveyquestion:create', label: 'Create Survey Question' },
      { key: 'Read', value: 'surveyquestion:read', label: 'Read Survey Question' },
      { key: 'Update', value: 'surveyquestion:update', label: 'Update Survey Question' },
      { key: 'Delete', value: 'surveyquestion:delete', label: 'Delete Survey Question' }
    ]
  },
  {
    name: 'Survey Template',
    permissions: [
      { key: 'Create', value: 'surveytemplate:create', label: 'Create Survey Template' },
      { key: 'Read', value: 'surveytemplate:read', label: 'Read Survey Template' },
      { key: 'Update', value: 'surveytemplate:update', label: 'Update Survey Template' },
      { key: 'Delete', value: 'surveytemplate:delete', label: 'Delete Survey Template' }
    ]
  },
  {
    name: 'Template Survey Question',
    permissions: [
      { key: 'Create', value: 'templatesurveyquestion:create', label: 'Create Template Survey Question' },
      { key: 'Read', value: 'templatesurveyquestion:read', label: 'Read Template Survey Question' },
      { key: 'Update', value: 'templatesurveyquestion:update', label: 'Update Template Survey Question' },
      { key: 'Delete', value: 'templatesurveyquestion:delete', label: 'Delete Template Survey Question' }
    ]
  },
  {
    name: 'Answered Survey',
    permissions: [
      { key: 'Create', value: 'answeredsurvey:create', label: 'Create Answered Survey' },
      { key: 'Read', value: 'answeredsurvey:read', label: 'Read Answered Survey' },
      { key: 'Update', value: 'answeredsurvey:update', label: 'Update Answered Survey' },
      { key: 'Delete', value: 'answeredsurvey:delete', label: 'Delete Answered Survey' }
    ]
  },
  {
    name: 'Evaluating Employee',
    permissions: [
      { key: 'Create', value: 'evaluatingemployee:create', label: 'Create Evaluating Employee' },
      { key: 'Read', value: 'evaluatingemployee:read', label: 'Read Evaluating Employee' },
      { key: 'Update', value: 'evaluatingemployee:update', label: 'Update Evaluating Employee' },
      { key: 'Delete', value: 'evaluatingemployee:delete', label: 'Delete Evaluating Employee' }
    ]
  },
  {
    name: 'Employee',
    permissions: [
      { key: 'Create', value: 'employee:create', label: 'Create Employee' },
      { key: 'Read', value: 'employee:read', label: 'Read Employee' },
      { key: 'Update', value: 'employee:update', label: 'Update Employee' },
      { key: 'Delete', value: 'employee:delete', label: 'Delete Employee' }
    ]
  },
  {
    name: 'Department',
    permissions: [
      { key: 'Create', value: 'department:create', label: 'Create Department' },
      { key: 'Read', value: 'department:read', label: 'Read Department' },
      { key: 'Update', value: 'department:update', label: 'Update Department' },
      { key: 'Delete', value: 'department:delete', label: 'Delete Department' }
    ]
  },
  {
    name: 'Competency',
    permissions: [
      { key: 'Create', value: 'competency:create', label: 'Create Competency' },
      { key: 'Read', value: 'competency:read', label: 'Read Competency' },
      { key: 'Update', value: 'competency:update', label: 'Update Competency' },
      { key: 'Delete', value: 'competency:delete', label: 'Delete Competency' }
    ]
  },
  {
    name: 'Competency Template',
    permissions: [
      { key: 'Create', value: 'competencytemplate:create', label: 'Create Competency Template' },
      { key: 'Read', value: 'competencytemplate:read', label: 'Read Competency Template' },
      { key: 'Update', value: 'competencytemplate:update', label: 'Update Competency Template' },
      { key: 'Delete', value: 'competencytemplate:delete', label: 'Delete Competency Template' }
    ]
  },
  {
    name: 'Fixed Competency',
    permissions: [
      { key: 'Create', value: 'fixedcompetency:create', label: 'Create Fixed Competency' },
      { key: 'Read', value: 'fixedcompetency:read', label: 'Read Fixed Competency' },
      { key: 'Update', value: 'fixedcompetency:update', label: 'Update Fixed Competency' },
      { key: 'Delete', value: 'fixedcompetency:delete', label: 'Delete Fixed Competency' }
    ]
  },
  {
    name: 'Fixed Question',
    permissions: [
      { key: 'Create', value: 'fixedquestion:create', label: 'Create Fixed Question' },
      { key: 'Read', value: 'fixedquestion:read', label: 'Read Fixed Question' },
      { key: 'Update', value: 'fixedquestion:update', label: 'Update Fixed Question' },
      { key: 'Delete', value: 'fixedquestion:delete', label: 'Delete Fixed Question' }
    ]
  },
  {
    name: 'App User',
    permissions: [
      { key: 'Create', value: 'appuser:create', label: 'Create App User' },
      { key: 'Read', value: 'appuser:read', label: 'Read App User' },
      { key: 'Update', value: 'appuser:update', label: 'Update App User' },
      { key: 'Delete', value: 'appuser:delete', label: 'Delete App User' }
    ]
  }
];

@Component({
  selector: 'app-account-management',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './account-management.component.html',
  styleUrl: './account-management.component.css'
})
export class AccountManagementComponent implements OnInit, OnDestroy {
  // Tab management
  activeTab: TabType = 'createAccount';
  tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'createAccount', label: 'Create Account', icon: 'user-plus' },
    { id: 'createRole', label: 'Create Role', icon: 'shield-plus' },
    { id: 'updateRole', label: 'Update Role', icon: 'shield-check' },
    { id: 'addRoleToUser', label: 'Add Role to User', icon: 'user-shield' },
    { id: 'viewRoles', label: 'View All Roles', icon: 'list' },
    { id: 'viewEmployees', label: 'Employee Hierarchy', icon: 'users' },
    { id: 'addUserPicture', label: 'User picture', icon: 'image' }
  ];

  /** Add picture tab */
  pictureUserId = '';
  picturePreviewUrl: string | null = null;
  isUploadingPicture = false;
  pictureMessage: string | null = null;
  pictureError: string | null = null;

  // Forms
  createAccountForm!: FormGroup;
  createRoleForm!: FormGroup;
  updateRoleForm!: FormGroup;
  addRoleToUserForm!: FormGroup;

  // State
  isLoading = false;
  isLoadingEmployees = false;
  isLoadingUsers = false;
  isLoadingUserRoles = false;
  rolesDictionary: RolesDictionary = {};
  usersDictionary: UsersDictionary = {};
  availableRoles: { id: string; name: string }[] = [];
  availableUsers: { id: string; name: string }[] = [];
  employees: Employee[] = [];
  employeeSearchTerm = '';
  employeeDropdownOpen = false;
  userExistingRoles: string[] = []; // Roles already assigned to selected user
  permissionCategories: PermissionCategory[] = PERMISSIONS;

  // Get all permissions as flat array
  get allPermissions(): { key: string; value: string; label: string }[] {
    return PERMISSIONS.flatMap(category => category.permissions);
  }

  isHierarchyExpanded = false;
  expandedEmployeeIds = new Set<string>();

  toggleHierarchyExpansion(): void {
    this.isHierarchyExpanded = !this.isHierarchyExpanded;
    if (this.isHierarchyExpanded) {
      this.expandAll();
    } else {
      this.collapseAll();
    }
  }

  toggleRow(employeeId: string): void {
    if (this.expandedEmployeeIds.has(employeeId)) {
      this.expandedEmployeeIds.delete(employeeId);
    } else {
      this.expandedEmployeeIds.add(employeeId);
    }
  }

  isRowExpanded(employeeId: string): boolean {
    return this.expandedEmployeeIds.has(employeeId);
  }

  expandAll(): void {
    this.employees.forEach(emp => {
      this.expandedEmployeeIds.add(emp.id);
      this.expandChildren(emp);
    });
  }

  private expandChildren(emp: Employee): void {
    if (emp.SubOrdinates) {
      emp.SubOrdinates.forEach(child => {
        this.expandedEmployeeIds.add(child.id);
        this.expandChildren(child);
      });
    }
  }

  collapseAll(): void {
    this.expandedEmployeeIds.clear();
  }

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private employeeService: EmployeeService,
    private toastr: ToastrService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.loadAllRoles();
    this.loadAllEmployees();
    this.loadAllUsers();
    this.createAccountForm.get('employeeId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(id => {
      if (!id) this.employeeSearchTerm = '';
      else {
        const emp = this.employees.find(e => e.id === id);
        if (emp) this.employeeSearchTerm = this.getEmployeeDisplayName(emp);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.picturePreviewUrl) {
      URL.revokeObjectURL(this.picturePreviewUrl);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    // Create Account Form
    this.createAccountForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_.]+$/)]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
      email: ['', [Validators.email]],
      employeeId: ['', [Validators.required]],
      permissions: this.fb.array([]),
      roles: this.fb.array([], [Validators.required, Validators.minLength(1)])
    }, { validators: this.passwordMatchValidator });

    // Create Role Form
    this.createRoleForm = this.fb.group({
      roleName: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_\s]+$/)]],
      permissions: this.fb.array([], [Validators.required, Validators.minLength(1)])
    });

    // Update Role Form
    this.updateRoleForm = this.fb.group({
      roleId: ['', [Validators.required]],
      roleName: ['', [Validators.required, Validators.minLength(3)]],
      permissions: this.fb.array([], [Validators.required, Validators.minLength(1)])
    });

    // Add Role to User Form
    this.addRoleToUserForm = this.fb.group({
      userId: ['', [Validators.required]],
      userName: [''],
      roleId: [''],
      roleName: ['', [Validators.required]]
    });

    // Watch userId changes in addRoleToUserForm to populate userName and load user roles
    this.addRoleToUserForm.get('userId')?.valueChanges.subscribe(userId => {
      if (userId && this.usersDictionary[userId]) {
        this.addRoleToUserForm.patchValue({ userName: this.usersDictionary[userId] }, { emitEvent: false });
        this.loadUserRoles(userId);
      } else {
        this.userExistingRoles = [];
        this.addRoleToUserForm.patchValue({ roleName: '' }, { emitEvent: false });
      }
    });

    // Watch roleName changes in addRoleToUserForm to populate roleId
    this.addRoleToUserForm.get('roleName')?.valueChanges.subscribe(roleName => {
      if (roleName) {
        const role = this.availableRoles.find(r => r.name === roleName);
        if (role) {
          this.addRoleToUserForm.patchValue({ roleId: role.id }, { emitEvent: false });
        }
      }
    });

    // Watch roleId changes in updateRoleForm to populate roleName
    this.updateRoleForm.get('roleId')?.valueChanges.subscribe(roleId => {
      if (roleId && this.rolesDictionary[roleId]) {
        this.updateRoleForm.patchValue({ roleName: this.rolesDictionary[roleId] }, { emitEvent: false });
        // Load existing permissions for this role (you might want to fetch from API)
      }
    });
  }

  // Password strength validator
  private passwordStrengthValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value;
    if (!value) return null;

    let strength = 0;
    if (value.length >= 8) strength++;
    if (/[a-z]/.test(value)) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[0-9]/.test(value)) strength++;
    if (/[^a-zA-Z0-9]/.test(value)) strength++;

    return strength >= 3 ? null : { weakPassword: true };
  }

  // Password match validator
  private passwordMatchValidator(form: AbstractControl): { [key: string]: any } | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // Tab switching
  switchTab(tab: TabType): void {
    this.activeTab = tab;
    if (tab === 'viewRoles') {
      this.loadAllRoles();
    } else if (tab === 'updateRole') {
      this.loadAllRoles();
    } else if (tab === 'addRoleToUser') {
      this.loadAllUsers();
      this.loadAllRoles();
    } else if (tab === 'viewEmployees') {
      this.loadAllEmployees();
    } else if (tab === 'addUserPicture') {
      this.loadAllUsers();
      this.resetPictureForm();
    }
  }

  resetPictureForm(): void {
    if (this.picturePreviewUrl) {
      URL.revokeObjectURL(this.picturePreviewUrl);
    }
    this.picturePreviewUrl = null;
    this.pictureUserId = '';
    this.pictureMessage = null;
    this.pictureError = null;
  }

  onPictureFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (this.picturePreviewUrl) {
      URL.revokeObjectURL(this.picturePreviewUrl);
      this.picturePreviewUrl = null;
    }
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.pictureError = 'Please choose an image file (PNG, JPEG, WebP, etc.).';
      input.value = '';
      return;
    }
    this.pictureError = null;
    this.picturePreviewUrl = URL.createObjectURL(file);
  }

  submitUserPicture(fileInput: HTMLInputElement): void {
    const file = fileInput.files?.[0];
    if (!this.pictureUserId?.trim()) {
      this.pictureError = 'Select a user.';
      return;
    }
    if (!file) {
      this.pictureError = 'Choose an image file.';
      return;
    }
    this.pictureError = null;
    this.pictureMessage = null;
    this.isUploadingPicture = true;
    this.authService.addpicture(file, this.pictureUserId.trim()).subscribe({
      next: () => {
        this.isUploadingPicture = false;
        this.pictureMessage = 'Picture uploaded successfully.';
        fileInput.value = '';
        if (this.picturePreviewUrl) {
          URL.revokeObjectURL(this.picturePreviewUrl);
          this.picturePreviewUrl = null;
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isUploadingPicture = false;
        this.pictureError =
          err.error?.message != null ? String(err.error.message) : 'Upload failed. Please try again.';
      },
    });
  }

  // Permission management helpers
  get permissionsArray(): FormArray {
    return this.getCurrentForm().get('permissions') as FormArray;
  }

  get rolesArray(): FormArray {
    return this.createAccountForm.get('roles') as FormArray;
  }

  private getCurrentForm(): FormGroup {
    switch (this.activeTab) {
      case 'createAccount':
        return this.createAccountForm;
      case 'createRole':
        return this.createRoleForm;
      case 'updateRole':
        return this.updateRoleForm;
      default:
        return this.createAccountForm;
    }
  }

  togglePermission(permissionValue: string): void {
    const permissionsArray = this.permissionsArray;
    const index = permissionsArray.controls.findIndex(
      (control) => control.value === permissionValue
    );

    if (index >= 0) {
      permissionsArray.removeAt(index);
    } else {
      permissionsArray.push(this.fb.control(permissionValue));
    }
  }

  isPermissionSelected(permissionValue: string): boolean {
    return this.permissionsArray.controls.some(
      (control) => control.value === permissionValue
    );
  }

  toggleRole(roleName: string): void {
    const rolesArray = this.rolesArray;
    const index = rolesArray.controls.findIndex(
      (control) => control.value === roleName
    );

    if (index >= 0) {
      rolesArray.removeAt(index);
    } else {
      rolesArray.push(this.fb.control(roleName));
    }
  }

  isRoleSelected(roleName: string): boolean {
    return this.rolesArray.controls.some(
      (control) => control.value === roleName
    );
  }

  // Load all roles
  loadAllRoles(): void {
    this.isLoading = true;
    this.authService.getAllRoles()
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Failed to load roles');
          return of({} as RolesDictionary);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((roles: RolesDictionary) => {
        this.rolesDictionary = roles;
        this.availableRoles = Object.entries(roles).map(([id, name]) => ({ id, name }));
      });
  }

  // Load all employees
  loadAllEmployees(): void {
    this.isLoadingEmployees = true;
    this.employeeService.getAllEmployees()
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Failed to load employees');
          return of([] as Employee[]);
        }),
        finalize(() => {
          this.isLoadingEmployees = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((employees: Employee[]) => {
        this.employees = employees;
        console.log('Loaded employees:', employees.length);
        console.log('Top-level employees:', this.getTopLevelEmployees().length);
      });
  }

  // Load all users
  loadAllUsers(): void {
    this.isLoadingUsers = true;
    this.authService.getAllUsers()
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Failed to load users');
          return of({} as UsersDictionary);
        }),
        finalize(() => {
          this.isLoadingUsers = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((users: UsersDictionary) => {
        this.usersDictionary = users;
        this.availableUsers = Object.entries(users).map(([id, name]) => ({ id, name }));
      });
  }

  // Load user roles
  loadUserRoles(userId: string): void {
    if (!userId) {
      this.userExistingRoles = [];
      return;
    }

    this.isLoadingUserRoles = true;
    this.authService.getuserRoles(userId)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Failed to load user roles');
          return of([] as string[]);
        }),
        finalize(() => {
          this.isLoadingUserRoles = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((roles: string[]) => {
        this.userExistingRoles = roles;
        // Clear role selection if the selected role is already assigned
        const currentRole = this.addRoleToUserForm.get('roleName')?.value;
        if (currentRole && roles.includes(currentRole)) {
          this.addRoleToUserForm.patchValue({ roleName: '' }, { emitEvent: false });
        }
      });
  }

  // Check if role is already assigned to user
  isRoleAlreadyAssigned(roleName: string): boolean {
    return this.userExistingRoles.includes(roleName);
  }

  // Get employee display name
  getEmployeeDisplayName(employee: Employee): string {
    return `${employee.nameEn} (${employee.employeeNumber})`;
  }

  // Filter employees by name or employee number for create-account dropdown
  getFilteredEmployeesForAccount(): Employee[] {
    const q = (this.employeeSearchTerm || '').trim().toLowerCase();
    if (!q) return this.employees;
    return this.employees.filter(
      e =>
        (e.nameEn && e.nameEn.toLowerCase().includes(q)) ||
        (e.employeeNumber && String(e.employeeNumber).toLowerCase().includes(q))
    );
  }

  selectEmployeeForAccount(employee: Employee): void {
    this.createAccountForm.patchValue({ employeeId: employee.id }, { emitEvent: true });
    this.employeeSearchTerm = this.getEmployeeDisplayName(employee);
    this.employeeDropdownOpen = false;
  }

  closeEmployeeDropdown(): void {
    setTimeout(() => (this.employeeDropdownOpen = false), 200);
  }

  // Get top-level employees (those without managers) and build complete hierarchy
  getTopLevelEmployees(): Employee[] {
    if (this.employees.length === 0) {
      return [];
    }

    // Build a map of all employees by ID for quick lookup
    const employeeMap = new Map<string, Employee>();
    this.employees.forEach(emp => {
      // Create a copy to avoid mutating the original
      const empCopy: Employee = {
        id: emp.id,
        nameEn: emp.nameEn,
        employeeNumber: emp.employeeNumber,
        manager: emp.manager,
        SubOrdinates: []
      };
      employeeMap.set(emp.id, empCopy);
    });

    // Build the hierarchy by linking subordinates based on manager relationships
    const hierarchyMap = new Map<string, Employee[]>();

    employeeMap.forEach(emp => {
      // Clear existing subordinates - we'll rebuild them
      emp.SubOrdinates = [];

      // If employee has a manager, add this employee to manager's subordinates
      if (emp.manager && emp.manager.id) {
        const managerId = emp.manager.id;
        if (!hierarchyMap.has(managerId)) {
          hierarchyMap.set(managerId, []);
        }
        hierarchyMap.get(managerId)!.push(emp);
      }
    });

    // Attach subordinates to each employee
    employeeMap.forEach(emp => {
      const subordinates = hierarchyMap.get(emp.id) || [];
      if (subordinates.length > 0) {
        emp.SubOrdinates = subordinates;
      } else {
        emp.SubOrdinates = undefined;
      }
    });

    // Return top-level employees (those without managers OR managers not in the list)
    const topLevelEmployees: Employee[] = [];
    employeeMap.forEach(emp => {
      if (!emp.manager || !emp.manager.id) {
        // No manager - top level
        topLevelEmployees.push(emp);
      } else if (!employeeMap.has(emp.manager.id)) {
        // Manager not in the list - treat as top level
        topLevelEmployees.push(emp);
      }
    });

    // If we have employees but no top-level ones (all have managers in the list),
    // it means we have a circular reference or incomplete data.
    // In that case, show all employees as top-level to ensure nothing is hidden
    if (topLevelEmployees.length === 0 && this.employees.length > 0) {
      console.warn('No top-level employees found. Showing all employees.');
      return Array.from(employeeMap.values());
    }

    return topLevelEmployees;
  }

  // Get all employees count for display
  getTotalEmployeesCount(): number {
    return this.employees.length;
  }

  // Get subordinates count for an employee
  getSubordinatesCount(employee: Employee): number {
    return employee.SubOrdinates?.length || 0;
  }

  // Check if employee has subordinates
  hasSubordinates(employee: Employee): boolean {
    return !!(employee.SubOrdinates && employee.SubOrdinates.length > 0);
  }

  // Create Account
  onCreateAccount(): void {
    if (this.createAccountForm.invalid) {
      this.markFormGroupTouched(this.createAccountForm);
      //this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    this.isLoading = true;
    const formValue = this.createAccountForm.value;
    const request: CreateAccountRequest = {
      userName: formValue.userName,
      password: formValue.password,
      email: formValue.email || null,
      employeeId: formValue.employeeId,
      permissions: formValue.permissions || [],
      roles: formValue.roles || []
    };

    this.authService.createAccount(request)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Failed to create account');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((response) => {
        if (response === null) return;
        //this.toastr.success('Account created successfully!', 'Success');
        this.createAccountForm.reset();
        this.clearFormArrays(this.createAccountForm);
      });
  }


  // Create Role
  onCreateRole(): void {
    if (this.createRoleForm.invalid) {
      this.markFormGroupTouched(this.createRoleForm);
      //this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    this.isLoading = true;
    const formValue = this.createRoleForm.value;
    const request: CreateRoleRequest = {
      roleName: formValue.roleName,
      permissions: formValue.permissions || []
    };

    this.authService.createRole(request)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Failed to create role');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((response) => {
        if (response === null) return;
        //this.toastr.success('Role created successfully!', 'Success');
        this.createRoleForm.reset();
        this.clearFormArrays(this.createRoleForm);
        this.loadAllRoles();
      });
  }

  // Update Role
  onUpdateRole(): void {
    if (this.updateRoleForm.invalid) {
      this.markFormGroupTouched(this.updateRoleForm);
      //this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    this.isLoading = true;
    const formValue = this.updateRoleForm.value;
    const request: UpdateRoleRequest = {
      roleName: formValue.roleName,
      roleId: formValue.roleId || null,
      permissions: formValue.permissions || []
    };

    this.authService.updateRole(request)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Failed to update role');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((response) => {
        if (response === null) return;
        //this.toastr.success('Role updated successfully!', 'Success');
        this.updateRoleForm.reset();
        this.clearFormArrays(this.updateRoleForm);
        this.loadAllRoles();
      });
  }

  // Add Role to User
  onAddRoleToUser(): void {
    if (this.addRoleToUserForm.invalid) {
      this.markFormGroupTouched(this.addRoleToUserForm);
      //this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    const formValue = this.addRoleToUserForm.value;

    // Check if role is already assigned
    if (this.isRoleAlreadyAssigned(formValue.roleName)) {
      //this.toastr.error('This role is already assigned to the user', 'Validation Error');
      return;
    }

    this.isLoading = true;
    const request: AddRoleRequest = {
      userId: formValue.userId,
      userName: formValue.userName || null,
      roleName: formValue.roleName,
      roleId: formValue.roleId || null
    };

    this.authService.addRoleToUser(request)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Failed to add role to user');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((response) => {
        if (response === null) return;
        //this.toastr.success('Role added to user successfully!', 'Success');
        // Reload user roles to update the list
        if (formValue.userId) {
          this.loadUserRoles(formValue.userId);
        }
        // Clear only the role selection, keep user selected
        this.addRoleToUserForm.patchValue({ roleName: '', roleId: '' });
      });
  }

  // Helper methods
  private clearFormArrays(form: FormGroup): void {
    const permissionsArray = form.get('permissions') as FormArray;
    const rolesArray = form.get('roles') as FormArray;

    while (permissionsArray.length > 0) {
      permissionsArray.removeAt(0);
    }
    if (rolesArray) {
      while (rolesArray.length > 0) {
        rolesArray.removeAt(0);
      }
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach((arrayControl) => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        });
      }
    });
  }

  private handleError(error: HttpErrorResponse, defaultMessage: string): void {
    console.error('API Error:', error);

    let errorMessage = defaultMessage;
    if (error.error?.message) {
      errorMessage = String(error.error.message);
    } else if (error.error?.errors) {
      const firstError = Object.values(error.error.errors)[0];
      errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
    }

    //this.toastr.error(errorMessage, 'Error', { timeOut: 7000 });
  }

  // Password strength indicator
  getPasswordStrength(password: string): { strength: number; text: string; color: string } {
    if (!password) return { strength: 0, text: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const strengthMap = [
      { text: 'Very Weak', color: '#ef4444' },
      { text: 'Weak', color: '#f97316' },
      { text: 'Fair', color: '#eab308' },
      { text: 'Good', color: '#22c55e' },
      { text: 'Strong', color: '#10b981' }
    ];

    return {
      strength,
      text: strengthMap[Math.min(strength, 4)].text,
      color: strengthMap[Math.min(strength, 4)].color
    };
  }

  // Get selected permissions count
  getSelectedPermissionsCount(): number {
    return this.permissionsArray.length;
  }

  // Get selected roles count
  getSelectedRolesCount(): number {
    return this.rolesArray.length;
  }
}

