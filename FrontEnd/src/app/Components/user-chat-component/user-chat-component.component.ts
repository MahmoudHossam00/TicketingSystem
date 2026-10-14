import {
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';
import { ChatMessage, TaskChatService } from '../../Services/TaskChat.service';
import { UserChatService } from '../../Services/userchat.service';
import { AuthService } from '../../Services/auth.service';
import { Environment } from '../../base/environment';
import { CallService, CallType } from '../../Services/communicationhub.service';
import {
  messangerRowsToChatMessages,
  oldestMessageCursorId,
} from '../../utils/chat-history-pagination';

interface StagedPicture {
  file: File;
  previewUrl: string;
}

interface StagedVoiceRecord {
  file: File;
  previewUrl: string;
  durationSecs: number;
}

@Component({
  selector: 'app-user-chat-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-chat-component.component.html',
  styleUrl: './user-chat-component.component.css',
})
export class UserChatComponentComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) otherUserId!: string;

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
      r.nativeElement.srcObject = stream ?? null;
      if (stream) {
        r.nativeElement.play().catch(() => undefined);
      }
    });
  }

  private readonly callSessionActive = signal(false);
  private readonly activeCallKind = signal<CallType | null>(null);
  readonly incomingCall = signal<{ from: string; type: CallType } | null>(null);
  readonly micEnabled = signal(true);
  readonly cameraEnabled = signal(true);
  readonly isAwaitingCallResponse = signal(false);

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

  private readonly hubUiSub = new Subscription();

  messages = signal<ChatMessage[]>([]);
  newMessage = '';
  isSending = false;
  isConnecting = signal(true);
  connectionError = signal(false);

  currentUserId = signal<string | null>(null);
  currentUserName = signal<string | null>(null);

  pendingPictures: StagedPicture[] = [];
  pendingAttachments: File[] = [];
  pendingVoiceRecords: StagedVoiceRecord[] = [];

  sendError = signal<string | null>(null);

  isRecording = signal(false);
  recordingSecs = signal(0);

  private mediaRecorder: MediaRecorder | null = null;
  private activeStream: MediaStream | null = null;
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  lightboxSrc = signal<string | null>(null);

  private msgSub?: Subscription;
  private readonly brokenOtherAvatars = new Set<string>();

  readonly loadingOlder = signal(false);
  readonly hasMoreOlder = signal(true);
  private prependScrollAnchor: { height: number; top: number } | null = null;
  private initialHistoryPageDone = false;

  constructor(
    private userChat: UserChatService,
    private authService: AuthService,
    private zone: NgZone,
    private callService: CallService,
  ) {}

  ngOnInit(): void {
    this.currentUserId.set(this.authService.getUserId());
    this.currentUserName.set(this.authService.getUserName());
    this.wireCallHubUi();
    this.attachToThread();
  }

  /** Trimmed peer id for WebRTC / CommunicationHub. */
  private callTargetId(): string | null {
    const id = this.otherUserId?.trim();
    return id ? id : null;
  }

  private wireCallHubUi(): void {
    this.hubUiSub.add(
      this.callService.callSessionActive$.subscribe(active => {
        this.callSessionActive.set(active);
        if (!active) {
          this.activeCallKind.set(null);
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
      }),
    );
    this.hubUiSub.add(
      this.callService.isAwaitingCallResponse$.subscribe(v => this.isAwaitingCallResponse.set(v)),
    );
    this.hubUiSub.add(
      this.callService.callAccepted$.subscribe(accepted => {
        if (!accepted) {
          this.activeCallKind.set(null);
        }
      }),
    );
    this.hubUiSub.add(
      this.callService.incomingCall$.subscribe(call => {
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    const idCh = changes['otherUserId'];
    if (!idCh) return;
    const prev = (idCh.previousValue as string | undefined)?.trim?.() ?? '';
    const cur = (idCh.currentValue as string | undefined)?.trim?.() ?? '';
    if (prev === cur) return;
    if (this.callSessionActive() && prev) {
      void this.callService.endCall(prev);
    }
    this.msgSub?.unsubscribe();
    this.messages.set([]);
    this.attachToThread();
  }
  private attachToThread(): void {
    this.msgSub?.unsubscribe();
    this.msgSub = undefined;
    this.resetPaginationState();

    this.currentUserId.set(this.authService.getUserId());
    this.currentUserName.set(this.authService.getUserName());

    if (!this.otherUserId?.trim()) {
      this.isConnecting.set(false);
      this.connectionError.set(true);
      return;
    }

    this.connectionError.set(false);
    this.isConnecting.set(true);

    const peer = this.callTargetId();
    if (peer) {
      this.callService.setTargetUser(peer);
    }

    this.userChat
  .startConnection()
  .then(async () => {
    this.isConnecting.set(false);

    await this.userChat.loadMessagesWithUser(this.otherUserId);

    this.userChat.markAsSeen(this.otherUserId);
  })
  .catch(() => {
    this.isConnecting.set(false);
    this.connectionError.set(true);
  });

    this.msgSub = this.userChat.getMessages(this.otherUserId).subscribe(msgs => {
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
    if (!cursor || this.loadingOlder() || !this.hasMoreOlder() || !this.otherUserId?.trim()) {
      return;
    }
    const el = this.messageListRef?.nativeElement;
    if (el) {
      this.prependScrollAnchor = { height: el.scrollHeight, top: el.scrollTop };
    }
    this.loadingOlder.set(true);
    this.authService
      .Get20More(cursor)
      .pipe(finalize(() => this.loadingOlder.set(false)))
      .subscribe({
        next: rows => {
          const chunk = messangerRowsToChatMessages(rows);
          if (chunk.length < 20) {
            this.hasMoreOlder.set(false);
          }
          this.userChat.prependOlderMessages(this.otherUserId, chunk as ChatMessage[]);
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
      const t = this.callTargetId();
      if (t) void this.callService.endCall(t);
    }
    void this.callService.stopScreenShare();
    this.cleanupRecording();
    this.revokeStagedUrls();
  }

  startCall(type: CallType = 'video'): void {
    const target = this.callTargetId();
    if (!target) {
      this.showError('Cannot start call: no chat partner selected.');
      return;
    }
    if (this.callSessionActive()) {
      this.showError('You already have an active call.');
      return;
    }

    this.activeCallKind.set(type);
    void this.callService.requestCall(target, type).catch(err => {
      console.error('startCall error:', err);
      this.activeCallKind.set(null);
    });
  }

  cancelOutgoingCall(): void {
    const target = this.callTargetId();
    if (target) void this.callService.endCall(target);
    this.activeCallKind.set(null);
  }

  acceptIncomingCall(): void {
    const call = this.incomingCall();
    if (!call) return;
    this.incomingCall.set(null);
    this.activeCallKind.set(call.type);
    void this.callService.acceptCall(call.from, call.type);
  }

  declineIncomingCall(): void {
    const call = this.incomingCall();
    if (!call) return;
    this.incomingCall.set(null);
    void this.callService.rejectCall(call.from);
  }

  endCall(): void {
    const target = this.callTargetId();
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
      this.callSessionActive() ||
      this.screenShare.isSharingScreen() ||
      this.screenShare.isReceivingScreen()
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

  shareScreenTooltip(): string {
    if (this.screenShare.isSharingScreen()) return 'Stop sharing your screen';
    if (!this.callTargetId()) return 'Cannot share: no chat partner selected';
    return 'Share your screen';
  }

  startShare(): void {
    const target = this.callTargetId();
    if (!target) {
      this.showError('Cannot share: no chat partner selected.');
      return;
    }
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
    const m = this.messages().find(
      msg => this.messageAuthorId(msg) === userId || msg.userId === userId,
    );
    return m?.userName ?? 'Someone';
  }


  sendMessage(): void {
    const text = this.newMessage.trim();
    const hasPics = this.pendingPictures.length > 0;
    const hasFiles = this.pendingAttachments.length > 0;
    const hasVoice = this.pendingVoiceRecords.length > 0;
    if (!text && !hasPics && !hasFiles && !hasVoice) return;
    if (this.isSending) return;

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

    this.userChat
      .sendMessage(
        this.otherUserId,
        text,
        this.pendingPictures.map(p => p.file),
        this.pendingAttachments,
        this.pendingVoiceRecords.map(v => v.file),
      )
      .then(() => this.resetCompose())
      .catch(err => {
        console.error('[UserChat] Send error:', err);
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
    this.pendingPictures = [];
    this.pendingAttachments = [];
    this.pendingVoiceRecords = [];
    this.isSending = false;
  }

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

  startRecording(): void {
    if (this.isRecording()) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      const isHttp = location.protocol === 'http:';
      const isLocalhost =
        location.hostname === 'localhost' || location.hostname === '127.0.0.1';

      if (isHttp && !isLocalhost) {
        this.showError(
          'Voice recording requires a secure connection. Use HTTPS or localhost.',
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

          const mr = new MediaRecorder(stream, { mimeType });
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
              const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
              const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: mimeType });
              const rec: StagedVoiceRecord = {
                file,
                previewUrl: URL.createObjectURL(blob),
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
          this.recordingInterval = setInterval(() => this.recordingSecs.update(s => s + 1), 1000);
        })
        .catch((err: unknown) => {
          console.error('[UserChat] Microphone error:', err);
          this.showError('Could not access microphone.');
        });

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then(status => {
          if (status.state === 'denied') {
            this.showError('Microphone access is blocked in your browser settings.');
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

  /** API / SignalR may send `userId` or `UserId`. */
  private messageAuthorId(msg: ChatMessage): string {
    const x = msg as ChatMessage & { UserId?: string };
    const raw = msg.userId ?? x.UserId;
    return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
  }

  private myUserIdNormalized(): string {
    const raw =
      (this.currentUserId() ?? this.authService.getUserId() ?? '').trim();
    return raw.toLowerCase();
  }

  isMyMessage(msg: ChatMessage): boolean {
    const me = this.myUserIdNormalized();
    if (!me) return false;
    return this.messageAuthorId(msg).toLowerCase() === me;
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
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
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

  openLightbox(filename: string): void {
    this.lightboxSrc.set(this.getFileUrl(filename));
  }

  closeLightbox(): void {
    this.lightboxSrc.set(null);
  }

  private scrollToBottom(): void {
    const el = this.messageListRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private revokeStagedUrls(): void {
    this.pendingPictures.forEach(p => URL.revokeObjectURL(p.previewUrl));
    this.pendingVoiceRecords.forEach(v => URL.revokeObjectURL(v.previewUrl));
  }

  get canSend(): boolean {
    return (
      !this.isSending &&
      !this.connectionError() &&
      (!!this.newMessage.trim() ||
        this.pendingPictures.length > 0 ||
        this.pendingAttachments.length > 0 ||
        this.pendingVoiceRecords.length > 0)
    );
  }
}
