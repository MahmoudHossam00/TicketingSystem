import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Environment } from '../base/environment';
import { AuthService } from './auth.service';
import { FilesService } from './Files.service';
import { mergeChatHistoryOlderFirst } from '../utils/chat-history-pagination';
import { BrowserNotificationService } from './browser-notification.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  /** Server message id — required for HTTP `20more` pagination. */
  id?: string;
  text: string;
  pictures: string[];
  attachments: string[];
  voiceRecords: string[];
  isSeen: boolean;
  date: string;
  userId: string;
  userName?: string;
  userPicture?: string;
  /** Direct messages: receiving user id (set when you are the sender). */
  recipientUserId?: string;
}



/**
 * Represents a single file sent through the SignalR channel.
 *
 * Backend counterpart (replace List<IFormFile> with this DTO):
 *   public class ChatFileDto {
 *     public string Name { get; set; }
 *     public string ContentType { get; set; }
 *     public string Data { get; set; }  // base64 raw bytes (no data: prefix)
 *   }
 */
export interface ChatFileDto {
  name: string;
  contentType: string;
  url: string;
}

/**
 * Payload sent to the hub's SendMessageToTask method.
 * Maps to the C# SendMessageRequest DTO.
 */
export interface SendMessageRequest {
  text: string;
  pictures?: ChatFileDto[];
  attachments?: ChatFileDto[];
  voiceRecords?: ChatFileDto[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class TaskChatService implements OnDestroy {

  private hubConnection: signalR.HubConnection | null = null;

  /** Per-Task message streams. */
  private messagesMap = new Map<string, BehaviorSubject<ChatMessage[]>>();

  /**
   * Rooms that should be active on the server.
   * Used to rejoin after an automatic reconnect.
   */
  private joinedRooms = new Set<string>();

  /**
   * Reference count per Task room.
   * joinTask increments, leaveTask decrements.
   * The server LeaveTask call is only sent when the count reaches zero,
   * so the Messenger's permanent membership keeps a room alive while an
   * individual chat component opens and closes inside it.
   */
  private roomRefCount = new Map<string, number>();

  /** Fires for every incoming message regardless of Task — used by the Messenger. */
  private anyMsg$ = new Subject<{ TaskId: string; message: ChatMessage }>();

  /** Fires when messages in a Task are marked as seen — used by the Messenger. */
  private seenUpdate$ = new Subject<{ TaskId: string; seenByUserId: string }>();

  /** Single in-flight `start()` — avoids replacing `hubConnection` on concurrent callers and ensures `.then()` runs only after Connected. */
  private startPromise: Promise<void> | null = null;

  constructor(
    private authService: AuthService,
    private filesService: FilesService,
    private browserNotification: BrowserNotificationService
  ) {}

  async loadTaskMessages(taskId: string): Promise<void> {
    await this.startConnection();
  
    await this.hubConnection!.invoke('LoadTaskMessages', taskId)
      .catch(err => console.error('[SignalR] LoadTaskMessages error:', err));
  }
  private get isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  // ── Connection lifecycle ──────────────────────────────────────────────────

  startConnection(): Promise<void> {
    this.browserNotification.requestPermission();
    if (this.isConnected) return Promise.resolve();

    if (this.startPromise) return this.startPromise;

    const state = this.hubConnection?.state;
    if (
      state === signalR.HubConnectionState.Connecting ||
      state === signalR.HubConnectionState.Reconnecting
    ) {
      this.startPromise = this.waitUntilTaskHubConnected().finally(() => {
        this.startPromise = null;
      });
      return this.startPromise;
    }
    const token = this.authService.getTokenFromCookie();

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${Environment.standaloneurl}TaskChatHub`, {
        accessTokenFactory: () => token ?? '',
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.registerHandlers();

    this.startPromise = this.hubConnection
      .start()
      .then(() => console.log('[SignalR] Task hub connected'))
      .catch((err: unknown) => {
        console.error('[SignalR] Connection error:', err);
        throw err;
      })
      .finally(() => {
        this.startPromise = null;
      });

    return this.startPromise;
  }

  private waitUntilTaskHubConnected(): Promise<void> {
    const c = this.hubConnection;
    if (!c || c.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 600;
      const tick = () => {
        const s = this.hubConnection?.state;
        if (s === signalR.HubConnectionState.Connected) {
          resolve();
          return;
        }
        if (++attempts >= maxAttempts) {
          reject(new Error('Task hub connection wait timed out'));
          return;
        }
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  stopConnection(): Promise<void> {
    this.startPromise = null;
    if (!this.hubConnection) return Promise.resolve();
    return this.hubConnection
      .stop()
      .then(() => {
        this.hubConnection = null;
        console.log('[SignalR] Disconnected');
      })
      .catch((err: unknown) => console.error('[SignalR] Stop error:', err));
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }

  // ── Hub handlers ──────────────────────────────────────────────────────────

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.off('LoadPreviousMessages');
    this.hubConnection.on('LoadPreviousMessages', (TaskId: string, messages: ChatMessage[]) => {
      this.subjectFor(TaskId).next(messages ?? []);
    });

    this.hubConnection.off('ReceiveMessage');
    this.hubConnection.on('ReceiveMessage', (TaskId: string, message: ChatMessage) => {
      const subject = this.subjectFor(TaskId);
      subject.next([...subject.getValue(), message]);
      // Broadcast to any global listener (e.g. the Messenger component)
      this.anyMsg$.next({ TaskId, message });

      if (this.peerKey(message.userId) !== this.peerKey(this.authService.getUserId())) {
        this.browserNotification.notifyChatMessage(message, {
          fallbackTitle: 'New task message',
          tag: `task-${TaskId}`,
          onClickUrl: '/messanger',
        });
      }
      
    });

    this.hubConnection.off('MessagesSeen');
    this.hubConnection.on('MessagesSeen', (TaskId: string, seenByUserId: string) => {
      // Mark all existing messages in this Task as seen
      const subject = this.subjectFor(TaskId);
      const updated = subject.getValue().map(m => ({ ...m, isSeen: true }));
      subject.next(updated);
      // Notify the Messenger component to update its conversation row
      this.seenUpdate$.next({ TaskId, seenByUserId });
    });

    this.hubConnection.onreconnected((connId: string | undefined) => {
      console.log('[SignalR] Reconnected, connectionId:', connId);
      // Re-join every Task room that was joined before the disconnect.
      // Without this, the client is connected but receives no group messages.
      this.joinedRooms.forEach(TaskId => {
        this.hubConnection!.invoke('JoinTask', TaskId)
          .catch((err: unknown) =>
            console.error('[SignalR] Rejoin error for', TaskId, err)
          );
      });
    });

    this.hubConnection.onclose((err: Error | undefined) => {
      if (err) console.error('[SignalR] Connection closed with error:', err);
      else console.log('[SignalR] Connection closed cleanly');
    });
  }

  // ── Task room ───────────────────────────────────────────────────────────
  leaveAllTickets(): void {
    // Go through every joined room and fully leave it
    this.joinedRooms.forEach(ticketId => {
      const count = this.roomRefCount.get(ticketId) ?? 0;
      for (let i = 0; i < count; i++) {
        this.leaveTask(ticketId);
      }
    });
  
    this.roomRefCount.clear();
    this.joinedRooms.clear();
  }
  joinTask(TaskId: string): void {
    // Always track the room so onreconnected can rejoin it, even if currently
    // reconnecting (the hub invoke below is skipped when not connected).
    const newCount = (this.roomRefCount.get(TaskId) ?? 0) + 1;
    this.roomRefCount.set(TaskId, newCount);
    this.joinedRooms.add(TaskId);

    // Only send the server-side JoinTask on the first reference.
    // Subsequent callers (e.g. the chat component joining a room the Messenger
    // already joined) rely on the existing group membership.
    if ( newCount === 1 && this.isConnected) {
      this.hubConnection!.invoke('JoinTask', TaskId)
        .catch((err: unknown) => console.error('[SignalR] JoinTask error:', err));
    }
  }

  leaveTask(TaskId: string): void {
    const remaining = (this.roomRefCount.get(TaskId) ?? 0) - 1;

    if (remaining > 0) {
      // Another listener (e.g. the Messenger) still needs this room — keep it.
      this.roomRefCount.set(TaskId, remaining);
      return;
    }

    // Last listener gone — release the room.
    this.roomRefCount.delete(TaskId);
    this.joinedRooms.delete(TaskId);
    if (this.isConnected) {
      this.hubConnection!.invoke('LeaveTask', TaskId)
        .catch((err: unknown) => console.error('[SignalR] LeaveTask error:', err));
    }
  }

  // ── Messaging ─────────────────────────────────────────────────────────────

  /**
   * Convert browser File objects to base64 DTOs, then invoke SendMessageToTask
   * on the hub in a single call — no separate HTTP upload endpoint required.
   *
   * Backend SendMessageRequest must use ChatFileDto (not IFormFile):
   *   public List<ChatFileDto> Pictures { get; set; }
   *   public List<ChatFileDto> Attachments { get; set; }
   *   public List<ChatFileDto> VoiceRecords { get; set; }
   */
  async sendMessage(
    TaskId: string,
    text: string,
    pictures: File[] = [],
    attachments: File[] = [],
    voiceRecords: File[] = []
  ): Promise<void> {
    if (!this.assertConnected('SendMessageToTask')) return;
  
    // Upload attachments via HTTP
    const [uploadedPics, uploadedAtts, uploadedVoices] = await Promise.all([
      this.filesService.uploadFiles(pictures),
      this.filesService.uploadFiles(attachments),
      this.filesService.uploadFiles(voiceRecords),
    ]);
  
    // Build payload with URLs only
    const payload: SendMessageRequest = {
      text,
      ...(uploadedPics.length  && { pictures: uploadedPics }),
      ...(uploadedAtts.length  && { attachments: uploadedAtts }),
      ...(uploadedVoices.length && { voiceRecords: uploadedVoices }),
    };
  
    await this.hubConnection!.invoke('SendMessageToTask', TaskId, payload)
      .catch(err => console.error('[SignalR] SendMessage error:', err));
  }

  markAsSeen(TaskId: string): void {
    if (!this.isConnected) return;
    this.hubConnection!.invoke('MarkAsSeen', TaskId)
      .catch((err: unknown) => console.error('[SignalR] MarkAsSeen error:', err));
  }

  // ── Observable stream ─────────────────────────────────────────────────────

  getMessages(TaskId: string): Observable<ChatMessage[]> {
    return this.subjectFor(TaskId).asObservable();
  }

  /** Prepend older messages from HTTP `Get20More` (dedupes + sorts by date). */
  prependOlderMessages(taskId: string, older: ChatMessage[]): void {
    if (!older.length) return;
    const sub = this.subjectFor(taskId);
    sub.next(mergeChatHistoryOlderFirst(older, sub.getValue()));
  }

  /** Global stream — emits every message from any Task. */
  onAnyMessage(): Observable<{ TaskId: string; message: ChatMessage }> {
    return this.anyMsg$.asObservable();
  }

  /** Emits when messages in a Task are marked as seen by another user. */
  onSeenUpdate(): Observable<{ TaskId: string; seenByUserId: string }> {
    return this.seenUpdate$.asObservable();
  }

  // ── File helpers ──────────────────────────────────────────────────────────

  /**
   * Reads a browser File and returns a ChatFileDto with base64-encoded content.
   *
   * Key fixes vs. the naive approach:
   * 1. `file.type` is empty ("") for many attachments (PDF, Office docs, etc.).
   *    We fall back to "application/octet-stream" so the backend always receives
   *    a valid MIME type.
   * 2. We read as ArrayBuffer → convert to base64 manually, which is reliable
   *    regardless of the file's MIME type.  readAsDataURL on a file with no
   *    content-type produces "data:;base64,…" in some browsers, whose split(',')
   *    may return an empty string.
   */
  
  // private static fileToDto(file: File): Promise<ChatFileDto> {
  //   return new Promise<ChatFileDto>((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       const buf   = reader.result as ArrayBuffer;
  //       const bytes = new Uint8Array(buf);
  //       let binary  = '';
  //       for (let i = 0; i < bytes.byteLength; i++) {
  //         binary += String.fromCharCode(bytes[i]);
  //       }
  //       const data        = btoa(binary);
  //       const contentType = file.type || 'application/octet-stream';
  //       resolve({ name: file.name, contentType, url: file.url });
  //     };
  //     reader.onerror = () => reject(reader.error);
  //     reader.readAsArrayBuffer(file);
  //   });
  // }

  /**
   * Max file size (bytes) that can safely be sent as a single base64-encoded
   * SignalR message.  Base64 adds ~33% overhead, so a 6 MB file becomes ~8 MB
   * on the wire.  Adjust to match your server's MaximumReceiveMessageSize.
   * Default SignalR limit is 32 KB — increase it on the server:
   *   builder.Services.AddSignalR(o => o.MaximumReceiveMessageSize = 50 * 1024 * 1024);
   */
  static readonly MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

  /** Returns files that exceed the safe size limit. */
  static oversizedFiles(files: File[]): File[] {
    return files.filter(f => f.size > TaskChatService.MAX_FILE_BYTES);
  }

  /**
   * Builds the URL to display a stored chat file.
   * Pattern: {baseUrl}Tasks/{TaskId}/files/{filename}
   */
  getFileUrl(TaskId: string, filename: string): string {
    return `${Environment.baseUrl}Tasks/${TaskId}/files/${filename}`;
  }

  // ── Hub connection accessor (used by ScreenShareService for WebRTC signaling) ─

  /** Returns the live hub connection, or null if not yet connected. */
  getConnection(): signalR.HubConnection | null {
    return this.hubConnection;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private subjectFor(TaskId: string): BehaviorSubject<ChatMessage[]> {
    if (!this.messagesMap.has(TaskId)) {
      this.messagesMap.set(TaskId, new BehaviorSubject<ChatMessage[]>([]));
    }
    return this.messagesMap.get(TaskId)!;
  }

  private assertConnected(methodName: string): boolean {
    if (!this.isConnected) {
      console.warn(`[SignalR] Cannot call '${methodName}': not connected (state: ${this.hubConnection?.state ?? 'null'})`);
      return false;
    }
    return true;
  }

  private peerKey(id: string | null | undefined): string {
    if (id == null) return '';
    return String(id).trim().toLowerCase();
  }
}
