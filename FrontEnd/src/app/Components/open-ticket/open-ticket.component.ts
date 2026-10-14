import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { ITSystemService } from '../../Services/ITsystem.servic';
import { SubModuleService } from '../../Services/submodule.service';
import { ticketService } from '../../Services/ticket.service';
import { AuthService, BasicUserDataResponse } from '../../Services/auth.service';
import { EmployeeService } from '../../Services/employee.service';

import { System, Module } from '../../Interfaces/system';
import { SubModule } from '../../Interfaces/submodule';
import { Question, TypeOfQuestion } from '../../Interfaces/question';
import { CreateTicketRequest, IssuePriority } from '../../Interfaces/ticket';
import { Department, EmployeeCache } from '../../Interfaces/employee';
import { PaginatedResponse } from '../../Interfaces/general';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';

function minArrayLength(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value as any[];
    return Array.isArray(v) && v.length >= min ? null : { minArrayLength: true };
  };
}

@Component({
  selector: 'app-open-ticket',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './open-ticket.component.html',
  styleUrl: './open-ticket.component.css',
})
export class OpenTicketComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly requesterSearch$ = new Subject<string>();
  private readonly toSearch$ = new Subject<string>();
  private readonly ccsSearch$ = new Subject<string>();
  /** Portal user id keyed by lowercase employee id (admin requester). */
  private employeeIdToUserId = new Map<string, string>();
  private userNameById = new Map<string, string>();

  constructor(
    private systemservice: ITSystemService,
    private submoduleservice: SubModuleService,
    private ticketSvc: ticketService,
    private authService: AuthService,
    private employeeService: EmployeeService,
    private router: Router
  ) {
    this.requesterSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          this.requesterSearchLoading.set(true);
          const deptId = this.createform.get('requesterFilterDepartmentId')?.value;
          const departmentIds =
            deptId != null && Number.isFinite(Number(deptId)) ? [Number(deptId)] : undefined;
          return this.employeeService.getFiltered(q, 1, departmentIds).pipe(
            finalize(() => this.requesterSearchLoading.set(false)),
            catchError(() =>
              of({
                data: [],
                filteredCount: 0,
                page: 1,
                pageSize: 0,
                totalRecords: 0,
              } as PaginatedResponse<EmployeeCache>)
            )
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => this.requesterSearchResults.set(res.data));

    this.toSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          this.toSearchLoading.set(true);
          return this.authService.getCompleteUsersBasicData({
            filter: q || null,
            page: 1,
            departmentIDS: null,
          }).pipe(
            finalize(() => this.toSearchLoading.set(false)),
            catchError(() =>
              of({
                data: [],
                filteredCount: 0,
                page: 1,
                pageSize: 0,
                totalRecords: 0,
              } as PaginatedResponse<BasicUserDataResponse>)
            )
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.toSearchResults.set(this.toRecipientOptions(res.data));
      });

    this.ccsSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          this.ccsSearchLoading.set(true);
          return this.authService.getCompleteUsersBasicData({
            filter: q || null,
            page: 1,
            departmentIDS: null,
          }).pipe(
            finalize(() => this.ccsSearchLoading.set(false)),
            catchError(() =>
              of({
                data: [],
                filteredCount: 0,
                page: 1,
                pageSize: 0,
                totalRecords: 0,
              } as PaginatedResponse<BasicUserDataResponse>)
            )
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.ccsSearchResults.set(this.toRecipientOptions(res.data));
      });
  }

  // enums to template
  IssuePriority = IssuePriority;
  TypeOfQuestion = TypeOfQuestion;

  IssuePriorityValues = Object.values(IssuePriority).filter(
    (v) => typeof v === 'number'
  ) as number[];

  systems: System[] = [];
  modules: Module[] = [];
  subModules: SubModule[] = [];

  // grouped questions by type
  textQuestions: Question[] = [];
  dateQuestions: Question[] = [];
  singleQuestions: Question[] = [];
  multiQuestions: Question[] = [];

  // UI state
  selectedsystemId = signal<string | null>(null);
  selectedmoduleId = signal<string | null>(null);
  selectedsubmoduleId = signal<string | null>(null);

  searchTo = signal('');
  searchCCs = signal('');
  dropdownToOpen = signal(false);
  dropdownCCsOpen = signal(false);
  toSearchResults = signal<{ id: string; name: string }[]>([]);
  ccsSearchResults = signal<{ id: string; name: string }[]>([]);
  toSearchLoading = signal(false);
  ccsSearchLoading = signal(false);

  /** Departments for optional requester search filter (admin). */
  requesterDepartments: Department[] = [];

  /** Admin: optional ticket requester (defaults to signed-in user when unset). */
  searchRequester = signal('');
  requesterDropdownOpen = signal(false);
  requesterSearchResults = signal<EmployeeCache[]>([]);
  requesterSearchLoading = signal(false);
  selectedRequester = signal<EmployeeCache | null>(null);

  get isAdminUser(): boolean {
    return this.authService.isAdmin();
  }

  // questionId -> index inside each FormArray
  textIndex: Record<string, number> = {};
  dateIndex: Record<string, number> = {};
  singleIndex: Record<string, number> = {};
  multiIndex: Record<string, number> = {};

  createform = new FormGroup({
    relatedSystemId: new FormControl<string | null>(null, Validators.required),
    relatedModuleId: new FormControl<string | null>(null, Validators.required),

    relatedSubModuleAnswer: this.buildRelatedSubModuleAnswerGroup(),

    priority: new FormControl<IssuePriority>(IssuePriority.Low, { nonNullable: true }),
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    attachments: new FormControl<File[]>([], { nonNullable: true }),

    to: new FormControl<string[]>([], { nonNullable: true }),
    cCs: new FormControl<string[]>([], { nonNullable: true }),

    /** Admin: narrow employee search by department (optional). */
    requesterFilterDepartmentId: new FormControl<number | null>(null),
    /** Admin: notify the (on-behalf) user when the ticket is created. */
    notifyUser: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadSystems();
    if (this.isAdminUser) {
      this.loadRequesterDepartments();
      this.authService.AllUsersWithEmployeeData().subscribe((users) => {
        for (const u of users) {
          const eid = u.employeeId?.trim();
          const raw = u as unknown as Record<string, unknown>;
          const uid = (u.userId ?? raw['UserId']) as string | undefined;
          const uidTrim = uid?.trim();
          if (eid && uidTrim) {
            this.employeeIdToUserId.set(eid.toLowerCase(), uidTrim);
          }
        }
      });
      this.createform.get('requesterFilterDepartmentId')?.valueChanges.subscribe(() => {
        this.selectedRequester.set(null);
        this.requesterSearchResults.set([]);
        this.requesterSearch$.next(this.searchRequester());
      });
    }

    // System -> Modules
    this.createform.get('relatedSystemId')?.valueChanges.subscribe((systemId) => {
      this.selectedsystemId.set(systemId);

      this.modules = [];
      this.subModules = [];
      this.clearQuestionsAndAnswers();

      this.createform.get('relatedModuleId')?.setValue(null, { emitEvent: false });
      this.createform
        .get('relatedSubModuleAnswer.relatedSubModuleId')
        ?.setValue(null, { emitEvent: false });

      this.selectedmoduleId.set(null);
      this.selectedsubmoduleId.set(null);

      if (!systemId) {
        this.refreshValidity();
        return;
      }

      this.systemservice.getSystemModules(systemId).subscribe((mods) => {
        this.modules = mods;
      });

      this.refreshValidity();
    });

    // Module -> SubModules
    this.createform.get('relatedModuleId')?.valueChanges.subscribe((moduleId) => {
      this.selectedmoduleId.set(moduleId);

      this.subModules = [];
      this.clearQuestionsAndAnswers();

      this.createform
        .get('relatedSubModuleAnswer.relatedSubModuleId')
        ?.setValue(null, { emitEvent: false });
      this.selectedsubmoduleId.set(null);

      if (!moduleId) {
        this.refreshValidity();
        return;
      }

      this.submoduleservice.getbyModuleId(moduleId).subscribe((subs) => {
        this.subModules = subs;
      });

      this.refreshValidity();
    });

    // SubModule -> Questions
    this.createform
      .get('relatedSubModuleAnswer.relatedSubModuleId')
      ?.valueChanges.subscribe((subModuleId: string | null) => {
        this.selectedsubmoduleId.set(subModuleId);

        this.clearQuestionsAndAnswers();

        if (!subModuleId) {
          this.refreshValidity();
          return;
        }

        this.submoduleservice.getQuestions(subModuleId).subscribe((qs) => {
          const normalized = qs.map((q) => ({
            ...q,
            questionType: Number(q.questionType) as TypeOfQuestion,
          }));

          this.textQuestions = normalized.filter((q) => q.questionType === TypeOfQuestion.Text);
          this.dateQuestions = normalized.filter((q) => q.questionType === TypeOfQuestion.DateTime);
          this.singleQuestions = normalized.filter((q) => q.questionType === TypeOfQuestion.SingleChoice);
          this.multiQuestions = normalized.filter((q) => q.questionType === TypeOfQuestion.MultipleChoice);

          this.buildAnswersForGroupedQuestions(); // ✅ atomic indexes => all appear instantly
          this.refreshValidity();
        });
      });
  }

  private buildRelatedSubModuleAnswerGroup() {
    return new FormGroup({
      relatedSubModuleId: new FormControl<string | null>(null, Validators.required),

      textAnswers: new FormArray<FormGroup>([]),
      dateAnswers: new FormArray<FormGroup>([]),
      multipleChoiceAnswers: new FormArray<FormGroup>([]),
      singleChoiceAnswers: new FormArray<FormGroup>([]),
    });
  }

  // ---------- getters ----------
  get rsa(): FormGroup {
    return this.createform.get('relatedSubModuleAnswer') as FormGroup;
  }

  get textAnswersFA(): FormArray<FormGroup> {
    return this.rsa.get('textAnswers') as FormArray<FormGroup>;
  }

  get dateAnswersFA(): FormArray<FormGroup> {
    return this.rsa.get('dateAnswers') as FormArray<FormGroup>;
  }

  get singleChoiceAnswersFA(): FormArray<FormGroup> {
    return this.rsa.get('singleChoiceAnswers') as FormArray<FormGroup>;
  }

  get multipleChoiceAnswersFA(): FormArray<FormGroup> {
    return this.rsa.get('multipleChoiceAnswers') as FormArray<FormGroup>;
  }

  // ---------- load ----------
  loadSystems() {
    this.systemservice.getAllSystems().subscribe((s) => (this.systems = s));
  }

  private toRecipientOptions(rows: BasicUserDataResponse[]): { id: string; name: string }[] {
    return (rows ?? [])
      .filter((r) => !!r.userId)
      .map((r) => {
        const id = r.userId;
        const name = (r.employeeName || r.userName || id || '').trim();
        this.userNameById.set(id, name || id);
        return { id, name: name || id };
      });
  }

  private loadRequesterDepartments(): void {
    this.employeeService.getAllDepartments().subscribe({
      next: (list) => {
        this.requesterDepartments = [...list].sort((a, b) => {
          const an = (a.departmentName ?? '').localeCompare(b.departmentName ?? '', undefined, {
            sensitivity: 'base',
          });
          if (an !== 0) return an;
          return (a.departmentId ?? 0) - (b.departmentId ?? 0);
        });
      },
      error: () => {
        this.requesterDepartments = [];
      },
    });
  }

  /** Departments with a valid id (for select options). */
  requesterDepartmentOptions(): Department[] {
    return this.requesterDepartments.filter((d) => d.departmentId != null);
  }

  toggleNotifyUser(): void {
    const c = this.createform.get('notifyUser');
    if (!c) return;
    c.setValue(!c.value);
  }

  // Filter users by search (name or id), exclude already selected
  getFilteredUsersForTo(): { id: string; name: string }[] {
    const selected = this.createform.get('to')?.value ?? [];
    return this.toSearchResults().filter((u) => !selected.includes(u.id));
  }

  getFilteredUsersForCCs(): { id: string; name: string }[] {
    const selected = this.createform.get('cCs')?.value ?? [];
    return this.ccsSearchResults().filter((u) => !selected.includes(u.id));
  }

  getUserName(id: string): string {
    return this.userNameById.get(id) ?? id;
  }

  addTo(userId: string) {
    const ctrl = this.createform.get('to') as FormControl<string[]>;
    const current = ctrl.value ?? [];
    if (current.includes(userId)) return;
    ctrl.setValue([...current, userId]);
    this.searchTo.set('');
    this.toSearchResults.set([]);
    this.dropdownToOpen.set(false);
    this.refreshValidity();
  }

  removeTo(userId: string) {
    const ctrl = this.createform.get('to') as FormControl<string[]>;
    ctrl.setValue((ctrl.value ?? []).filter((id) => id !== userId));
    this.refreshValidity();
  }

  addCCs(userId: string) {
    const ctrl = this.createform.get('cCs') as FormControl<string[]>;
    const current = ctrl.value ?? [];
    if (current.includes(userId)) return;
    ctrl.setValue([...current, userId]);
    this.searchCCs.set('');
    this.ccsSearchResults.set([]);
    this.dropdownCCsOpen.set(false);
    this.refreshValidity();
  }

  onToSearchInput(raw: string): void {
    this.searchTo.set(raw);
    this.dropdownToOpen.set(true);
    this.toSearch$.next(raw.trim());
  }

  onCCsSearchInput(raw: string): void {
    this.searchCCs.set(raw);
    this.dropdownCCsOpen.set(true);
    this.ccsSearch$.next(raw.trim());
  }

  onToSearchFocus(): void {
    this.dropdownToOpen.set(true);
    this.toSearch$.next(this.searchTo().trim());
  }

  onCCsSearchFocus(): void {
    this.dropdownCCsOpen.set(true);
    this.ccsSearch$.next(this.searchCCs().trim());
  }

  removeCCs(userId: string) {
    const ctrl = this.createform.get('cCs') as FormControl<string[]>;
    ctrl.setValue((ctrl.value ?? []).filter((id) => id !== userId));
    this.refreshValidity();
  }

  closeToDropdown() {
    setTimeout(() => this.dropdownToOpen.set(false), 200);
  }

  closeCCsDropdown() {
    setTimeout(() => this.dropdownCCsOpen.set(false), 200);
  }

  onRequesterSearchInput(raw: string) {
    this.searchRequester.set(raw);
    this.requesterDropdownOpen.set(true);
    this.requesterSearch$.next(raw);
  }

  openRequesterDropdown() {
    this.requesterDropdownOpen.set(true);
    this.requesterSearch$.next(this.searchRequester());
  }

  closeRequesterDropdown() {
    setTimeout(() => this.requesterDropdownOpen.set(false), 200);
  }

  requesterDisplayLine(emp: EmployeeCache): string {
    const extra = [emp.email, emp.departmentName].filter(Boolean).join(' · ');
    return extra ? `${emp.nameEn} — ${extra}` : emp.nameEn;
  }

  requesterSubline(emp: EmployeeCache): string {
    return `#${emp.employeeNumber}`;
  }

  selectRequester(emp: EmployeeCache) {
    this.selectedRequester.set(emp);
    this.searchRequester.set('');
    this.requesterDropdownOpen.set(false);
    this.requesterSearchResults.set([]);
  }

  clearRequester() {
    this.selectedRequester.set(null);
    this.searchRequester.set('');
    this.requesterSearchResults.set([]);
  }

  // ---------- clear ----------
  private clearQuestionsAndAnswers() {
    this.textQuestions = [];
    this.dateQuestions = [];
    this.singleQuestions = [];
    this.multiQuestions = [];

    this.textAnswersFA.clear();
    this.dateAnswersFA.clear();
    this.singleChoiceAnswersFA.clear();
    this.multipleChoiceAnswersFA.clear();

    this.textIndex = {};
    this.dateIndex = {};
    this.singleIndex = {};
    this.multiIndex = {};
  }

  // ✅ atomic build (no “one-by-one” rendering)
  private buildAnswersForGroupedQuestions() {
    // clear arrays again (safe)
    this.textAnswersFA.clear();
    this.dateAnswersFA.clear();
    this.singleChoiceAnswersFA.clear();
    this.multipleChoiceAnswersFA.clear();

    const textIdx: Record<string, number> = {};
    const dateIdx: Record<string, number> = {};
    const singleIdx: Record<string, number> = {};
    const multiIdx: Record<string, number> = {};

    // TEXT
    for (const q of this.textQuestions) {
      const idx = this.textAnswersFA.length;
      textIdx[q.id] = idx;

      this.textAnswersFA.push(
        new FormGroup({
          questionId: new FormControl(q.id, Validators.required),
          value: new FormControl('', q.isRequired ? Validators.required : []),
        })
      );
    }

    // DATE
    for (const q of this.dateQuestions) {
      const idx = this.dateAnswersFA.length;
      dateIdx[q.id] = idx;

      this.dateAnswersFA.push(
        new FormGroup({
          questionId: new FormControl(q.id, Validators.required),
          value: new FormControl<string | null>(null, q.isRequired ? Validators.required : []),
        })
      );
    }

    // SINGLE
    for (const q of this.singleQuestions) {
      const idx = this.singleChoiceAnswersFA.length;
      singleIdx[q.id] = idx;

      this.singleChoiceAnswersFA.push(
        new FormGroup({
          questionId: new FormControl(q.id, Validators.required),
          selectedOptionId: new FormControl<string | null>(null, q.isRequired ? Validators.required : []),
        })
      );
    }

    // MULTI
    for (const q of this.multiQuestions) {
      const idx = this.multipleChoiceAnswersFA.length;
      multiIdx[q.id] = idx;

      this.multipleChoiceAnswersFA.push(
        new FormGroup({
          questionId: new FormControl(q.id, Validators.required),
          selectedOptions: new FormControl<string[]>(
            [],
            q.isRequired ? [minArrayLength(1)] : []
          ),
        })
      );
    }

    // assign once
    this.textIndex = textIdx;
    this.dateIndex = dateIdx;
    this.singleIndex = singleIdx;
    this.multiIndex = multiIdx;
  }

  private refreshValidity() {
    this.rsa.updateValueAndValidity({ emitEvent: false });
    this.createform.updateValueAndValidity({ emitEvent: false });
  }

  // ---------- multi checkbox ----------
  toggleMultiChoice(questionId: string, optionId: string, checked: boolean) {
    const idx = this.multiIndex[questionId];
    if (idx === undefined) return;

    const group = this.multipleChoiceAnswersFA.at(idx) as FormGroup;
    const ctrl = group.get('selectedOptions') as FormControl<string[]>;
    const current = ctrl.value ?? [];

    const next = checked
      ? (current.includes(optionId) ? current : [...current, optionId])
      : current.filter((x) => x !== optionId);

    ctrl.setValue(next);
    ctrl.markAsTouched();
    group.markAsTouched();

    ctrl.updateValueAndValidity({ emitEvent: false });
    group.updateValueAndValidity({ emitEvent: false });

    this.refreshValidity();
  }

  isMultiChecked(questionId: string, optionId: string): boolean {
    const idx = this.multiIndex[questionId];
    if (idx === undefined) return false;

    const group = this.multipleChoiceAnswersFA.at(idx) as FormGroup;
    const ctrl = group.get('selectedOptions') as FormControl<string[]>;
    return (ctrl.value ?? []).includes(optionId);
  }

  // ---------- attachments ----------
  onFilesSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.createform.get('attachments')?.setValue(files);
    this.createform.get('attachments')?.markAsDirty();
    this.refreshValidity();
  }

  // ---------- submit ----------
  submit() {
    if (this.createform.invalid) {
      this.createform.markAllAsTouched();
      return;
    }

    const v = this.createform.getRawValue();

    const body: CreateTicketRequest = {
      RelatedSubModuleAnswer: {
        relatedSubModuleId: v.relatedSubModuleAnswer.relatedSubModuleId!,
        textAnswers: (v.relatedSubModuleAnswer.textAnswers ?? []).map((x: any) => ({
          questionId: x.questionId,
          value: x.value,
        })),
        dateAnswers: (v.relatedSubModuleAnswer.dateAnswers ?? []).map((x: any) => ({
          questionId: x.questionId,
          value: x.value,
        })),
        singleChoiceAnswers: (v.relatedSubModuleAnswer.singleChoiceAnswers ?? []).map((x: any) => ({
          questionId: x.questionId,
          value: x.selectedOptionId,
        })),
        multipleChoiceAnswers: (v.relatedSubModuleAnswer.multipleChoiceAnswers ?? []).map((x: any) => ({
          questionId: x.questionId,
          value: x.selectedOptions ?? [],
        })),
      },
      priority: v.priority ?? undefined,
      subject: v.subject!,
      description: v.description!,
      attachments: v.attachments ?? [],
      to: v.to ?? [],
      cCs: v.cCs ?? [],
    };

    if (this.isAdminUser) {
      const reqEmp = this.selectedRequester();
      if (reqEmp) {
        body.employeeId = reqEmp.id;
        const uid = this.employeeIdToUserId.get(reqEmp.id.toLowerCase());
        if (uid) {
          body.userId = uid;
        }
      }
      body.notifyUser = v.notifyUser;
    }

    this.ticketSvc.create(body).subscribe({
      next: (response) => {console.log('Ticket created'),
        this.router.navigate(['/ticketdetails', response.id]);
      },
      error: (err) => console.error(err),
    });
  }
}
