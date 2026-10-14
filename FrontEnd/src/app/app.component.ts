import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { NavbarComponent } from './Components/navbar/navbar.component';
import { AlertsPanelComponent } from './Components/alerts-panel/alerts-panel.component';
import { NewsletterTickerComponent } from './Components/newsletter-ticker/newsletter-ticker.component';
import { AuthService } from './Services/auth.service';
import { CallService, CallType } from './Services/communicationhub.service';
import { BrowserNotificationService } from './Services/browser-notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, AlertsPanelComponent, NewsletterTickerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Ticketing System';
  private router = inject(Router);
  private authService = inject(AuthService);
  private callService = inject(CallService);
  private browserNotification = inject(BrowserNotificationService);
  /** Hide main nav on login and mandatory password-change screen. */
  showNavbar = true;
  showGlobalWidgets = false;
  readonly incomingGlobalCall = signal<{ from: string; type: CallType } | null>(null);
  readonly callSessionActive = signal(false);
  readonly activeCallPeer = signal<string | null>(null);
  readonly callActionBusy = signal(false);
  readonly globalCallError = signal<string | null>(null);

  private globalRemoteAudioSub?: { unsubscribe: () => void };

  @ViewChild('globalRemoteAudio') set globalRemoteAudioRef(r: ElementRef<HTMLAudioElement> | undefined) {
    this.globalRemoteAudioSub?.unsubscribe();
    this.globalRemoteAudioSub = undefined;
    if (!r) return;
    this.globalRemoteAudioSub = this.callService.remoteStream$.subscribe(stream => {
      r.nativeElement.srcObject = stream ?? null;
      if (stream) {
        r.nativeElement.play().catch(() => undefined);
      }
    });
  }

  constructor() {
    // Important: keep CallService instantiated globally so IncomingCall events are
    // received even when no chat component is currently mounted.
    this.callService.incomingCall$.subscribe(call => {
      this.incomingGlobalCall.set(call);
      if (!call) return;
      if (!this.showGlobalWidgets) return;
      this.activeCallPeer.set(call.from);

      this.browserNotification.notify({
        title: `Incoming ${call.type} call`,
        body: `${call.from} is calling you`,
        tag: `incoming-call-${call.from}-${Date.now()}`,
        onClickUrl: '/messanger',
      });
    });
    this.callService.callSessionActive$.subscribe(active => {
      this.callSessionActive.set(active);
      if (!active) {
        this.activeCallPeer.set(null);
      }
    });

    const route$ = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    );
  
    combineLatest([
      route$,
      this.authService.userData
    ]).subscribe(([_, user]) => {
      const path = this.router.url.split('?')[0];
      const isPublic = path === '/login' || path === '/changepassword';
      this.showNavbar = !isPublic && !!user;
      this.showGlobalWidgets = !isPublic && !!user;
    });
  }

  acceptGlobalIncomingCall(): void {
    const call = this.incomingGlobalCall();
    if (!call || this.callActionBusy()) return;
    this.globalCallError.set(null);
    this.callActionBusy.set(true);
    this.callService.setTargetUser(call.from);
    void this.callService.acceptCall(call.from, call.type)
      .then(() => {
        this.activeCallPeer.set(call.from);
        this.incomingGlobalCall.set(null);
        void this.router.navigate(['/messanger']);
      })
      .catch(() => {
        this.globalCallError.set('Could not accept the call. Try opening chat and retry.');
      })
      .finally(() => this.callActionBusy.set(false));
  }

  declineGlobalIncomingCall(): void {
    const call = this.incomingGlobalCall();
    if (!call || this.callActionBusy()) return;
    this.callActionBusy.set(true);
    this.globalCallError.set(null);
    void this.callService.rejectCall(call.from)
      .then(() => {
        this.incomingGlobalCall.set(null);
      })
      .catch(() => {
        this.globalCallError.set('Could not decline call.');
      })
      .finally(() => this.callActionBusy.set(false));
  }

  endGlobalCall(): void {
    const peer = this.activeCallPeer();
    if (!peer || this.callActionBusy()) return;
    this.callActionBusy.set(true);
    void this.callService.endCall(peer)
      .finally(() => this.callActionBusy.set(false));
  }

  openMessengerForCall(): void {
    void this.router.navigate(['/messanger']);
  }

  ngOnDestroy(): void {
    this.globalRemoteAudioSub?.unsubscribe();
  }
}
