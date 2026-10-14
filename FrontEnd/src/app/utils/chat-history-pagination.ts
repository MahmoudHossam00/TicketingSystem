import { messangermsg } from '../Interfaces/ticket';

/** Normalized row compatible with hub `ChatMessage` across task/ticket/project/user chats. */
export interface NormalizedChatMessagePayload {
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
  recipientUserId?: string;
}

function chatMessageKey(m: NormalizedChatMessagePayload): string {
  const id = m.id?.trim();
  if (id) return `id:${id}`;
  const t = (m.text ?? '').slice(0, 200);
  return `f:${m.userId}|${m.date}|${t}`;
}

export function mergeChatHistoryOlderFirst<T extends NormalizedChatMessagePayload>(
  olderChunk: T[],
  current: T[],
): T[] {
  const map = new Map<string, T>();
  for (const m of olderChunk) {
    map.set(chatMessageKey(m), m);
  }
  for (const m of current) {
    map.set(chatMessageKey(m), m);
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function pickRowId(r: Record<string, unknown>): string | undefined {
  const v = r['id'] ?? r['messageId'] ?? r['Id'] ?? r['MessageId'];
  return v != null && String(v).trim() !== '' ? String(v) : undefined;
}

export function messangerRowsToChatMessages(rows: messangermsg[]): NormalizedChatMessagePayload[] {
  const out: NormalizedChatMessagePayload[] = [];
  for (const m of rows) {
    const r = m as messangermsg & Record<string, unknown>;
    const dateVal = m.date;
    const dateStr =
      typeof dateVal === 'string'
        ? dateVal
        : dateVal instanceof Date
          ? dateVal.toISOString()
          : new Date(dateVal as string).toISOString();
    const id = pickRowId(r);
    const pics = (r['pictures'] as string[] | undefined) ?? m.pictures ?? [];
    const atts = (r['attachments'] as string[] | undefined) ?? m.attachments ?? [];
    const voices = (r['voiceRecords'] as string[] | undefined) ?? m.voiceRecords ?? [];
    out.push({
      id,
      text: m.text ?? '',
      pictures: Array.isArray(pics) ? pics : [],
      attachments: Array.isArray(atts) ? atts : [],
      voiceRecords: Array.isArray(voices) ? voices : [],
      isSeen: !!m.isSeen,
      date: dateStr,
      userId: m.userId ?? String(r['UserId'] ?? ''),
      userName: (r['userName'] as string | undefined) ?? m.userName ?? m.contactedUserName ?? undefined,
      userPicture:
        (r['userPicture'] as string | undefined) ?? m.userPicture ?? m.contactedUserPicture ?? undefined,
      recipientUserId: m.contactedUserId ?? (r['ContactedUserId'] as string | undefined),
    });
  }
  return out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function oldestMessageCursorId(
  messages: ReadonlyArray<NormalizedChatMessagePayload>,
): string | null {
  if (!messages.length) return null;
  const first = messages[0];
  const id = first.id?.trim();
  if (id) return id;
  const r = first as unknown as Record<string, unknown>;
  const v = pickRowId(r);
  return v ?? null;
}
