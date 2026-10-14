import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { Alert, AlertViewer, NewsLetter, sendAlertRequest, type as AlertType } from '../../Interfaces/Alerts';
import { NotificationsService } from '../../Services/notifications.service';

@Component({
  selector: 'app-admin-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-alerts.component.html',
  styleUrl: './admin-alerts.component.css',
})
export class AdminAlertsComponent implements OnInit {
  readonly AlertType = AlertType;

  alerts = signal<Alert[]>([]);
  newsLetters = signal<NewsLetter[]>([]);

  isLoadingAlerts = signal(true);
  isLoadingNewsLetters = signal(true);
  isSending = signal(false);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  viewersOpen = signal(false);
  viewersLoading = signal(false);
  viewers = signal<AlertViewer[]>([]);
  viewersAlertText = signal('');

  form: sendAlertRequest = {
    text: '',
    endDate: this.defaultEndDate(),
    type: AlertType.Alert,
  };

  constructor(private notifSvc: NotificationsService) {}

  ngOnInit(): void {
    this.loadAlerts();
    this.loadNewsLetters();
  }

  private loadAlerts(): void {
    this.isLoadingAlerts.set(true);
    this.notifSvc.GetAlertsWithExpired('').pipe(take(1)).subscribe({
      next: (items) => {
        this.alerts.set(items ?? []);
        this.isLoadingAlerts.set(false);
      },
      error: () => this.isLoadingAlerts.set(false),
    });
  }

  isExpired(endDate: Date): boolean {
    return new Date(endDate) < new Date();
  }

  private loadNewsLetters(): void {
    this.isLoadingNewsLetters.set(true);
    this.notifSvc.MyNewsLetters().pipe(take(1)).subscribe({
      next: (items) => {
        this.newsLetters.set(items ?? []);
        this.isLoadingNewsLetters.set(false);
      },
      error: () => this.isLoadingNewsLetters.set(false),
    });
  }

  submit(): void {
    if (!this.form.text?.trim()) {
      this.errorMsg.set('Message text is required.');
      return;
    }
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.isSending.set(true);

    this.notifSvc.SendAlert(this.form).pipe(take(1)).subscribe({
      next: () => {
        this.isSending.set(false);
        this.successMsg.set('Sent successfully!');
        this.form = { text: '', endDate: this.defaultEndDate(), type: AlertType.Alert };
        this.loadAlerts();
        this.loadNewsLetters();
        setTimeout(() => this.successMsg.set(null), 3000);
      },
      error: (err) => {
        this.isSending.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Failed to send.');
      },
    });
  }

  deleteAlert(id: string): void {
    this.notifSvc.DeleteAlert(id).pipe(take(1)).subscribe({
      next: () => this.alerts.update(list => list.filter(a => a.id !== id)),
      error: () => {},
    });
  }

  openViewers(alert: Alert): void {
    this.viewersAlertText.set(alert.text);
    this.viewers.set([]);
    this.viewersLoading.set(true);
    this.viewersOpen.set(true);
    this.notifSvc.GetAlertStatistics(alert.id).pipe(take(1)).subscribe({
      next: (data) => {
        console.log(data,"data");
        console.log(this.viewers(),"viewers");
        this.viewers.set(data ?? []);
        this.viewersLoading.set(false);
      },
      error: () => this.viewersLoading.set(false),
    });
  }

  closeViewers(): void {
    this.viewersOpen.set(false);
  }

  deleteNewsLetter(id: string): void {
    this.notifSvc.DeleteNewsLetter(id).pipe(take(1)).subscribe({
      next: () => this.newsLetters.update(list => list.filter(n => n.id !== id)),
      error: () => {},
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  private defaultEndDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }

  get endDateString(): string {
    if (!this.form.endDate) return '';
    const d = new Date(this.form.endDate);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  set endDateString(val: string) {
    this.form.endDate = val ? new Date(val) : new Date();
  }
}
