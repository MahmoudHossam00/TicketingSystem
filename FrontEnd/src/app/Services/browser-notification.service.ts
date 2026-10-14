import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';

export interface BrowserNotificationOptions {
  title: string;
  body?: string;
  iconUrl?: string;
  tag?: string;
  onClickUrl?: string;
}

export interface NotificationDebugInfo {
  supported: boolean;
  secureContext: boolean;
  permission: NotificationPermission | 'unsupported';
  visibility: DocumentVisibilityState | 'unknown';
  focused: boolean;
}

interface ChatLikeMessage {
  text?: string;
  pictures?: unknown[];
  attachments?: unknown[];
  voiceRecords?: unknown[];
  userName?: string;
  userPicture?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class BrowserNotificationService {
  private static readonly DESKTOP_ENABLED_KEY = 'fpi_desktop_notifications_enabled';
  private static readonly SOUND_MUTED_KEY = 'fpi_notification_sound_muted';
  private audioContext: AudioContext | null = null;
  private unlockListenersBound = false;

  constructor() {
    this.bindAudioUnlockListeners();
  }
  private shouldShowOnlyInOneTab(tag: string): boolean {
    const key = `notif-lock-${tag}`;
    const now = Date.now();
  
    const existing = Number(localStorage.getItem(key) ?? '0');
  
    // لو Tab تانية عرضتها آخر 3 ثواني، متعرضهاش تاني
    if (existing && now - existing < 3000) {
      return false;
    }
  
    localStorage.setItem(key, String(now));
    return true;
  }

  requestPermission(): void {
    if (!this.canUseNotificationApi()) return;
    if (Notification.permission !== 'default') return;
    void this.requestPermissionFromUser();
  }

  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!this.canUseNotificationApi()) return 'unsupported';
    return Notification.permission;
  }

  getDebugInfo(): NotificationDebugInfo {
    const supported = this.canUseNotificationApi();
    const permission = supported ? Notification.permission : 'unsupported';
    const secureContext = typeof window !== 'undefined' ? window.isSecureContext : false;
    const visibility =
      typeof document !== 'undefined' && typeof document.visibilityState !== 'undefined'
        ? document.visibilityState
        : 'unknown';
    const focused =
      typeof document !== 'undefined' && typeof document.hasFocus === 'function'
        ? document.hasFocus()
        : false;
    return {
      supported,
      secureContext,
      permission,
      visibility,
      focused,
    };
  }

  async requestPermissionFromUser(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.canUseNotificationApi()) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch {
      return Notification.permission;
    }
  }
  notify(options: {
    title: string;
    body?: string;
    tag?: string;
    iconUrl?: string;
    onClickUrl?: string;
  }): boolean {
    if (!this.isDesktopEnabled()) return false;
    if (!('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;
  
    const tag = options.tag ?? `${options.title}-${options.body ?? ''}`;
  
    if (!this.shouldShowOnlyInOneTab(tag)) {
      return false;
    }
  
    const n = new Notification(options.title, {
      body: options.body,
      icon: options.iconUrl,
      tag,
      // renotify: false,
    });
  
    n.onclick = () => {
      window.focus();
      if (options.onClickUrl) {
        window.location.href = options.onClickUrl;
      }
      n.close();
    };
  
    return true;
  }

  notifyChatMessage(
    message: ChatLikeMessage,
    options?: { fallbackTitle?: string; tag?: string; onClickUrl?: string }
  ): void {
    const sender = message.userName?.trim();
    this.notify({
      title: sender || options?.fallbackTitle || 'New message',
      body: this.buildChatPreview(message),
      iconUrl: this.resolveImageUrl(message.userPicture),
      tag: options?.tag,
      onClickUrl: options?.onClickUrl,
    });
  }

  resolveImageUrl(raw: string | null | undefined): string | undefined {
    if (raw == null || String(raw).trim() === '') return undefined;
    const s = String(raw).trim();
    if (/^https?:\/\//i.test(s) || s.startsWith('data:') || s.startsWith('blob:')) {
      return s;
    }
    const base = Environment.baseUrl.replace(/\/$/, '');
    if (s.startsWith('/files/') || s.startsWith('/Files/')) {
      return `${base}${s}`;
    }
    if (s.startsWith('/')) {
      const root = Environment.standaloneurl.replace(/\/$/, '');
      return `${root}${s.replace(/\/+$/, '')}`;
    }

    const normalized = s.replace(/^\//, '');
    if (/^files\//i.test(normalized)) {
      return `${base}/${normalized}`;
    }
    return `${base}/Files/${normalized}`;
  }

  isDesktopEnabled(): boolean {
    if (typeof localStorage === 'undefined') return true;
    const v = localStorage.getItem(BrowserNotificationService.DESKTOP_ENABLED_KEY);
    return v !== '0';
  }

  setDesktopEnabled(enabled: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(BrowserNotificationService.DESKTOP_ENABLED_KEY, enabled ? '1' : '0');
  }

  isSoundMuted(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(BrowserNotificationService.SOUND_MUTED_KEY) === '1';
  }

  setSoundMuted(muted: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(BrowserNotificationService.SOUND_MUTED_KEY, muted ? '1' : '0');
  }

  private buildChatPreview(message: ChatLikeMessage): string {
    const parts: string[] = [];
    const text = message.text?.trim();
    if (text) parts.push(text);
    if (message.pictures?.length) parts.push(message.pictures.length > 1 ? `${message.pictures.length} photos` : 'Photo');
    if (message.attachments?.length) parts.push(message.attachments.length > 1 ? `${message.attachments.length} files` : 'File');
    if (message.voiceRecords?.length) parts.push('Voice message');
    return parts.join(' · ') || 'You have a new message.';
  }

  private canUseNotificationApi(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  private defaultIconUrl(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/favicon.ico`;
  }

  private bindAudioUnlockListeners(): void {
    if (typeof window === 'undefined' || this.unlockListenersBound) return;
    this.unlockListenersBound = true;

    const unlock = () => {
      const ctx = this.ensureAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => undefined);
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext;
    if (typeof window === 'undefined') return null;

    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      this.audioContext = new AudioCtx();
    } catch {
      this.audioContext = null;
    }
    return this.audioContext;
  }

  private playSound(): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    const t0 = ctx.currentTime;

    const playTone = (start: number, frequency: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    // Notification-like "ding-ding" chime.
    playTone(t0, 880, 0.20, 0.36);
    playTone(t0 + 0.17, 1174, 0.22, 0.34);
    playTone(t0 + 0.39, 988, 0.24, 0.30);
  }
}
