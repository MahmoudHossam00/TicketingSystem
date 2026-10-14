import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, take } from 'rxjs';
import { NewsLetter } from '../../Interfaces/Alerts';
import { NotificationSignalRService } from '../../Services/notification-signalr.service';
import { NotificationsService } from '../../Services/notifications.service';

@Component({
  selector: 'app-newsletter-ticker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './newsletter-ticker.component.html',
  styleUrl: './newsletter-ticker.component.css',
})
export class NewsletterTickerComponent implements OnInit, OnDestroy {
  newsLetters = signal<NewsLetter[]>([]);

  private sub?: Subscription;

  constructor(
    private signalR: NotificationSignalRService,
    private notifSvc: NotificationsService,
  ) {}

  ngOnInit(): void {
    this.notifSvc.MyNewsLetters().pipe(take(1)).subscribe({
      next: (items) => this.signalR.seedNewsLetters(items ?? []),
      error: () => {},
    });

    this.sub = this.signalR.newsLetters$.subscribe(items => {
      this.newsLetters.set(items);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get tickerText(): string {
    return this.newsLetters()
      .map(n => n.text)
      .join('   ·   ');
  }
}
