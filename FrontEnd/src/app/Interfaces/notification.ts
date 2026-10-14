
// models/notification.model.ts
export interface NotificationResponse {
    id: string;
    userId: string;
    text: string;
    type: number; // or enum if you have one
    date: string;
    isSeen: boolean;
    redirectLink?: string;
 
  }

export enum NotificationType {
    Ticket,
    Reply,
    Project,
    Task,
    General
}