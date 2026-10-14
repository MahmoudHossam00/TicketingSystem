import {
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';
import { ChatMessage, TicketChatService } from '../../Services/TicketChat.service';
import { AuthService } from '../../Services/auth.service';
import { Environment } from '../../base/environment';
import { CallService, CallType } from '../../Services/communicationhub.service';
import { ticketService } from '../../Services/ticket.service';
import { ArticleService } from '../../Services/article.service';
import { ArticleSummaryResponse } from '../../Interfaces/Article';
import {
  messangerRowsToChatMessages,
  oldestMessageCursorId,
} from '../../utils/chat-history-pagination';

// ── Staged-file types ─────────────────────────────────────────────────────────

interface StagedPicture {
  file: File;
  previewUrl: string;
}

interface StagedVoiceRecord {
  file: File;
  previewUrl: string;
  durationSecs: number;
}

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-ticket-chat-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-chat-component.component.html',
  styleUrl: './ticket-chat-component.component.css',
})
export class TicketChatComponentComponent implements OnInit, OnDestroy {
  private readonly articleLinkTag = '[article-link]';
  @Input() ticketId!: string;

  @Input() ticketCreatorId = '';
  @Input() assignedUserId  = '';

  @Input() otherpartId ='';
  @ViewChild('messageList') messageListRef!: ElementRef<HTMLDivElement>;


  @ViewChild('remoteAudio') remoteAudioRef!: ElementRef<HTMLAudioElement>;

  private localVideoStreamSub?: Subscription;
  private remoteVideoStreamSub?: Subscription;

  @ViewChild('localVideo') set localVideoRef(r: ElementRef<HTMLVideoElement> | undefined) {
    this.localVideoStreamSub?.unsubscribe();
    this.localVideoStreamSub = undefined;
    if (!r) return;
    this.localVideoStreamSub = this.callService.localStream$.subscribe(stream => {
      r.nativeElement.srcObject = stream;
    });
  }

  @ViewChild('remoteVideo') set remoteVideoRef(r: ElementRef<HTMLVideoElement> | undefined) {
    this.remoteVideoStreamSub?.unsubscribe();
    this.remoteVideoStreamSub = undefined;
    if (!r) return;
    this.remoteVideoStreamSub = this.callService.remoteStream$.subscribe(stream => {
      // Directly assign — Angular property binding on [srcObject] is NOT reliable
      // across stream object replacements, so we always set the DOM property.
      r.nativeElement.srcObject = stream ?? null;
      if (stream) {
        r.nativeElement.play().catch(() => undefined);
      }
    });
  }

  // ── Call state ─────────────────────────────────────────────────────────────
  private readonly callSessionActive = signal(false);
  private readonly activeCallKind    = signal<CallType | null>(null);

  /** Incoming call pending user decision (shown in template instead of confirm()). */
  readonly incomingCall = signal<{ from: string; type: CallType } | null>(null);

  // Track mic / camera enabled state so the template can reflect it
  readonly micEnabled    = signal(true);
  readonly cameraEnabled = signal(true);

  // ── Chat / compose state ───────────────────────────────────────────────────
  messages        = signal<ChatMessage[]>([]);
  newMessage      = '';
  isSending       = false;
  isConnecting    = signal(true);
  connectionError = signal(false);

  currentUserId   = signal<string | null>(null);
  currentUserName = signal<string | null>(null);

  pendingPictures:     StagedPicture[]     = [];
  pendingAttachments:  File[]              = [];
  pendingVoiceRecords: StagedVoiceRecord[] = [];

  sendError = signal<string | null>(null);
  articlePickerOpen = signal(false);
  articleSearch = signal('');
  articleSearchResults = signal<ArticleSummaryResponse[]>([]);
  articleSearchLoading = signal(false);
  private articleSearchDebounce?: ReturnType<typeof setTimeout>;

  // ── Voice recording ────────────────────────────────────────────────────────
  isRecording   = signal(false);
  recordingSecs = signal(0);

  private mediaRecorder:     MediaRecorder | null                  = null;
  private activeStream:      MediaStream   | null                  = null;
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  // ── Lightbox ──────────────────────────────────────────────────────────────
  lightboxSrc = signal<string | null>(null);

  private msgSub?: Subscription;
  private readonly brokenOtherAvatars = new Set<string>();

  readonly loadingOlder = signal(false);
  readonly hasMoreOlder = signal(true);
  private prependScrollAnchor: { height: number; top: number } | null = null;
  private initialHistoryPageDone = false;

  readonly baseurl = Environment.baseUrl + 'Ticket';

  private readonly hubUiSub = new Subscription();

  // ── Screen-share mirrors ───────────────────────────────────────────────────
  private readonly isLocalScreenSharing  = signal(false);
  private readonly isRemoteScreenShare   = signal(false);
  private readonly screenShareWaitingSig = signal(false);
  private readonly incomingScreenShareFrom = signal<string | null>(null);
  private readonly screenShareErr        = signal<string | null>(null);

  readonly screenShare = {
    isSharingScreen:    () => this.isLocalScreenSharing(),
    isReceivingScreen:  () => this.isRemoteScreenShare(),
    isWaitingForAccept: () => this.screenShareWaitingSig(),
    incomingRequest:    () => this.incomingScreenShareFrom(),
    shareError:         () => this.screenShareErr(),
  };

  constructor(
    private chatService: TicketChatService,
    private authService: AuthService,
    private zone: NgZone,
    private callService: CallService,
    private ticketApi: ticketService,
    private articleService: ArticleService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.currentUserId.set(this.authService.getUserId());
    this.currentUserName.set(this.authService.getUserName());
    this.resetPaginationState();
    this.loadtargetUserId();

    // Session active / ended
    this.hubUiSub.add(
      this.callService.callSessionActive$.subscribe(active => {
        this.callSessionActive.set(active);
        if (!active) {
          this.activeCallKind.set(null);
          // Reset media controls for next call
          this.micEnabled.set(true);
          this.cameraEnabled.set(true);
        }
      }),
    );
    this.hubUiSub.add(
      this.callService.remoteStream$.subscribe(stream => {
        const el = this.remoteAudioRef?.nativeElement;
        if (!el) return;
        el.srcObject = stream ?? null;
        if (stream) el.play().catch(() => undefined);
      })
    );
    this.hubUiSub.add(
      this.callService.isAwaitingCallResponse$.subscribe(v =>
        this.isAwaitingCallResponse.set(v)
      )
    );

    // ── FIX: Subscribe to callAccepted$ so we know when the callee accepted.
    // activeCallKind is already set in startCall() before the invite is sent,
    // so we only need to clear it on rejection here.
    this.hubUiSub.add(
      this.callService.callAccepted$.subscribe(accepted => {
        if (!accepted) {
          // Remote rejected — clear the call kind so the UI resets cleanly.
          this.activeCallKind.set(null);
        }
        // When accepted, activeCallKind was already set in startCall(),
        // and callSessionActive$ will fire true to show the overlay.
      })
    );

    // Incoming call — store in signal, let template show a proper UI banner
    // instead of blocking confirm(), which freezes SignalR message processing.
    this.hubUiSub.add(
      this.callService.incomingCall$.subscribe(call => {
        if (!call) {
          this.incomingCall.set(null);
          return;
        }
        this.incomingCall.set(call);
      }),
    );

    this.hubUiSub.add(
      this.callService.isLocalScreenSharing$.subscribe(v => this.isLocalScreenSharing.set(v)),
    );
    this.hubUiSub.add(
      this.callService.isRemoteScreenShare$.subscribe(v => this.isRemoteScreenShare.set(v)),
    );
    this.hubUiSub.add(
      this.callService.screenShareWaiting$.subscribe(v => this.screenShareWaitingSig.set(v)),
    );
    this.hubUiSub.add(
      this.callService.incomingScreenShareRequest$.subscribe(v => this.incomingScreenShareFrom.set(v)),
    );
    this.hubUiSub.add(
      this.callService.screenShareError$.subscribe(v => this.screenShareErr.set(v)),
    );

    this.chatService
      .startConnection()
      .then(() => {
        this.isConnecting.set(false);
        this.chatService.joinTicket(this.ticketId);
        this.chatService.markAsSeen(this.ticketId);
        this.chatService.loadTicketMessages(this.ticketId);

      })
      .catch(() => {
        this.isConnecting.set(false);
        this.connectionError.set(true);
      });

    this.msgSub = this.chatService.getMessages(this.ticketId).subscribe(msgs => {
      const anchor = this.prependScrollAnchor;
      this.messages.set(msgs);
      console.log(this.hasMoreOlder(),"hasMoreOlder")
      if (anchor) {
        this.prependScrollAnchor = null;
        setTimeout(() => {
          const el = this.messageListRef?.nativeElement;
          if (el) {
            el.scrollTop = anchor.top + (el.scrollHeight - anchor.height);
          }
        }, 0);
      } else {
        setTimeout(() => this.scrollToBottom(), 50);
      }
      if (!anchor && msgs.length > 0 && !this.initialHistoryPageDone) {
        this.initialHistoryPageDone = true;
        this.hasMoreOlder.set(msgs.length >= 20);
        console.log(this.hasMoreOlder(),"hasMoreOlder")
      }
    });
  }

  private resetPaginationState(): void {
    this.hasMoreOlder.set(true);
    this.initialHistoryPageDone = false;
    this.prependScrollAnchor = null;
  }

  canLoadOlderMessages(): boolean {
    return this.messages().length > 0 && !!oldestMessageCursorId(this.messages());
  }

  loadOlderMessages(): void {
    const cursor = oldestMessageCursorId(this.messages());
    if (!cursor || this.loadingOlder() || !this.hasMoreOlder()) {
      return;
    }
    const el = this.messageListRef?.nativeElement;
    if (el) {
      this.prependScrollAnchor = { height: el.scrollHeight, top: el.scrollTop };
    }
    this.loadingOlder.set(true);
    this.ticketApi
      .Get20More(cursor)
      .pipe(finalize(() => this.loadingOlder.set(false)))
      .subscribe({
        next: rows => {
          const chunk = messangerRowsToChatMessages(rows);
          if (chunk.length < 20) {
            this.hasMoreOlder.set(false);
          }
          this.chatService.prependOlderMessages(this.ticketId, chunk as ChatMessage[]);
        },
        error: () => {
          this.prependScrollAnchor = null;
        },
      });
  }

  ngOnDestroy(): void {
    this.msgSub?.unsubscribe();
    this.hubUiSub.unsubscribe();
    this.localVideoStreamSub?.unsubscribe();
    this.remoteVideoStreamSub?.unsubscribe();
    if (this.callSessionActive()) {
      const t = this.targetUserId();
      if (t) void this.callService.endCall(t);
    }
    this.chatService.leaveTicket(this.ticketId);
    this.cleanupRecording();
    this.revokeStagedUrls();
    void this.callService.stopScreenShare();
    if (this.articleSearchDebounce) {
      clearTimeout(this.articleSearchDebounce);
      this.articleSearchDebounce = undefined;
    }
  }

  // ── Call actions ───────────────────────────────────────────────────────────
  readonly isAwaitingCallResponse = signal(false);

  startCall(type: CallType = 'video'): void {
    const target = this.targetUserId();
    if (!target) {
      this.showError('Cannot start call: the ticket must be assigned first.');
      return;
    }
    if (this.callSessionActive()) {
      this.showError('You already have an active call.');
      return;
    }
    // Prevent double-click
    if (this.callActive()) return;

    // ── FIX: Set activeCallKind NOW so the overlay renders as soon as
    // callSessionActive becomes true (after the remote accepts).
    // Without this, videoCallActive() returns false for the caller even
    // after acceptance, so the <video> elements never mount and the
    // @ViewChild setters never fire — meaning no stream gets shown.
    this.activeCallKind.set(type);

    void this.callService.requestCall(target, type).catch((err) => {
      console.error('startCall error:', err);
      this.activeCallKind.set(null); // reset on failure
    });
  }

  cancelOutgoingCall(): void {
    const target = this.targetUserId();
    if (target) void this.callService.endCall(target);
    this.activeCallKind.set(null);
  }

  /** Called from the template's incoming-call banner — Accept button. */
  acceptIncomingCall(): void {
    const call = this.incomingCall();
    if (!call) return;
    this.incomingCall.set(null);
    this.activeCallKind.set(call.type);

    void this.callService.acceptCall(call.from, call.type);
  }

  /** Called from the template's incoming-call banner — Decline button. */
  declineIncomingCall(): void {
    const call = this.incomingCall();
    if (!call) return;
    this.incomingCall.set(null);
    void this.callService.rejectCall(call.from);
  }

  endCall(): void {
    const target = this.targetUserId();
    if (!target) return;
    void this.callService.endCall(target);
  }

  onStopCallOrShare(): void {
    if (this.screenShare.isSharingScreen()) {
      void this.callService.stopScreenShare();
      return;
    }
    this.endCall();
  }

  callActive(): boolean {
    return this.callSessionActive();
  }

  videoCallActive(): boolean {
    return this.callSessionActive() && this.activeCallKind() === 'video';
  }

  showCallMediaOverlay(): boolean {
    return (
      this.callSessionActive()
      || this.screenShare.isSharingScreen()
      || this.screenShare.isReceivingScreen()
    );
  }

  callOverlayLabel(): string {
    if (this.screenShare.isSharingScreen() && !this.screenShare.isReceivingScreen()) {
      return 'You are sharing your screen';
    }
    if (this.screenShare.isReceivingScreen()) {
      return 'Viewing shared screen';
    }
    if (this.callSessionActive() && this.activeCallKind() === 'video') {
      return 'Video call';
    }
    if (this.callSessionActive() && this.activeCallKind() === 'audio') {
      return 'Audio call';
    }
    return '';
  }

  // Toggle mic/camera and update signal so template button reflects state
  toggleMic(enabled?: boolean): void {
    const next = enabled !== undefined ? enabled : !this.micEnabled();
    this.micEnabled.set(next);
    this.callService.toggleMic(next);
  }

  toggleCamera(enabled?: boolean): void {
    const next = enabled !== undefined ? enabled : !this.cameraEnabled();
    this.cameraEnabled.set(next);
    this.callService.toggleCamera(next);
  }

  // ── Screen share ───────────────────────────────────────────────────────────

  targetUserId = signal<string | null>(null);

  loadtargetUserId(): void {
    const me = this.currentUserId();
    console.log(me,"me", this.otherpartId, "otherpartId", this.ticketCreatorId, "ticketCreatorId", this.assignedUserId, "assignedUserId","allparts");
    if (!me) this.targetUserId.set(null);
    if (this.otherpartId) this.targetUserId.set(this.otherpartId);
    if (me === this.ticketCreatorId && this.assignedUserId)  this.targetUserId.set(this.assignedUserId);
    if (me === this.assignedUserId  && this.ticketCreatorId) this.targetUserId.set(this.ticketCreatorId);
  }

  shareScreenTooltip(): string {
    if (this.screenShare.isSharingScreen()) return 'Stop sharing your screen';
    if (!this.targetUserId()) return 'Cannot share: ticket must be assigned first';
    return 'Share your screen';
  }

  startShare(): void {
    const target = this.targetUserId();
    if (!target) {
      this.showError('Cannot share: the ticket must be assigned first.');
      return;
    }
    // Tell the service who to connect to before starting the share
    this.callService.setTargetUser(target);
    void this.callService.startScreenShare();
  }

  stopShare(): void {
    void this.callService.stopScreenShare();
  }

  acceptShare(fromId: string): void {
    this.callService.dismissScreenShareInvite(true, fromId);
  }

  declineShare(fromId: string): void {
    this.callService.dismissScreenShareInvite(false, fromId);
  }

  cancelShareRequest(): void {
    this.callService.cancelOutgoingScreenShare();
  }

  getShareRequesterName(userId: string): string {
    return this.messages().find(m => m.userId === userId)?.userName ?? 'Someone';
  }

  // ── Sending ────────────────────────────────────────────────────────────────

  sendMessage(): void {
    const text     = this.newMessage.trim();
    const hasPics  = this.pendingPictures.length > 0;
    const hasFiles = this.pendingAttachments.length > 0;
    const hasVoice = this.pendingVoiceRecords.length > 0;
    if (!text && !hasPics && !hasFiles && !hasVoice) return;
    if (this.isSending) return;

    const allFiles = [
      ...this.pendingPictures.map(p => p.file),
      ...this.pendingAttachments,
      ...this.pendingVoiceRecords.map(v => v.file),
    ];
    const oversized = TicketChatService.oversizedFiles(allFiles);
    if (oversized.length) {
      const limitMB = (TicketChatService.MAX_FILE_BYTES / (1024 * 1024)).toFixed(0);
      this.showError(`File too large: "${oversized[0].name}". Max size is ${limitMB} MB per file.`);
      return;
    }

    this.isSending = true;
    this.sendError.set(null);

    this.chatService
      .sendMessage(
        this.ticketId,
        text,
        this.pendingPictures.map(p => p.file),
        this.pendingAttachments,
        this.pendingVoiceRecords.map(v => v.file),
      )
      .then(() => this.resetCompose())
      .catch(err => {
        console.error('[Chat] Send error:', err);
        this.showError('Failed to send message. Please try again.');
        this.isSending = false;
      });
  }

  onEnter(event: Event): void {
    if (!(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private resetCompose(): void {
    this.newMessage      = '';
    this.revokeStagedUrls();
    this.pendingPictures     = [];
    this.pendingAttachments  = [];
    this.pendingVoiceRecords = [];
    this.isSending = false;
  }

  private showError(msg: string, durationMs = 8000): void {
    this.sendError.set(msg);
    setTimeout(() => this.sendError.set(null), durationMs);
  }

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

  sendArticleFromPicker(article: ArticleSummaryResponse): void {
    const link = this.tagArticleLink(this.articleLink(article.id));
    const text = this.newMessage.trim();
    this.newMessage = text ? `${text}\n${link}` : link;
    this.closeArticlePicker();
  }

  // ── Picture picking ────────────────────────────────────────────────────────

  onPictureChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const staged = Array.from(input.files).map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      this.pendingPictures = [...this.pendingPictures, ...staged];
    }
    input.value = '';
  }

  removePicture(index: number): void {
    URL.revokeObjectURL(this.pendingPictures[index].previewUrl);
    this.pendingPictures = this.pendingPictures.filter((_, i) => i !== index);
  }

  // ── Attachment picking ─────────────────────────────────────────────────────

  onAttachmentChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.pendingAttachments = [...this.pendingAttachments, ...Array.from(input.files)];
    }
    input.value = '';
  }

  removeAttachment(index: number): void {
    this.pendingAttachments = this.pendingAttachments.filter((_, i) => i !== index);
  }

  // ── Voice recording ────────────────────────────────────────────────────────

  startRecording(): void {
    if (this.isRecording()) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      const isHttp      = location.protocol === 'http:';
      const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      if (isHttp && !isLocalhost) {
        this.showError(
          'Voice recording requires a secure connection. ' +
          'During development you can either: ' +
          '(1) Open the app on http://localhost (not an IP address), or ' +
          '(2) In Chrome go to chrome://flags → "Insecure origins treated as secure" → add ' +
          location.origin + ' → Relaunch.'
        );
      } else {
        this.showError('Voice recording is not supported in this browser.');
      }
      return;
    }

    const doRecord = () =>
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => {
          this.activeStream = stream;

          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/ogg';

          const mr     = new MediaRecorder(stream, { mimeType });
          const chunks: Blob[] = [];

          mr.ondataavailable = e => {
            this.zone.run(() => {
              if (e.data.size > 0) chunks.push(e.data);
            });
          };

          mr.onstop = () => {
            this.zone.run(() => {
              stream.getTracks().forEach(t => t.stop());
              this.activeStream = null;

              const blob = new Blob(chunks, { type: mimeType });
              const ext  = mimeType.includes('ogg') ? 'ogg' : 'webm';
              const file = new File(
                [blob],
                `voice-note-${Date.now()}.${ext}`,
                { type: mimeType }
              );
              const rec: StagedVoiceRecord = {
                file,
                previewUrl:   URL.createObjectURL(blob),
                durationSecs: this.recordingSecs(),
              };

              this.pendingVoiceRecords = [...this.pendingVoiceRecords, rec];
              this.isRecording.set(false);
              this.recordingSecs.set(0);
              clearInterval(this.recordingInterval!);
              this.recordingInterval = null;
            });
          };

          this.mediaRecorder = mr;
          mr.start(100);

          this.isRecording.set(true);
          this.recordingSecs.set(0);
          this.recordingInterval = setInterval(
            () => this.recordingSecs.update(s => s + 1),
            1000
          );
        })
        .catch((err: unknown) => {
          console.error('[Chat] Microphone error:', err);
          const name = (err as { name?: string })?.name;
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            this.showError(
              'Microphone blocked. Click the 🔒 icon in the address bar → set Microphone to "Allow", then try again.'
            );
          } else if (name === 'NotFoundError') {
            this.showError(
              'Microphone not accessible. Possible causes: ' +
              '(1) Windows Settings → Privacy → Microphone — make sure this browser is allowed. ' +
              '(2) Another app is using the mic exclusively. ' +
              '(3) No audio input device is connected.'
            );
          } else if (name === 'NotReadableError') {
            this.showError(
              'Microphone is busy or unavailable. Close other apps using the microphone (e.g. Teams, Zoom) and try again.'
            );
          } else if (name === 'OverconstrainedError') {
            this.showError('Your microphone does not meet the required audio constraints. Try a different device.');
          } else if (name === 'SecurityError') {
            this.showError('Microphone access is blocked by a security policy. Make sure the page is served over HTTPS.');
          } else {
            this.showError(`Could not start recording (${name ?? 'unknown error'}). Check your microphone and browser settings.`);
          }
        });

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then(status => {
          if (status.state === 'denied') {
            this.showError(
              'Microphone access is blocked. Click the 🔒 icon in your browser address bar, set Microphone to "Allow", then refresh and try again.'
            );
          } else {
            doRecord();
          }
        })
        .catch(() => doRecord());
    } else {
      doRecord();
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  removeVoiceRecord(index: number): void {
    URL.revokeObjectURL(this.pendingVoiceRecords[index].previewUrl);
    this.pendingVoiceRecords = this.pendingVoiceRecords.filter((_, i) => i !== index);
  }

  formatDuration(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  private cleanupRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.activeStream?.getTracks().forEach(t => t.stop());
    clearInterval(this.recordingInterval!);
    this.recordingInterval = null;
    this.isRecording.set(false);
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  isMyMessage(msg: ChatMessage): boolean {
    return msg.userId === this.currentUserId();
  }

  getFileUrl(filename: string): string {
    return filename;
  }

  getpicurl(picture: string): string {
    return `${Environment.baseUrl}Files/${picture}`;
  }

  private otherAvatarKey(msg: ChatMessage): string {
    return `${msg.userId}\0${msg.date}`;
  }

  otherUserAvatarUrl(msg: ChatMessage): string | null {
    return this.authService.resolvePictureUrl(
      msg.userPicture != null ? Environment.baseUrl + 'files/' + msg.userPicture : null
    );
  }

  otherUserAvatarBroken(msg: ChatMessage): boolean {
    return this.brokenOtherAvatars.has(this.otherAvatarKey(msg));
  }

  onOtherUserAvatarError(msg: ChatMessage): void {
    this.brokenOtherAvatars.add(this.otherAvatarKey(msg));
  }

  otherUserAvatarInitials(msg: ChatMessage): string {
    const raw = (msg.userName || msg.userId || '?').trim();
    if (!raw) return '?';
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }

  getAttachmentName(path: string): string {
    return path.split('/').pop() ?? path;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const today   = new Date();
    const isToday =
      d.getDate()     === today.getDate()     &&
      d.getMonth()    === today.getMonth()    &&
      d.getFullYear() === today.getFullYear();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return (
      d.toLocaleDateString([], { day: '2-digit', month: 'short' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
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

  // ── Lightbox ───────────────────────────────────────────────────────────────

  openLightbox(filename: string): void {
    this.lightboxSrc.set(this.getFileUrl(filename));
  }

  closeLightbox(): void {
    this.lightboxSrc.set(null);
  }

  // ── Scroll ─────────────────────────────────────────────────────────────────

  private scrollToBottom(): void {
    const el = this.messageListRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ── Cleanup helpers ────────────────────────────────────────────────────────

  private revokeStagedUrls(): void {
    this.pendingPictures.forEach(p => URL.revokeObjectURL(p.previewUrl));
    this.pendingVoiceRecords.forEach(v => URL.revokeObjectURL(v.previewUrl));
  }

  // ── Send-button gate ───────────────────────────────────────────────────────

  get canSend(): boolean {
    return (
      !this.isSending &&
      !this.connectionError() &&
      (
        !!this.newMessage.trim()         ||
        this.pendingPictures.length     > 0 ||
        this.pendingAttachments.length  > 0 ||
        this.pendingVoiceRecords.length > 0
      )
    );
  }
}