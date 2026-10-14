import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Environment } from '../base/environment';
import { AuthService } from './auth.service';
import { FilesService } from './Files.service';
import { ChatMessage, SendMessageRequest } from './TaskChat.service';
import { mergeChatHistoryOlderFirst } from '../utils/chat-history-pagination';
import { BrowserNotificationService } from './browser-notification.service';


// ── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class UserChatService implements OnDestroy {

  private hubConnection: signalR.HubConnection | null = null;

  /** Streams per conversation (keyed by the other user's ID) */
  private messagesMap = new Map<string, BehaviorSubject<ChatMessage[]>>();

  private readonly emptyPeerMessages$ = new BehaviorSubject<ChatMessage[]>([]);

  /** Fires for every incoming message, regardless of user */
  private anyMsg$ = new Subject<{ userId: string; message: ChatMessage }>();

  /** Fires when messages are marked as seen */
  private seenUpdate$ = new Subject<{ userId: string; seenByUserId: string }>();

  /** Last `SendMessageToUser` target — used to route hub echoes where `userId` is the sender (me). */
  private lastSendToUserId: string | null = null;

  /** In-flight `start()` so concurrent callers (Messenger + UserChatComponent, multiple tabs’ logic) do not replace `hubConnection`. */
  private startPromise: Promise<void> | null = null;

  constructor(
    private authService: AuthService,
    private filesService: FilesService,
    private browserNotification: BrowserNotificationService
  ) {}

  private get isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  // ── Connection Lifecycle ────────────────────────────────────────────────
  // private joinedRooms = new Set<string>();
  // joinUser(userId: string): void {
  //   const newCount = (this.roomRefCount.get(userId) ?? 0) + 1;
  //   this.roomRefCount.set(userId, newCount);
  //   this.joinedRooms.add(userId);
  
  //   if (newCount === 1 && this.isConnected) {
  //     this.hubConnection!.invoke('JoinUserRoom', userId)
  //       .catch(err => console.error('[SignalR] JoinUserRoom error:', err));
  //   }
  // }
  /**
   * Reference count per Task room.
   * joinTask increments, leaveTask decrements.
   * The server LeaveTask call is only sent when the count reaches zero,
   * so the Messenger's permanent membership keeps a room alive while an
   * individual chat component opens and closes inside it.
   */
  // private roomRefCount = new Map<string, number>();
// 
  // leaveAllTickets(): void {
  //   // Go through every joined room and fully leave it
  //   this.joinedRooms.forEach(ticketId => {
  //     const count = this.roomRefCount.get(ticketId) ?? 0;
  //     for (let i = 0; i < count; i++) {
  //       this.leaveUser(ticketId);
  //     }
  //   });
  
  //   this.roomRefCount.clear();
  //   this.joinedRooms.clear();
  // }
  // leaveUser(ticketId: string): void {
  //   const remaining = (this.roomRefCount.get(ticketId) ?? 0) - 1;

  //   if (remaining > 0) {
  //     // Another listener (e.g. the Messenger) still needs this room — keep it.
  //     this.roomRefCount.set(ticketId, remaining);
  //     return;
  //   }

  //   // Last listener gone — release the room.
  //   this.roomRefCount.delete(ticketId);
  //   this.joinedRooms.delete(ticketId);
  //   if (this.isConnected) {
  //     this.hubConnection!.invoke('LeaveTicket', ticketId)
  //       .catch((err: unknown) => console.error('[SignalR] LeaveTicket error:', err));
  //   }
  // }
  async loadMessagesWithUser(otherUserId: string): Promise<void> {
    await this.startConnection();
  
    if (!this.isConnected) return;
  
    await this.hubConnection!.invoke('LoadMessagesWithUser', otherUserId)
      .catch(err => console.error('[SignalR] LoadMessagesWithUser error:', err));
  }

  startConnection(): Promise<void> {
    this.browserNotification.requestPermission();
    if (this.isConnected) return Promise.resolve();

    if (this.startPromise) return this.startPromise;

    const state = this.hubConnection?.state;
    if (
      state === signalR.HubConnectionState.Connecting ||
      state === signalR.HubConnectionState.Reconnecting
    ) {
      return (this.startPromise = this.waitUntilUserHubConnected().finally(() => {
        this.startPromise = null;
      }));
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${Environment.standaloneurl}userChatHub`, {
        accessTokenFactory: () => this.authService.getTokenFromCookie() ?? '',
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.registerHandlers();

    this.startPromise = this.hubConnection
      .start()
      .then(() => console.log('[SignalR] UserChatHub connected'))
      .catch((err: unknown) => {
        console.error('[SignalR] Connection error:', err);
        throw err;
      })
      .finally(() => {
        this.startPromise = null;
      });

    return this.startPromise;
  }

  /** Wait for an existing hub instance to reach Connected (e.g. another caller already invoked `start()`). */
  private waitUntilUserHubConnected(): Promise<void> {
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
          reject(new Error('UserChatHub connection wait timed out'));
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
    return this.hubConnection.stop()
      .then(() => {
        this.hubConnection = null;
        console.log('[SignalR] UserChatHub disconnected');
      })
      .catch(err => console.error('[SignalR] Stop error:', err));
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }

  // ── Hub Handlers ─────────────────────────────────────────────────────
  async loadPreviousMessages(): Promise<void> {
    await this.startConnection();
  
    if (!this.isConnected) return;
  
    await this.hubConnection!.invoke('LoadPreviousMessages')
      .catch(err => console.error('[SignalR] LoadPreviousMessages error:', err));
  }

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.off('LoadPreviousMessages');
    this.hubConnection.on('LoadPreviousMessages', (messages: ChatMessage[]) => {
      const me = this.peerKey(this.authService.getUserId());
      const byPeer = new Map<string, ChatMessage[]>();
      for (const m of messages) {
        const rawPeer =
          this.peerKey(m.userId) === me
            ? this.inferPeerForOwnMessage(m, messages, me)
            : m.userId;
        const peer = rawPeer ? this.peerKey(rawPeer) : '';
        if (!peer) continue;
        if (!byPeer.has(peer)) byPeer.set(peer, []);
        byPeer.get(peer)!.push(m);
      }
      byPeer.forEach((arr, peer) => {
        arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        this.subjectFor(peer).next(arr);
      });
    });

    this.hubConnection.off('ReceiveMessage');
    this.hubConnection.on('ReceiveMessage', (message: ChatMessage) => {
      const me = this.peerKey(this.authService.getUserId());
      let peerRaw: string | null = null;
      let isIncomingFromAnotherUser = false;
      if (this.peerKey(message.userId) !== me) {
        peerRaw = message.userId;
        isIncomingFromAnotherUser = true;
      } else {
        peerRaw = this.peerFromMessageMeta(message) ?? this.lastSendToUserId;
        this.lastSendToUserId = null;
      }
      const peer = peerRaw ? this.peerKey(peerRaw) : '';
      if (!peer) return;
      const subject = this.subjectFor(peer);
      subject.next([...subject.getValue(), message]);
      this.anyMsg$.next({ userId: peer, message });

      if (isIncomingFromAnotherUser) {
        this.browserNotification.notifyChatMessage(message, {
          fallbackTitle: 'New direct message',
          tag: `user-${peer}`,
          onClickUrl: '/messanger',
        });
      }
    });
    this.hubConnection.off('LoadUserMessages');
    this.hubConnection.on('LoadUserMessages', (otherUserId: string, messages: ChatMessage[]) => {
      this.subjectFor(otherUserId).next(messages ?? []);
    });
    this.hubConnection.off('MessagesSeen');
    this.hubConnection.on('MessagesSeen', (userId: string) => {
      const key = this.peerKey(userId);
      if (!key) return;
      const subject = this.subjectFor(key);
      const updated = subject.getValue().map(m => ({ ...m, isSeen: true }));
      subject.next(updated);
      this.seenUpdate$.next({ userId: key, seenByUserId: this.peerKey(this.authService.getUserId()) });
    });

    this.hubConnection.onreconnected((connId?: string) => {
      console.log('[SignalR] Reconnected, connectionId:', connId);
    });

    this.hubConnection.onclose(err => {
      if (err) console.error('[SignalR] Connection closed with error:', err);
      else console.log('[SignalR] Connection closed cleanly');
    });
  }
  

  // ── Messaging ─────────────────────────────────────────────────────────

  async sendMessage(
    otherUserId: string,
    text: string,
    pictures: File[] = [],
    attachments: File[] = [],
    voiceRecords: File[] = []
  ): Promise<void> {
    if (!this.isConnected) return;

    const [uploadedPics, uploadedAtts, uploadedVoices] = await Promise.all([
      this.filesService.uploadFiles(pictures),
      this.filesService.uploadFiles(attachments),
      this.filesService.uploadFiles(voiceRecords),
    ]);

    const payload: SendMessageRequest = {
      text,
      ...(uploadedPics.length && { pictures: uploadedPics }),
      ...(uploadedAtts.length && { attachments: uploadedAtts }),
      ...(uploadedVoices.length && { voiceRecords: uploadedVoices }),
    };

    this.lastSendToUserId = otherUserId;
    
    await this.hubConnection!.invoke('SendMessageToUser', otherUserId, payload).catch(err => {
      console.error('[SignalR] SendMessageToUser error:', err);
      this.lastSendToUserId = null;
    });
    // Do not clear lastSendToUserId here — ReceiveMessage for your echo clears it after routing.
  }

  markAsSeen(otherUserId: string): void {
    if (!this.isConnected) return;
    this.hubConnection!.invoke('MarkAsSeen', otherUserId)
      .catch(err => console.error('[SignalR] MarkAsSeen error:', err));
  }

  // ── Observables ──────────────────────────────────────────────────────

  getMessages(userId: string): Observable<ChatMessage[]> {
    return this.subjectFor(userId).asObservable();
  }

  onAnyMessage(): Observable<{ userId: string; message: ChatMessage }> {
    return this.anyMsg$.asObservable();
  }

  onSeenUpdate(): Observable<{ userId: string; seenByUserId: string }> {
    return this.seenUpdate$.asObservable();
  }

  /**
   * Fills the peer bucket from HTTP when SignalR history is still empty (new tab, hub grouping, etc.).
   * Does not overwrite if the subject already has messages (SignalR won the race).
   */
  applyThreadSnapshotIfEmpty(otherUserId: string, messages: ChatMessage[] | null | undefined): void {
    const key = this.peerKey(otherUserId);
    if (!key) return;
    const sub = this.subjectFor(key);
    if (sub.getValue().length > 0) return;
    const list = messages ?? [];
    if (list.length === 0) return;
    const sorted = [...list].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    sub.next(sorted);
  }

  /** Prepend older DMs from HTTP `Auth/Get20More/{messageId}`. */
  prependOlderMessages(otherUserId: string, older: ChatMessage[]): void {
    if (!older.length) return;
    const key = this.peerKey(otherUserId);
    if (!key) return;
    const sub = this.subjectFor(key);
    sub.next(mergeChatHistoryOlderFirst(older, sub.getValue()));
  }

  // ── Internal Helpers ────────────────────────────────────────────────

  /** One canonical map key per user (JWT / DB ids may differ only by casing). */
  private peerKey(id: string | null | undefined): string {
    if (id == null) return '';
    return String(id).trim().toLowerCase();
  }

  private subjectFor(userId: string): BehaviorSubject<ChatMessage[]> {
    const key = this.peerKey(userId);
    if (!key) {
      return this.emptyPeerMessages$;
    }
    if (!this.messagesMap.has(key)) {
      this.messagesMap.set(key, new BehaviorSubject<ChatMessage[]>([]));
    }
    return this.messagesMap.get(key)!;
  }

  private peerFromMessageMeta(m: ChatMessage): string | null {
    const x = m as ChatMessage & {
      recipientUserId?: string;
      otherUserId?: string;
      RecipientUserId?: string;
    };
    const v = x.recipientUserId ?? x.RecipientUserId ?? x.otherUserId;
    return v != null && String(v).trim() !== '' ? String(v).trim() : null;
  }

  private inferPeerForOwnMessage(m: ChatMessage, all: ChatMessage[], meKey: string): string | null {
    // Server sets RecipientUserId on user DMs so we never rely on "only one other user in the batch".
    const explicit = this.peerFromMessageMeta(m);
    if (explicit) return explicit;
    const others = new Set<string>();
    for (const x of all) {
      if (this.peerKey(x.userId) !== meKey) others.add(this.peerKey(x.userId));
    }
    if (others.size === 1) return [...others][0];
    return null;
  }
}
