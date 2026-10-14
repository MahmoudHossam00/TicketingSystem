import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, take } from 'rxjs';
import { Alert } from '../../Interfaces/Alerts';
import { NotificationSignalRService } from '../../Services/notification-signalr.service';
import { NotificationsService } from '../../Services/notifications.service';

@Component({
  selector: 'app-alerts-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alerts-panel.component.html',
  styleUrl: './alerts-panel.component.css',
})
export class AlertsPanelComponent implements OnInit, OnDestroy {
  alerts = signal<Alert[]>([]);
  isLoading = signal(true);
  showHidden = signal(false);
  isMinimized = signal(false);

  private sub?: Subscription;

  constructor(
    private signalR: NotificationSignalRService,
    private notifSvc: NotificationsService,
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
    this.sub = this.signalR.alerts$.subscribe(alerts => {
      this.alerts.set(alerts);
      // If a new visible alert arrives, force the panel back open
      if (alerts.some(a => !a.isHidden)) {
        this.isMinimized.set(false);
      }
      else{
        this.isMinimized.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private loadAlerts(): void {
    this.notifSvc.MyAlerts().pipe(take(1)).subscribe({
      next: (alerts) => {
        this.signalR.seedAlerts(alerts ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  visibleAlerts(): Alert[] {
    return this.alerts().filter(a => !a.isHidden);
  }

  hiddenAlerts(): Alert[] {
    return this.alerts().filter(a => a.isHidden);
  }

  toggleHide(alert: Alert): void {
    this.notifSvc.tOGGLEHideAlert(alert.id).pipe(take(1)).subscribe({
      next: () => this.signalR.toggleHideAlertLocal(alert.id),
      error: () => {},
    });
  }

  toggleShowHidden(): void {
    this.showHidden.set(!this.showHidden());
  }

  minimize(): void {
    this.isMinimized.set(true);
  }

  restore(): void {
    this.isMinimized.set(false);
  }

  allDismissed(): boolean {
    return this.alerts().length > 0 && this.visibleAlerts().length === 0;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
}
