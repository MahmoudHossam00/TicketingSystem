import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../base/environment';
import {
  ExcelImportResult,
  FilterOldTaskRequest,
  OldTaskPaginatedResponse
} from '../Interfaces/old-task';

@Injectable({
  providedIn: 'root'
})
export class OldTaskService {
  private apiUrl = `${Environment.baseUrl}OldTasks`;
  private oldTaskQueryUrl = `${Environment.baseUrl}OldTasks`;

  constructor(private _HttpClient: HttpClient) {}

  downloadOldTasksTemplate(): Observable<Blob> {
    return this._HttpClient.get(`${this.apiUrl}/DownloadOldTasksTemplate`, {
      responseType: 'blob'
    });
  }

  importOldTasks(excelFile: File): Observable<ExcelImportResult> {
    const formData = new FormData();
    formData.append('Excel', excelFile);

    return this._HttpClient.post<ExcelImportResult>(
      `${this.apiUrl}/ImportOldTasks`,
      formData
    );
  }

  getFilteredOldTasks(
    request: FilterOldTaskRequest
  ): Observable<OldTaskPaginatedResponse> {
    let params = new HttpParams();

    params = params.set('pagenum', (request.pagenum ?? 1).toString());

    if (request.from) {
      params = params.set('from', request.from);
    }

    if (request.to) {
      params = params.set('to', request.to);
    }

    if (request.companyId) {
      params = params.set('companyId', request.companyId);
    }

    if (request.issueTypeId) {
      params = params.set('issueTypeId', request.issueTypeId);
    }

    if (request.relatedSubModuleId) {
      params = params.set('relatedSubModuleId', request.relatedSubModuleId);
    }

    if (request.issueCreatorId) {
      params = params.set('issueCreatorId', request.issueCreatorId);
    }

    if (request.issueStatusId) {
      params = params.set('issueStatusId', request.issueStatusId);
    }

    if (request.type !== null && request.type !== undefined) {
      params = params.set('type', request.type.toString());
    }

    if (request.search && request.search.trim() !== '') {
      params = params.set('search', request.search.trim());
    }

    params = params.set(
      'sortBy',
      (request.sortBy ?? 0).toString()
    );

    params = params.set(
      'sortDirection',
      (request.sortDirection ?? 1).toString()
    );

    return this._HttpClient.get<OldTaskPaginatedResponse>(
      `${this.oldTaskQueryUrl}/FilteredOldTasks`,
      { params }
    );
  }
}