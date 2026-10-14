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
import { ChatMessage, ProjectChatService } from '../../Services/ProjectChat.service';
import { AuthService } from '../../Services/auth.service';
import { Environment } from '../../base/environment';
import { ProjectService } from '../../Services/project.service';
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
  selector: 'app-project-chat-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-chat-component.component.html',
  styleUrl: './project-chat-component.component.css',
})
export class ProjectChatComponentComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) projectId!: string;

  /** When true, hide compose UI and block sending (e.g. project is closed). */
  @Input() composeDisabled = false;

  getpicurl(picture: string): string {
    return `${Environment.baseUrl}Files/${picture}`;
  }
  /** Project owner (submitter) user id — used with `projectPeerUserId` for screen share targeting. */
  @Input() projectOwnerUserId = '';
  /** Optional second participant (e.g. assigned contact). When empty, only non-owners can share with the owner. */
  @Input() projectPeerUserId = '';

  @ViewChild('messageList') messageListRef!: ElementRef<HTMLDivElement>;

  // @ViewChild('localVideo') set localVideoRef(r: ElementRef<HTMLVideoElement> | undefined) {
  //   this.screenShare.setLocalVideo(r?.nativeElement ?? null);
  // }
  // @ViewChild('remoteVideo') set remoteVideoRef(r: ElementRef<HTMLVideoElement> | undefined) {
  //   this.screenShare.setRemoteVideo(r?.nativeElement ?? null);
  // }

  messages = signal<ChatMessage[]>([]);
  newMessage = '';
  isSending = false;
  isConnecting = signal(true);
  connectionError = signal(false);

  currentUserId = signal<string | null>(null);

  pendingPictures: StagedPicture[] = [];
  pendingAttachments: File[] = [];
  pendingVoiceRecords: StagedVoiceRecord[] = [];

  sendError = signal<string | null>(null);
  otherUserAvatarUrl(msg: ChatMessage): string | null {
    // console.log("msg.userPicture",msg.userPicture);
    return this.authService.resolvePictureUrl(msg.userPicture !=null ?Environment.baseUrl+"files/"+ msg.userPicture : null);
  }
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
    private chatService: ProjectChatService,
    private authService: AuthService,
    private zone: NgZone,
    private projectApi: ProjectService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && !changes['projectId'].firstChange) {
      this.resetPaginationState();
    }
    if (changes['composeDisabled']?.currentValue === true) {
      // this.screenShare.stopScreenShare();
      // this.screenShare.cancelOutgoingRequest();
      this.cleanupRecording();
      this.revokeStagedUrls();
      this.pendingPictures = [];
      this.pendingAttachments = [];
      this.pendingVoiceRecords = [];
      this.newMessage = '';
      this.isSending = false;
      this.sendError.set(null);
    }
  }

  ngOnInit(): void {
    this.currentUserId.set(this.authService.getUserId());
    this.resetPaginationState();

    this.chatService
  .startConnection()
  .then(async () => {
    this.isConnecting.set(false);

    this.chatService.joinProject(this.projectId);
    await this.chatService.loadProjectMessages(this.projectId);

    this.chatService.markAsSeen(this.projectId);

    const hub = this.chatService.getConnection();
  })
  .catch(() => {
    this.isConnecting.set(false);
    this.connectionError.set(true);
  });

    this.msgSub = this.chatService.getMessages(this.projectId).subscribe(msgs => {
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
    this.projectApi
      .Get20More(cursor)
      .pipe(finalize(() => this.loadingOlder.set(false)))
      .subscribe({
        next: rows => {
          const chunk = messangerRowsToChatMessages(rows);
          if (chunk.length < 20) {
            this.hasMoreOlder.set(false);
          }
          this.chatService.prependOlderMessages(this.projectId, chunk as ChatMessage[]);
        },
        error: () => {
          this.prependScrollAnchor = null;
        },
      });
  }

  ngOnDestroy(): void {
    this.msgSub?.unsubscribe();
    this.chatService.leaveProject(this.projectId);
    this.cleanupRecording();
    this.revokeStagedUrls();
    // this.screenShare.stopScreenShare();
  }

  sendMessage(): void {
    if (this.composeDisabled) return;
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
    const oversized = ProjectChatService.oversizedFiles(allFiles);
    if (oversized.length) {
      const limitMB = (ProjectChatService.MAX_FILE_BYTES / (1024 * 1024)).toFixed(0);
      this.showError(`File too large: "${oversized[0].name}". Max size is ${limitMB} MB per file.`);
      return;
    }

    this.isSending = true;
    this.sendError.set(null);

    this.chatService
      .sendMessage(
        this.projectId,
        text,
        this.pendingPictures.map(p => p.file),
        this.pendingAttachments,
        this.pendingVoiceRecords.map(v => v.file),
      )
      .then(() => this.resetCompose())
      .catch(() => {
        this.showError('Failed to send message. Please try again.');
        this.isSending = false;
      });
  }

  private showError(msg: string, durationMs = 8000): void {
    this.sendError.set(msg);
    setTimeout(() => this.sendError.set(null), durationMs);
  }

  onEnter(event: Event): void {
    if (this.composeDisabled) return;
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
    if (this.composeDisabled) return;
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
    if (this.composeDisabled) return;
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
    if (this.composeDisabled) return;
    if (this.isRecording()) return;

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
            location.origin +
            ' → Relaunch.',
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
          console.error('[Project chat] Microphone error:', err);
          const name = (err as { name?: string })?.name;
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            this.showError(
              'Microphone blocked. Click the 🔒 icon in the address bar → set Microphone to "Allow", then try again.',
            );
          } else if (name === 'NotFoundError') {
            this.showError(
              'Microphone not accessible. Check Windows Privacy → Microphone, or that a device is connected.',
            );
          } else if (name === 'NotReadableError') {
            this.showError(
              'Microphone is busy or unavailable. Close other apps using the microphone and try again.',
            );
          } else if (name === 'OverconstrainedError') {
            this.showError('Your microphone does not meet the required constraints. Try a different device.');
          } else if (name === 'SecurityError') {
            this.showError('Microphone access is blocked by a security policy. Use HTTPS.');
          } else {
            this.showError(
              `Could not start recording (${name ?? 'unknown error'}). Check your microphone and browser settings.`,
            );
          }
        });

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then(status => {
          if (status.state === 'denied') {
            this.showError(
              'Microphone access is blocked. Click the 🔒 icon in your browser address bar, set Microphone to "Allow", then refresh and try again.',
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
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
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

  isMyMessage(msg: ChatMessage): boolean {
    return msg.userId === this.currentUserId();
  }

  getFileUrl(pathOrName: string): string {
    if (pathOrName.startsWith('http://') || pathOrName.startsWith('https://')) {
      return pathOrName;
    }
    const name = this.getAttachmentName(pathOrName);
    return this.chatService.getFileUrl(this.projectId, name);
  }

  getAttachmentName(path: string): string {
    return path.split('/').pop() ?? path;
  }

  private otherAvatarKey(msg: ChatMessage): string {
    return `${msg.userId}\0${msg.date}`;
  }

  otherUserAvatarImageSrc(msg: ChatMessage): string | null {
    return this.authService.resolvePictureUrl(msg.userPicture ?? null);
  }

  otherUserAvatarBroken(msg: ChatMessage): boolean {
    return this.brokenOtherAvatars.has(this.otherAvatarKey(msg));
  }

  onOtherUserAvatarError(msg: ChatMessage): void {
    this.zone.run(() => {
      this.brokenOtherAvatars.add(this.otherAvatarKey(msg));
    });
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

  trackMessage(_i: number, msg: ChatMessage): string {
    return msg.id ?? `${msg.userId}|${msg.date}|${msg.text?.slice(0, 20)}`;
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

  /**
   * Screen-share peer: project owner shares with `projectPeerUserId` when set;
   * anyone else shares with the owner.
   */
  get targetUserId(): string | null {
    const me = this.currentUserId();
    if (!me) return null;
    const owner = this.projectOwnerUserId?.trim() || '';
    const peer = this.projectPeerUserId?.trim() || '';
    if (!owner) return null;
    if (me === owner) return peer || null;
    return owner;
  }

  // startShare(): void {
  //   if (this.composeDisabled) return;
  //   const target = this.targetUserId;
  //   if (!target) {
  //     this.showError(
  //       'Cannot share: there is no other participant linked to this project for screen share.',
  //     );
  //     return;
  //   }
  //   this.screenShare.requestScreenShare(target);
  // }

  // stopShare(): void {
  //   this.screenShare.stopScreenShare();
  // }

  // cancelShareRequest(): void {
  //   this.screenShare.cancelOutgoingRequest();
  // }

  // acceptShare(fromUserId: string): void {
  //   if (this.composeDisabled) return;
  //   this.screenShare.respondToRequest(fromUserId, true);
  // }

  // declineShare(fromUserId: string): void {
  //   this.screenShare.respondToRequest(fromUserId, false);
  // }

  getShareRequesterName(userId: string): string {
    return this.messages().find(m => m.userId === userId)?.userName ?? 'Someone';
  }

  get canSend(): boolean {
    return (
      !this.composeDisabled &&
      !this.isSending &&
      !this.connectionError() &&
      (!!this.newMessage.trim() ||
        this.pendingPictures.length > 0 ||
        this.pendingAttachments.length > 0 ||
        this.pendingVoiceRecords.length > 0)
    );
  }
}
