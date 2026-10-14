import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../Interfaces/general';
import {  MessageResponse } from '../Interfaces/project';
import { CreateProjectRequest, FilterProjectRequest, UpdateProjectRequest } from '../Interfaces/project';
import { ProjectResponse } from '../Interfaces/project';
import { messangermsg } from '../Interfaces/ticket';
import { CreateTaskRequest, TaskResponse } from '../Interfaces/Projecttasks';
import { filterKPITaskReqeust } from '../Interfaces/kpitasks';
import { projecttasksubtaskresponse } from './tasks.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${Environment.baseUrl}Project`;


  constructor(private http: HttpClient) {}



  /**
   * Paged project list with KPI summary.
   * @param page 1-based page index (first page is 1). Sent to the API as `pagenum` (0-based).
   */
  getAllFiltered(filter: FilterProjectRequest, page: number = 1): Observable<PaginatedResponse<ProjectResponse>> {
    let params = new HttpParams();
    if (filter.systemId) params = params.set('systemId', filter.systemId);
    if (filter.issueStatusId) params = params.set('issueStatusId', filter.issueStatusId);
    if (filter.onlyMyProjects !== undefined) params = params.set('onlyMyProjects', String(filter.onlyMyProjects));
    const pageIndex = Math.max(0, Math.floor(page) - 1);
    params = params.set('pagenum', String(pageIndex));

    return this.http.get<PaginatedResponse<ProjectResponse>>(`${this.apiUrl}/FilteredWithKpis`, { params });
  }

  getById(id: string): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${this.apiUrl}/${id}`);
  }

  create(project: CreateProjectRequest): Observable<ProjectResponse> {
    const formData = new FormData();
    formData.append('description', project.description);
    formData.append('startDate', project.startDate);
    formData.append('endDate', project.endDate);
    formData.append('relatedSubModuleId', project.relatedSubModuleId);

    if (project.priority !== undefined) formData.append('priority', project.priority.toString());
    if (project.currentStatusId) formData.append('currentStatusId', project.currentStatusId);
    if (project.attachments) {
      project.attachments.forEach(file => formData.append('attachments', file));
    }

    return this.http.post<ProjectResponse>(this.apiUrl, formData);
  }

  update(id: string, project: UpdateProjectRequest): Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`${this.apiUrl}/${id}`, project);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getPrivateNotes(id: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${id}/PrivateNotes`);
  }

  addPrivateNote(id: string, note: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/PrivateNotes`, { name:note });
  }

  changeStatus(id: string, statusId: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/changestatus/${statusId}`, null);
  }

  getProjectFile(id: string, fileName: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/files/${fileName}`, { responseType: 'blob' });
  }

  getMessages(id: string): Observable<MessageResponse[]> {
    return this.http.get<MessageResponse[]>(`${this.apiUrl}/${id}/Messages`);
  }

  myMessenger(): Observable<messangermsg[]> {
    return this.http.get<messangermsg[]>(`${this.apiUrl}/MyMessanger`);
  }

  // getKPIs(filterrequest:filterKPITaskReqeust): Observable<PaginatedResponse<projecttasksubtaskresponse>> {
  //   let params = new HttpParams();
  //   if (filterrequest.userIds) {
  //     filterrequest.userIds.forEach(userId => params = params.append('userIds', userId));
  //   }
  //   if (filterrequest.systemIds) {
  //     filterrequest.systemIds.forEach(systemId => params = params.append('systemIds', systemId));
  //   }
  //   if (filterrequest.hasKpi !== undefined && filterrequest.hasKpi !== null) {
  //     params = params.append('hasKpi', filterrequest.hasKpi.toString());
  //   }
  //   params = params.set('page', filterrequest.page?.toString() ?? '1');
  //   return this.http.get<PaginatedResponse<projecttasksubtaskresponse>>(`${this.apiUrl}/KPIs`, { params });
  // }



  ToggleProjectClosed(id: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/ToggleProjectClosed/${id}`, null);
  }

  Get20More(MessageId: string): Observable<messangermsg[]> {
    return this.http.get<messangermsg[]>(`${this.apiUrl}/20more/${MessageId}`);
  }


  getProjectTasks(projectId: string): Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(`${this.apiUrl}/${projectId}/Tasks`);
  }

  addTask(projectId: string, request: CreateTaskRequest): Observable<TaskResponse> {
    const formData = new FormData();

    formData.append('userId', request.userId);
    formData.append('description', request.description);
    formData.append('startDate', request.startDate.toISOString());
    formData.append('endDate', request.endDate.toISOString());

    if (request.currentStatusId) {
      formData.append('currentStatusId', request.currentStatusId);
    }

    if (request.priority !== undefined) {
      formData.append('priority', request.priority.toString());
    }
    if (request.blockingEmployeeId) {
      formData.append('blockingEmployeeId', request.blockingEmployeeId);
    }

    for (const file of request.attachments ?? []) {
      formData.append('attachments', file);
    }

    return this.http.post<TaskResponse>(`${this.apiUrl}/${projectId}/Tasks`, formData);
  }
}
