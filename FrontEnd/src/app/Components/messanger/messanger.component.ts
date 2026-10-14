import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ticketService } from '../../Services/ticket.service';
import { messangermsg } from '../../Interfaces/ticket';
import { ProjectService } from '../../Services/project.service';
import { TicketChatService, ChatMessage } from '../../Services/TicketChat.service';
import { TaskChatService } from '../../Services/TaskChat.service';
import { ProjectChatService } from '../../Services/ProjectChat.service';
import { UserChatService } from '../../Services/userchat.service';
import { TasksService } from '../../Services/tasks.service';
import { AuthService, BasicUserDataResponse } from '../../Services/auth.service';
import { TicketChatComponentComponent } from '../ticket-chat-component/ticket-chat-component.component';
import { TaskChatComponentComponent } from '../task-chat-component/task-chat-component.component';
import { ProjectChatComponentComponent } from '../project-chat-component/project-chat-component.component';
import { UserChatComponentComponent } from '../user-chat-component/user-chat-component.component';
import { Environment } from '../../base/environment';

// ── Local conversation item ────────────────────────────────────────────────

/** Enriched view model for a single ticket conversation row. */
interface ConvItem {
  ticketId:            string;
  contactedUserName:   string;
  contactedUserPicture: string | null;
  contactedUserId: string;
  /** Preview text of the last message. */
  lastText:   string;
  lastDate:   Date;
  isSeen:     boolean;
  /** userId who sent the last message — compared against currentUserId for direction. */
  senderUserId: string;
}

/** Enriched view model for a single project conversation row. */
interface ProjectConvItem {
  projectId: string;
  contactedUserName: string;
  contactedUserPicture: string | null;
  lastText: string;
  lastDate: Date;
  isSeen: boolean;
  senderUserId: string;
}

/** Same `messangermsg` DTO as tickets; `ticketId` is the task id from `Tasks/MyMessanger`. */
interface TaskConvItem {
  taskId: string;
  contactedUserName: string;
  contactedUserPicture: string | null;
  lastText: string;
  lastDate: Date;
  isSeen: boolean;
  senderUserId: string;
}

/** Direct messages from `Auth/MyMessanger`; peer is `contactedUserId`. */
interface UserConvItem {
  otherUserId: string;
  contactedUserName: string;
  contactedUserPicture: string | null;
  lastText: string;
  lastDate: Date;
  isSeen: boolean;
  senderUserId: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-messanger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TicketChatComponentComponent,
    TaskChatComponentComponent,
    ProjectChatComponentComponent,
    UserChatComponentComponent,
  ],
  templateUrl: './messanger.component.html',
  styleUrl: './messanger.component.css',
})
export class MessangerComponent implements OnInit, OnDestroy {
  private static nextInstanceId = 1;
  private readonly instanceId = MessangerComponent.nextInstanceId++;

  activeTab = signal<'tickets' | 'direct' | 'tasks' | 'projects'>('tickets');

  conversations: ConvItem[] = [];
  selected      = signal<ConvItem | null>(null);
  isLoading     = signal(true);
  error         = signal<string | null>(null);

  taskConversations: TaskConvItem[] = [];
  selectedTask         = signal<TaskConvItem | null>(null);
  isLoadingTasks       = signal(true);
  errorTasks           = signal<string | null>(null);

  projectConversations: ProjectConvItem[] = [];
  selectedProject      = signal<ProjectConvItem | null>(null);
  isLoadingProjects    = signal(true);
  errorProjects        = signal<string | null>(null);

  userConversations: UserConvItem[] = [];
  selectedUser         = signal<UserConvItem | null>(null);
  isLoadingUsers       = signal(true);
  errorUsers           = signal<string | null>(null);

  pickUsers = signal<BasicUserDataResponse[]>([]);
  /** Search text inside the “choose user” modal. */
  pickUserSearch = '';
  pickUserModalOpen = signal(false);
  pickUsersLoaded = false;
  pickUsersPage = 1;
  pickUsersHasMore = signal(false);
  pickUsersTotal = signal(0);
  directoryLoading = signal(false);
  directoryError = signal<string | null>(null);

  currentUserId = '';

  private msgSub?:  Subscription;
  private seenSub?: Subscription;
  private taskMsgSub?: Subscription;
  private taskSeenSub?: Subscription;
  private projectMsgSub?:  Subscription;
  private projectSeenSub?: Subscription;
  private userMsgSub?: Subscription;
  private userSeenSub?: Subscription;
  private pickUsersSearchDebounce?: ReturnType<typeof setTimeout>;

  constructor(
    private ticketSvc: ticketService,
    private projectSvc: ProjectService,
    private chatSvc:   TicketChatService,
    private taskChatSvc: TaskChatService,
    private tasksSvc: TasksService,
    private projectChatSvc: ProjectChatService,
    private userChatSvc: UserChatService,
    private authSvc:   AuthService,
    private router:    Router,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────
 isAdminOrModerator=signal<boolean>(false);
  ngOnInit(): void {
    this.debug('ngOnInit', { route: this.router.url });
    this.currentUserId = this.authSvc.getUserId() ?? '';

    this.isAdminOrModerator.set(this.authSvc.isAdmin() || this.authSvc.isModerator());
    
    this.debug('request ticket MyMessanger');
    this.ticketSvc.MyMessanger().subscribe({
      next: msgs => {
        this.debug('request ticket MyMessanger resolved', { count: msgs.length });
        this.conversations = this.toConvItems(msgs);
        this.isLoading.set(false);
        this.connectAndListen();
      },
      error: () => {
        this.debug('request ticket MyMessanger failed');
        this.error.set('Could not load messages.');
        this.isLoading.set(false);
      },
    });

    this.debug('request direct MyMessanger');
    this.authSvc.MyMessanger().subscribe({
      next: msgs => {
        this.debug('request direct MyMessanger resolved', { count: msgs.length });
        this.userConversations = this.toUserConvItems(msgs);
        this.isLoadingUsers.set(false);
        this.connectAndListenUsers();
      },
      error: () => {
        this.debug('request direct MyMessanger failed');
        this.errorUsers.set('Could not load direct messages.');
        this.isLoadingUsers.set(false);
      },
    });

    if(this.isAdminOrModerator()){
    this.debug('request task myMessanger');
    this.tasksSvc.myMessanger().subscribe({
      next: msgs => {
        this.debug('request task myMessanger resolved', { count: msgs.length });
        this.taskConversations = this.toTaskConvItems(msgs);
        this.isLoadingTasks.set(false);
        this.connectAndListenTasks();
      },
      error: () => {
        this.debug('request task myMessanger failed');
        this.errorTasks.set('Could not load task messages.');
        this.isLoadingTasks.set(false);
      },
    });

    this.debug('request project myMessenger');
    this.projectSvc.myMessenger().subscribe({
      next: msgs => {
        this.debug('request project myMessenger resolved', { count: msgs.length });
        this.projectConversations = this.toProjectConvItems(msgs);
        this.isLoadingProjects.set(false);
        this.connectAndListenProjects();
      },
      error: () => {
        this.debug('request project myMessenger failed');
        this.errorProjects.set('Could not load project messages.');
        this.isLoadingProjects.set(false);
      },
    });
  }
  }

  ngOnDestroy(): void {
    this.debug('ngOnDestroy');
    this.msgSub?.unsubscribe();
    this.seenSub?.unsubscribe();
    this.taskMsgSub?.unsubscribe();
    this.taskSeenSub?.unsubscribe();
    this.projectMsgSub?.unsubscribe();
    this.projectSeenSub?.unsubscribe();
    this.userMsgSub?.unsubscribe();
    this.userSeenSub?.unsubscribe();
    if (this.pickUsersSearchDebounce) {
      clearTimeout(this.pickUsersSearchDebounce);
      this.pickUsersSearchDebounce = undefined;
    }
  }

  // ── SignalR ────────────────────────────────────────────────────────────────

  private connectAndListen(): void {
    this.debug('connectAndListen ticket start', { conversations: this.conversations.length });
    this.chatSvc.startConnection().then(() => {
      this.debug('connectAndListen ticket connected');
      // Join every ticket room so we receive real-time messages for all of them
      this.conversations.forEach(c => this.chatSvc.joinTicket(c.ticketId));

      // Listen for any incoming message across all tickets
      this.msgSub = this.chatSvc.onAnyMessage().subscribe({
        next: ({ ticketId, message }) => {
          try {
            this.handleIncoming(ticketId, message);
          } catch (e) {
            console.error('[Messenger] msgSub handler error:', e);
          }
        },
        error: (e) => console.error('[Messenger] msgSub stream error:', e),
      });

      // Listen for seen updates — mark the conversation row as read
      this.seenSub = this.chatSvc.onSeenUpdate().subscribe({
        next: ({ ticketId }) => {
          try {
            const conv = this.conversations.find(c => c.ticketId === ticketId);
            if (conv) {
              conv.isSeen = true;
              this.conversations = [...this.conversations];
            }
          } catch (e) {
            console.error('[Messenger] seenSub handler error:', e);
          }
        },
        error: (e) => console.error('[Messenger] seenSub stream error:', e),
      });
    }).catch((error) => {
      this.debug('connectAndListen ticket failed', error);
      // Hub unavailable — list is still functional, just no live updates
    });
  }

  private connectAndListenTasks(): void {
    this.debug('connectAndListen task start', { conversations: this.taskConversations.length });
    this.taskChatSvc.startConnection().then(() => {
      this.debug('connectAndListen task connected');
      this.taskConversations.forEach(c => this.taskChatSvc.joinTask(c.taskId));

      this.taskMsgSub = this.taskChatSvc.onAnyMessage().subscribe({
        next: ({ TaskId, message }) => {
          try {
            this.handleIncomingTask(TaskId, message);
          } catch (e) {
            console.error('[Messenger] taskMsgSub handler error:', e);
          }
        },
        error: (e) => console.error('[Messenger] taskMsgSub stream error:', e),
      });

      this.taskSeenSub = this.taskChatSvc.onSeenUpdate().subscribe({
        next: ({ TaskId }) => {
          try {
            const conv = this.taskConversations.find(c => c.taskId === TaskId);
            if (conv) {
              conv.isSeen = true;
              this.taskConversations = [...this.taskConversations];
            }
          } catch (e) {
            console.error('[Messenger] taskSeenSub handler error:', e);
          }
        },
        error: (e) => console.error('[Messenger] taskSeenSub stream error:', e),
      });
    }).catch((error) => {
      this.debug('connectAndListen task failed', error);
      // Hub unavailable — list is still functional, just no live updates
    });
  }

  private connectAndListenProjects(): void {
    this.debug('connectAndListen project start', { conversations: this.projectConversations.length });
    this.projectChatSvc.startConnection().then(() => {
      this.debug('connectAndListen project connected');
      this.projectConversations.forEach(c => this.projectChatSvc.joinProject(c.projectId));

      this.projectMsgSub = this.projectChatSvc.onAnyMessage().subscribe({
        next: ({ ProjectId, message }) => {
          try {
            this.handleIncomingProject(ProjectId, message);
          } catch (e) {
            console.error('[Messenger] projectMsgSub handler error:', e);
          }
        },
        error: (e) => console.error('[Messenger] projectMsgSub stream error:', e),
      });

      this.projectSeenSub = this.projectChatSvc.onSeenUpdate().subscribe({
        next: ({ ProjectId }) => {
          try {
            const conv = this.projectConversations.find(c => c.projectId === ProjectId);
            if (conv) {
              conv.isSeen = true;
              this.projectConversations = [...this.projectConversations];
            }
          } catch (e) {
            console.error('[Messenger] projectSeenSub handler error:', e);
          }
        },
        error: (e) => console.error('[Messenger] projectSeenSub stream error:', e),
      });
    }).catch((error) => {
      this.debug('connectAndListen project failed', error);
      // Hub unavailable — list is still functional, just no live updates
    });
  }

  private connectAndListenUsers(): void {
    this.debug('connectAndListen user start', { conversations: this.userConversations.length });
    this.userChatSvc.startConnection().then(() => {
      this.debug('connectAndListen user connected');
      this.userMsgSub = this.userChatSvc.onAnyMessage().subscribe({
        next: ({ userId, message }) => {
          try {
            this.handleIncomingUser(userId, message);
          } catch (e) {
            console.error('[Messenger] userMsgSub handler error:', e);
          }
        },
        error: e => console.error('[Messenger] userMsgSub stream error:', e),
      });

      this.userSeenSub = this.userChatSvc.onSeenUpdate().subscribe({
        next: ({ userId }) => {
          try {
            const conv = this.userConversations.find(c => this.dmPeerKey(c.otherUserId) === userId);
            if (conv) {
              conv.isSeen = true;
              this.userConversations = [...this.userConversations];
            }
          } catch (e) {
            console.error('[Messenger] userSeenSub handler error:', e);
          }
        },
        error: e => console.error('[Messenger] userSeenSub stream error:', e),
      });
    }).catch((error) => {
      this.debug('connectAndListen user failed', error);
    });
  }

  private debug(message: string, data?: unknown): void {
    if (data === undefined) {
      console.log(`[Messenger#${this.instanceId}] ${message}`);
      return;
    }
    console.log(`[Messenger#${this.instanceId}] ${message}`, data);
  }

  private handleIncoming(ticketId: string, msg: ChatMessage): void {
    const existing = this.conversations.find(c => c.ticketId === ticketId);
    if (!existing) return;
  
    const isFromMe = msg.userId === this.currentUserId;
    const isActive = this.selected()?.ticketId === ticketId;
  
    const updated: ConvItem = {
      ...existing,
      lastText: this.messagePreview(msg),
      lastDate: new Date(msg.date),
      isSeen: isFromMe || isActive, // 🔥 FIX
      senderUserId: msg.userId,
    };
  
    this.conversations = [
      updated,
      ...this.conversations.filter(c => c.ticketId !== ticketId),
    ];
  }

  private handleIncomingTask(taskId: string, msg: ChatMessage): void {
    const existing = this.taskConversations.find(c => c.taskId === taskId);
    if (!existing) return;

    const isFromMe = msg.userId === this.currentUserId;
    const isActive = this.selectedTask()?.taskId === taskId;

    const updated: TaskConvItem = {
      ...existing,
      lastText: this.messagePreview(msg),
      lastDate: new Date(msg.date),
      isSeen: isFromMe || isActive,
      senderUserId: msg.userId,
    };

    this.taskConversations = [updated, ...this.taskConversations.filter(c => c.taskId !== taskId)];
  }

  private handleIncomingProject(projectId: string, msg: ChatMessage): void {
    const existing = this.projectConversations.find(c => c.projectId === projectId);
    if (!existing) return;

    const isFromMe = msg.userId === this.currentUserId;
    const isActive = this.selectedProject()?.projectId === projectId;

    const updated: ProjectConvItem = {
      ...existing,
      lastText: this.messagePreview(msg),
      lastDate: new Date(msg.date),
      isSeen: isFromMe || isActive,
      senderUserId: msg.userId,
    };

    this.projectConversations = [
      updated,
      ...this.projectConversations.filter(c => c.projectId !== projectId),
    ];
  }

  private handleIncomingUser(peerId: string, msg: ChatMessage): void {
    if (!peerId) return;

    const isFromMe = this.dmPeerKey(msg.userId) === this.dmPeerKey(this.currentUserId);
    const isActive = this.dmPeerKey(this.selectedUser()?.otherUserId) === peerId;
    const existing = this.userConversations.find(c => this.dmPeerKey(c.otherUserId) === peerId);

    if (!existing) {
      const newConv: UserConvItem = {
        otherUserId: peerId,
        contactedUserName: this.displayNameForUserPeer(peerId, msg, isFromMe),
        contactedUserPicture: this.pictureForUserPeer(peerId, msg, isFromMe),
        lastText: this.messagePreview(msg),
        lastDate: new Date(msg.date),
        isSeen: isFromMe || isActive,
        senderUserId: msg.userId,
      };
      this.userConversations = [newConv, ...this.userConversations];
      return;
    }

    const updated: UserConvItem = {
      ...existing,
      lastText: this.messagePreview(msg),
      lastDate: new Date(msg.date),
      isSeen: isFromMe || isActive,
      senderUserId: msg.userId,
    };

    this.userConversations = [
      updated,
      ...this.userConversations.filter(c => this.dmPeerKey(c.otherUserId) !== peerId),
    ];
  }

  private displayNameForUserPeer(peerId: string, msg: ChatMessage, fromMe: boolean): string {
    if (!fromMe) {
      const n = (msg.userName || '').trim();
      return n || 'User';
    }
    for (const e of this.pickUsers()) {
      if (this.dmPeerKey(e.userId) === peerId) {
        return (e.employeeName || e.userName || '').trim() || peerId;
      }
    }
    return 'Direct message';
  }

  private pictureForUserPeer(peerId: string, msg: ChatMessage, fromMe: boolean): string | null {
    if (!fromMe && msg.userPicture) return msg.userPicture;
    return null;
  }

  // ── User actions ───────────────────────────────────────────────────────────

  setTab(tab: 'tickets' | 'direct' | 'tasks' | 'projects'): void {
    this.activeTab.set(tab);
  }

  select(conv: ConvItem): void {
    if (this.selected()?.ticketId === conv.ticketId) return; // already open

    // Optimistically mark as seen in the list as soon as the user opens it
    if (!conv.isSeen) {
      conv.isSeen = true;
      this.conversations = [...this.conversations];
    }

    // Destroy the current chat component first so Angular fully recreates it
    // with the new ticketId (ngOnInit reruns, new hub subscription, fresh state).
    this.selected.set(null);
    setTimeout(() => this.selected.set(conv));
  }

  goToDetails(): void {
    const conv = this.selected();
    if (conv) this.router.navigate(['/ticketdetails', conv.ticketId]);
  }

  selectTask(conv: TaskConvItem): void {
    if (this.selectedTask()?.taskId === conv.taskId) return;

    if (!conv.isSeen) {
      conv.isSeen = true;
      this.taskConversations = [...this.taskConversations];
    }

    this.selectedTask.set(null);
    setTimeout(() => this.selectedTask.set(conv));
  }

  goToTaskDetails(): void {
    const conv = this.selectedTask();
    if (conv) this.router.navigate(['/taskdetails', conv.taskId]);
  }

  selectProject(conv: ProjectConvItem): void {
    if (this.selectedProject()?.projectId === conv.projectId) return;

    if (!conv.isSeen) {
      conv.isSeen = true;
      this.projectConversations = [...this.projectConversations];
    }

    this.selectedProject.set(null);
    setTimeout(() => this.selectedProject.set(conv));
  }

  goToProjectDetails(): void {
    const conv = this.selectedProject();
    if (conv) this.router.navigate(['/projectdetails', conv.projectId]);
  }

  selectUser(conv: UserConvItem): void {
    const cur = this.selectedUser();
    // Only skip when we already have a real selection for the same peer — not when both ids are missing
    // (`undefined === undefined` was true and blocked opening the chat forever).
    if (
      cur !== null &&
      conv.otherUserId !== '' &&
      this.dmPeerKey(cur.otherUserId) === this.dmPeerKey(conv.otherUserId)
    ) {
      return;
    }

    if (!conv.isSeen) {
      conv.isSeen = true;
      this.userConversations = [...this.userConversations];
    }

    this.selectedUser.set(null);
    setTimeout(() => this.selectedUser.set(conv));
  }

  loadPickUsers(filter = '', page = 1, append = false): void {
    this.directoryLoading.set(true);
    this.directoryError.set(null);

    this.authSvc.getCompleteUsersBasicData({
      filter,
      page,
      departmentIDS: null,
    }).subscribe({
      next: (res) => {
        const me = this.currentUserId;
        const incoming = (res?.data ?? []).filter(
          r => !!r.userId && this.dmPeerKey(r.userId) !== this.dmPeerKey(me)
        );
        if (append) {
          const merged = [...this.pickUsers(), ...incoming];
          const dedup = new Map<string, BasicUserDataResponse>();
          for (const row of merged) dedup.set(this.dmPeerKey(row.userId), row);
          this.pickUsers.set(Array.from(dedup.values()));
        } else {
          this.pickUsers.set(incoming);
        }
        this.pickUsersPage = res?.page ?? page;
        this.pickUsersTotal.set(res?.filteredCount ?? this.pickUsers().length);
        const pageSize = res?.pageSize ?? incoming.length;
        const loadedCount = this.pickUsers().length;
        this.pickUsersHasMore.set(pageSize > 0 && loadedCount < this.pickUsersTotal());
        this.pickUsersLoaded = true;
        this.directoryLoading.set(false);
      },
      error: () => {
        this.directoryError.set('Could not load employees.');
        this.directoryLoading.set(false);
      },
    });
  }

  get modalFilteredEmployees(): BasicUserDataResponse[] {
    return this.pickUsers();
  }

  openPickUserModal(): void {
    this.pickUserModalOpen.set(true);
    this.pickUserSearch = '';
  
    if (this.pickUsers().length === 0 && !this.directoryLoading()) {
      this.loadPickUsers('', 1, false);
    }
  }

  closePickUserModal(): void {
    this.pickUserModalOpen.set(false);
  }

  onPickUserSearchInput(value: string): void {
    this.pickUserSearch = value;
    if (this.pickUsersSearchDebounce) {
      clearTimeout(this.pickUsersSearchDebounce);
    }
    this.pickUsersSearchDebounce = setTimeout(() => {
      this.loadPickUsers(this.pickUserSearch.trim(), 1, false);
    }, 300);
  }

  loadMorePickUsers(): void {
    if (this.directoryLoading() || !this.pickUsersHasMore()) return;
    this.loadPickUsers(this.pickUserSearch.trim(), this.pickUsersPage + 1, true);
  }

  pickEmployeeFromModal(emp: BasicUserDataResponse): void {
    this.startChatWithEmployee(emp);
    this.closePickUserModal();
  }

  employeePictureUrl(_emp: BasicUserDataResponse): string | null {
    return null;
  }

  startChatWithEmployee(emp: BasicUserDataResponse): void {
    const pid = emp.userId?.trim();
    if (!pid) {
      console.error('[Messenger] Cannot open chat: employee has no user id in API response.');
      return;
    }
    const existing = this.userConversations.find(c => this.dmPeerKey(c.otherUserId) === this.dmPeerKey(pid));
    if (existing) {
      this.selectUser(existing);
      return;
    }
    const synthetic: UserConvItem = {
      otherUserId: this.dmPeerKey(pid),
      contactedUserName: emp.employeeName || emp.userName,
      contactedUserPicture: null,
      lastText: '',
      lastDate: new Date(),
      isSeen: true,
      senderUserId: this.currentUserId,
    };
    this.userConversations = [synthetic, ...this.userConversations];
    this.selectUser(synthetic);
  }

  // ── Template helpers ───────────────────────────────────────────────────────

  get unreadCount(): number {
    // Only count as unread if the OTHER person sent the last message and I haven't seen it
    return this.conversations.filter(c => !c.isSeen && !this.isFromMe(c)).length;
  }

  get unreadTaskCount(): number {
    return this.taskConversations.filter(c => !c.isSeen && !this.isFromMeTask(c)).length;
  }

  get unreadProjectCount(): number {
    return this.projectConversations.filter(c => !c.isSeen && !this.isFromMeProject(c)).length;
  }

  get unreadUserCount(): number {
    return this.userConversations.filter(c => !c.isSeen && !this.isFromMeUser(c)).length;
  }

  /** Unread badge for the sidebar header — matches the active tab. */
  get sidebarUnreadCount(): number {
    const tab = this.activeTab();
    if (tab === 'projects') return this.unreadProjectCount;
    if (tab === 'tasks') return this.unreadTaskCount;
    if (tab === 'direct') return this.unreadUserCount;
    return this.unreadCount;
  }

  isFromMe(conv: ConvItem): boolean {
    return !!this.currentUserId && conv.senderUserId === this.currentUserId;
  }

  isFromMeTask(conv: TaskConvItem): boolean {
    return !!this.currentUserId && conv.senderUserId === this.currentUserId;
  }

  isFromMeProject(conv: ProjectConvItem): boolean {
    return !!this.currentUserId && conv.senderUserId === this.currentUserId;
  }

  isFromMeUser(conv: UserConvItem): boolean {
    return !!this.currentUserId && conv.senderUserId === this.currentUserId;
  }

  initial(name: string): string {
    return (name ?? '?').trim().charAt(0).toUpperCase();
  }

  formatTime(date: Date | string): string {
    const d       = new Date(date);
    const now     = new Date();
    const diffMs  = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1)  return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)   return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7)    return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  preview(text: string): string {
    if (!text) return '';
    return text.length > 42 ? text.slice(0, 42) + '…' : text;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private toConvItems(msgs: messangermsg[]): ConvItem[] {
    return [...msgs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(m => ({
        ticketId:            m.ticketId,
        contactedUserName:   m.contactedUserName,
        contactedUserPicture: m.contactedUserPicture,
        contactedUserId:     m.contactedUserId,
        lastText:            m.text,
        lastDate:            new Date(m.date),
        isSeen:              m.isSeen,
        senderUserId:        m.userId,
      }));
  }
 

  /** Same DTO as tickets (`messangermsg`); `ticketId` is the task id for this endpoint. */
  private toTaskConvItems(msgs: messangermsg[]): TaskConvItem[] {
    return [...msgs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(m => ({
        taskId: m.ticketId,
        contactedUserName: m.contactedUserName,
        contactedUserPicture: m.contactedUserPicture,
        lastText: m.text,
        lastDate: new Date(m.date),
        isSeen: m.isSeen,
        senderUserId: m.userId,
      }));
  }

  /** Same DTO as tickets (`messangermsg`); `ticketId` is the project id for this endpoint. */
  private toProjectConvItems(msgs: messangermsg[]): ProjectConvItem[] {
    return [...msgs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(m => ({
        projectId: m.ticketId,
        contactedUserName: m.contactedUserName,
        contactedUserPicture: m.contactedUserPicture,
        lastText: m.text,
        lastDate: new Date(m.date),
        isSeen: m.isSeen,
        senderUserId: m.userId,
      }));
  }

  private toUserConvItems(msgs: messangermsg[]): UserConvItem[] {
    return [...msgs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(m => ({
        otherUserId: this.dmPeerKey(this.peerIdFromMessengerRow(m)),
        contactedUserName: m.contactedUserName,
        contactedUserPicture: m.contactedUserPicture,
        lastText: m.text,
        lastDate: new Date(m.date),
        isSeen: m.isSeen,
        senderUserId: this.senderIdFromMessengerRow(m),
      }));
  }

  /** Same normalization as UserChatService peer keys (JWT vs SQL user id casing). */
  private dmPeerKey(id: string | null | undefined): string {
    if (id == null || id === '') return '';
    return String(id).trim().toLowerCase();
  }

  private peerIdFromMessengerRow(m: messangermsg): string {
    const a = m as unknown as Record<string, unknown>;
    const contacted =
      m.contactedUserId ?? (a['ContactedUserId'] as string | undefined | null);
    const ticket = m.ticketId ?? (a['TicketId'] as string | undefined | null);
    const raw = contacted ?? ticket ?? '';
    return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
  }

  private senderIdFromMessengerRow(m: messangermsg): string {
    const a = m as unknown as Record<string, unknown>;
    const v = m.userId ?? a['UserId'];
    return v != null ? String(v) : '';
  }

  /** Build a short preview string from a ChatMessage (handles media types). */
  private messagePreview(msg: ChatMessage): string {
    const parts: string[] = [];
    if (msg.text?.trim())          parts.push(msg.text.trim());
    if (msg.pictures?.length)      parts.push(`📷 ${msg.pictures.length > 1 ? msg.pictures.length + ' photos' : 'Photo'}`);
    if (msg.attachments?.length)   parts.push(`📎 ${msg.attachments.length > 1 ? msg.attachments.length + ' files' : 'File'}`);
    if (msg.voiceRecords?.length)  parts.push('🎤 Voice message');
    return parts.join(' · ') || '';
  }
  getpicurl(picture:string): string {
    return `${Environment.baseUrl}Files/${picture}`;
  }
}
