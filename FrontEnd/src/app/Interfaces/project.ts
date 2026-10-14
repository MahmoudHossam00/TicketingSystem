// project.model.ts

export interface ProjectResponse {
    id: string;
    ipAddress: string;
    userId: string;
    userName: string;
    isClosed: boolean;
    priority?: IssuePriority;
    description: string;
    attachments: string[];
    currentStatusId?: string;
    creationDate: string;
    startDate: string;
    endDate: string;
    finishDate?: string;
    relatedSubModuleId: string;
    numericId?:number;
  }
  
  export enum IssuePriority {
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
  }
  
  export interface FilterProjectRequest {
    systemId?: string;
    issueStatusId?: string;
    onlyMyProjects?: boolean;
  }
  
  export interface CreateProjectRequest {
    priority?: IssuePriority;
    description: string;
    attachments?: File[];
    currentStatusId?: string;
    startDate: string;
    endDate: string;
    // systemId: string;
    relatedSubModuleId:string;
  }
  
  export interface UpdateProjectRequest {
    priority?: IssuePriority;
    description?: string;
    currentStatusId?: string;
    startDate?: string;
    endDate?: string;
    systemId?: string;
  }
  
  export interface MessageResponse {
    text: string;
    pictures: string[];
    attachments: string[];
    voiceRecords: string[];
    isSeen: boolean;
    date: string;
    userId: string;
    userName: string;
  }
  
  export interface MessengerResponse {
    text: string;
    projectId: string;
    isSeen: boolean;
    date: string;
    userId: string;
    contactedUserId: string;
    contactedUserName: string;
    contactedUserPicture?: string;
  }
