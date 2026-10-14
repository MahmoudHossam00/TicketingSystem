import { Component, inject, OnInit, OnDestroy, signal, HostListener, ElementRef, ViewChild, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../Services/auth.service';
import { Subscription, catchError, finalize, of, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
// import { ticketService } from '../../Services/ticket.service';
// import { ProjectService } from '../../Services/project.service';
// import { TasksService } from '../../Services/tasks.service';
// import { TicketChatService, ChatMessage } from '../../Services/TicketChat.service';
// import { ProjectChatService } from '../../Services/ProjectChat.service';
// import { TaskChatService } from '../../Services/TaskChat.service';
// import { UserChatService } from '../../Services/userchat.service';
// import { messangermsg } from '../../Interfaces/ticket';
import { NotificationsService } from '../../Services/notifications.service';
import { NotificationSignalRService } from '../../Services/notification-signalr.service';
import { NotificationResponse, NotificationType } from '../../Interfaces/notification';
import { BrowserNotificationService } from '../../Services/browser-notification.service';

interface NavItem { path: string; label: string; icon: string; requiresAdminOrMaster?: boolean; }

interface NavGroupItem {
  path: string;
  label: string;
  icon: string;
  adminOnly: boolean;
  masterOnly?: boolean;
  /** If true, only ADMIN (not MASTER-only) users see the link. */
  strictAdminOnly?: boolean;
}
interface NavGroup { id: string; label: string; icon: string; adminOnly: boolean; items: NavGroupItem[]; }

interface ComputedNavGroup { id: string; label: string; icon: string; items: NavGroupItem[]; }

// type NavConvKind = 'ticket' | 'project' | 'task';

/** Tracks which rooms we've joined — no seen/sender state needed anymore. */
// interface NavConv {
//   kind: NavConvKind;
//   id: string;
// }

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  private static nextInstanceId = 1;
  private readonly instanceId = NavbarComponent.nextInstanceId++;
  @ViewChild('profileMenuRoot') profileMenuRoot?: ElementRef<HTMLElement>;
  @ViewChild('notificationsMenuRoot') notificationsMenuRoot?: ElementRef<HTMLElement>;

  currentRoute = '';

  authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  unreadCount = signal(0);
  notificationUnreadCount = signal(0);
  notificationPermission = signal<NotificationPermission | 'unsupported'>('default');
  notificationPermissionMessage = signal<string | null>(null);
  desktopNotificationsEnabled = signal(true);
  notificationSoundMuted = signal(false);

  /** Profile picture popover */
  profileMenuOpen = false;
  profilePictureBlobUrl: string | null = null;
  pictureCacheBuster = 0;
  isLoadingProfilePicture = false;
  isUploadingProfilePicture = false;
  profilePictureMessage: string | null = null;
  profilePictureError: string | null = null;
  profileImageLoadFailed = false;
  notificationsMenuOpen = false;

  private currentUserId = '';
  // private convs: NavConv[] = [];
  // private joinedTicketIds: string[] = [];
  // private joinedProjectIds: string[] = [];
  // private joinedTaskIds: string[] = [];

  private userDataSub?: Subscription;
  // private ticketMsgSub?: Subscription;
  // private ticketSeenSub?: Subscription;
  // private projectMsgSub?: Subscription;
  // private projectSeenSub?: Subscription;
  // private taskMsgSub?: Subscription;
  // private taskSeenSub?: Subscription;
  // private userMsgSub?: Subscription;
  // private userSeenSub?: Subscription;
  private notificationsSub?: Subscription;
  private isNotificationHubStarted = false;
  private recentNotifications: NotificationResponse[] = [];

  /** Inline change-password form in profile dropdown */
  showPasswordForm = false;
  pwdOld = '';
  pwdNew = '';
  pwdConfirm = '';
  pwdSubmitting = false;
  pwdError: string | null = null;
  pwdSuccess: string | null = null;

  private readonly groupDefs: NavGroup[] = [
    {
      id: 'admin',
      label: 'Administration',
      icon: 'M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z',
      adminOnly: true,
      items: [
        { path: '/master-data',         label: 'Master Data',           adminOnly: true,  icon: 'M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3A1.5 1.5 0 0 1 15 10.5v3A1.5 1.5 0 0 1 13.5 15h-3A1.5 1.5 0 0 1 9 13.5v-3z' },
        { path: '/employees',           label: 'Employees',             adminOnly: true,  icon: 'M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm14.5-5.5A1.5 1.5 0 0 0 14 7h-3.5a.5.5 0 0 0 0 1H14a.5.5 0 0 1 0 1h-3.5a.5.5 0 0 0 0 1H14a.5.5 0 0 1 0 1h-3.5a.5.5 0 0 0 0 1H14a1.5 1.5 0 0 0 1.5-1.5v-3z' },
        { path: '/account-management',  label: 'Account Management',    adminOnly: true,  icon: 'M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zm14.5-5.5A1.5 1.5 0 0 0 14 7h-3.5a.5.5 0 0 0 0 1H14a.5.5 0 0 1 0 1h-3.5a.5.5 0 0 0 0 1H14a.5.5 0 0 1 0 1h-3.5a.5.5 0 0 0 0 1H14a1.5 1.5 0 0 0 1.5-1.5v-3z' },
        { path: '/admin-alerts',        label: 'Alerts & Newsletters',  adminOnly: true,  icon: 'M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z' },
        { path: '/zen-functions',       label: 'Zen functions',         adminOnly: false, masterOnly: true, icon: 'M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0zM9.796 1.343c-.527-1.79-3.04-1.79-3.568 0l-.177.604A2.25 2.25 0 0 1 5.234 3.393H3.066a.75.75 0 0 0-.548 1.238l1.305 1.305a2.25 2.25 0 0 1-.364 2.598l-.804.804a.75.75 0 0 0 1.06 1.06l.804-.804a2.25 2.25 0 0 1 2.598-.364l1.305 1.305a.75.75 0 0 0 1.238-.548v-2.168a2.25 2.25 0 0 1 1.393-2.056l.604-.177c1.79-.527 1.79-3.04 0-3.568l-.604-.177A2.25 2.25 0 0 1 12.75 3.066V.898a.75.75 0 0 0-1.238-.548l-1.305 1.305a2.25 2.25 0 0 1-2.598-.364l-.804-.804A.75.75 0 0 0 5.234 1.393h2.168z' },
      ],
    },
    {
      id: 'tickets',
      label: 'Tickets',
      icon: 'M2 2a2 2 0 0 0-2 2v1.5h16V4a2 2 0 0 0-2-2H2zm-2 5.5v5A2 2 0 0 0 2 14h12a2 2 0 0 0 2-2v-5H0zm6.5 2h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1zm-4 0h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1 0-1z',
      adminOnly: false,
      items: [
        { path: '/open-ticket',   label: 'Open Ticket',   adminOnly: false, icon: 'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3v-3z' },
        { path: '/all-tickets',   label: 'All Tickets',   adminOnly: false, icon: 'M10.5 8.5a.5.5 0 0 1 0 1H3a.5.5 0 0 1 0-1h7.5zm-7-5A.5.5 0 0 1 4 3h7.5a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5zM3.854 7.146a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708L2 8.293l1.146-1.147a.5.5 0 0 1 .708 0zm0-4a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708L2 4.293l1.146-1.147a.5.5 0 0 1 .708 0zm0 8a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0zM10.5 12.5a.5.5 0 0 1 0 1H3a.5.5 0 0 1 0-1h7.5z' },
        { path: '/kpi-tickets',   label: 'KPI Tickets',   adminOnly: true,  icon: 'M0 0h1v16H0zm1 14.5 3.5-5.5 3 3.5 3-6 3.5 3.5H15V15H1z' },
        { path: '/old-tasks',     label: 'Old tasks (Excel)', adminOnly: false, strictAdminOnly: true, icon: 'M2 1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm0 1v2h12V2H2zm0 3v9h12V5H2zm1 1h2v1H3V6zm0 2h2v1H3V8zm0 2h2v1H3v-1zm0 2h2v1H3v-1zm0 2h2v1H3v-1z' },
      ],
    },
    {
      id: 'projects',
      label: 'Projects & Tasks',
      icon: 'M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 0 6v7zm6.854-5.146l-2 2a.5.5 0 0 1-.708 0l-1-1a.5.5 0 1 1 .708-.708L4.5 8.793l1.646-1.647a.5.5 0 1 1 .708.708zM7 9.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm.5-3.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1zm-3-1a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm0 3a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1z',
      adminOnly: true,
      items: [
        { path: '/projects',   label: 'Projects',   adminOnly: true, icon: 'M2 3.5h4v4H2v-4zm8 0h4v4h-4v-4zM2 10.5h4v4H2v-4zm8 0h4v4h-4v-4z' },
        { path: '/all-tasks',  label: 'All Tasks',  adminOnly: true, icon: 'M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2zm10.854 4.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L5.5 11.293l6.646-6.647a.5.5 0 0 1 .708 0z' },
      ],
    },
    {
      id: 'articles',
      label: 'Articles',
      icon: 'M14 2H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zM4 5.5h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1 0-1zm0 3h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1 0-1zm0 3h5a.5.5 0 0 1 0 1H4a.5.5 0 0 1 0-1z',
      adminOnly: false,
      items: [
        { path: '/articles', label: 'Articles', adminOnly: false, icon: 'M14 2H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zM4 5.5h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1 0-1zm0 3h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1 0-1zm0 3h5a.5.5 0 0 1 0 1H4a.5.5 0 0 1 0-1z' },
      ],
    },
  ];

  private readonly messagesNavItem: NavItem = {
    path: '/messanger',
    label: 'Messages',
    icon: 'M16 8c0 3.866-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.584.296-1.925.864-4.181 1.234-.2.032-.352-.176-.273-.362.354-.836.674-1.95.77-2.966C.744 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7zM5 8a1 1 0 1 0-2 0 1 1 0 0 0 2 0zm4 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    requiresAdminOrMaster: false,
  };

  navGroups = signal<ComputedNavGroup[]>([]);
  navItems = signal<NavItem[]>([]);
  openDropdown: string | null = null;

  constructor(
    private router: Router,
    // private ticketSvc: ticketService,
    // private projectSvc: ProjectService,
    // private tasksSvc: TasksService,
    // private chatSvc: TicketChatService,
    // private projectChatSvc: ProjectChatService,
    // private taskChatSvc: TaskChatService,
    // private userChatSvc: UserChatService,
    private notificationsSvc: NotificationsService,
    private notificationSignalRSvc: NotificationSignalRService,
    private browserNotification: BrowserNotificationService,
  ) {
    this.router.events.subscribe(() => {
      this.currentRoute = this.router.url.split('?')[0];
    });
  }

  ngOnInit(): void {
    this.debug('ngOnInit', { route: this.router.url, userId: this.authService.getUserId() });
    console.log(this.authService.getUserName(),'name from oninit');
    this.currentRoute   = this.router.url.split('?')[0];
    this.currentUserId  = this.authService.getUserId() ?? '';
    this.refreshNotificationPermissionState();
    this.desktopNotificationsEnabled.set(this.browserNotification.isDesktopEnabled());
    this.notificationSoundMuted.set(this.browserNotification.isSoundMuted());

    this.updateNavItems();
    this.userDataSub = this.authService.userData.subscribe(() => {
      this.debug('userData subscription fired', {
        route: this.router.url,
        userId: this.authService.getUserId(),
        mustChangePassword: this.authService.mustChangePassword(),
      });
      this.updateNavItems();
      this.refreshProfilePictureFromApi();
      if(!this.authService.mustChangePassword() && this.authService.getUserId()){
        this.loadUnreadCount();
        this.initNotificationFeed();
  
      }
    });

    this.refreshProfilePictureFromApi();
  }

  ngOnDestroy(): void {
    this.debug('ngOnDestroy');
    this.revokeProfileBlobUrl();
    this.userDataSub?.unsubscribe();
    // this.disconnectMessengerHubs();
    this.notificationsSub?.unsubscribe();
    this.notificationSignalRSvc.stopConnection();
  }

  // ── Unread count ────────────────────────────────────────────────────────────

  private loadUnreadCount(): void {
    this.debug('loadUnreadCount start');
  
    this.authService.mymsgcount().pipe(take(1)).subscribe({
      next: (count) => this.unreadCount.set(count ?? 0),
      error: () => {},
    });
  }
  /** Re-fetch the authoritative count from the server (used after a seen event). */
  // private refreshUnreadCount(): void {
  //   this.authService.mymsgcount().pipe(take(1)).subscribe({
  //     next: (count) => this.unreadCount.set(count ?? 0),
  //     error: () => {},
  //   });
  // }

  // private disconnectMessengerHubs(): void {
  //   this.debug('disconnectMessengerHubs');
  //   this.ticketMsgSub?.unsubscribe();
  //   this.ticketSeenSub?.unsubscribe();
  //   this.projectMsgSub?.unsubscribe();
  //   this.projectSeenSub?.unsubscribe();
  //   this.taskMsgSub?.unsubscribe();
  //   this.taskSeenSub?.unsubscribe();
  //   // this.userMsgSub?.unsubscribe();
  //   // this.userSeenSub?.unsubscribe();
  //   this.ticketMsgSub = undefined;
  //   this.ticketSeenSub = undefined;
  //   this.projectMsgSub = undefined;
  //   this.projectSeenSub = undefined;
  //   this.taskMsgSub = undefined;
  //   this.taskSeenSub = undefined;
  //   // this.userMsgSub = undefined;
  //   // this.userSeenSub = undefined;

  //   this.joinedTicketIds.forEach(id => this.chatSvc.leaveTicket(id));
  //   this.joinedProjectIds.forEach(id => this.projectChatSvc.leaveProject(id));
  //   this.joinedTaskIds.forEach(id => this.taskChatSvc.leaveTask(id));
  //   // this.userChatSvc.leaveAllTickets();
  //   this.joinedTicketIds = [];
  //   this.joinedProjectIds = [];
  //   this.joinedTaskIds = [];
  //   }

  // private connectSignalR(): void {
  //   this.debug('connectSignalR start', { conversations: this.convs.length });
  //   this.disconnectMessengerHubs();

  //   Promise.all([
  //     this.chatSvc.startConnection(),
  //     this.projectChatSvc.startConnection(),
  //     this.taskChatSvc.startConnection(),
  //     // this.userChatSvc.startConnection(),
  //   ])
  //     .then(() => {
  //       this.debug('connectSignalR connected', { conversations: this.convs.length });
  //       for (const c of this.convs) {
  //         if (c.kind === 'ticket') {
  //           this.chatSvc.joinTicket(c.id);
  //           this.joinedTicketIds.push(c.id);
  //         } else if (c.kind === 'project') {
  //           this.projectChatSvc.joinProject(c.id);
  //           this.joinedProjectIds.push(c.id);
  //         } else {
  //           this.taskChatSvc.joinTask(c.id);
  //           this.joinedTaskIds.push(c.id);
  //         }
  //       }

  //       this.ticketMsgSub = this.chatSvc.onAnyMessage().subscribe({
  //         next: ({ ticketId, message }) => {
  //           try {
  //             this.onNewMessage('ticket', ticketId, message);
  //           } catch {
  //             /* noop */
  //           }
  //         },
  //         error: () => {},
  //       });

  //       this.ticketSeenSub = this.chatSvc.onSeenUpdate().subscribe({
  //         next: () => {
  //           try { this.refreshUnreadCount(); } catch { /* noop */ }
  //         },
  //         error: () => {},
  //       });

  //       this.projectMsgSub = this.projectChatSvc.onAnyMessage().subscribe({
  //         next: ({ ProjectId, message }) => {
  //           try {
  //             this.onNewMessage('project', ProjectId, message);
  //           } catch {
  //             /* noop */
  //           }
  //         },
  //         error: () => {},
  //       });

  //       this.projectSeenSub = this.projectChatSvc.onSeenUpdate().subscribe({
  //         next: () => {
  //           try { this.refreshUnreadCount(); } catch { /* noop */ }
  //         },
  //         error: () => {},
  //       });

  //       this.taskMsgSub = this.taskChatSvc.onAnyMessage().subscribe({
  //         next: ({ TaskId, message }) => {
  //           try {
  //             this.onNewMessage('task', TaskId, message);
  //           } catch {
  //             /* noop */
  //           }
  //         },
  //         error: () => {},
  //       });

  //       this.taskSeenSub = this.taskChatSvc.onSeenUpdate().subscribe({
  //         next: () => {
  //           try { this.refreshUnreadCount(); } catch { /* noop */ }
  //         },
  //         error: () => {},
  //       });

  //       // this.userMsgSub = this.userChatSvc.onAnyMessage().subscribe({
  //       //   next: ({ message }) => {
  //       //     try {
  //       //       if (message.userId !== this.currentUserId) {
  //       //         this.unreadCount.update(n => n + 1);
  //       //       }
  //       //     } catch {
  //       //       /* noop */
  //       //     }
  //       //   },
  //       //   error: () => {},
  //       // });

  //       // this.userSeenSub = this.userChatSvc.onSeenUpdate().subscribe({
  //       //   next: () => {
  //       //     try { this.refreshUnreadCount(); } catch { /* noop */ }
  //       //   },
  //       //   error: () => {},
  //       // });
  //     })
  //     .catch((error) => {
  //       this.debug('connectSignalR failed', error);
  //     });
  // }

  // private onNewMessage(kind: NavConvKind, id: string, msg: ChatMessage): void {
  //   if (msg.userId === this.currentUserId) return; // sent by me — don't count

  //   // If this is a brand-new conversation, register it so we can track it
  //   if (!this.convs.find(c => c.kind === kind && c.id === id)) {
  //     this.convs.push({ kind, id });
  //   }

  //   this.unreadCount.update(n => n + 1);
  // }

  private initNotificationFeed(): void {
    this.debug('initNotificationFeed start', {
      hasUser: !!this.authService.getUserId(),
      alreadyStarted: this.isNotificationHubStarted,
    });
  
    if (!this.authService.getUserId()) {
      this.notificationUnreadCount.set(0);
      return;
    }
  
    if (!this.notificationsSub) {
      this.notificationsSub = this.notificationSignalRSvc.notifications$.subscribe({
        next: (items) => {
          this.recentNotifications = items ?? [];
          this.recalcNotificationCount();
        },
        error: () => {},
      });
  
      this.notificationSignalRSvc.taskMessageNotification$
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe({
    next: (payload) => {
      if (payload.senderId === this.currentUserId) return;
      this.unreadCount.update(n => n + 1);
    },
    error: () => {},
  });
  
      this.notificationSignalRSvc.directMessageNotification$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (payload) => {
            if (payload.senderId === this.currentUserId) return;
            this.unreadCount.update(n => n + 1);
          },
          error: () => {},
        });
        this.notificationSignalRSvc.projectMessageNotification$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (payload) => {
            if (payload.senderId === this.currentUserId) return;
            this.unreadCount.update(n => n + 1);
          },
          error: () => {},
        });
      this.notificationSignalRSvc.ticketMessageNotification$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (payload) => {
            if (payload.senderId === this.currentUserId) return;
            this.unreadCount.update(n => n + 1);
          },
          error: () => {},
        });
    }
  
    if (!this.isNotificationHubStarted) {
      const token = this.authService.getTokenFromCookie();
      if (token) {
        this.debug('initNotificationFeed startConnection');
        this.notificationSignalRSvc.startConnection(token);
        this.isNotificationHubStarted = true;
      }
    }
  }
  refreshNotificationPermissionState(): void {
    this.notificationPermission.set(this.browserNotification.getPermissionStatus());
  }

  enableDesktopNotifications(): void {
    this.notificationPermissionMessage.set(null);
    this.browserNotification.setDesktopEnabled(true);
    this.desktopNotificationsEnabled.set(true);
    void this.browserNotification.requestPermissionFromUser().then(status => {
      this.notificationPermission.set(status);

      if (status === 'granted') {
        this.notificationPermissionMessage.set('Desktop notifications enabled.');
        return;
      }
      if (status === 'denied') {
        this.notificationPermissionMessage.set('Blocked by browser. Enable notifications from site settings.');
        return;
      }
      if (status === 'unsupported') {
        this.notificationPermissionMessage.set('This browser does not support desktop notifications.');
        return;
      }
      this.notificationPermissionMessage.set('Permission request dismissed.');
    });
  }

  sendTestDesktopNotification(): void {
    this.refreshNotificationPermissionState();
    const status = this.notificationPermission();

    if (status === 'denied') {
      this.notificationPermissionMessage.set('Notifications are blocked. Enable them from browser site settings.');
      return;
    }

    if (status === 'unsupported') {
      this.notificationPermissionMessage.set('This browser does not support desktop notifications.');
      return;
    }

    const shown = this.browserNotification.notify({
      title: 'Notification test',
      body: 'Desktop popup and sound are working.',
      tag: 'desktop-notification-test',
      iconUrl: this.authService.getResolvedProfilePictureUrl(this.pictureCacheBuster) ?? undefined,
      onClickUrl: '/notifications',
    });
    if (shown) {
      this.notificationPermissionMessage.set('Test sent. If popups are allowed, you should see it now.');
      return;
    }

    const debug = this.browserNotification.getDebugInfo();
    if (!debug.secureContext) {
      this.notificationPermissionMessage.set('Desktop notifications require HTTPS (or localhost). Open the app over HTTPS and try again.');
      return;
    }

    this.notificationPermissionMessage.set(
      `Notification blocked. permission=${debug.permission}, secure=${debug.secureContext}, focused=${debug.focused}, visibility=${debug.visibility}.`
    );
  }

  disableDesktopNotifications(): void {
    this.browserNotification.setDesktopEnabled(false);
    this.desktopNotificationsEnabled.set(false);
    this.notificationPermissionMessage.set('Desktop popups disabled for this app.');
  }

  toggleNotificationSoundMute(): void {
    const nextMuted = !this.notificationSoundMuted();
    this.browserNotification.setSoundMuted(nextMuted);
    this.notificationSoundMuted.set(nextMuted);
    this.notificationPermissionMessage.set(nextMuted ? 'Notification sound muted.' : 'Notification sound enabled.');
  }

  private debug(message: string, data?: unknown): void {
    if (data === undefined) {
      console.log(`[Navbar#${this.instanceId}] ${message}`);
      return;
    }
    console.log(`[Navbar#${this.instanceId}] ${message}`, data);
  }

  private recalcNotificationCount(): void {
    const unseenCount = this.recentNotifications.filter(n => !n.isSeen).length;
    this.notificationUnreadCount.set(unseenCount);
  }

  get recentNotificationsPreview(): NotificationResponse[] {
    return this.recentNotifications
      .slice(0, 6);
  }

  toggleNotificationsMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsMenuOpen = !this.notificationsMenuOpen;
    if (this.notificationsMenuOpen) {
      this.profileMenuOpen = false;
    }
  }

  openNotification(item: NotificationResponse): void {
    if (!item.isSeen) {
      this.notificationsSvc.MarkAsSeen(item.id).pipe(take(1)).subscribe({
        next: () => {
          this.notificationSignalRSvc.markAsSeenLocal(item.id);
        },
        error: () => {},
      });
    }

    const link = this.getNotificationLink(item);
    if (link) {
      this.notificationsMenuOpen = false;
      this.router.navigateByUrl(link);
    }
  }

  goToNotification(event: MouseEvent, item: NotificationResponse): void {
    event.stopPropagation();
    this.openNotification(item);
  }

  viewAllNotifications(): void {
    this.notificationsMenuOpen = false;
    this.router.navigate(['/notifications']);
  }

  markAllNotificationsSeen(): void {
    this.notificationsSvc.markallasseen().pipe(take(1)).subscribe({
      next: () => {
        this.notificationSignalRSvc.markAllAsSeenLocal();
      },
      error: () => {},
    });
  }

  formatNotificationDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }

  private getNotificationLink(item: NotificationResponse): string | null {
    const candidate = item.redirectLink;
    if (!candidate || !candidate.trim()) return null;
    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
      window.open(candidate, '_blank', 'noopener');
      return null;
    }
    return candidate.startsWith('/') ? candidate : `/${candidate}`;
  }

  notificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.Ticket:
        return '🎫';
      case NotificationType.Reply:
        return '💬';
      case NotificationType.Project:
        return '📁';
      case NotificationType.Task:
        return '✅';
      default:
        return '🔔';
    }
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    this.pwdError = null;
    this.pwdSuccess = null;
    if (!this.showPasswordForm) {
      this.pwdOld = '';
      this.pwdNew = '';
      this.pwdConfirm = '';
    }
  }

  submitPasswordChange(): void {
    this.pwdError = null;
    this.pwdSuccess = null;
    if (!this.pwdOld.trim() || !this.pwdNew.trim()) {
      this.pwdError = 'Fill in all fields.';
      return;
    }
    if (this.pwdNew !== this.pwdConfirm) {
      this.pwdError = 'New password and confirmation do not match.';
      return;
    }
    this.pwdSubmitting = true;
    this.authService
      .ChangeMyPassword({
        oldPassword: this.pwdOld,
        newPassword: this.pwdNew,
        confirmNewPassword: this.pwdConfirm,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        take(1),
        finalize(() => {
          this.pwdSubmitting = false;
        }),
      )
      .subscribe({
        next: () => {
          this.pwdSuccess = 'Password updated.';
          this.pwdOld = '';
          this.pwdNew = '';
          this.pwdConfirm = '';
        },
        error: (err: HttpErrorResponse) => {
          this.pwdError =
            err.error?.message != null
              ? String(err.error.message)
              : 'Could not change password. Check your current password.';
        },
      });
  }

  // ── Nav items ───────────────────────────────────────────────────────────────

  private updateNavItems(): void {
    const isAdminOrMaster = this.authService.isAdmin() || this.authService.isMaster();

    const groups: ComputedNavGroup[] = this.groupDefs
      .filter(g => !g.adminOnly || isAdminOrMaster)
      .map(g => ({
        id: g.id,
        label: g.label,
        icon: g.icon,
        items: g.items.filter(item => {
          if (item.strictAdminOnly) return this.authService.isAdmin();
          if (item.masterOnly) return this.authService.isMaster();
          if (item.adminOnly) return isAdminOrMaster;
          return true;
        }),
      }))
      .filter(g => g.items.length > 0);

    this.navGroups.set(groups);
    this.navItems.set([this.messagesNavItem]);
  }

  toggleDropdown(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdown = this.openDropdown === id ? null : id;
  }

  closeDropdown(): void {
    this.openDropdown = null;
  }

  isGroupActive(group: ComputedNavGroup): boolean {
    return group.items.some(item => this.isActive(item.path));
  }

  isActive(path: string): boolean {
    if (path === '/account-management' && this.currentRoute === '/') return true;
    return this.currentRoute === path || this.currentRoute.startsWith(path + '/');
  }

  shouldShowNavbar(): boolean {
    return this.currentRoute !== '/login';
  }

  // ── Profile picture (GET GetMyPicture only — img must use object URL string, not Blob) ──

  /** Object URL from server blob; the only source for `<img src>` (not JWT / token). */
  get profileAvatarSrc(): string | null {
    return this.profilePictureBlobUrl;
  }

  /** First line in the navbar actions: “Hello, …” */
  get greetingDisplayName(): string {
    const name = this.authService.getUserName()?.trim();
    console.log(name,'name from navbar');
    return name || 'there';
  }

  get userDisplayInitials(): string {
    const name = this.authService.getUserName();
    if (!name?.trim()) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
    if (this.profileMenuOpen) {
      this.profilePictureMessage = null;
      this.profilePictureError = null;
    } else {
      this.showPasswordForm = false;
      this.pwdError = null;
      this.pwdSuccess = null;
      this.pwdOld = '';
      this.pwdNew = '';
      this.pwdConfirm = '';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (event.target instanceof Node) {
      const profileRoot = this.profileMenuRoot?.nativeElement;
      const notificationsRoot = this.notificationsMenuRoot?.nativeElement;

      if (this.profileMenuOpen && profileRoot && !profileRoot.contains(event.target)) {
        this.profileMenuOpen = false;
        this.showPasswordForm = false;
        this.pwdError = null;
        this.pwdSuccess = null;
        this.pwdOld = '';
        this.pwdNew = '';
        this.pwdConfirm = '';
      }

      if (this.notificationsMenuOpen && notificationsRoot && !notificationsRoot.contains(event.target)) {
        this.notificationsMenuOpen = false;
      }

      // Close any open nav dropdown when clicking outside
      if (this.openDropdown !== null) {
        const target = event.target as Element;
        if (!target.closest('.nav-dropdown')) {
          this.openDropdown = null;
        }
      }
    }
  }

  private revokeProfileBlobUrl(): void {
    if (this.profilePictureBlobUrl) {
      URL.revokeObjectURL(this.profilePictureBlobUrl);
      this.profilePictureBlobUrl = null;
    }
  }

  /**
   * Reload avatar from GET GetMyPicture. Pass `cacheBust` after a picture change so the URL
   * differs from any cached response (e.g. same as pictureCacheBuster for JWT fallback alignment).
   */
  refreshProfilePictureFromApi(cacheBust?: number): void {
    this.profileImageLoadFailed = false;
    if (!this.authService.getUserId()) {
      this.revokeProfileBlobUrl();
      return;
    }
    this.revokeProfileBlobUrl();
    this.isLoadingProfilePicture = true;
    this.authService
      .getMyPicture(cacheBust)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        take(1),
        catchError(() => of(null)),
        finalize(() => {
          this.isLoadingProfilePicture = false;
        })
      )
      .subscribe(blob => {
        if (blob && blob.size > 0) {
          this.profilePictureBlobUrl = URL.createObjectURL(blob);
        }
      });
  }

  onProfilePictureFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.profilePictureMessage = null;
    this.profilePictureError = null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.profilePictureError = 'Please choose an image file.';
      input.value = '';
      return;
    }
   
    this.isUploadingProfilePicture = true;
    this.authService
      .changemyPicture(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        take(1),
        finalize(() => {
          this.isUploadingProfilePicture = false;
        })
      )
      .subscribe({
        next: () => {
          this.profilePictureMessage = 'Profile picture updated.';
          input.value = '';
          this.pictureCacheBuster++;
          this.revokeProfileBlobUrl();
          this.refreshProfilePictureFromApi(this.pictureCacheBuster);
        },
        error: (err: HttpErrorResponse) => {
          this.profilePictureError =
            err.error?.message != null
              ? String(err.error.message)
              : 'Could not update your picture. Try again.';
          input.value = '';
        },
      });
  }
}
