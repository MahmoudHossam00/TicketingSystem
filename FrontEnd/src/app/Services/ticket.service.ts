import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
// import { CreateSubModuleRequest, SubModule } from '../Interfaces/submodule';
import { CreateQuestionOptionRequest, CreateQuestionRequest, Question, UpdateQuestionRequest } from '../Interfaces/question';
import { CreateRelatedSubModuleAnswerRequest, CreateReplyRequest, CreateTicketRequest, IssuePriority, KPIViewDto, messangermsg, Reply, SplitTicketRequest, ticket, TicketFilterRequest } from '../Interfaces/ticket';
import { CreateSubModuleRequest, RelatedSubModuleAnswerResponse, SubModule } from '../Interfaces/submodule';
import { userresponseviewDTO } from '../Interfaces/auth';
import { assignhistories, issuestatushistory } from '../Interfaces/issuestatus';
import { PaginatedResponse, stringDTO } from '../Interfaces/general';
import { kpiviewDTO, projecttasksubtaskresponse } from './tasks.service';
import { filterKPITaskReqeust } from '../Interfaces/kpitasks';
// import { Employee } from '../Interfaces/auth';

@Injectable({
  providedIn: 'root'
})
export class ticketService {
  private apiUrl = `${Environment.baseUrl}Ticket`;

  constructor(private _HttpClient: HttpClient) {}

  getAll(): Observable<ticket[]> {
    return this._HttpClient.get<ticket[]>(`${this.apiUrl}`);
  }
  getFiltered(filter: TicketFilterRequest): Observable<ticket[]> {
    let params: HttpParams = new HttpParams();
    if (filter.SystemId) {
      params = params.set('SystemId', filter.SystemId);
    }
    if (filter.IssueStatusId) {
      params = params.set('IssueStatusId', filter.IssueStatusId);
    }
    if (filter.OnlyMyTickets) {
      params = params.set('OnlyMyTickets', filter.OnlyMyTickets);
    }
    if (filter.OnlyNonAssignedTickets) {
      params = params.set('OnlyNonAssignedTickets', filter.OnlyNonAssignedTickets);
    }
    if (filter.GetMyOpenedTicketsOnly) {
      params = params.set('GetMyOpenedTicketsOnly', filter.GetMyOpenedTicketsOnly.toString());
    }
    if (filter.from) {
      const from = this.toLocalDateString(filter.from);
      params = params.append('from', from);
    }
    if (filter.to) {
      const to = this.toLocalDateString(filter.to);
      params = params.append('to', to);
    }
    return this._HttpClient.get<ticket[]>(`${this.apiUrl}/Filtered`, { params });
  }
  getFilteredWithKPIs(filter: TicketFilterRequest): Observable<ticket[]> {
    let params: HttpParams = new HttpParams();
    if (filter.SystemId) {
      params = params.set('SystemId', filter.SystemId);
    }
    if (filter.IssueStatusId) {
      params = params.set('IssueStatusId', filter.IssueStatusId);
    }
    if (filter.OnlyMyTickets) {
      params = params.set('OnlyMyTickets', filter.OnlyMyTickets);
    }
    if (filter.OnlyNonAssignedTickets) {
      params = params.set('OnlyNonAssignedTickets', filter.OnlyNonAssignedTickets);
    }
    if (filter.GetMyOpenedTicketsOnly) {
      params = params.set('GetMyOpenedTicketsOnly', filter.GetMyOpenedTicketsOnly.toString());
    }
    if (filter.from) {
      params = params.set('from', filter.from.toISOString());
    }
    if (filter.to) {
      params = params.set('to', filter.to.toISOString());
    }

    return this._HttpClient.get<ticket[]>(`${this.apiUrl}/FilteredWithKpis`, { params });
  }
  getById(id: string): Observable<ticket> {
    return this._HttpClient.get<ticket>(`${this.apiUrl}/${id}`);
  }
  create(request: CreateTicketRequest): Observable<ticket> {
    console.log('CreateTicketRequest payload before send:', request);

    const form = new FormData();

    // primitive fields
    if (request.priority !== undefined && request.priority !== null) {
      form.append('priority', request.priority.toString());
    }
    form.append('subject', request.subject);
    form.append('description', request.description);

    if (request.userId != null && String(request.userId).trim() !== '') {
      form.append('userId', String(request.userId).trim());
    }
    if (request.employeeId != null && String(request.employeeId).trim() !== '') {
      form.append('employeeId', String(request.employeeId).trim());
    }
    if (request.notifyUser !== undefined && request.notifyUser !== null) {
      form.append('notifyUser', request.notifyUser ? 'true' : 'false');
    }

    // to / cCs as repeated form keys
    (request.to ?? []).forEach((value) => {
      form.append('to', value);
    });
    (request.cCs ?? []).forEach((value) => {
      form.append('cCs', value);
    });
    console.log(request.attachments,'attachments');

    // attachments (currently strings per interface)
    (request.attachments ?? []).forEach((att) => {
      form.append('attachments', att);
    });

    // RelatedSubModuleAnswer and nested answers
    const rsa = request.RelatedSubModuleAnswer;
    form.append('RelatedSubModuleAnswer.relatedSubModuleId', rsa.relatedSubModuleId);

    (rsa.textAnswers ?? []).forEach((a, i) => {
      form.append(`RelatedSubModuleAnswer.textAnswers[${i}].questionId`, a.questionId);
      if (a.value != null) {
        form.append(`RelatedSubModuleAnswer.textAnswers[${i}].value`, a.value);
      }
    });

    (rsa.dateAnswers ?? []).forEach((a, i) => {
      form.append(`RelatedSubModuleAnswer.dateAnswers[${i}].questionId`, a.questionId);
      if (a.value != null) {
        form.append(
          `RelatedSubModuleAnswer.dateAnswers[${i}].value`,
          a.value instanceof Date ? a.value.toISOString() : (a.value as any)
        );
      }
    });

    (rsa.singleChoiceAnswers ?? []).forEach((a, i) => {
      form.append(`RelatedSubModuleAnswer.singleChoiceAnswers[${i}].questionId`, a.questionId);
      if (a.value != null) {
        form.append(`RelatedSubModuleAnswer.singleChoiceAnswers[${i}].selectedOptionId`, a.value);
      }
    });

    (rsa.multipleChoiceAnswers ?? []).forEach((a, i) => {
      form.append(`RelatedSubModuleAnswer.multipleChoiceAnswers[${i}].questionId`, a.questionId);
      if (a.value != null) {
        a.value.forEach((val) => {
          form.append(`RelatedSubModuleAnswer.multipleChoiceAnswers[${i}].selectedOptions`, val);
        });
      }
    });

    // debug: log full FormData contents
    console.log('FormData payload before send:');
    // FormData.entries() is supported in modern browsers
    for (const [key, value] of form.entries()) {
      console.log(`  ${key}:`, value);
    }

    return this._HttpClient.post<ticket>(`${this.apiUrl}`, form);
  }
  createTicket(fd: FormData) {
    return this._HttpClient.post<ticket>(`${this.apiUrl}`, fd);
  }
  update(id: string, subModule: CreateTicketRequest): Observable<ticket> {
    return this._HttpClient.put<ticket>(`${this.apiUrl}/${id}`, subModule);
  }
  delete(id: string): Observable<void> {
    return this._HttpClient.delete<void>(`${this.apiUrl}/${id}`);
  }
 ChangeModule(id:string,Module:CreateRelatedSubModuleAnswerRequest): Observable<void> {
  const data:CreateRelatedSubModuleAnswerRequest={
    relatedSubModuleId: Module.relatedSubModuleId,
    textAnswers: (Module.textAnswers ?? []).map((a: any) => ({
      questionId: a.questionId,
      value: a.value
    })),
    dateAnswers: (Module.dateAnswers ?? []).map((a: any) => ({
      questionId: a.questionId,
      value: a.value
    })),
    singleChoiceAnswers: (Module.singleChoiceAnswers ?? []).map((a: any) => ({
      questionId: a.questionId,
      selectedOptionId: a.value
    })),
    multipleChoiceAnswers: (Module.multipleChoiceAnswers ?? []).map((a: any) => ({
      questionId: a.questionId,
      selectedOptions: a.value ?? []
    }))

  }
  console.log(data,'data');
  return this._HttpClient.post<void>(`${this.apiUrl}/${id}/ChangeModule`, data);
 }
  getPrivateNotes(id: string): Observable<string[]> {
    return this._HttpClient.get<string[]>(`${this.apiUrl}/${id}/PrivateNotes`);
  }
  /**
   * KPIs for a ticket within an optional date range (query params expected by API).
   */
  getKPIs(filterrequest:filterKPITaskReqeust): Observable<PaginatedResponse<TicketTaskResponse>> {
    let params = new HttpParams();
    if (filterrequest.userIds) {
      filterrequest.userIds.forEach(userId => params = params.append('userIds', userId));
    }
    if (filterrequest.systemIds) {
      filterrequest.systemIds.forEach(systemId => params = params.append('systemIds', systemId));
    }
    if (filterrequest.hasKpi !== undefined && filterrequest.hasKpi !== null) {
      params = params.append('hasKpi', filterrequest.hasKpi.toString());
    }
    if (filterrequest.from) {
      const from = this.toLocalDateString(filterrequest.from);
      params = params.append('from', from);
    }
    if (filterrequest.to) {
      const to = this.toLocalDateString(filterrequest.to);
      params = params.append('to', to);
    }
    params=params.set('page', filterrequest.page?.toString() ?? '1');
    return this._HttpClient.get<PaginatedResponse<TicketTaskResponse>>(`${this.apiUrl}/KPIs`, { params });
  }
  private toLocalDateString(value: Date): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  getCCs(id: string): Observable<userresponseviewDTO[]> {
    return this._HttpClient.get<userresponseviewDTO[]>(`${this.apiUrl}/${id}/CCs`);
  }
  getTOs(id: string): Observable<userresponseviewDTO[]> {
    return this._HttpClient.get<userresponseviewDTO[]>(`${this.apiUrl}/${id}/TOs`);
  }

  getRelatedSubModuleAnswer(id: string): Observable<RelatedSubModuleAnswerResponse> {
    return this._HttpClient.get<RelatedSubModuleAnswerResponse>(`${this.apiUrl}/${id}/RelatedAnswer`);
  }

  getStatuses(id: string): Observable<issuestatushistory[]> {
    return this._HttpClient.get<issuestatushistory[]>(`${this.apiUrl}/${id}/Statuses`);
  }
  
  getReplies(id: string): Observable<Reply[]> {
    return this._HttpClient.get<Reply[]>(`${this.apiUrl}/${id}/Replies`);
  }

  ChangeStatus(id: string, statusId: string): Observable<void> {
    return this._HttpClient.put<void>(`${this.apiUrl}/${id}/changestatus/${statusId}`, {  });
  }
  getAssignHistoriess(id: string): Observable<assignhistories[]> {
    return this._HttpClient.get<assignhistories[]>(`${this.apiUrl}/${id}/AssignHistories`);
  }
  getTicketSystemId(id: string): Observable<string> {
    return this._HttpClient.get<string>(`${this.apiUrl}/TicketSystem/${id}`);
  }
  Reassign(ticketId: string, userId: string): Observable<assignhistories> {
    return this._HttpClient.put<assignhistories>(`${this.apiUrl}/${ticketId}/Reassign/${userId}`, {  });
  }

  PrivateNotes(ticketId: string, note: stringDTO): Observable<void> {
    return this._HttpClient.post<void>(`${this.apiUrl}/${ticketId}/PrivateNotes`, note );
  }

  CreateReplies(createreply:CreateReplyRequest): Observable<string> {
    const form = new FormData();
    form.append('Description', createreply.description);
    (createreply.attachments ?? []).forEach((att) => {
      form.append('Attachments', att);
    });
    (createreply.pictures ?? []).forEach((pic) => {
      form.append('Pictures', pic);
    });
    (createreply.to ?? []).forEach((to) => {
      form.append('To', to);
    });
    (createreply.cCs ?? []).forEach((cc) => {
      form.append('CCs', cc);
    });
    return this._HttpClient.post<string>(`${this.apiUrl}/${createreply.ticketId}/Replies`, form );
  }
  ChangeBasicData(id: string, CompanyId?:string, IssueTypeId?:string,Priority?:IssuePriority):Observable<string>
  {
    return this._HttpClient.put<string>(`${this.apiUrl}/${id}/BasicData`, {
      issueTypeId: IssueTypeId,
      companyId: CompanyId,
      priority: Priority,
      priorityId: Priority,
    } );
  }

  MyMessanger(): Observable<messangermsg[]> {
    return this._HttpClient.get<messangermsg[]>(`${this.apiUrl}/MyMessanger`);
  }
  Get20More(MessageId: string): Observable<messangermsg[]> {
    return this._HttpClient.get<messangermsg[]>(`${this.apiUrl}/20more/${MessageId}`);
  }

  SplitTicket(request:SplitTicketRequest):Observable<{guid:string}> {
    console.log(request,'request');

    const form = new FormData();

    // primitive fields
    if (request.priority !== undefined && request.priority !== null) {
      form.append('priority', request.priority.toString());
    }
    form.append('subject', request.subject);
    form.append('description', request.description);

    // to / cCs as repeated form keys
    (request.to ?? []).forEach((value) => {
      form.append('to', value);
    });
    (request.cCs ?? []).forEach((value) => {
      form.append('cCs', value);
    });
    console.log(request.attachments,'attachments');

    // attachments (currently strings per interface)
    (request.attachments ?? []).forEach((att) => {
      form.append('attachments', att);
    });

    // RelatedSubModuleAnswer and nested answers
    const rsa = request.RelatedSubModuleAnswer;
    form.append('RelatedSubModuleAnswer.relatedSubModuleId', rsa.relatedSubModuleId);

    (rsa.textAnswers ?? []).forEach((a, i) => {
      form.append(`RelatedSubModuleAnswer.textAnswers[${i}].questionId`, a.questionId);
      if (a.value != null) {
        form.append(`RelatedSubModuleAnswer.textAnswers[${i}].value`, a.value);
      }
    });

    (rsa.dateAnswers ?? []).forEach((a, i) => {
      form.append(`RelatedSubModuleAnswer.dateAnswers[${i}].questionId`, a.questionId);
      if (a.value != null) {
        form.append(
          `RelatedSubModuleAnswer.dateAnswers[${i}].value`,
          a.value instanceof Date ? a.value.toISOString() : (a.value as any)
        );
      }
    });

    (rsa.singleChoiceAnswers ?? []).forEach((a, i) => {
      form.append(`RelatedSubModuleAnswer.singleChoiceAnswers[${i}].questionId`, a.questionId);
      if (a.value != null) {
        form.append(`RelatedSubModuleAnswer.singleChoiceAnswers[${i}].selectedOptionId`, a.value);
      }
    });

    (rsa.multipleChoiceAnswers ?? []).forEach((a, i) => {
      form.append(`RelatedSubModuleAnswer.multipleChoiceAnswers[${i}].questionId`, a.questionId);
      if (a.value != null) {
        a.value.forEach((val) => {
          form.append(`RelatedSubModuleAnswer.multipleChoiceAnswers[${i}].selectedOptions`, val);
        });
      }
    });

    if(request.CompanyId){
      form.append('companyId', request.CompanyId);

    }
    if(request.IssueTypeId){
      form.append('issueTypeId', request.IssueTypeId);

    }
    form.append('replyId', request.ReplyId);
    // debug: log full FormData contents
    console.log('FormData payload before send:');
    // FormData.entries() is supported in modern browsers
    for (const [key, value] of form.entries()) {
      console.log(`  ${key}:`, value);
    }
    return this._HttpClient.post<{guid:string}>(`${this.apiUrl}/SplitTicket`, form);
  }




  
  createTickettask(id:string,task:createticketTaskRequest):Observable<void> {
    return this._HttpClient.post<void>(`${this.apiUrl}/${id}/Tasks`, task);
  }
  MyTicketTasks(id:string):Observable<TicketTaskResponse[]> {
    return this._HttpClient.get<TicketTaskResponse[]>(`${this.apiUrl}/${id}/Tasks`);
  }
}

export interface createticketTaskRequest {
description:string;
date:Date;
}

export interface TicketTaskResponse {
  id:string;
  description:string;
  ticketId:string;
  userId:string;
  userName?:string;
  companyId?:string;
  typeId?:string;
  subject?:string;
  ticketDescription?:string;
  relatedSubModuleId?:string;
  numericId?:number;
  ticketNumericId?:number;
  issuePriority?:string;
  issueStatusId?:string;
  employee?:string;
  assignedEmployee?:string;
  date:Date;
  kpi?:kpiviewDTO;
}
