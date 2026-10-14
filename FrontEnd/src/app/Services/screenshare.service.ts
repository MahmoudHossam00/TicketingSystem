// import { Injectable, NgZone, signal } from '@angular/core';
// import * as signalR from '@microsoft/signalr';
// import { TicketChatService } from './TicketChat.service';

// /**
//  * WebRTC screen-share service wired to the backend SignalR hub.
//  *
//  * Full signalling flow
//  * ────────────────────
//  * Sharer (A)                            Receiver (B)
//  *   │                                        │
//  *   │──RequestScreenShare(B)────────────────>│  hub → ScreenShareRequest(A)
//  *   │                                        │  (shows Accept / Decline banner)
//  *   │<──────────────────RespondScreenShare(A, true/false)
//  *   │  ScreenShareResponse(B, accepted)      │
//  *   │                                        │
//  *   │  if accepted:                          │
//  *   │  getDisplayMedia() → createOffer()     │
//  *   │──SendScreenOffer(B, offer)────────────>│  hub → ReceiveScreenOffer(A, offer)
//  *   │                                        │  createAnswer()
//  *   │<──────────────────SendScreenAnswer(A, answer)
//  *   │  ReceiveScreenAnswer(B, answer)        │
//  *   │                                        │
//  *   │◄──────── ICE exchange (both) ─────────►│
//  *   │                                        │
//  *   │  stop: CancelScreenShare(B)───────────>│  ScreenShareCancelled(A)
//  */
// @Injectable({ providedIn: 'root' })
// export class ScreenShareService {

//   // ── Public signals (bind these in the template) ───────────────────────────
//   isSharingScreen    = signal(false);
//   isReceivingScreen  = signal(false);
//   /** Set while we've sent a request and are waiting for the other user. */
//   isWaitingForAccept = signal(false);
//   /** Non-null when an incoming request arrives; contains the requester's userId. */
//   incomingRequest    = signal<string | null>(null);
//   shareError         = signal<string | null>(null);

//   // ── Private state ──────────────────────────────────────────────────────────
//   private pcs           = new Map<string, RTCPeerConnection>();
//   private localStream:  MediaStream | null = null;
//   private localVideoEl: HTMLVideoElement  | null = null;
//   private remoteVideoEl: HTMLVideoElement | null = null;
//   /** The peer we are currently sharing with (or receiving from). */
//   private activePeer:   string | null = null;

//   /**
//    * Hub used for screen-share signalling after the last `registerHandlers` call.
//    * Falls back to the ticket chat connection when unset (legacy `registerHandlers()`).
//    */
//   private boundHub: signalR.HubConnection | null = null;

//   /**
//    * Streams that arrived before the *ngIf rendered the video element.
//    * Applied the moment setVideoElements() is called by the setter.
//    */
//   private pendingLocalStream:  MediaStream | null = null;
//   private pendingRemoteStream: MediaStream | null = null;

//   constructor(
//     private chatService: TicketChatService,
//     private zone: NgZone,
//   ) {}

//   // ── Setup ──────────────────────────────────────────────────────────────────

//   /** Called by the component setter for #localVideo */
//   setLocalVideo(el: HTMLVideoElement | null): void {
//     this.localVideoEl = el;
//     if (el && this.pendingLocalStream) {
//       el.srcObject            = this.pendingLocalStream;
//       this.pendingLocalStream = null;
//     }
//   }

//   /** Called by the component setter for #remoteVideo */
//   setRemoteVideo(el: HTMLVideoElement | null): void {
//     this.remoteVideoEl = el;
//     if (el && this.pendingRemoteStream) {
//       el.srcObject             = this.pendingRemoteStream;
//       this.pendingRemoteStream = null;
//     }
//   }

//   /** @deprecated — use setLocalVideo / setRemoteVideo instead */
//   setVideoElements(local: HTMLVideoElement, remote: HTMLVideoElement): void {
//     this.setLocalVideo(local);
//     this.setRemoteVideo(remote);
//   }

//   /**
//    * Register all SignalR handlers for screen-share signalling.
//    * Safe to call multiple times — each handler is unregistered first.
//    * Call once after startConnection() resolves.
//    *
//    * @param hub Optional hub (e.g. Project chat). When omitted, uses the ticket chat connection.
//    */
//   registerHandlers(hub?: signalR.HubConnection | null): void {
//     const h = hub ?? this.chatService.getConnection();
//     if (!h) return;
//     this.boundHub = h;

//     // ── Request / response ─────────────────────────────────────────────────

//     h.off('ScreenShareRequest');
//     h.on('ScreenShareRequest', (fromUserId: string) => {
//       this.zone.run(() => {
//         this.incomingRequest.set(fromUserId);
//       });
//     });

//     h.off('ScreenShareResponse');
//     h.on('ScreenShareResponse', async (_fromUserId: string, accepted: boolean) => {
//       await this.zone.run(async () => {
//         this.isWaitingForAccept.set(false);
//         if (accepted && this.activePeer) {
//           await this.beginCapture(this.activePeer, h);
//         } else if (!accepted) {
//           this.activePeer = null;
//           this.setError('Screen share was declined.');
//         }
//       });
//     });

//     h.off('ScreenShareCancelled');
//     h.on('ScreenShareCancelled', (_fromUserId: string) => {
//       this.zone.run(() => this.teardown(false));
//     });

//     // ── WebRTC signalling ──────────────────────────────────────────────────

//     h.off('ReceiveScreenOffer');
//     h.on('ReceiveScreenOffer', async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
//       const pc = this.getOrCreatePc(fromUserId, h);
//       await pc.setRemoteDescription(new RTCSessionDescription(offer));
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);
//       h.invoke('SendScreenAnswer', fromUserId, answer)
//         .catch((e: unknown) => console.error('[ScreenShare] SendAnswer:', e));
//       this.zone.run(() => {
//         this.activePeer = fromUserId;
//         this.isReceivingScreen.set(true);
//       });
//     });

//     h.off('ReceiveScreenAnswer');
//     h.on('ReceiveScreenAnswer', async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
//       const pc = this.pcs.get(fromUserId);
//       if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
//     });

//     h.off('ReceiveScreenIceCandidate');
//     h.on('ReceiveScreenIceCandidate', (fromUserId: string, candidate: RTCIceCandidateInit) => {
//       const pc = this.pcs.get(fromUserId);
//       if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate))
//         .catch((e: unknown) => console.error('[ScreenShare] AddICE:', e));
//     });
//   }

//   private hub(): signalR.HubConnection | null {
//     return this.boundHub ?? this.chatService.getConnection();
//   }

//   // ── Public API ─────────────────────────────────────────────────────────────

//   /** Step 1 — sharer sends a request to the target user. */
//   requestScreenShare(targetUserId: string): void {
//     const hub = this.hub();
//     if (!hub) { this.setError('Not connected.'); return; }

//     this.activePeer = targetUserId;
//     this.isWaitingForAccept.set(true);

//     hub.invoke('RequestScreenShare', targetUserId)
//       .catch((e: unknown) => {
//         console.error('[ScreenShare] RequestScreenShare:', e);
//         this.zone.run(() => {
//           this.isWaitingForAccept.set(false);
//           this.activePeer = null;
//           this.setError('Failed to send screen share request.');
//         });
//       });
//   }

//   /** Step 2 — receiver accepts or declines. */
//   respondToRequest(requesterUserId: string, accepted: boolean): void {
//     const hub = this.chatService.getConnection();
//     this.incomingRequest.set(null);

//     if (!accepted) {
//       hub?.invoke('RespondScreenShare', requesterUserId, false)
//         .catch((e: unknown) => console.error('[ScreenShare] Decline:', e));
//       return;
//     }

//     // Mark peer so ReceiveScreenOffer handler knows who to talk to
//     this.activePeer = requesterUserId;
//     hub?.invoke('RespondScreenShare', requesterUserId, true)
//       .catch((e: unknown) => console.error('[ScreenShare] Accept:', e));
//     // Offer will arrive as ReceiveScreenOffer
//   }

//   /** Cancel an outgoing request that hasn't been answered yet. */
//   cancelOutgoingRequest(): void {
//     const hub = this.hub();
//     const target = this.activePeer;
//     this.isWaitingForAccept.set(false);
//     this.activePeer = null;
//     if (hub && target) {
//       hub.invoke('CancelScreenShare', target)
//         .catch((e: unknown) => console.error('[ScreenShare] Cancel:', e));
//     }
//   }

//   /** Stop an active share (or viewing session) and notify the peer. */
//   stopScreenShare(): void {
//     const hub    = this.hub();
//     const target = this.activePeer;
//     if (hub && target) {
//       hub.invoke('CancelScreenShare', target)
//         .catch((e: unknown) => console.error('[ScreenShare] Cancel:', e));
//     }
//     this.teardown(true);
//   }

//   // ── Private helpers ────────────────────────────────────────────────────────

//   /**
//    * Called after the receiver has accepted.
//    * Captures the screen and sends the WebRTC offer.
//    */
//   private async beginCapture(
//     targetUserId: string,
//     hub: signalR.HubConnection,
//   ): Promise<void> {
//     if (!navigator.mediaDevices?.getDisplayMedia) {
//       this.setError('Screen sharing is not supported in this browser.');
//       return;
//     }
//     try {
//       this.localStream = await navigator.mediaDevices.getDisplayMedia({
//         video: true,
//         audio: false,
//       });

//       if (this.localVideoEl) {
//         this.localVideoEl.srcObject = this.localStream;
//       } else {
//         // *ngIf not rendered yet — store for when setVideoElements() is called
//         this.pendingLocalStream = this.localStream;
//       }

//       // React to the native browser "Stop sharing" button
//       this.localStream.getVideoTracks()[0].onended = () => {
//         this.zone.run(() => this.stopScreenShare());
//       };

//       const pc = this.getOrCreatePc(targetUserId, hub);
//       this.localStream.getTracks().forEach(t => pc.addTrack(t, this.localStream!));

//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);
//       await hub.invoke('SendScreenOffer', targetUserId, offer);

//       this.zone.run(() => this.isSharingScreen.set(true));

//     } catch (err: unknown) {
//       const name = (err as { name?: string })?.name;
//       if (name === 'NotAllowedError') {
//         this.setError('Screen sharing permission denied.');
//       } else if (name === 'NotSupportedError') {
//         this.setError('Screen sharing is not supported in this browser.');
//       } else {
//         this.setError('Could not start screen sharing.');
//         console.error('[ScreenShare] getDisplayMedia error:', err);
//       }
//       // Let the receiver know it failed
//       hub.invoke('CancelScreenShare', targetUserId)
//         .catch((e: unknown) => console.error('[ScreenShare] Cancel after error:', e));
//       this.teardown(true);
//     }
//   }

//   private teardown(alreadyNotified: boolean): void {
//     void alreadyNotified;
//     this.localStream?.getTracks().forEach(t => t.stop());
//     this.pcs.forEach(pc => pc.close());
//     this.pcs.clear();
//     this.localStream        = null;
//     this.pendingLocalStream  = null;
//     this.pendingRemoteStream = null;
//     this.activePeer          = null;

//     this.isSharingScreen.set(false);
//     this.isReceivingScreen.set(false);
//     this.isWaitingForAccept.set(false);
//     this.incomingRequest.set(null);

//     if (this.localVideoEl)  this.localVideoEl.srcObject  = null;
//     if (this.remoteVideoEl) this.remoteVideoEl.srcObject = null;
//   }

//   private getOrCreatePc(userId: string, hub: signalR.HubConnection): RTCPeerConnection {
//     if (this.pcs.has(userId)) return this.pcs.get(userId)!;

//     const pc = new RTCPeerConnection({
//       iceServers: [
//         { urls: 'stun:stun.l.google.com:19302' },
//         { urls: 'stun:stun1.l.google.com:19302' },
//       ],
//     });

//     pc.onicecandidate = e => {
//       if (e.candidate) {
//         hub.invoke('SendScreenIceCandidate', userId, e.candidate)
//           .catch((err: unknown) => console.error('[ScreenShare] SendICE:', err));
//       }
//     };

//     // Fires on the receiver when the sender's track arrives.
//     // The *ngIf video element may not be in the DOM yet at this point,
//     // so store the stream and apply it once setVideoElements() is called.
//     pc.ontrack = e => {
//       this.zone.run(() => {
//         const stream = e.streams?.[0] ?? new MediaStream([e.track]);
//         if (this.remoteVideoEl) {
//           this.remoteVideoEl.srcObject = stream;
//         } else {
//           this.pendingRemoteStream = stream;
//         }
//         this.isReceivingScreen.set(true);
//       });
//     };

//     pc.onconnectionstatechange = () => {
//       if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
//         this.zone.run(() => this.stopScreenShare());
//       }
//     };

//     this.pcs.set(userId, pc);
//     return pc;
//   }

//   private setError(msg: string): void {
//     this.zone.run(() => {
//       this.shareError.set(msg);
//       setTimeout(() => this.shareError.set(null), 6000);
//     });
//   }
// }
