import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription, take } from 'rxjs';
import { NotificationsService } from '../../Services/notifications.service';
import { NotificationSignalRService } from '../../Services/notification-signalr.service';
import { NotificationResponse, NotificationType } from '../../Interfaces/notification';
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications = signal<NotificationResponse[]>([]);
  isLoading = signal(false);
  errorText = signal<string | null>(null);
  isLoadingMore = signal(false);
  canLoadMore = signal(true);

  private notificationsSub?: Subscription;
  private isHubStarted = false;
  private gotInitialBatchFromSignalR = false;
  readonly NotificationType = NotificationType;

  constructor(
    private notificationsSvc: NotificationsService,
    private notificationSignalRSvc: NotificationSignalRService,
    private authSvc: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.isLoading.set(true);
    this.notificationsSub = this.notificationSignalRSvc.notifications$.subscribe(items => {
      const filtered = (items ?? []);
      this.notifications.set(filtered);
      if (!this.gotInitialBatchFromSignalR) {
        this.gotInitialBatchFromSignalR = true;
        this.isLoading.set(false);
      }
    });
    this.startHub();
  }

  ngOnDestroy(): void {
    this.notificationsSub?.unsubscribe();
    this.notificationSignalRSvc.stopConnection();
  }

  loadMoreNotifications(): void {
    const current = this.notifications();
    if (current.length === 0) {
      return;
    }

    const topNotificationId = current[current.length - 1]?.id;
    if (!topNotificationId) {
      return;
    }

    this.isLoadingMore.set(true);
    this.errorText.set(null);
    this.notificationsSvc.GetMoreNotifications(topNotificationId).pipe(take(1)).subscribe({
      next: (items) => {
        const filtered = (items ?? []);
        this.canLoadMore.set(filtered.length === 10);
        if (filtered.length > 0) {
          this.notificationSignalRSvc.appendOlderNotifications(filtered);
        }
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.errorText.set('Could not load more notifications.');
        this.isLoadingMore.set(false);
      },
    });
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

  }

  goToNotification(item: NotificationResponse): void {
    this.openNotification(item);
    const link = this.getNotificationLink(item);
    console.log('notification redirectLink:', item.redirectLink ?? null);
    if (link) this.router.navigateByUrl(link);
  }

  deleteNotification(item: NotificationResponse): void {
    this.notificationsSvc.delete(item.id).pipe(take(1)).subscribe({
      next: () => {
        this.notificationSignalRSvc.removeLocal(item.id);
      },
      error: () => {},
    });
  }

  markAllSeen(): void {
    this.notificationsSvc.markallasseen().pipe(take(1)).subscribe({
      next: () => {
        this.notificationSignalRSvc.markAllAsSeenLocal();
      },
      error: () => {},
    });
  }

  formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }

  private startHub(): void {
    if (this.isHubStarted) return;
    const token = this.authSvc.getTokenFromCookie();
    if (!token) return;
    this.notificationSignalRSvc.startConnection(token);
    this.isHubStarted = true;
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

  notificationTypeLabel(type: NotificationType): string {
    switch (type) {
      case NotificationType.Ticket:
        return 'Ticket';
      case NotificationType.Reply:
        return 'Message';
      case NotificationType.Project:
        return 'Project';
      case NotificationType.Task:
        return 'Task';
      default:
        return 'General';
    }
  }

  unseenCount(): number {
    return this.notifications().filter(n => !n.isSeen).length;
  }
}
