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
import { ChatMessage, TaskChatService } from '../../Services/TaskChat.service';
import { AuthService } from '../../Services/auth.service';
import { Environment } from '../../base/environment';
import { CallService } from '../../Services/communicationhub.service';
import { TasksService } from '../../Services/tasks.service';
import {
  messangerRowsToChatMessages,
  oldestMessageCursorId,
} from '../../utils/chat-history-pagination';

// ── Staged-file types ─────────────────────────────────────────────────────────

/** A picture staged for the next send with a stable, pre-computed blob URL. */
interface StagedPicture {
  file: File;
  previewUrl: string;
}

/** A voice recording staged for the next send. */
interface StagedVoiceRecord {
  file: File;
  /** Blob URL for in-compose audio preview. Revoked after send/remove. */
  previewUrl: string;
  durationSecs: number;
}

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-task-chat-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-chat-component.component.html',
  styleUrl: './task-chat-component.component.css',
})
export class TaskChatComponentComponent implements OnInit, OnDestroy {
  @Input({ required: true }) taskId!: string;

  /** Current task assignee (`TaskResponse.userId`). */
  @Input() taskAssigneeUserId = '';
  /** Other participant (e.g. project owner) for screen-share targeting. */
  @Input() taskPeerUserId = '';

  @ViewChild('messageList') messageListRef!: ElementRef<HTMLDivElement>;

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
      r.nativeElement.srcObject = stream;
    });
  }

  // ── State ─────────────────────────────────────────────────────────────────

  messages= signal<ChatMessage[]>([]);
  newMessage = '';
  isSending = false;
  isConnecting = signal(true);
  connectionError = signal(false);

  currentUserId  = signal<string | null>(null);
  currentUserName = signal<string | null>(null);

  pendingPictures:     StagedPicture[]    = [];
  pendingAttachments:  File[]             = [];
  pendingVoiceRecords: StagedVoiceRecord[] = [];

  /** User-visible error (e.g. file too large, send failed). Auto-clears after 5 s. */
  sendError = signal<string | null>(null);

  // ── Voice recording (signals so native callbacks trigger change detection) ─
  isRecording   = signal(false);
  recordingSecs = signal(0);

  private mediaRecorder:     MediaRecorder | null                    = null;
  private activeStream:      MediaStream   | null                    = null;
  private recordingInterval: ReturnType<typeof setInterval> | null   = null;

  // ── Lightbox ──────────────────────────────────────────────────────────────
  lightboxSrc = signal<string | null>(null);

  private msgSub?: Subscription;
  /** Keys for messages whose remote avatar image failed to load (show initials). */
  private readonly brokenOtherAvatars = new Set<string>();

  readonly loadingOlder = signal(false);
  readonly hasMoreOlder = signal(true);
  private prependScrollAnchor: { height: number; top: number } | null = null;
  private initialHistoryPageDone = false;

  private readonly hubUiSub = new Subscription();

  private readonly isLocalScreenSharing = signal(false);
  private readonly isRemoteScreenShare = signal(false);
  private readonly screenShareWaitingSig = signal(false);
  private readonly incomingScreenShareFrom = signal<string | null>(null);
  private readonly screenShareErr = signal<string | null>(null);

  readonly screenShare = {
    isSharingScreen: () => this.isLocalScreenSharing(),
    isReceivingScreen: () => this.isRemoteScreenShare(),
    isWaitingForAccept: () => this.screenShareWaitingSig(),
    incomingRequest: () => this.incomingScreenShareFrom(),
    shareError: () => this.screenShareErr(),
  };

  constructor(
    private chatService: TaskChatService,
    private authService: AuthService,
    private zone: NgZone,
    private callService: CallService,
    private tasksService: TasksService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.currentUserId.set(this.authService.getUserId());
    this.currentUserName.set(this.authService.getUserName());
    this.resetPaginationState();

    this.hubUiSub.add(
      this.callService.incomingCall$.subscribe(call => {
        if (!call) return;
        const accept = confirm(`${call.from} is calling you (${call.type})`);
        if (accept) {
          void this.callService.acceptCall(call.from, call.type);
        } else {
          void this.callService.rejectCall(call.from);
        }
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
  .then(async () => {
    this.isConnecting.set(false);
    this.chatService.joinTask(this.taskId);
    await this.chatService.loadTaskMessages(this.taskId);
    this.chatService.markAsSeen(this.taskId);
  })
  .catch(() => {
    this.isConnecting.set(false);
    this.connectionError.set(true);
  });

    this.msgSub = this.chatService.getMessages(this.taskId).subscribe(msgs => {
      const anchor = this.prependScrollAnchor;
      this.messages.set(msgs);
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
    this.tasksService
      .Get20More(cursor)
      .pipe(finalize(() => this.loadingOlder.set(false)))
      .subscribe({
        next: rows => {
          const chunk = messangerRowsToChatMessages(rows);
          if (chunk.length < 20) {
            this.hasMoreOlder.set(false);
          }
          this.chatService.prependOlderMessages(this.taskId, chunk as ChatMessage[]);
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
    this.chatService.leaveTask(this.taskId);
    this.cleanupRecording();
    this.revokeStagedUrls();
    void this.callService.stopScreenShare();
  }

  // ── Sending ────────────────────────────────────────────────────────────────

  sendMessage(): void {
    const text = this.newMessage.trim();
    const hasPics  = this.pendingPictures.length > 0;
    const hasFiles = this.pendingAttachments.length > 0;
    const hasVoice = this.pendingVoiceRecords.length > 0;
    if (!text && !hasPics && !hasFiles && !hasVoice) return;
    if (this.isSending) return;

    // ── Size guard ────────────────────────────────────────────────────────
    const allFiles = [
      ...this.pendingPictures.map(p => p.file),
      ...this.pendingAttachments,
      ...this.pendingVoiceRecords.map(v => v.file),
    ];
    const oversized = TaskChatService.oversizedFiles(allFiles);
    if (oversized.length) {
      const limitMB = (TaskChatService.MAX_FILE_BYTES / (1024 * 1024)).toFixed(0);
      this.showError(`File too large: "${oversized[0].name}". Max size is ${limitMB} MB per file.`);
      return;
    }

    this.isSending = true;
    this.sendError.set(null);

    this.chatService
      .sendMessage(
        this.taskId,
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

  private showError(msg: string, durationMs = 8000): void {
    this.sendError.set(msg);
    setTimeout(() => this.sendError.set(null), durationMs);
  }

  onEnter(event: Event): void {
    if (!(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private resetCompose(): void {
    this.newMessage = '';
    this.revokeStagedUrls();
    this.pendingPictures     = [];
    this.pendingAttachments  = [];
    this.pendingVoiceRecords = [];
    this.isSending = false;
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

    // getUserMedia is only available in a secure context (HTTPS or localhost).
    if (!navigator.mediaDevices?.getUserMedia) {
      const isHttp = location.protocol === 'http:';
      const isLocalhost =
        location.hostname === 'localhost' || location.hostname === '127.0.0.1';

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

    // Query existing permission state so we can give a useful message
    // if the user already denied access rather than silently failing.
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

        // ondataavailable is a native event — run inside zone so Angular sees it
        mr.ondataavailable = e => {
          this.zone.run(() => {
            if (e.data.size > 0) chunks.push(e.data);
          });
        };

        // onstop is also native — wrap entirely in zone.run()
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
        mr.start(100); // collect data every 100 ms for reliable chunks

        // setInterval IS zone-patched, but signals make the template binding robust
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

    // Use Permissions API when available to detect denied state before calling getUserMedia.
    // If already denied the browser won't show any prompt — we surface instructions instead.
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then(status => {
          if (status.state === 'denied') {
            this.showError(
              'Microphone access is blocked. Click the 🔒 icon in your browser address bar, set Microphone to "Allow", then refresh and try again.'
            );
          } else {
            // 'granted' or 'prompt' — getUserMedia will either work or show the browser dialog
            doRecord();
          }
        })
        .catch(() => doRecord()); // Permissions API unavailable — fall back to getUserMedia directly
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
    return this.chatService.getFileUrl(this.taskId, filename);
  }
  getpicurl(picture: string): string {
    return `${Environment.baseUrl}Files/${picture}`;
  }

  private otherAvatarKey(msg: ChatMessage): string {
    return `${msg.userId}\0${msg.date}`;
  }

  otherUserAvatarUrl(msg: ChatMessage): string | null {
    return this.authService.resolvePictureUrl(
      msg.userPicture != null ? Environment.baseUrl + 'files/' + msg.userPicture : null,
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
    const today = new Date();
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

  // ── Screen share ───────────────────────────────────────────────────────────

  /**
   * Peer for screen share: assignee ↔ project owner (or other `taskPeerUserId`).
   */
  get targetUserId(): string | null {
    const me = this.currentUserId();
    if (!me) return null;
    const assignee = this.taskAssigneeUserId;
    const peer = this.taskPeerUserId;
    if (me === assignee && peer) return peer;
    if (me === peer && assignee) return assignee;
    return null;
  }

  startShare(): void {
    if (!this.targetUserId) {
      this.showError('Cannot share: no peer user is available for this task.');
      return;
    }
    void this.callService.startScreenShare();
  }

  stopShare(): void {
    void this.callService.stopScreenShare();
  }

  cancelShareRequest(): void {
    this.callService.cancelOutgoingScreenShare();
  }

  acceptShare(fromUserId: string): void {
    this.callService.dismissScreenShareInvite(true, fromUserId);
  }

  declineShare(fromUserId: string): void {
    this.callService.dismissScreenShareInvite(false, fromUserId);
  }

  /** Tries to find a display name for a userId from the message history. */
  getShareRequesterName(userId: string): string {
    return this.messages().find(m => m.userId === userId)?.userName ?? 'Someone';
  }

  // ── Send-button gate ───────────────────────────────────────────────────────

  get canSend(): boolean {
    return (
      !this.isSending &&
      !this.connectionError() &&
      (
        !!this.newMessage.trim() ||
        this.pendingPictures.length     > 0 ||
        this.pendingAttachments.length  > 0 ||
        this.pendingVoiceRecords.length > 0
      )
    );
  }
}
