import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { createticketTaskRequest, ticketService, TicketTaskResponse } from '../../Services/ticket.service';
import { ticket, IssuePriority, Reply, CreateReplyRequest, SplitTicketRequest, CreateRelatedSubModuleAnswerRequest } from '../../Interfaces/ticket';
import { UserResponseDTO, userresponseviewDTO } from '../../Interfaces/auth';
import { AnswerResponse, RelatedSubModuleAnswerResponse, SubModule } from '../../Interfaces/submodule';
import { Question, TypeOfQuestion } from '../../Interfaces/question';
import { assignhistories, issuestatus, issuestatushistory } from '../../Interfaces/issuestatus';
import { IssueStatusService } from '../../Services/issueStatus.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AgentResponseWithTasksNumberDTO, ITSystemService } from '../../Services/ITsystem.servic';
import { AuthService, BasicUserDataResponse } from '../../Services/auth.service';
import { stringDTO } from '../../Interfaces/general';
import { Environment } from '../../base/environment';
import { CompanyService } from '../../Services/Company.service';
import { IssuetypeService } from '../../Services/Issuetype.service';
import { company, fixedKPI, issueType, System, Module } from '../../Interfaces/system';
import { SubModuleService } from '../../Services/submodule.service';
import { TicketChatComponentComponent } from '../ticket-chat-component/ticket-chat-component.component';
import { ArticleService } from '../../Services/article.service';
import { ArticleSummaryResponse } from '../../Interfaces/Article';
import { fixedKPIService } from '../../Services/KPIMasterData.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-ticketdetails',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule,TicketChatComponentComponent],
  templateUrl: './ticketdetails.component.html',
  styleUrls: ['./ticketdetails.component.css'],
})
export class TicketdetailsComponent implements OnInit {
  private readonly articleLinkTag = '[article-link]';
  ticket: ticket | null = null;
  id: string | null = null;
  CCs: userresponseviewDTO[] = [];
  TOs: userresponseviewDTO[] = [];
  relatedSubModuleAnswer: RelatedSubModuleAnswerResponse | null = null;

  /** Full IT hierarchy for resolving names next to IDs (from related submodule). */
  hierarchySystems: System[] = [];
  hierarchyModules: Module[] = [];
  hierarchySubModules: SubModule[] = [];
  notes: string[] = [];
  ticketTasks: TicketTaskResponse[] = [];
  taskDescription = '';
  taskDate = '';
  isCreatingTask = false;
  ticketTaskKpiBusyId = signal<string | null>(null);
  ticketTaskKpiModal = signal<TicketTaskResponse | null>(null);
  ticketTaskUseFixedKpi = signal(false);
  ticketTaskFixedKpis = signal<fixedKPI[]>([]);
  ticketTaskFixedKpisLoading = signal(false);
  ticketTaskSelectedFixedKpiId = signal('');
  ticketTaskKpiModalError = signal<string | null>(null);
  ticketTaskSupervisorAccessById = signal<Record<string, boolean>>({});
  taskError = signal<string | null>(null);
  taskSuccess = signal<string | null>(null);
  isLoading = true;
  baseUrl = Environment.baseUrl + 'Ticket/';
  IssuePriority = IssuePriority;
  statuses: issuestatus[] = [];
  currentssueStatus = signal<issuestatus | null>(null);
  selectedStatusId = signal<string | null>(null);

  selectedUserId = signal<string | null>(null);
  systemAgents = signal<UserResponseDTO[]>([]);
  agentWorkloadById = signal<Record<string, { tickets: number; projectTasks: number }>>({});
  canchangestatus = signal<boolean>(false);
  systemId = signal<string | null>(null);

  assignHistoriess: assignhistories[] = [];
  currentAssignHistory = signal<assignhistories | null>(null);

  currentuserId = signal<string | null>(null);
  currentAssignedUser = signal<string | null>(null);

  statusHistory: issuestatushistory[] = [];
  showStatusHistory = false;
  showAssignHistory = false;

  // replies / conversation
  replies: Reply[] = [];
  replyText = '';
  replyAttachments: File[] = [];
  replyPictures: File[] = [];
  isSendingReply = false;

  private readonly REPLY_PAGE = 8;
  visibleReplyCount = signal(this.REPLY_PAGE);

  visibleReplies(): Reply[] {
    const count = this.visibleReplyCount();
    return this.replies.slice(Math.max(0, this.replies.length - count));
  }

  hasOlderReplies(): boolean {
    return this.replies.length > this.visibleReplyCount();
  }
isTaskUser(): boolean {
  return this.ticket?.userId === this.currentuserId();
}
  showOlderReplies(): void {
    this.visibleReplyCount.update(n => n + this.REPLY_PAGE);
  }

  // lightbox
  lightboxSrc = signal<string | null>(null);
  openLightbox(src: string) { this.lightboxSrc.set(src); }
  closeLightbox() { this.lightboxSrc.set(null); }

  // reply To / CCs user pickers
  appUsers: { id: string; name: string }[] = [];
  replyTo: string[] = [];
  replyCCs: string[] = [];
  replySearchTo = signal('');
  replySearchCCs = signal('');
  replyDropdownToOpen = signal(false);
  replyDropdownCCsOpen = signal(false);
  replyToSearchResults = signal<{ id: string; name: string }[]>([]);
  replyCCsSearchResults = signal<{ id: string; name: string }[]>([]);
  replyToSearchLoading = signal(false);
  replyCCsSearchLoading = signal(false);
  private replyToSearchDebounce?: ReturnType<typeof setTimeout>;
  private replyCCsSearchDebounce?: ReturnType<typeof setTimeout>;
  private replyUserNameById = new Map<string, string>();
  private ticketReplyRecipientsLoaded = { to: false, cc: false };
  private didInitReplyRecipients = false;
  articlePickerOpen = signal(false);
  articleSearch = signal('');
  articleSearchResults = signal<ArticleSummaryResponse[]>([]);
  articleSearchLoading = signal(false);
  private articleSearchDebounce?: ReturnType<typeof setTimeout>;

  // modals + searchable pickers
  showStatusModal = signal(false);
  showAssignModal = signal(false);
  showStatusHistoryModal = signal(false);
  showAssignHistoryModal = signal(false);
  statusSearch = signal('');
  agentSearch = signal('');

  constructor(
    private ticketService: ticketService,
    private router: Router,
    private route: ActivatedRoute,
    private issueStatusService: IssueStatusService,
    private systemservice: ITSystemService,
    private userService: AuthService,
    private CompanyService: CompanyService,
    private IssueTypeService: IssuetypeService,
    private subModuleService: SubModuleService,
    private articleService: ArticleService,
    private fixedKpiService: fixedKPIService,
  ) {}

  LoadCompanies(): void {
    this.CompanyService.getAllcompanys().subscribe(data => {
      this.companies.set(data);
      this.currentCompany.set(this.companies().find(c => c.id === this.ticket?.companyId) || null);
    });
  }
  LoadIssueTypes(): void {
    this.IssueTypeService.getAllIssueTypes().subscribe(data => {
      this.issueTypes.set(data);
      this.currentIssueType.set(this.issueTypes().find(i => i.id === this.ticket?.issueTypeId) || null);
    });
  }
  currentCompany=signal<company | null>(null);
  currentIssueType=signal<issueType | null>(null);

  
  companies=signal<company[]>([]);
  issueTypes=signal<issueType[]>([]);
  ngOnInit(): void {
    this.loadAppUsers();

    // Subscribe to param changes so navigating from one ticket to another
    // (e.g. after splitting) reloads the component without a full page refresh.
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.id = id;
      this.currentuserId.set(this.userService.getUserId());
      this.resetState();
      this.loadTicketDetails(id);
    });
  }


  isRelatedToTask(task: TicketTaskResponse): boolean {

    const supervisorId = this.systemsupervisors()[task.userId];
    const currentuserId = this.currentuserId();
    return task?.userId === currentuserId || supervisorId === currentuserId;
  }
  /** Reset all mutable state so stale data from the previous ticket is cleared. */
  private resetState(): void {
    this.ticket              = null;
    this.CCs                 = [];
    this.TOs                 = [];
    this.relatedSubModuleAnswer = null;
    this.hierarchySystems = [];
    this.hierarchyModules = [];
    this.hierarchySubModules = [];
    this.notes               = [];
    this.ticketTasks         = [];
    this.taskDescription     = '';
    this.taskDate            = '';
    this.isCreatingTask      = false;
    this.ticketTaskKpiBusyId.set(null);
    this.ticketTaskKpiModal.set(null);
    this.ticketTaskUseFixedKpi.set(false);
    this.ticketTaskSelectedFixedKpiId.set('');
    this.ticketTaskKpiModalError.set(null);
    this.ticketTaskSupervisorAccessById.set({});
    this.taskError.set(null);
    this.taskSuccess.set(null);
    this.replies             = [];
    this.isLoading           = true;
    this.statuses            = [];
    this.assignHistoriess    = [];
    this.statusHistory       = [];
    this.replyText           = '';
    this.replyAttachments    = [];
    this.replyPictures       = [];
    this.replyTo             = [];
    this.replyCCs            = [];
    this.replySearchTo.set('');
    this.replySearchCCs.set('');
    this.replyToSearchResults.set([]);
    this.replyCCsSearchResults.set([]);
    this.replyToSearchLoading.set(false);
    this.replyCCsSearchLoading.set(false);
    this.ticketReplyRecipientsLoaded = { to: false, cc: false };
    this.didInitReplyRecipients = false;
    this.currentssueStatus.set(null);
    this.selectedStatusId.set(null);
    this.selectedUserId.set(null);
    this.systemAgents.set([]);
    this.agentWorkloadById.set({});
    this.canchangestatus.set(false);
    this.systemId.set(null);
    this.currentAssignHistory.set(null);
    this.currentCompany.set(null);
    this.currentIssueType.set(null);
    this.companies.set([]);
    this.issueTypes.set([]);
    this.visibleReplyCount.set(this.REPLY_PAGE);
    this.lightboxSrc.set(null);
    this.showSplitModal.set(false);
  }

  loadAppUsers() {
    this.userService.getAllUsers().subscribe((dict) => {
      this.appUsers = Object.entries(dict).map(([id, name]) => ({ id, name: name as string }));
      for (const user of this.appUsers) this.replyUserNameById.set(user.id, user.name);
    });
  }

  getFilteredReplyTo(): { id: string; name: string }[] {
    return this.replyToSearchResults().filter((u) => !this.replyTo.includes(u.id));
  }

  getFilteredReplyCCs(): { id: string; name: string }[] {
    return this.replyCCsSearchResults().filter((u) => !this.replyCCs.includes(u.id));
  }

  getAppUserName(id: string): string {
    return this.replyUserNameById.get(id) ?? this.appUsers.find((u) => u.id === id)?.name ?? id;
  }

  addReplyTo(userId: string) {
    if (!this.replyTo.includes(userId)) this.replyTo = [...this.replyTo, userId];
    this.replySearchTo.set('');
    this.replyToSearchResults.set([]);
    this.replyDropdownToOpen.set(false);
  }

  removeReplyTo(userId: string) {
    this.replyTo = this.replyTo.filter((id) => id !== userId);
  }

  addReplyCCs(userId: string) {
    if (!this.replyCCs.includes(userId)) this.replyCCs = [...this.replyCCs, userId];
    this.replySearchCCs.set('');
    this.replyCCsSearchResults.set([]);
    this.replyDropdownCCsOpen.set(false);
  }

  removeReplyCCs(userId: string) {
    this.replyCCs = this.replyCCs.filter((id) => id !== userId);
  }

  private tryInitializeReplyRecipientsFromTicket(): void {
    if (this.didInitReplyRecipients) return;
    if (!this.ticketReplyRecipientsLoaded.to || !this.ticketReplyRecipientsLoaded.cc) return;
    const unique = (arr: string[]) => [...new Set(arr.filter(Boolean))];
    this.replyTo = unique(this.TOs.map((u) => u.userId));
    this.replyCCs = unique(this.CCs.map((u) => u.userId));
    this.didInitReplyRecipients = true;
  }

  closeReplyToDropdown() { setTimeout(() => this.replyDropdownToOpen.set(false), 200); }
  closeReplyCCsDropdown() { setTimeout(() => this.replyDropdownCCsOpen.set(false), 200); }

  openArticlePicker(): void {
    this.articlePickerOpen.set(true);
    this.articleSearch.set('');
    this.searchArticles('');
  }

  closeArticlePicker(): void {
    this.articlePickerOpen.set(false);
  }

  onArticleSearchInput(value: string): void {
    this.articleSearch.set(value);
    if (this.articleSearchDebounce) clearTimeout(this.articleSearchDebounce);
    this.articleSearchDebounce = setTimeout(() => this.searchArticles(value), 250);
  }

  private searchArticles(raw: string): void {
    const title = raw.trim();
    this.articleSearchLoading.set(true);
    this.articleService.getArticles({
      pagenumber: 1,
      title: title || undefined,
    }).subscribe({
      next: (res) => {
        this.articleSearchResults.set(res?.data ?? []);
      },
      error: () => {
        this.articleSearchResults.set([]);
      },
      complete: () => {
        this.articleSearchLoading.set(false);
      },
    });
  }

  private articleLink(id: string): string {
    return `${window.location.origin}/articles/${id}`;
  }

  private tagArticleLink(link: string): string {
    return `${this.articleLinkTag}${link}`;
  }

  sendArticleReply(article: ArticleSummaryResponse): void {
    if (!this.ticket || this.isSendingReply) return;
    const link = this.tagArticleLink(this.articleLink(article.id));
    const text = this.replyText.trim();
    this.replyText = text ? `${text}\n${link}` : link;
    this.closeArticlePicker();
  }

  onReplyToSearchInput(value: string): void {
    this.replySearchTo.set(value);
    this.replyDropdownToOpen.set(true);
    if (this.replyToSearchDebounce) clearTimeout(this.replyToSearchDebounce);
    this.replyToSearchDebounce = setTimeout(() => this.searchReplyUsers(value, 'to'), 250);
  }

  onReplyCCsSearchInput(value: string): void {
    this.replySearchCCs.set(value);
    this.replyDropdownCCsOpen.set(true);
    if (this.replyCCsSearchDebounce) clearTimeout(this.replyCCsSearchDebounce);
    this.replyCCsSearchDebounce = setTimeout(() => this.searchReplyUsers(value, 'cc'), 250);
  }

  onReplyToSearchFocus(): void {
    this.replyDropdownToOpen.set(true);
    this.searchReplyUsers(this.replySearchTo(), 'to');
  }

  onReplyCCsSearchFocus(): void {
    this.replyDropdownCCsOpen.set(true);
    this.searchReplyUsers(this.replySearchCCs(), 'cc');
  }

  private searchReplyUsers(raw: string, target: 'to' | 'cc'): void {
    const query = raw.trim();
    if (target === 'to') this.replyToSearchLoading.set(true);
    else this.replyCCsSearchLoading.set(true);

    this.userService.getCompleteUsersBasicData({
      filter: query || null,
      page: 1,
      departmentIDS: null,
    }).subscribe({
      next: (res) => {
        const mapped = this.mapBasicUsersToOptions(res?.data ?? []);
        if (target === 'to') this.replyToSearchResults.set(mapped);
        else this.replyCCsSearchResults.set(mapped);
      },
      error: () => {
        if (target === 'to') this.replyToSearchResults.set([]);
        else this.replyCCsSearchResults.set([]);
      },
      complete: () => {
        if (target === 'to') this.replyToSearchLoading.set(false);
        else this.replyCCsSearchLoading.set(false);
      },
    });
  }

  private mapBasicUsersToOptions(rows: BasicUserDataResponse[]): { id: string; name: string }[] {
    return (rows ?? [])
      .filter((u) => !!u.userId)
      .map((u) => {
        const name = (u.employeeName || u.userName || u.userId).trim();
        this.replyUserNameById.set(u.userId, name);
        return { id: u.userId, name };
      });
  }

  // ─── SPLIT TICKET ──────────────────────────────────────────────────────────

  showSplitModal = signal(false);
  splitReplyId: string | null = null;
  isSplitting = false;
  splitError: string | null = null;

  splitSystems: System[] = [];
  splitModules: Module[] = [];
  splitSubModules: SubModule[] = [];
  splitSelectedSystemId: string | null = null;
  splitSelectedModuleId: string | null = null;
  splitSelectedSubModuleId: string | null = null;

  splitTextQuestions:   Question[] = [];
  splitDateQuestions:   Question[] = [];
  splitSingleQuestions: Question[] = [];
  splitMultiQuestions:  Question[] = [];

  splitTextAnswers:   Record<string, string>        = {};
  splitDateAnswers:   Record<string, string>        = {};
  splitSingleAnswers: Record<string, string | null> = {};
  splitMultiAnswers:  Record<string, string[]>      = {};

  splitSubject     = '';
  splitDescription = '';
  splitPriority: IssuePriority = IssuePriority.Low;
  splitCompanyId: string | undefined;
  splitIssueTypeId: string | undefined;

  splitAttachments: File[] = [];
  splitTo:  string[] = [];
  splitCCs: string[] = [];
  splitSearchTo   = signal('');
  splitSearchCCs  = signal('');
  splitDropdownToOpen  = signal(false);
  splitDropdownCCsOpen = signal(false);

  // ─── CHANGE MODULE / ANSWERS ───────────────────────────────────────────────
  showChangeModuleEditor = signal(false);
  isSavingModuleChange = signal(false);
  isCreatingChangeSystem = signal(false);
  isCreatingChangeModule = signal(false);
  isCreatingChangeSubModule = signal(false);
  moduleChangeError = signal<string | null>(null);
  moduleChangeSuccess = signal<string | null>(null);

  changeSystems: System[] = [];
  changeModules: Module[] = [];
  changeSubModules: SubModule[] = [];
  changeSystemAgents: UserResponseDTO[] = [];
  changeSelectedSystemId: string | null = null;
  changeSelectedModuleId: string | null = null;
  changeSelectedSubModuleId: string | null = null;
  changeSelectedAssignedUserId: string | null = null;
  changeIsCurrentUserAgent = signal(true);
  changeMustPickAssignedUser = signal(false);

  newChangeSystemName = '';
  newChangeModuleName = '';
  newChangeSubModuleName = '';

  changeTextQuestions: Question[] = [];
  changeDateQuestions: Question[] = [];
  changeSingleQuestions: Question[] = [];
  changeMultiQuestions: Question[] = [];

  changeTextAnswers: Record<string, string> = {};
  changeDateAnswers: Record<string, string> = {};
  changeSingleAnswers: Record<string, string | null> = {};
  changeMultiAnswers: Record<string, string[]> = {};

  IssuePriorityValues = Object.values(IssuePriority).filter(v => typeof v === 'number') as number[];

  openSplitModal(reply: Reply): void {
    this.splitReplyId    = reply.id;
    console.log(reply,'reply');
    console.log(reply.id,'id');
    this.splitSubject    = reply.subject    || '';
    this.splitDescription = reply.description || '';
    this.splitPriority   = this.ticket?.priority  ?? IssuePriority.Low;
    this.splitCompanyId  = this.ticket?.companyId;
    this.splitIssueTypeId = this.ticket?.issueTypeId;
    this.splitTo  = [...(reply.to  ?? [])];
    this.splitCCs = [...(reply.cCs ?? [])];
    // merge ticket-level To/CCs that aren't already in the list
    for (const u of this.TOs)  { if (!this.splitTo.includes(u.userId))  this.splitTo  = [...this.splitTo,  u.userId]; }
    for (const u of this.CCs)  { if (!this.splitCCs.includes(u.userId)) this.splitCCs = [...this.splitCCs, u.userId]; }
    this.splitAttachments = [];
    this.splitSelectedSystemId  = null;
    this.splitSelectedModuleId  = null;
    this.splitSelectedSubModuleId = null;
    this.splitModules    = [];
    this.splitSubModules = [];
    this.clearSplitQuestions();
    if (!this.splitSystems.length) {
      this.systemservice.getAllSystems().subscribe(s => (this.splitSystems = s));
    }
    this.showSplitModal.set(true);
  }

  closeSplitModal(): void {
    this.showSplitModal.set(false);
    this.splitError = null;
  }

  onSplitSystemChange(): void {
    this.splitModules = [];
    this.splitSubModules = [];
    this.splitSelectedModuleId = null;
    this.splitSelectedSubModuleId = null;
    this.clearSplitQuestions();
    if (this.splitSelectedSystemId) {
      this.systemservice.getSystemModules(this.splitSelectedSystemId).subscribe(m => (this.splitModules = m));
    }
  }

  onSplitModuleChange(): void {
    this.splitSubModules = [];
    this.splitSelectedSubModuleId = null;
    this.clearSplitQuestions();
    if (this.splitSelectedModuleId) {
      this.subModuleService.getbyModuleId(this.splitSelectedModuleId).subscribe(s => (this.splitSubModules = s));
    }
  }

  onSplitSubModuleChange(): void {
    this.clearSplitQuestions();
    if (this.splitSelectedSubModuleId) {
      this.subModuleService.getQuestions(this.splitSelectedSubModuleId).subscribe(qs => {
        const normalized = qs.map(q => ({ ...q, questionType: Number(q.questionType) as TypeOfQuestion }));
        this.splitTextQuestions   = normalized.filter(q => q.questionType === TypeOfQuestion.Text);
        this.splitDateQuestions   = normalized.filter(q => q.questionType === TypeOfQuestion.DateTime);
        this.splitSingleQuestions = normalized.filter(q => q.questionType === TypeOfQuestion.SingleChoice);
        this.splitMultiQuestions  = normalized.filter(q => q.questionType === TypeOfQuestion.MultipleChoice);
        this.splitTextAnswers = {}; this.splitDateAnswers = {};
        this.splitSingleAnswers = {}; this.splitMultiAnswers = {};
      });
    }
  }

  private clearSplitQuestions(): void {
    this.splitTextQuestions = []; this.splitDateQuestions = [];
    this.splitSingleQuestions = []; this.splitMultiQuestions = [];
    this.splitTextAnswers = {}; this.splitDateAnswers = {};
    this.splitSingleAnswers = {}; this.splitMultiAnswers = {};
  }

  toggleSplitMulti(questionId: string, optionId: string, checked: boolean): void {
    const cur = this.splitMultiAnswers[questionId] ?? [];
    this.splitMultiAnswers[questionId] = checked
      ? (cur.includes(optionId) ? cur : [...cur, optionId])
      : cur.filter(id => id !== optionId);
  }

  isSplitMultiChecked(questionId: string, optionId: string): boolean {
    return (this.splitMultiAnswers[questionId] ?? []).includes(optionId);
  }

  splitIsValid(): boolean {
    if (!this.splitSubject.trim() || !this.splitDescription.trim() || !this.splitSelectedSubModuleId) return false;
    for (const q of this.splitTextQuestions)   { if (q.isRequired && !this.splitTextAnswers[q.id]?.trim()) return false; }
    for (const q of this.splitDateQuestions)   { if (q.isRequired && !this.splitDateAnswers[q.id]) return false; }
    for (const q of this.splitSingleQuestions) { if (q.isRequired && !this.splitSingleAnswers[q.id]) return false; }
    for (const q of this.splitMultiQuestions)  { if (q.isRequired && !this.splitMultiAnswers[q.id]?.length) return false; }
    return true;
  }

  submitSplitTicket(): void {
    if (!this.splitIsValid() || !this.splitSelectedSubModuleId) return;
    this.isSplitting = true;
    this.splitError = null;

    const req: SplitTicketRequest = {
      attachments: [...this.splitAttachments],
      RelatedSubModuleAnswer: {
        relatedSubModuleId: this.splitSelectedSubModuleId,
        textAnswers:   this.splitTextQuestions.map(q => ({ questionId: q.id, value: this.splitTextAnswers[q.id] ?? '' })),
        dateAnswers:   this.splitDateQuestions.map(q => ({ questionId: q.id, value: this.splitDateAnswers[q.id] ? new Date(this.splitDateAnswers[q.id]) : undefined })),
        singleChoiceAnswers:   this.splitSingleQuestions.map(q => ({ questionId: q.id, value: this.splitSingleAnswers[q.id] ?? undefined })),
        multipleChoiceAnswers: this.splitMultiQuestions.map(q => ({ questionId: q.id, value: this.splitMultiAnswers[q.id] ?? [] })),
      },
      priority:    this.splitPriority,
      subject:     this.splitSubject.trim(),
      description: this.splitDescription.trim(),
      to:   this.appUsers.filter(u => this.splitTo.includes(u.id)).map(u => u.id),
      cCs:   this.appUsers.filter(u => this.splitCCs.includes(u.id)).map(u => u.id),
      IssueTypeId: this.splitIssueTypeId,
      CompanyId:   this.splitCompanyId,
      ReplyId:     this.splitReplyId ?? '0',
    };

    this.ticketService.SplitTicket(req).subscribe({
      next: (newTicketId) => {
        this.isSplitting = false;
        this.closeSplitModal();
        const reply = this.replies.find(r => r.id === this.splitReplyId);
        if (reply) {
          reply.splitTicketId = newTicketId.guid;
        }
        this.router.navigate(['/ticketdetails', newTicketId.guid]);
      },
      error: () => {
        this.isSplitting = false;
        this.splitError = 'Failed to create split ticket. Please try again.';
      },
    });
  }

  getFilteredSplitTo(): { id: string; name: string }[] {
    const q = this.splitSearchTo().trim().toLowerCase();
    return this.appUsers.filter(u => !this.splitTo.includes(u.id) &&
      (!q || u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)));
  }

  getFilteredSplitCCs(): { id: string; name: string }[] {
    const q = this.splitSearchCCs().trim().toLowerCase();
    return this.appUsers.filter(u => !this.splitCCs.includes(u.id) &&
      (!q || u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)));
  }

  addSplitTo(userId: string): void {
    if (!this.splitTo.includes(userId)) this.splitTo = [...this.splitTo, userId];
    this.splitSearchTo.set(''); this.splitDropdownToOpen.set(false);
  }
  removeSplitTo(userId: string): void { this.splitTo = this.splitTo.filter(id => id !== userId); }

  addSplitCCs(userId: string): void {
    if (!this.splitCCs.includes(userId)) this.splitCCs = [...this.splitCCs, userId];
    this.splitSearchCCs.set(''); this.splitDropdownCCsOpen.set(false);
  }
  removeSplitCCs(userId: string): void { this.splitCCs = this.splitCCs.filter(id => id !== userId); }

  NavigateToSplitTicket(splitTicketId: string): void {
    this.router.navigate(['/ticketdetails', splitTicketId]);
  }
  onSplitAttachmentChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.splitAttachments = [...this.splitAttachments, ...Array.from(input.files)];
      input.value = '';
    }
  }

  removeSplitAttachment(index: number): void {
    this.splitAttachments = this.splitAttachments.filter((_, i) => i !== index);
  }

  closeSplitToDropdown(): void  { setTimeout(() => this.splitDropdownToOpen.set(false), 200); }
  closeSplitCCsDropdown(): void { setTimeout(() => this.splitDropdownCCsOpen.set(false), 200); }

  canChangeModuleAndAnswers(): boolean {
    const uid = this.currentuserId();
    if (!uid) return false;
    return this.currentAssignHistory()?.userId === uid;
  }

  openChangeModuleEditor(): void {
    this.moduleChangeError.set(null);
    this.moduleChangeSuccess.set(null);
    this.showChangeModuleEditor.set(true);
    this.resetChangeModuleEditor();
    this.changeSelectedAssignedUserId = this.currentAssignHistory()?.userId ?? null;
    if (!this.changeSystems.length) {
      this.systemservice.getAllSystems().subscribe((systems) => {
        this.changeSystems = systems;
        this.prefillChangeModuleFromCurrent();
      });
      return;
    }

    this.prefillChangeModuleFromCurrent();
  }

  closeChangeModuleEditor(): void {
    this.showChangeModuleEditor.set(false);
    this.moduleChangeError.set(null);
    this.moduleChangeSuccess.set(null);
  }

  private prefillChangeModuleFromCurrent(): void {
    const current = this.relatedSubModuleAnswer;
    if (!current) return;

    this.changeSelectedSystemId = current.systemId ?? null;
    this.changeSelectedModuleId = current.moduleId ?? null;
    this.changeSelectedSubModuleId = current.relatedSubModuleId ?? null;
    this.changeSelectedAssignedUserId = this.currentAssignHistory()?.userId ?? null;

    if (!this.changeSelectedSystemId) return;
    this.loadChangeSystemAgents(this.changeSelectedSystemId);
    this.systemservice.getSystemModules(this.changeSelectedSystemId).subscribe((modules) => {
      this.changeModules = modules;
      if (!this.changeSelectedModuleId) return;

      this.subModuleService.getbyModuleId(this.changeSelectedModuleId).subscribe((submodules) => {
        this.changeSubModules = submodules;
        if (!this.changeSelectedSubModuleId) return;
        this.loadChangeQuestions(this.changeSelectedSubModuleId);
      });
    });
  }

  private resetChangeModuleEditor(): void {
    this.changeModules = [];
    this.changeSubModules = [];
    this.changeSystemAgents = [];
    this.changeSelectedSystemId = null;
    this.changeSelectedModuleId = null;
    this.changeSelectedSubModuleId = null;
    this.changeSelectedAssignedUserId = null;
    this.changeIsCurrentUserAgent.set(true);
    this.changeMustPickAssignedUser.set(false);
    this.newChangeSystemName = '';
    this.newChangeModuleName = '';
    this.newChangeSubModuleName = '';
    this.clearChangeQuestions();
  }

  onChangeEditorSystemChange(): void {
    this.moduleChangeError.set(null);
    this.changeModules = [];
    this.changeSubModules = [];
    this.changeSystemAgents = [];
    this.changeSelectedModuleId = null;
    this.changeSelectedSubModuleId = null;
    this.newChangeModuleName = '';
    this.newChangeSubModuleName = '';
    this.clearChangeQuestions();

    if (this.changeSelectedSystemId) {
      this.loadChangeSystemAgents(this.changeSelectedSystemId);
      this.systemservice.getSystemModules(this.changeSelectedSystemId).subscribe((modules) => {
        this.changeModules = modules;
      });
    }
  }

  private loadChangeSystemAgents(systemId: string): void {
    this.changeSystemAgents = [];
    this.changeIsCurrentUserAgent.set(false);
    this.changeMustPickAssignedUser.set(false);

    this.systemservice.getSystemAgents(systemId).subscribe((agents) => {
      this.changeSystemAgents = agents;
      const currentUid = this.currentuserId();
      const isCurrentUserAgent = !!currentUid && agents.some((agent) => agent.id === currentUid);
      const selectedOrCurrentAssigned = this.changeSelectedAssignedUserId ?? this.currentAssignHistory()?.userId ?? null;
      const hasValidAssigned = !!selectedOrCurrentAssigned && agents.some((agent) => agent.id === selectedOrCurrentAssigned);

      this.changeIsCurrentUserAgent.set(isCurrentUserAgent);
      this.changeMustPickAssignedUser.set(!isCurrentUserAgent && !hasValidAssigned);

      if (hasValidAssigned) {
        this.changeSelectedAssignedUserId = selectedOrCurrentAssigned;
        return;
      }

      if (isCurrentUserAgent) {
        this.changeSelectedAssignedUserId = currentUid;
        return;
      }

      this.changeSelectedAssignedUserId = null;
    });
  }

  getChangeAgentDisplay(agent: UserResponseDTO): string {
    const parts = [
      agent.userName || agent.email || agent.id,
      agent.employeeNumber ? `(${agent.employeeNumber})` : '',
      agent.email || '',
    ].filter(Boolean);
    return parts.join(' ');
  }

  onChangeEditorModuleChange(): void {
    this.moduleChangeError.set(null);
    this.changeSubModules = [];
    this.changeSelectedSubModuleId = null;
    this.newChangeSubModuleName = '';
    this.clearChangeQuestions();

    if (this.changeSelectedModuleId) {
      this.subModuleService.getbyModuleId(this.changeSelectedModuleId).subscribe((submodules) => {
        this.changeSubModules = submodules;
      });
    }
  }

  onChangeEditorSubModuleChange(): void {
    this.moduleChangeError.set(null);
    this.clearChangeQuestions();

    if (this.changeSelectedSubModuleId) {
      this.loadChangeQuestions(this.changeSelectedSubModuleId);
    }
  }

  private loadChangeQuestions(subModuleId: string): void {
    this.subModuleService.getQuestions(subModuleId).subscribe((qs) => {
      const normalized = qs.map((q) => ({ ...q, questionType: Number(q.questionType) as TypeOfQuestion }));
      this.changeTextQuestions = normalized.filter((q) => q.questionType === TypeOfQuestion.Text);
      this.changeDateQuestions = normalized.filter((q) => q.questionType === TypeOfQuestion.DateTime);
      this.changeSingleQuestions = normalized.filter((q) => q.questionType === TypeOfQuestion.SingleChoice);
      this.changeMultiQuestions = normalized.filter((q) => q.questionType === TypeOfQuestion.MultipleChoice);
      this.changeTextAnswers = {};
      this.changeDateAnswers = {};
      this.changeSingleAnswers = {};
      this.changeMultiAnswers = {};
    });
  }

  private clearChangeQuestions(): void {
    this.changeTextQuestions = [];
    this.changeDateQuestions = [];
    this.changeSingleQuestions = [];
    this.changeMultiQuestions = [];
    this.changeTextAnswers = {};
    this.changeDateAnswers = {};
    this.changeSingleAnswers = {};
    this.changeMultiAnswers = {};
  }

  addChangeSystem(): void {
    const name = this.newChangeSystemName.trim();
    if (!name || this.isCreatingChangeSystem()) return;
    this.isCreatingChangeSystem.set(true);
    this.moduleChangeError.set(null);

    this.systemservice.createSystem({ name }).subscribe({
      next: (created) => {
        this.changeSystems = [...this.changeSystems, created];
        this.changeSelectedSystemId = created.id;
        this.newChangeSystemName = '';
        this.onChangeEditorSystemChange();
      },
      error: () => {
        this.moduleChangeError.set('Failed to create system. Please try again.');
        this.isCreatingChangeSystem.set(false);
      },
      complete: () => this.isCreatingChangeSystem.set(false),
    });
  }

  addChangeModule(): void {
    const name = this.newChangeModuleName.trim();
    if (!name || !this.changeSelectedSystemId || this.isCreatingChangeModule()) return;
    this.isCreatingChangeModule.set(true);
    this.moduleChangeError.set(null);

    this.systemservice.addModule(this.changeSelectedSystemId, { name }).subscribe({
      next: () => {
        this.systemservice.getSystemModules(this.changeSelectedSystemId!).subscribe((modules) => {
          this.changeModules = modules;
          const created = [...modules].reverse().find((m) => m.name.trim().toLowerCase() === name.toLowerCase());
          if (created) {
            this.changeSelectedModuleId = created.id;
            this.onChangeEditorModuleChange();
          }
        });
        this.newChangeModuleName = '';
      },
      error: () => {
        this.moduleChangeError.set('Failed to create module. Please try again.');
        this.isCreatingChangeModule.set(false);
      },
      complete: () => this.isCreatingChangeModule.set(false),
    });
  }

  addChangeSubModule(): void {
    const name = this.newChangeSubModuleName.trim();
    if (!name || !this.changeSelectedModuleId || this.isCreatingChangeSubModule()) return;
    this.isCreatingChangeSubModule.set(true);
    this.moduleChangeError.set(null);

    this.subModuleService.create({ name, moduleId: this.changeSelectedModuleId }).subscribe({
      next: (created) => {
        this.changeSubModules = [...this.changeSubModules, created];
        this.changeSelectedSubModuleId = created.id;
        this.newChangeSubModuleName = '';
        this.onChangeEditorSubModuleChange();
      },
      error: () => {
        this.moduleChangeError.set('Failed to create sub module. Please try again.');
        this.isCreatingChangeSubModule.set(false);
      },
      complete: () => this.isCreatingChangeSubModule.set(false),
    });
  }

  toggleChangeMulti(questionId: string, optionId: string, checked: boolean): void {
    const cur = this.changeMultiAnswers[questionId] ?? [];
    this.changeMultiAnswers[questionId] = checked
      ? (cur.includes(optionId) ? cur : [...cur, optionId])
      : cur.filter((id) => id !== optionId);
  }

  isChangeMultiChecked(questionId: string, optionId: string): boolean {
    return (this.changeMultiAnswers[questionId] ?? []).includes(optionId);
  }

  isChangeModulePayloadValid(): boolean {
    if (!this.changeSelectedSubModuleId) return false;
    if (this.changeMustPickAssignedUser() && !this.changeSelectedAssignedUserId) return false;
    if (
      this.changeSelectedAssignedUserId &&
      this.changeSystemAgents.length > 0 &&
      !this.changeSystemAgents.some((a) => a.id === this.changeSelectedAssignedUserId)
    ) return false;
    for (const q of this.changeTextQuestions) {
      if (q.isRequired && !this.changeTextAnswers[q.id]?.trim()) return false;
    }
    for (const q of this.changeDateQuestions) {
      if (q.isRequired && !this.changeDateAnswers[q.id]) return false;
    }
    for (const q of this.changeSingleQuestions) {
      if (q.isRequired && !this.changeSingleAnswers[q.id]) return false;
    }
    for (const q of this.changeMultiQuestions) {
      if (q.isRequired && !this.changeMultiAnswers[q.id]?.length) return false;
    }
    return true;
  }

  submitModuleChange(): void {
    if (!this.ticket || !this.isChangeModulePayloadValid() || !this.changeSelectedSubModuleId) return;

    this.moduleChangeError.set(null);
    this.moduleChangeSuccess.set(null);
    this.isSavingModuleChange.set(true);

    const payload: CreateRelatedSubModuleAnswerRequest = {
      relatedSubModuleId: this.changeSelectedSubModuleId,
      textAnswers: this.changeTextQuestions.map((q) => ({
        questionId: q.id,
        value: this.changeTextAnswers[q.id] ?? '',
      })),
      dateAnswers: this.changeDateQuestions.map((q) => ({
        questionId: q.id,
        value: this.changeDateAnswers[q.id] ? new Date(this.changeDateAnswers[q.id]) : undefined,
      })),
      singleChoiceAnswers: this.changeSingleQuestions.map((q) => ({
        questionId: q.id,
        value: this.changeSingleAnswers[q.id] ?? undefined,
      })),
      multipleChoiceAnswers: this.changeMultiQuestions.map((q) => ({
        questionId: q.id,
        value: this.changeMultiAnswers[q.id] ?? [],
      })),
    };

    const finishSuccess = () => {
      this.moduleChangeSuccess.set('System/module/answers updated successfully.');
      this.showChangeModuleEditor.set(false);
      this.getRelatedSubModuleAnswer(this.ticket!.id);
      this.loadsystemId();
      this.loadAssignHistoriess();
      this.isSavingModuleChange.set(false);
    };

    this.ticketService.ChangeModule(this.ticket.id, payload).subscribe({
      next: () => {
        const selectedAssigned = this.changeSelectedAssignedUserId;
        const currentAssigned = this.currentAssignHistory()?.userId ?? null;

        if (selectedAssigned && selectedAssigned !== currentAssigned) {
          this.ticketService.Reassign(this.ticket!.id, selectedAssigned).subscribe({
            next: (assignHistory) => {
              this.currentAssignHistory.set(assignHistory);
              finishSuccess();
            },
            error: () => {
              this.moduleChangeError.set('Module updated, but failed to reassign ticket.');
              this.isSavingModuleChange.set(false);
            },
          });
          return;
        }

        finishSuccess();
      },
      error: () => {
        this.moduleChangeError.set('Failed to update module and answers. Please try again.');
        this.isSavingModuleChange.set(false);
      },
    });
  }

  note: string = '';
  addPrivateNote() {
    if (!this.note) return;
    const note: stringDTO = { name: this.note };
    this.ticketService.PrivateNotes(this.ticket!.id,note ).subscribe(() => {
      this.notes.push(this.note);
      this.note = '';
    });
  }

  loadTicketTasks(): void {
    if (!this.ticket?.id) return;
    this.ticketService.MyTicketTasks(this.ticket.id).subscribe({
      next: (tasks) => {
        this.ticketTasks = Array.isArray(tasks) ? tasks : [];
        this.loadTicketTaskSupervisorAccess();
      },
      error: () => {
        this.taskError.set('Failed to load tasks.');
      },
    });
  }

  private loadTicketTaskSupervisorAccess(): void {
    const systemId = this.systemId();
    const currentUserId = this.currentuserId();
    const rows = this.ticketTasks ?? [];

    if (!systemId || !currentUserId || !rows.length) {
      this.ticketTaskSupervisorAccessById.set({});
      return;
    }

    const requests = rows.map((task) => {
      if (!task?.id || !task?.userId) {
        return of({ taskId: task?.id ?? '', canManage: false });
      }
      return this.systemservice.getagentsupervisor(systemId, task.userId).pipe(
        map((supervisorId) => ({
          taskId: task.id,
          canManage: (supervisorId.id ?? '').toLowerCase() === currentUserId.toLowerCase(),
        })),
        catchError(() => of({ taskId: task.id, canManage: false })),
      );
    });

    forkJoin(requests).subscribe((result) => {
      const accessMap: Record<string, boolean> = {};
      for (const entry of result) {
        if (!entry.taskId) continue;
        accessMap[entry.taskId] = entry.canManage;
      }
      this.ticketTaskSupervisorAccessById.set(accessMap);
    });
  }

  canCreateTicketTask(): boolean {
    const uid = this.currentuserId();
    if (!uid) return false;
    // const isAgent = this.systemAgents().some(a => a.id === uid);
    const isCreator = this.ticket?.userId === uid;
    const isAssigned = this.currentAssignHistory()?.userId === uid;
    return  isAssigned ;
  }

  canViewTicketTasks(): boolean {
    const uid = this.currentuserId();
    if (!uid) return false;
    const isAgent = this.systemAgents().some(a => a.id === uid);
    const isCreator = this.ticket?.userId === uid;
    const isAssigned = this.currentAssignHistory()?.userId === uid;
    return  isAgent;
  }

  submitTicketTask(): void {
    if (!this.ticket?.id || !this.canCreateTicketTask()) return;
    const description = this.taskDescription.trim();
    if (!description || !this.taskDate) return;

    this.isCreatingTask = true;
    this.taskError.set(null);
    this.taskSuccess.set(null);

    const payload: createticketTaskRequest = {
      description,
      date: new Date(this.taskDate),
    };

    this.ticketService.createTickettask(this.ticket.id, payload).subscribe({
      next: () => {
        this.taskDescription = '';
        this.taskDate = '';
        this.taskSuccess.set('Task added successfully.');
        this.loadTicketTasks();
      },
      error: () => {
        this.taskError.set('Failed to add task. Please try again.');
        this.isCreatingTask = false;
      },
      complete: () => {
        this.isCreatingTask = false;
      },
    });
  }

  getTaskUserDisplay(task: TicketTaskResponse): string {
    if (task.userId === this.currentuserId()) return 'You';
    return task.userName || task.userId || '—';
  }

  canManageTicketTaskKpi(task: TicketTaskResponse): boolean {
    if (!task?.id) return false;
    return (!!this.ticketTaskSupervisorAccessById()[task.id]) || this.canCreateTicketTask();
  }

  ticketTaskKpiName(task: TicketTaskResponse): string {
    return task.kpi?.kpiName || '—';
  }

  openTicketTaskKpiModalPrompt(task: TicketTaskResponse): void {
    if (!task?.id || !!task.kpi || !this.isRelatedToTask(task)) return;
    this.ticketTaskUseFixedKpi.set(false);
    this.ticketTaskSelectedFixedKpiId.set(this.ticketTaskFixedKpis()[0]?.id ?? '');
    this.ticketTaskKpiModalError.set(null);
    this.ticketTaskKpiModal.set(task);
    this.ensureTicketTaskFixedKpisLoaded();
  }

  closeTicketTaskKpiModalPrompt(): void {
    this.ticketTaskKpiModal.set(null);
    this.ticketTaskUseFixedKpi.set(false);
    this.ticketTaskKpiModalError.set(null);
  }

  private ensureTicketTaskFixedKpisLoaded(): void {
    if (this.ticketTaskFixedKpis().length || this.ticketTaskFixedKpisLoading()) return;
    this.ticketTaskFixedKpisLoading.set(true);
    this.fixedKpiService.getAllfixedKPIs().subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.ticketTaskFixedKpis.set(list);
        if (!this.ticketTaskSelectedFixedKpiId() && list.length) {
          this.ticketTaskSelectedFixedKpiId.set(list[0].id);
        }
      },
      error: () => {
        this.ticketTaskKpiModalError.set('Failed to load fixed KPIs.');
      },
      complete: () => {
        this.ticketTaskFixedKpisLoading.set(false);
      },
    });
  }

  submitTicketTaskKpi(): void {
    const task = this.ticketTaskKpiModal();
    if (!task?.id || !!task.kpi || !this.isRelatedToTask(task)) return;
    const req: { ticketTaskId: string; fixedKPIId?: string } = { ticketTaskId: task.id };
    if (this.ticketTaskUseFixedKpi()) {
      const fixedId = this.ticketTaskSelectedFixedKpiId();
      if (!fixedId) {
        this.ticketTaskKpiModalError.set('Please select a fixed KPI, or choose No.');
        return;
      }
      req.fixedKPIId = fixedId;
    }
    this.ticketTaskKpiBusyId.set(task.id);
    this.taskError.set(null);
    this.ticketTaskKpiModalError.set(null);
    this.fixedKpiService.CreateKPI(req).subscribe({
      next: () => {
        this.taskSuccess.set('KPI linked to task.');
        this.closeTicketTaskKpiModalPrompt();
        this.loadTicketTasks();
      },
      error: () => {
        this.taskError.set('Failed to link KPI to task.');
        this.ticketTaskKpiModalError.set('Failed to link KPI to task.');
      },
      complete: () => {
        this.ticketTaskKpiBusyId.set(null);
      },
    });
  }
  systemsupervisors=signal<Record<string, string>>({});
  getSystemSupervisors() {
    this.systemservice.getSystemSupervisors(this.systemId()!).subscribe((agents) => {
      this.systemsupervisors.set(agents);
    });
  }
  private loadTicketDetails(id: string): void {
    this.isLoading = true;
    this.ticketService.getById(id).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        console.log(ticket,'ticket paw flnaw');
        this.ticketService.getCCs(id).subscribe((ccs) => {
          this.CCs = Array.isArray(ccs) ? ccs : [];
          this.ticketReplyRecipientsLoaded.cc = true;
          this.tryInitializeReplyRecipientsFromTicket();
        });
        this.ticketService.getTOs(id).subscribe((tos) => {
          this.TOs = Array.isArray(tos) ? tos : [];
          this.ticketReplyRecipientsLoaded.to = true;
          this.tryInitializeReplyRecipientsFromTicket();
        });
        this.ticketService.getPrivateNotes(id).subscribe((notes) => (this.notes = notes));
        this.LoadCompanies();
        this.LoadIssueTypes();
        this.loadStatuses();
        this.loadsystemId();
        this.loadstatushistory();
        this.loadAssignHistoriess();
        this.loadTicketHierarchyLookups();
        this.getRelatedSubModuleAnswer(id);
        this.loadTicketTasks();
        this.loadReplies(id);

      },
      error: () => (this.isLoading = false),
      complete: () => (this.isLoading = false),
    });
  }
// property
modalType: 'status' | 'assign' | null = null;

// open modal
openStatusAssignModal(type: 'status' | 'assign') {
  this.modalType = type;
}

// close modal
closeStatusAssignModal() {
  this.modalType = null;
}

// check if any modal is open
showStatusAssignModal(): boolean {
  return this.modalType !== null;
}

// get the current modal type
currentModalType(): 'status' | 'assign' | null {
  return this.modalType;
}
  loadsystemId() {
    this.ticketService.getTicketSystemId(this.ticket!.id).subscribe((systemId) => {
      this.systemId.set(systemId);
      this.loadsystemagents();
          this.getSystemSupervisors();

      this.loadTicketTaskSupervisorAccess();
    });
  }

  loadsystemagents() {
    this.systemservice.getSystemAgents(this.systemId()!).subscribe((agents) => {
      this.systemAgents.set(agents);
      if (agents.find((agent) => agent.id === this.currentuserId())) {
        this.canchangestatus.set(true);
      }
    });
    this.systemservice.getSystemAgentsWithTasksNumber(this.systemId()!).subscribe((agents) => {
      const map: Record<string, { tickets: number; projectTasks: number }> = {};
      for (const a of (agents ?? []) as AgentResponseWithTasksNumberDTO[]) {
        const uid = a?.userdataresponse?.userId;
        if (!uid) continue;
        map[uid] = {
          tickets: Number(a.numberOfAssignedActiveTicketss ?? 0),
          projectTasks: Number(a.numberOfAssignedActiveProjectTasks ?? 0),
        };
      }
      this.agentWorkloadById.set(map);
    });
  }

  agentWorkload(userId: string): { tickets: number; projectTasks: number } {
    return this.agentWorkloadById()[userId] ?? { tickets: 0, projectTasks: 0 };
  }

  saveBasicData(){
    console.log(this.ticket,'ticket');
    console.log(this.ticket?.companyId,'companyId');
    console.log(this.ticket?.issueTypeId,'issueTypeId');
    this.ticketService.ChangeBasicData(this.ticket!.id, this.ticket?.companyId, this.ticket?.issueTypeId,this.ticket?.priority).subscribe(() => {
      
      // this.loadTicketDetails(this.ticket!.id);
      
    });
  }
  loadAssignHistoriess() {
    this.ticketService.getAssignHistoriess(this.ticket!.id).subscribe((assignHistoriess) => {
      this.assignHistoriess = assignHistoriess;
      this.currentAssignHistory.set(this.assignHistoriess.at(-1) || null);
      if (!this.selectedUserId()) {
        this.selectedUserId.set(this.currentAssignHistory()?.userId ?? null);
      }
    });
  }

  reassign(ticketId: string) {
    if (!this.selectedUserId()) return;
    this.ticketService.Reassign(ticketId, this.selectedUserId()!).subscribe((assignHistory) => {
      this.currentAssignHistory.set(assignHistory);
      this.loadAssignHistoriess();
      this.closeAssignModal();
    });
  }

  toggleAssignHistory() {
    this.showAssignHistory = !this.showAssignHistory;
    if (this.showAssignHistory && this.assignHistoriess.length === 0) this.loadAssignHistoriess();
  }

  loadStatuses() {
    this.issueStatusService.getAllIssueStatuses().subscribe((data) => {
      this.statuses = data;
      this.currentssueStatus.set(this.statuses.find((s) => s.id === this.ticket!.issueStatusId) || null);
      this.selectedStatusId.set(this.currentssueStatus()?.id ?? null);
    });
  }

  openStatusModal() {
    this.statusSearch.set('');
    this.showStatusModal.set(true);
  }

  closeStatusModal() {
    this.showStatusModal.set(false);
  }

  filteredStatuses(): issuestatus[] {
    const q = this.statusSearch().trim().toLowerCase();
    if (!q) return this.statuses;
    return this.statuses.filter((s) => s.name.toLowerCase().includes(q));
  }

  pickStatus(id: string) {
    this.selectedStatusId.set(id);
  }

  applyStatus(ticketId: string) {
    const id = this.selectedStatusId();
    if (!id) return;
    this.ticketService.ChangeStatus(ticketId, id).subscribe(() => {
      this.currentssueStatus.set(this.statuses.find((s) => s.id === id) || null);
      this.loadstatushistory();
      this.closeStatusModal();
      this.closeStatusAssignModal();
    });
  }

  loadstatushistory() {
    this.ticketService.getStatuses(this.ticket!.id).subscribe((data) => {
      this.statusHistory = data;
      this.currentssueStatus.set(this.statusHistory.at(-1)?.response || null);
    });
  }

  toggleStatusHistory() {
    this.showStatusHistory = !this.showStatusHistory;
    if (this.showStatusHistory) this.loadstatushistory();
  }

  openStatusHistoryModal() {
    this.showStatusHistoryModal.set(true);
    this.loadstatushistory();
  }

  closeStatusHistoryModal() {
    this.showStatusHistoryModal.set(false);
  }

  getRelatedSubModuleAnswer(id: string) {
    this.ticketService.getRelatedSubModuleAnswer(id).subscribe((data) => {
      this.relatedSubModuleAnswer = data;
    });
  }

  /** Load all systems, their modules, and all submodules to resolve IDs from `ticket.subModuleId` / answer. */
  private loadTicketHierarchyLookups(): void {
    this.subModuleService.getAll().pipe(catchError(() => of([] as SubModule[]))).subscribe((subs) => {
      this.hierarchySubModules = subs ?? [];
    });
    this.systemservice.getAllSystems().subscribe((systems) => {
      this.hierarchySystems = systems ?? [];
      if (!this.hierarchySystems.length) {
        this.hierarchyModules = [];
        return;
      }
      forkJoin(
        this.hierarchySystems.map((s) =>
          this.systemservice.getSystemModules(s.id).pipe(catchError(() => of([] as Module[]))),
        ),
      ).subscribe((modulesArray) => {
        this.hierarchyModules = (modulesArray ?? []).flat();
      });
    });
  }

  /**
   * Resolved system → module → submodule for the ticket, using API answer when present
   * and hierarchy lookups (submodule → module → system) as fallback.
   */
  ticketHierarchyContext(): {
    systemId: string;
    systemName: string;
    moduleId: string;
    moduleName: string;
    subModuleId: string;
    subModuleName: string;
  } | null {
    const subId = (
      this.relatedSubModuleAnswer?.relatedSubModuleId ??
      this.ticket?.subModuleId ??
      ''
    ).trim();
    if (!subId) return null;

    const ans = this.relatedSubModuleAnswer;
    let systemId = (ans?.systemId ?? '').trim();
    let moduleId = (ans?.moduleId ?? '').trim();
    let systemName = (ans?.systemName ?? '').trim();
    let moduleName = (ans?.moduleName ?? '').trim();
    let subModuleName = (ans?.relatedSubModule?.name ?? '').trim();

    const sub = this.hierarchySubModules.find((s) => s.id === subId);
    if (sub) {
      subModuleName = subModuleName || sub.name;
      if (!moduleId) moduleId = (sub.moduleId ?? '').trim();
    }

    const mod = moduleId ? this.hierarchyModules.find((m) => m.id === moduleId) : undefined;
    if (mod) {
      moduleName = moduleName || mod.name;
      if (!systemId) systemId = (mod.systemId ?? '').trim();
    }

    const sys = systemId ? this.hierarchySystems.find((s) => s.id === systemId) : undefined;
    if (sys) systemName = systemName || sys.name;

    return {
      systemId: systemId || '—',
      systemName: systemName || '—',
      moduleId: moduleId || '—',
      moduleName: moduleName || '—',
      subModuleId: subId,
      subModuleName: subModuleName || '—',
    };
  }

  getPriorityLabel(priority: number | undefined): string {
    const labels: Record<number, string> = {
      [IssuePriority.Low]: 'Low',
      [IssuePriority.Meduim]: 'Medium',
      [IssuePriority.High]: 'High',
      [IssuePriority.Critical]: 'Critical',
    };
    return labels[priority ?? -1] ?? '—';
  }

  splitTicketOriginId(): string | null {
    return this.ticket?.originalTicketId ?? null;
  }

  getAnswerDisplay(answer: AnswerResponse): string {
    switch (answer.questionType) {
      case TypeOfQuestion.Text:
        return answer.textAnswer?.trim() || '—';
      case TypeOfQuestion.DateTime:
        const date = answer.dateAnswer ? new Date(answer.dateAnswer) : null;
        return date && !isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
      default:
        return answer.answeredOptions?.join(', ') || '—';
    }
  }

  getUserDisplay(user: userresponseviewDTO): string {
    return user.employeeName ? `${user.employeeName} (${user.userName})` : user.userName || user.userId || '—';
  }

  openAssignModal() {
    this.agentSearch.set('');
    this.showAssignModal.set(true);
  }

  closeAssignModal() {
    this.showAssignModal.set(false);
  }

  filteredAgents(): UserResponseDTO[] {
    const q = this.agentSearch().trim().toLowerCase();
    const agents = this.systemAgents();
    if (!q) return agents;
    return agents.filter((a) => {
      const num = String(a.employeeNumber ?? '').toLowerCase();
      const name = (a.userName ?? '').toLowerCase();
      const email = (a.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || num.includes(q);
    });
  }

  pickAgent(id: string) {
    this.selectedUserId.set(id);
  }

  applyAssign(ticketId: string) {
    const id = this.selectedUserId();
    if (!id) return;
    this.ticketService.Reassign(ticketId, id).subscribe((assignHistory) => {
      this.currentAssignHistory.set(assignHistory);
      this.loadAssignHistoriess();
      this.closeAssignModal();
      this.closeStatusAssignModal();
    });
  }

  openAssignHistoryModal() {
    this.showAssignHistoryModal.set(true);
    this.loadAssignHistoriess();
  }

  closeAssignHistoryModal() {
    this.showAssignHistoryModal.set(false);
  }

  canReply(): boolean {
    const uid = this.currentuserId();
    if (!uid) return false;
    const isCreator = this.ticket?.userId === uid;
    const isAssigned = this.currentAssignHistory()?.userId === uid;
    return isCreator || isAssigned;
  }

  isCurrentAssigned():boolean{
    const uid = this.currentuserId();
    if (!uid) return false;
    const isAssigned = this.currentAssignHistory()?.userId === uid;
    return isAssigned;
  }
  loadReplies(id: string, keepScroll = false) {
    this.ticketService.getReplies(id).subscribe((data) => {
      this.replies = Array.isArray(data) ? data : [];
      if (!keepScroll) this.visibleReplyCount.set(this.REPLY_PAGE);
    });
  }

  isMyReply(reply: Reply): boolean {
    return reply.userId === this.currentuserId();
  }

  onReplyAttachmentChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.replyAttachments = [...this.replyAttachments, ...Array.from(input.files)];
      input.value = '';
    }
  }

  onReplyPictureChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.replyPictures = [...this.replyPictures, ...Array.from(input.files)];
      input.value = '';
    }
  }

  removeReplyAttachment(index: number) {
    this.replyAttachments.splice(index, 1);
  }

  removeReplyPicture(index: number) {
    this.replyPictures.splice(index, 1);
  }

  getFileName(path: string): string {
    return path.split('/').pop() || path.split('\\').pop() || path;
  }

  isStandaloneLink(text: string | null | undefined): boolean {
    const value = this.untagArticleLink((text ?? '').trim());
    if (!value) return false;
    return /^(https?:\/\/|www\.)\S+$/i.test(value);
  }

  asHref(text: string | null | undefined): string {
    const value = this.untagArticleLink((text ?? '').trim());
    if (!value) return '';
    if (/^www\./i.test(value)) return `https://${value}`;
    return value;
  }

  linkLabel(text: string | null | undefined): string {
    return this.untagArticleLink((text ?? '').trim());
  }

  extractTaggedArticleLink(text: string | null | undefined): { before: string; link: string; after: string } | null {
    const raw = text ?? '';
    const idx = raw.indexOf(this.articleLinkTag);
    if (idx < 0) return null;

    const before = raw.slice(0, idx).trim();
    const afterTag = raw.slice(idx + this.articleLinkTag.length).trimStart();
    const match = afterTag.match(/^\S+/);
    if (!match) return null;

    const link = this.untagArticleLink(match[0]);
    if (!/^(https?:\/\/|www\.)\S+$/i.test(link)) return null;

    const after = afterTag.slice(match[0].length).trim();
    return { before, link, after };
  }

  private untagArticleLink(value: string): string {
    return value.startsWith(this.articleLinkTag)
      ? value.slice(this.articleLinkTag.length).trim()
      : value;
  }

  sendReply() {
    if (!this.replyText.trim() || !this.ticket) return;
    this.isSendingReply = true;
    const req: CreateReplyRequest = {
      ticketId: this.ticket.id,
      description: this.replyText.trim(),
      attachments: this.replyAttachments,
      pictures: this.replyPictures,
      to: [...this.replyTo],
      cCs: [...this.replyCCs],
    };
    this.ticketService.CreateReplies(req).subscribe({
      next: () => {
        this.replyText = '';
        this.replyAttachments = [];
        this.replyPictures = [];
        this.loadReplies(this.ticket!.id, true);
      },
      error: () => { this.isSendingReply = false; },
      complete: () => { this.isSendingReply = false; },
    });
  }
}