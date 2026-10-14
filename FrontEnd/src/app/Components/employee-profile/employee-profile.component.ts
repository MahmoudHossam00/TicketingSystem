import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { take } from 'rxjs';
import { EmployeeService } from '../../Services/employee.service';
import { ExternalSystemService } from '../../Services/externalsystem.service';
import { AuthService } from '../../Services/auth.service';
import { EmployeeCache } from '../../Interfaces/employee';
import { ExternalSystem, SystemAccount } from '../../Interfaces/externalsystems';
import { UserDetails } from '../../Interfaces/auth';
import { Environment } from '../../base/environment';

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './employee-profile.component.html',
  styleUrl: './employee-profile.component.css',
})
export class EmployeeProfileComponent implements OnInit {

  employee     = signal<EmployeeCache | null>(null);
  isLoading    = signal(true);
  error        = signal<string | null>(null);

  // ── System accounts ──────────────────────────────────────────
  systemAccounts       = signal<SystemAccount[]>([]);
  allExternalSystems   = signal<ExternalSystem[]>([]);
  accountsLoading      = signal(false);
  showAddAccountForm   = signal(false);
  addAccountError      = signal<string | null>(null);

  addAccountForm = {
    externalSystemId: '',
    username: '',
    isDisabled: false,
  };

  // ── IT portal account (Auth GetUserDetails) ─────────────────
  portalUserDetails = signal<UserDetails | null>(null);
  portalLoading = signal(false);
  portalNoAccount = signal(false);
  portalLoadError = signal<string | null>(null);
  portalHeroImgFailed = false;

  constructor(
    private route: ActivatedRoute,
    private employeeService: EmployeeService,
    private extSystemService: ExternalSystemService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No employee ID provided.');
      this.isLoading.set(false);
      return;
    }

    this.employeeService.getById(id).subscribe({
      next: data => {
        this.employee.set(data);
        this.isLoading.set(false);
        this.loadSystemAccounts(data.id);
        this.loadPortalUserDetails(data.id);
      },
      error: () => {
        this.error.set('Employee not found or could not be loaded.');
        this.isLoading.set(false);
      },
    });

    this.extSystemService.getAllExternalSystems().subscribe({
      next: systems => this.allExternalSystems.set(systems),
      error: () => {},
    });
  }

  loadSystemAccounts(employeeId: string): void {
    this.accountsLoading.set(true);
    this.extSystemService.getSystemAccountsByEmployee(employeeId).subscribe({
      next: data => { this.systemAccounts.set(data); this.accountsLoading.set(false); },
      error: () => { this.accountsLoading.set(false); },
    });
  }

  loadPortalUserDetails(employeeId: string): void {
    this.portalLoading.set(true);
    this.portalNoAccount.set(false);
    this.portalLoadError.set(null);
    this.portalUserDetails.set(null);
    this.portalHeroImgFailed = false;
    this.authService
      .getUserDetails(employeeId)
      .pipe(take(1))
      .subscribe({
        next: d => {
          this.portalUserDetails.set(d);
          this.portalLoading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.portalLoading.set(false);
          this.portalUserDetails.set(null);
          if (err.status === 404) {
            this.portalNoAccount.set(true);
            return;
          }
          this.portalLoadError.set('Could not load application account details.');
        },
      });
  }

  portalDisplayName(ud: UserDetails): string {
    const n = ud.userName ?? ud.UserName;
    return n?.trim() ? n : '—';
  }

  portalPictureSrc(ud: UserDetails | null): string | null {
    if (!ud) return null;
    return this.authService.resolvePictureUrl(ud.picture ?? null);
  }
  getpicurl(picture:string): string {
    return `${Environment.baseUrl}Files/${picture}`;
  }

  portalSystemsKeys(ud: UserDetails): string[] {
    const s = ud.systems;
    return s && typeof s === 'object' ? Object.keys(s) : [];
  }

  portalSystemValue(ud: UserDetails, key: string): string {
    const v = ud.systems?.[key];
    return v != null && String(v).trim() !== '' ? String(v) : '—';
  }

  /** Systems the employee does NOT yet have a real account in */
  availableSystemsToAdd(): ExternalSystem[] {
    const linkedIds = new Set(
      this.systemAccounts()
        .filter(a => a.userName && a.userName.trim() !== '' && a.userName !== '-')
        .map(a => a.externalSystemId)
    );
    return this.allExternalSystems().filter(s => !linkedIds.has(s.id));
  }

  systemUrl(sysId: string): string | undefined {
    return this.allExternalSystems().find(s => s.id === sysId)?.url;
  }

  openAddAccount(): void {
    const available = this.availableSystemsToAdd();
    this.addAccountForm = { externalSystemId: available[0]?.id ?? '', username: '', isDisabled: false };
    this.addAccountError.set(null);
    this.showAddAccountForm.set(true);
  }

  submitAddAccount(): void {
    const emp = this.employee();
    if (!emp || !this.addAccountForm.externalSystemId || !this.addAccountForm.username.trim()) {
      this.addAccountError.set('Please fill in all required fields.');
      return;
    }
    this.addAccountError.set(null);
    this.extSystemService.addExternalUser({
      username: this.addAccountForm.username.trim(),
      employeeId: emp.id,
      externalSystemId: this.addAccountForm.externalSystemId,
      employeeNumber: emp.employeeNumber,
      isDisabled: this.addAccountForm.isDisabled,
    }).subscribe({
      next: () => {
        this.showAddAccountForm.set(false);
        this.loadSystemAccounts(emp.id);
      },
      error: () => this.addAccountError.set('Failed to add account. Please try again.'),
    });
  }

  removeAccount(accountId: string): void {
    const emp = this.employee();
    if (!emp) return;
    this.extSystemService.removeSystemAccount(accountId).subscribe({
      next: () => this.loadSystemAccounts(emp.id),
      error: () => {},
    });
  }

  systemName(sysId: string): string {
    return this.allExternalSystems().find(s => s.id === sysId)?.name ?? sysId;
  }

  // ── Helpers ──────────────────────────────────────────────────
  initials(emp: EmployeeCache): string {
    return (emp.nameEn ?? '?').trim().charAt(0).toUpperCase();
  }

  displayEmail(emp: EmployeeCache): string | null {
    return emp.email ?? emp.manuallyAddedEmail ?? null;
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  age(iso: string | null | undefined): string {
    if (!iso) return '';
    const birth = new Date(iso);
    if (isNaN(birth.getTime())) return '';
    const years = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
    return `${years} yrs`;
  }

  yearsOfService(hiringIso: string | null | undefined): string {
    if (!hiringIso) return '';
    const hired = new Date(hiringIso);
    if (isNaN(hired.getTime())) return '';
    const years  = Math.floor((Date.now() - hired.getTime()) / (365.25 * 24 * 3600 * 1000));
    const months = Math.floor(((Date.now() - hired.getTime()) % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));
    if (years === 0) return `${months}mo`;
    return months > 0 ? `${years}y ${months}mo` : `${years}y`;
  }
}
