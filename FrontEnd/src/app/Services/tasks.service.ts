import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TaskResponse } from '../Interfaces/Projecttasks';
import { Environment } from '../base/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { messageresponse, PaginatedResponse, stringDTO } from '../Interfaces/general';
import { assignhistories, issuestatushistory } from '../Interfaces/issuestatus';
import { FilterTaskRequest, KPIViewDto, messangermsg } from '../Interfaces/ticket';
import { filterKPITaskReqeust } from '../Interfaces/kpitasks';

@Injectable({
  providedIn: 'root'
})
export class TasksService {


  constructor(private http: HttpClient) { }
  private apiUrl = `${Environment.baseUrl}Tasks`;

  // ✅ Task
  getById(id: string): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`${this.apiUrl}/${id}`);
  }

  // update(id: string, dto: any): Observable<TaskResponse> {
  //   return this.http.put<TaskResponse>(`${this.apiUrl}/${id}`, dto);
  // }

  delete(id: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${id}`);
  }

  // ✅ Private Notes
  getPrivateNotes(id: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${id}/PrivateNotes`);
  }

  addPrivateNote(id: string, note: stringDTO): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/${id}/PrivateNotes`, note);
  }

  // ✅ Statuses
  getStatuses(id: string): Observable<issuestatushistory[]> {
    return this.http.get<issuestatushistory[]>(`${this.apiUrl}/${id}/Statuses`);
  }

  changeStatus(id: string, statusId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/changestatus/${statusId}`, {});
  }

  // ✅ AssignHistories
  getAssignHistories(id: string): Observable<assignhistories[]> {
    return this.http.get<assignhistories[]>(`${this.apiUrl}/${id}/AssignHistories`);
  }

  reAssign(id: string, agentId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/ReAssign/${agentId}`, {});
  }

  // ✅ Files
  getTicketFile(id: string, fileName: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/files/${fileName}`, { responseType: 'blob' });
  }

  uploadAttachments(id: string, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(f => formData.append('file', f));
    return this.http.put(`${this.apiUrl}/${id}/Attachments`, formData);
  }

  // ✅ Messages
  getMessages(id: string): Observable<messageresponse[]> {
    return this.http.get<messageresponse[]>(`${this.apiUrl}/${id}/Messages`);
  }

  
  myMessanger(): Observable<messangermsg[]> {
    return this.http.get<messangermsg[]>(`${this.apiUrl}/MyMessanger`);
  }

  getPaged(filter: FilterTaskRequest): Observable<PaginatedResponse<TaskResponse>> {
    let params: HttpParams = new HttpParams();
    if (filter.systemId) {
      params = params.set('systemId', filter.systemId);
    }
    if (filter.issueStatusId) {
      params = params.set('issueStatusId', filter.issueStatusId);
    }
    if (filter.onlyAssignedTasks) {
      params = params.set('onlyAssignedTasks', filter.onlyAssignedTasks.toString());
    }
    if (filter.onlyResponsibleTasks) {
      params = params.set('onlyResponsibleTasks', filter.onlyResponsibleTasks.toString());
    }
    if (filter.pagenum) {
      params = params.set('pagenum', filter.pagenum.toString());
    }
    if (filter.from) {
      const from = this.toLocalDateString(filter.from);
      params = params.append('from', from);
    }
    if (filter.to) {
      const to = this.toLocalDateString(filter.to);
      params = params.append('to', to);
    }
    return this.http.get<PaginatedResponse<TaskResponse>>(`${this.apiUrl}/Filtered`, { params });
  }

  Get20More(MessageId: string): Observable<messangermsg[]> {
    return this.http.get<messangermsg[]>(`${this.apiUrl}/20more/${MessageId}`);
  }
  getKPIs(filterrequest:filterKPITaskReqeust): Observable<PaginatedResponse<projecttasksubtaskresponse>> {
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
    return this.http.get<PaginatedResponse<projecttasksubtaskresponse>>(`${this.apiUrl}/KPIs`, { params });
  }

  private toLocalDateString(value: Date): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  createsubtask(id:string,task:createticketTaskRequest):Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/Tasks`, task);
  }
  MysubTasks(id:string):Observable<projecttasksubtaskresponse[]> {
    return this.http.get<projecttasksubtaskresponse[]>(`${this.apiUrl}/${id}/Tasks`);
  }
}
export interface createticketTaskRequest {
  description:string;
  date:Date;
}
export interface projecttasksubtaskresponse {
  id:string;
  description:string;
  projectTaskId:string;
  userId:string;
  userName?:string;
  date:Date;
  kpi?:kpiviewDTO;
}

export interface kpiviewDTO{
  kpiId:string;
  kpiName:string;
  confirmationDate:Date;
}
