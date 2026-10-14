import { IssuePriority } from "./project";

export interface CreateTaskRequest {
    userId: string;
    description: string;
    startDate: Date;
    endDate: Date;
    attachments?: File[];
    currentStatusId?: string;
    blockingEmployeeId?:string;
    // isClosed?: boolean;
    priority?: IssuePriority;
  }
  export interface TaskResponse {
    id: string;
  
    description: string;
    projectId: string;
  
    userId: string;
    userName: string;
  
    blockingEmployeeId?:string;
    blockingEmployeeName?:string;
    
    creationDate: Date;
    startDate: Date;
    endDate: Date;
    finishDate?: Date;
  
    attachments: string[];
    assignedAttachments: string[];
  
    assignHistories: any[];
    messages: any[];
    ticketStatuses: any[];
    taskPrivateNotes: any[];
  
    currentStatusId?: string;
    isClosed: boolean;
    priority?: IssuePriority;
  }