import { EntityResponse } from "./general";

export interface ticket extends EntityResponse {

    relatedSubModuleAnswerId:string;
    ipAddress:string;
    subModuleId:string;
    userId:string;
    userName:string;
    issueTypeId:string;
    companyId:string;
    priority:IssuePriority;
    subject:string;
    description:string;
    attachments:string[];
    issueStatusId:string;
    originalTicketId?:string;
    employeeName?:string;
    // kpis:KPIViewDto[];
}
export interface KPIViewDto {
  kpiId: string;
  kpiName: string;
  type: string;
  /** Answered / recorded KPI value when provided by the API. */
  value?: string | null;
  /** Same as `value` if the API uses a different name. */
  kpiValue?: string | null;
  /** When the KPI was confirmed (e.g. project subtask flow). */
  confirmationDate?: string | null;
}
export enum IssuePriority
{
    Low=0,
    Meduim=1,
    High=2,
    Critical=3
}




export interface CreateTicketRequest{
    RelatedSubModuleAnswer:CreateRelatedSubModuleAnswerRequest;
    priority?:IssuePriority;
    subject:string;
    description:string;
    attachments:File[];
    to:string[];
    cCs:string[];
    userId?:string;
    employeeId?:string;
    notifyUser?:boolean;
}
export interface SplitTicketRequest{
    RelatedSubModuleAnswer:CreateRelatedSubModuleAnswerRequest;
    priority?:IssuePriority;
    subject:string;
    description:string;
    attachments:File[];

    to:string[];
    cCs:string[];
    IssueTypeId?:string;
    CompanyId?:string;
    ReplyId:string;
}
export interface CreateRelatedSubModuleAnswerRequest
{
    relatedSubModuleId:string;
    textAnswers:TextQuestionAnswerRequest[];
    dateAnswers:DateQuestionAnswerRequest[];
    multipleChoiceAnswers:MultipleChoiceQuestionAnswerRequest[];
    singleChoiceAnswers:SingleChoiceQuestionAnswerRequest[];

}
export interface QuestionAnswerRequest
{
    //public Guid SubModuleAnswerId { get; set; }
    questionId:string;
}
export interface TextQuestionAnswerRequest extends QuestionAnswerRequest{
 value?:string;
}
export interface DateQuestionAnswerRequest extends QuestionAnswerRequest{
    value?:Date;
}
export interface MultipleChoiceQuestionAnswerRequest extends QuestionAnswerRequest{
    value?:string[];
}
export interface SingleChoiceQuestionAnswerRequest extends QuestionAnswerRequest{
    value?:string;
}


export interface CreateReplyRequest{
    ticketId:string;
    //public Guid? ParentReplyId { set; get; }
    //public string? Subject { set; get; }
    description:string;
    attachments:File[];
    pictures:File[];
    
    to:string[];
    cCs:string[];

}

export interface Reply extends EntityResponse{
    id:string;
    ticketId:string;
    userId:string;
    userName:string;
   
    subject:string;
    description:string;
    date:Date;
    attachments:string[];
    pictures:string[];
    to:string[];
    cCs:string[];
    splitTicketId?:string;
}
export interface TicketFilterRequest{
    SystemId?:string;
    IssueStatusId?:string;
    OnlyMyTickets?:boolean;
    OnlyNonAssignedTickets?:boolean;
    GetMyOpenedTicketsOnly?:boolean;
    from?:Date;
    to?:Date;
}

export interface messangermsg
{ 
    text:string;
    ticketId:string;
    isSeen:boolean;
    date:Date;
    userId:string;
    contactedUserId:string;
    contactedUserName:string;
    contactedUserPicture:string|null;
    /** Message row id for `…/20more/{id}` pagination (camelCase or PascalCase from API). */
    id?: string;
    messageId?: string;
    pictures?: string[];
    attachments?: string[];
    voiceRecords?: string[];
    userName?: string;
    userPicture?: string;
}



export interface FilterTaskRequest
{
    systemId?:string;
    issueStatusId?:string;
    onlyAssignedTasks?:boolean;
    onlyResponsibleTasks?:boolean;
    pagenum?:number;
    from?:Date;
    to?:Date;
}