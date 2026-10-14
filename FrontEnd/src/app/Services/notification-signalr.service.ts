import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Environment } from '../base/environment';
import { NotificationResponse } from '../Interfaces/notification';
import { ToastrService } from 'ngx-toastr';
import { Alert, NewsLetter } from '../Interfaces/Alerts';
import { BrowserNotificationService } from './browser-notification.service';
export interface DirectMessageNotification {
  senderId: string;
  messageId: string;
  preview?: string;
  date: string;
}
export interface ProjectMessageNotification {
  projectId: string;
  senderId: string;
  messageId: string;
  preview?: string;
  date: string;
}
export interface TicketMessageNotification {
  ticketId: string;
  senderId: string;
  messageId: string;
  preview?: string;
  date: string;
}

export interface TaskMessageNotification {
  taskId: string;
  senderId: string;
  messageId: string;
  preview?: string;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationSignalRService {
  private static nextInstanceId = 1;
  private readonly instanceId = NotificationSignalRService.nextInstanceId++;
  private hubConnection: signalR.HubConnection | null = null;
  private isStarted = false;
  private startPromise: Promise<void> | null = null;
  private handlersRegistered = false;
  private projectMessageNotificationSubject = new Subject<ProjectMessageNotification>();


  private taskMessageNotificationSubject = new Subject<TaskMessageNotification>();

taskMessageNotification$: Observable<TaskMessageNotification> =
  this.taskMessageNotificationSubject.asObservable();


  projectMessageNotification$: Observable<ProjectMessageNotification> =
    this.projectMessageNotificationSubject.asObservable();
  private notificationsSubject = new BehaviorSubject<NotificationResponse[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private directMessageNotificationSubject = new Subject<DirectMessageNotification>();

  directMessageNotification$: Observable<DirectMessageNotification> =
    this.directMessageNotificationSubject.asObservable();

  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  alerts$ = this.alertsSubject.asObservable();

  private newsLettersSubject = new BehaviorSubject<NewsLetter[]>([]);
  newsLetters$ = this.newsLettersSubject.asObservable();

  private baseUrl = Environment.standaloneurl + 'notificationHub';


  private ticketMessageNotificationSubject = new Subject<TicketMessageNotification>();

ticketMessageNotification$: Observable<TicketMessageNotification> =
  this.ticketMessageNotificationSubject.asObservable();

  
  constructor(
    private toastr: ToastrService,
    private browserNotification: BrowserNotificationService
  ) {}

  startConnection(token: string): void {
    this.debug('startConnection called', {
      isStarted: this.isStarted,
      hasStartPromise: !!this.startPromise,
      hasToken: !!token?.trim(),
    });
    this.browserNotification.requestPermission();
    if (this.isStarted || this.startPromise || !token?.trim()) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.baseUrl, {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .configureLogging(signalR.LogLevel.Warning)
      .withAutomaticReconnect([0, 2000, 5000, 10000])      .build();

    this.registerHandlers();

    this.startPromise = this.hubConnection
      .start()
      .then(() => {
        this.isStarted = true;
        this.debug('SignalR Connected');
      })
      .catch(err => console.error(`[NotificationHub#${this.instanceId}] SignalR Error:`, err))
      .finally(() => {
        this.startPromise = null;
      });
  }

  private registerHandlers(): void {
    if (!this.hubConnection || this.handlersRegistered) return;
    this.handlersRegistered = true;

    this.hubConnection.on('LoadNotifications', (notifications: NotificationResponse[]) => {
      this.notificationsSubject.next(notifications);
      console.log(notifications, 'notifications');
      console.log(this.notificationsSubject.value, 'this.notificationsSubject.value');
    });
this.hubConnection.on('TaskMessageNotification', (payload: TaskMessageNotification) => {
  this.taskMessageNotificationSubject.next(payload);

  this.toastr.info(payload.preview || 'New task message', 'Task message', {
    timeOut: 5000,
    closeButton: true,
    progressBar: true,
  });

  this.browserNotification.notify({
    title: 'New task message',
    body: payload.preview || 'You have a new task message',
    tag: `task-${payload.taskId}-${payload.messageId}`,
    onClickUrl: `/taskdetails/${payload.taskId}`,
  });
});

    this.hubConnection.on('ProjectMessageNotification', (payload: ProjectMessageNotification) => {
      this.projectMessageNotificationSubject.next(payload);
    
      this.toastr.info(payload.preview || 'New project message', 'Project message', {
        timeOut: 5000,
        closeButton: true,
        progressBar: true,
      });
    
      this.browserNotification.notify({
        title: 'New project message',
        body: payload.preview || 'You have a new project message',
        tag: `project-${payload.projectId}-${payload.messageId}`,
        onClickUrl: `/projectdetails/${payload.projectId}`,
      });
    });

    this.hubConnection.on('TicketMessageNotification', (payload: TicketMessageNotification) => {
      this.ticketMessageNotificationSubject.next(payload);
    
      this.toastr.info(payload.preview || 'New ticket message', 'Ticket message', {
        timeOut: 5000,
        closeButton: true,
        progressBar: true,
      });
    
      this.browserNotification.notify({
        title: 'New ticket message',
        body: payload.preview || 'You have a new ticket message',
        tag: `ticket-${payload.ticketId}-${payload.messageId}`,
        onClickUrl: `/ticketdetails/${payload.ticketId}`,
      });
    });

    this.hubConnection.on('ReceiveNotification', (notification: NotificationResponse) => {
      const current = this.notificationsSubject.value;

      this.notificationsSubject.next([
        notification,
        ...current
      ]);

      this.toastr.info(notification.text, 'New notification', {
        timeOut: 5000,
        closeButton: true,
        progressBar: true,
      });

      this.browserNotification.notify({
        title: 'New notification',
        body: notification.text,
        tag: `notif-${notification.id}`,
        onClickUrl: this.normalizeNotificationLink(notification.redirectLink),
      });
    });
    this.hubConnection.on('DirectMessageNotification', (payload: DirectMessageNotification) => {
      this.directMessageNotificationSubject.next(payload);
    
      this.toastr.info(payload.preview || 'You have a new message', 'New direct message', {
        timeOut: 5000,
        closeButton: true,
        progressBar: true,
      });
    
      this.browserNotification.notify({
        title: 'New direct message',
        body: payload.preview || 'You have a new message',
        tag: `dm-${payload.messageId}`,
        onClickUrl: '/messanger',
      });
    });
    this.hubConnection.on('ReceiveAnAlert', (alert: Alert) => {
      const current = this.alertsSubject.value;
      this.alertsSubject.next([alert, ...current]);
    });

    this.hubConnection.on('ReceiveANewsLetter', (newsLetter: NewsLetter) => {
      const current = this.newsLettersSubject.value;
      this.newsLettersSubject.next([...current, newsLetter]);
    });
  }

  seedAlerts(alerts: Alert[]): void {
    this.alertsSubject.next(alerts);
  }

  seedNewsLetters(newsLetters: NewsLetter[]): void {
    this.newsLettersSubject.next(newsLetters);
  }

  removeAlertLocal(id: string): void {
    this.alertsSubject.next(this.alertsSubject.value.filter(a => a.id !== id));
  }

  removeNewsLetterLocal(id: string): void {
    this.newsLettersSubject.next(this.newsLettersSubject.value.filter(n => n.id !== id));
  }

  toggleHideAlertLocal(id: string): void {
    this.alertsSubject.next(
      this.alertsSubject.value.map(a => a.id === id ? { ...a, isHidden: !a.isHidden } : a)
    );
  }

  markAsSeenLocal(notificationId: string): void {
    const next = this.notificationsSubject.value.map(n =>
      n.id === notificationId ? { ...n, isSeen: true } : n
    );
    this.notificationsSubject.next(next);
  }

  markAllAsSeenLocal(): void {
    const next = this.notificationsSubject.value.map(n => ({ ...n, isSeen: true }));
    this.notificationsSubject.next(next);
  }

  appendOlderNotifications(items: NotificationResponse[]): void {
    if (!items?.length) return;
    const current = this.notificationsSubject.value;
    const known = new Set(current.map(n => n.id));
    const toAppend = items.filter(n => !known.has(n.id));
    if (toAppend.length > 0) {
      this.notificationsSubject.next([...current, ...toAppend]);
    }
  }

  removeLocal(notificationId: string): void {
    const next = this.notificationsSubject.value.filter(n => n.id !== notificationId);
    this.notificationsSubject.next(next);
  }

  stopConnection(): void {
    this.debug('stopConnection called');
    if (this.hubConnection) {
      void this.hubConnection.stop();
    }
    this.hubConnection = null;
    this.isStarted = false;
    this.startPromise = null;
    this.handlersRegistered = false;
  }

  private debug(message: string, data?: unknown): void {
    if (data === undefined) {
      console.log(`[NotificationHub#${this.instanceId}] ${message}`);
      return;
    }
    console.log(`[NotificationHub#${this.instanceId}] ${message}`, data);
  }

  private normalizeNotificationLink(link: string | undefined): string | undefined {
    if (!link || !link.trim()) return undefined;
    const candidate = link.trim();
    if (/^https?:\/\//i.test(candidate)) return candidate;
    return candidate.startsWith('/') ? candidate : `/${candidate}`;
  }
}
