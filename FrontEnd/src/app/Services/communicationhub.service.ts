import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { Environment } from '../base/environment';
import { AuthService } from './auth.service';

export type CallType = 'audio' | 'video';

/**
 * DESIGN: one RTCPeerConnection for everything.
 *
 * Screen-share without a prior call (standalone):
 *   startScreenShare() builds one PC with mic + screen tracks and sends the
 *   offer via the normal SendOffer / ReceiveOffer / SendAnswer path.
 *   No separate hub methods, no second peer connection.
 *
 * Screen-share on top of an active call:
 *   addTrack(screenTrack) + renegotiate().  replaceTrack() is NOT used because
 *   it does NOT fire ontrack on the remote — the remote would never see the
 *   screen.  addTrack + full renegotiation forces a new ontrack on the remote.
 *
 * Stopping screen share:
 *   removeTrack(screenSender) + renegotiate().
 *   For a standalone session the whole PC is torn down.
 */
@Injectable({ providedIn: 'root' })
export class CallService implements OnDestroy {
  private hubConnection: signalR.HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;   // mic / camera only
  private screenStream: MediaStream | null = null;  // screen capture only
  private remoteStream: MediaStream | null = null;
  private signalingTargetId: string | null = null;
  private activeCallType: CallType | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private isCallInProgress = false;
  /** true when the session was opened by startScreenShare with no prior call */
  private standaloneScreenShare = false;

  private readonly _localStream            = new BehaviorSubject<MediaStream | null>(null);
  private readonly _remoteStream           = new BehaviorSubject<MediaStream | null>(null);
  private readonly _isLocalScreenSharing   = new BehaviorSubject(false);
  private readonly _isRemoteScreenShare    = new BehaviorSubject(false);
  private readonly _screenShareError       = new BehaviorSubject<string | null>(null);
  private readonly _callSessionActive      = new BehaviorSubject(false);
  private readonly _isAwaitingCallResponse = new BehaviorSubject(false);

  readonly incomingScreenShareRequest$ = new BehaviorSubject<string | null>(null);
  readonly screenShareWaiting$         = new BehaviorSubject(false);
  readonly incomingCall$               = new BehaviorSubject<{ from: string; type: CallType } | null>(null);
  readonly callAccepted$               = new BehaviorSubject<boolean>(false);

  readonly localStream$            = this._localStream.asObservable();
  readonly remoteStream$           = this._remoteStream.asObservable();
  readonly isLocalScreenSharing$   = this._isLocalScreenSharing.asObservable();
  readonly isRemoteScreenShare$    = this._isRemoteScreenShare.asObservable();
  readonly screenShareError$       = this._screenShareError.asObservable();
  readonly callSessionActive$      = this._callSessionActive.asObservable();
  readonly isAwaitingCallResponse$ = this._isAwaitingCallResponse.asObservable();

  constructor(private authService: AuthService) {
    this.buildHub();
  }

  ngOnDestroy(): void {
    this.hubConnection?.stop().catch(() => undefined);
    this.resetAll();
  }

  // ── Hub ────────────────────────────────────────────────────────────────────

  private buildHub(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${Environment.standaloneurl}communicationHub`, {
        accessTokenFactory: () => this.authService.getTokenFromCookie() ?? '',
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('IncomingCall', (from: string, type: CallType) => {
      this.incomingCall$.next({ from, type });
    });

    // Caller side: remote accepted or rejected
    this.hubConnection.on('CallResponse', async (_from: string, accepted: boolean) => {
      this._isAwaitingCallResponse.next(false);
      this.callAccepted$.next(accepted);
      if (!accepted) { this.resetAll(); return; }

      await this.startLocalStream(this.activeCallType ?? 'audio');
      this.createPeerConnection();
      await this.sendOffer(_from);
      this._callSessionActive.next(true);
    });

    this.hubConnection.on('CallEnded', () => {
      this.resetAll();
      this.incomingCall$.next(null);
    });

    // Both callee (initial offer) and both sides (renegotiation offers)
    this.hubConnection.on('ReceiveOffer', async (from: string, offerStr: string) => {
      try {
        this.signalingTargetId = from;

        // Ensure we have a local stream before answering
        if (!this.localStream) {
          await this.startLocalStream(this.activeCallType ?? 'audio');
        }
        if (!this.peerConnection) {
          this.createPeerConnection();
        }

        await this.peerConnection!.setRemoteDescription(
          JSON.parse(offerStr) as RTCSessionDescriptionInit
        );
        await this.flushPendingCandidates();

        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);
        await this.ensureConnected();
        await this.hubConnection!.invoke('SendAnswer', from, JSON.stringify(answer));

        if (!this._callSessionActive.value) {
          this._callSessionActive.next(true);
        }
      } catch (err) {
        console.error('[CallService] ReceiveOffer failed:', err);
      }
    });

    // Caller side: answer to initial offer or renegotiation
    this.hubConnection.on('ReceiveAnswer', async (_from: string, answerStr: string) => {
      if (!this.peerConnection) return;
      if (this.peerConnection.signalingState !== 'have-local-offer') return;
      try {
        await this.peerConnection.setRemoteDescription(
          JSON.parse(answerStr) as RTCSessionDescriptionInit
        );
        await this.flushPendingCandidates();
      } catch (err) {
        console.error('[CallService] ReceiveAnswer failed:', err);
      }
    });

    this.hubConnection.on('ReceiveIceCandidate', async (_from: string, candidateStr: string) => {
      const parsed = JSON.parse(candidateStr) as RTCIceCandidateInit;
      if (!this.peerConnection?.remoteDescription) {
        this.pendingCandidates.push(parsed);
        return;
      }
      await this.peerConnection.addIceCandidate(parsed)
        .catch(err => console.error('[CallService] addIceCandidate failed:', err));
    });

    // Remote tells us they started / stopped screen sharing so we can update UI
    this.hubConnection.on('ScreenShareStarted', () => this._isRemoteScreenShare.next(true));
    this.hubConnection.on('ScreenShareStopped', () => this._isRemoteScreenShare.next(false));

    this.startPromise = this.hubConnection.start()
      .catch(err => console.error('[CallService] hub start failed:', err))
      .finally(() => {
        this.startPromise = null;
      });
  }

  private async ensureConnected(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;
    if (this.startPromise) {
      await this.startPromise;
      return;
    }
    this.startPromise = this.hubConnection?.start()
      .finally(() => {
        this.startPromise = null;
      }) ?? null;
    await this.startPromise;
  }

  // ── Call flow ──────────────────────────────────────────────────────────────

  async requestCall(targetUserId: string, type: CallType): Promise<void> {
    if (this.isCallInProgress) return;
    this.isCallInProgress = true;
    this.signalingTargetId = targetUserId;
    this.activeCallType = type;
    await this.ensureConnected();
    await this.hubConnection!.invoke('RequestCall', targetUserId, type);
    this._isAwaitingCallResponse.next(true);
  }

  async acceptCall(from: string, type: CallType): Promise<void> {
    await this.ensureConnected();
    this.signalingTargetId = from;
    this.activeCallType = type;
    await this.hubConnection!.invoke('RespondCall', from, true);
    // PC + local stream are set up when ReceiveOffer arrives
    this._callSessionActive.next(true);
  }

  async rejectCall(from: string): Promise<void> {
    await this.ensureConnected();
    await this.hubConnection?.invoke('RespondCall', from, false);
  }

  async endCall(targetUserId: string): Promise<void> {
    const wasSharing = this._isLocalScreenSharing.value;
    this.resetAll();
    this.incomingCall$.next(null);
    try {
      await this.ensureConnected();
      await this.hubConnection?.invoke('EndCall', targetUserId);
      if (wasSharing) {
        await this.hubConnection?.invoke('NotifyScreenShareStopped', targetUserId)
          .catch(() => undefined);
      }
    } catch (err) {
      console.error('[CallService] EndCall failed:', err);
    }
  }

  // ── Screen share ───────────────────────────────────────────────────────────

  /**
   * Start screen sharing.
   *
   * Mode A — active call exists:
   *   Adds the screen video track to the existing PC and renegotiates.
   *   The remote receives ontrack with the new video track.
   *   Audio keeps flowing on the existing audio sender — no interruption.
   *
   * Mode B — no active call (standalone):
   *   Starts mic, captures screen, builds a fresh PC with both tracks,
   *   sends the offer. Remote answers and receives both audio + video.
   */
  async startScreenShare(): Promise<void> {
    this._screenShareError.next(null);

    if (!this.signalingTargetId) {
      this._screenShareError.next('Cannot share: no chat partner is selected.');
      return;
    }

    // Acquire screen
    let screenStream: MediaStream;
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
      });
    } catch (err: unknown) {
      this._screenShareError.next(
        err instanceof Error ? err.message : 'Could not access the screen.'
      );
      return;
    }

    this.screenStream = screenStream;
    const screenTrack = screenStream.getVideoTracks()[0];

    if (!screenTrack) {
      screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
      this._screenShareError.next('No display track available.');
      return;
    }

    screenTrack.onended = () => void this.stopScreenShare();

    if (this.peerConnection) {
      // ── Mode A: existing call — add track + renegotiate ───────────────────
      this.peerConnection.addTrack(screenTrack, screenStream);
      await this.renegotiate();
    } else {
      // ── Mode B: standalone — build a new PC with mic + screen ─────────────
      try {
        await this.startLocalStream('audio');
      } catch {
        screenStream.getTracks().forEach(t => t.stop());
        this.screenStream = null;
        this._screenShareError.next('Could not access microphone.');
        return;
      }

      this.standaloneScreenShare = true;
      this.createPeerConnection();
      // createPeerConnection() already added the mic track from localStream.
      // Now add the screen video track.
      this.peerConnection!.addTrack(screenTrack, screenStream);

      await this.sendOffer(this.signalingTargetId);
      this._callSessionActive.next(true);
    }

    await this.hubConnection?.invoke('NotifyScreenShareStarted', this.signalingTargetId)
      .catch(() => undefined);

    this._isLocalScreenSharing.next(true);
  }

  async stopScreenShare(): Promise<void> {
    if (!this._isLocalScreenSharing.value) return;
    this._isLocalScreenSharing.next(false);

    const screenTrack = this.screenStream?.getVideoTracks()[0] ?? null;
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = null;

    if (this.signalingTargetId) {
      await this.hubConnection?.invoke('NotifyScreenShareStopped', this.signalingTargetId)
        .catch(() => undefined);
    }

    if (this.standaloneScreenShare) {
      // Tear down the whole session — there is no underlying call to return to
      this.standaloneScreenShare = false;
      if (this.signalingTargetId) await this.endCall(this.signalingTargetId);
      return;
    }

    if (!this.peerConnection) return;

    // Remove the screen sender and renegotiate so the remote drops the track
    if (screenTrack) {
      const sender = this.peerConnection.getSenders()
        .find(s => s.track?.id === screenTrack.id);
      if (sender) {
        this.peerConnection.removeTrack(sender);
        await this.renegotiate();
      }
    }

    this._screenShareError.next(null);
  }

  // ── Media controls ─────────────────────────────────────────────────────────

  toggleMic(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach(t => { t.enabled = enabled; });
  }

  toggleCamera(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach(t => { t.enabled = enabled; });
  }

  dismissScreenShareInvite(_accept: boolean, _fromUserId: string): void {
    this.incomingScreenShareRequest$.next(null);
  }

  cancelOutgoingScreenShare(): void {
    this.screenShareWaiting$.next(false);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private async startLocalStream(type: CallType): Promise<void> {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    this._localStream.next(this.localStream);
  }

  private createPeerConnection(): void {
    this.peerConnection?.close();
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    this.peerConnection = pc;

    // Fresh remote stream for this session
    this.remoteStream = new MediaStream();
    this._remoteStream.next(this.remoteStream);

    // Add local mic/camera tracks
    this.localStream?.getTracks().forEach(t => pc.addTrack(t, this.localStream!));

    pc.ontrack = event => {
      if (!this.remoteStream) this.remoteStream = new MediaStream();
      event.streams[0]?.getTracks().forEach(track => {
        if (!this.remoteStream!.getTracks().some(t => t.id === track.id)) {
          this.remoteStream!.addTrack(track);
        }
      });
      // Emit a NEW MediaStream instance so Angular/DOM detect the change
      // and rebind srcObject on both <video> and <audio> elements.
      this._remoteStream.next(new MediaStream(this.remoteStream.getTracks()));
    };

    pc.onicecandidate = event => {
      if (!event.candidate || !this.signalingTargetId || !this.hubConnection) return;
      const init: RTCIceCandidateInit = {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        usernameFragment: event.candidate.usernameFragment,
      };
      this.hubConnection
        .invoke('SendIceCandidate', this.signalingTargetId, JSON.stringify(init))
        .catch(err => console.error('[CallService] SendIceCandidate:', err));
    };

    pc.oniceconnectionstatechange = () =>
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
    pc.onsignalingstatechange = () =>
      console.log('[WebRTC] Signaling state:', pc.signalingState);
  }

  private async sendOffer(targetId: string): Promise<void> {
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    await this.ensureConnected();
    await this.hubConnection!.invoke('SendOffer', targetId, JSON.stringify(offer));
  }

  private async renegotiate(): Promise<void> {
    if (!this.peerConnection || !this.signalingTargetId) return;
    try {
      await this.sendOffer(this.signalingTargetId);
    } catch (err) {
      console.error('[CallService] renegotiate failed:', err);
    }
  }

  private async flushPendingCandidates(): Promise<void> {
    for (const c of this.pendingCandidates) {
      await this.peerConnection?.addIceCandidate(c)
        .catch(err => console.error('[CallService] flush candidate failed:', err));
    }
    this.pendingCandidates = [];
  }
  setTargetUser(userId: string): void {
    this.signalingTargetId = userId;
  }
  private resetAll(): void {
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = null;
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.peerConnection?.close();
    this.peerConnection = null;
    this.remoteStream = null;
    this.signalingTargetId = null;
    this.activeCallType = null;
    this.pendingCandidates = [];
    this.isCallInProgress = false;
    this.standaloneScreenShare = false;
    this._localStream.next(null);
    this._remoteStream.next(null);
    this._isLocalScreenSharing.next(false);
    this._isRemoteScreenShare.next(false);
    this._callSessionActive.next(false);
    this._isAwaitingCallResponse.next(false);
    this.screenShareWaiting$.next(false);
  }
}
