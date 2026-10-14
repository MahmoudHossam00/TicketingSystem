import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExternalSystem, ExternalUserRequest, ExternalSystemRequest, ExternalUserFromExcel, SystemAccount } from '../Interfaces/externalsystems';

@Injectable({
  providedIn: 'root'
})
export class ExternalSystemService {
  private apiUrl = `${Environment.baseUrl}ExternalSystem`;

  constructor(private http: HttpClient) {}

  getAllExternalSystems(): Observable<ExternalSystem[]> {
    return this.http.get<ExternalSystem[]>(`${this.apiUrl}`);
  }

  getExternalSystemById(id: string): Observable<ExternalSystem> {
    return this.http.get<ExternalSystem>(`${this.apiUrl}/${id}`);
  }

  createExternalSystem(req: ExternalSystemRequest): Observable<ExternalSystem> {
    return this.http.post<ExternalSystem>(`${this.apiUrl}/CreateExternalSystem`, req);
  }

  updateExternalSystem(id: string, req: ExternalSystemRequest): Observable<ExternalSystem> {
    return this.http.put<ExternalSystem>(`${this.apiUrl}/${id}`, req);
  }

  deleteExternalSystem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  loadSystemsUsers(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/Load`, {});
  }

  importExternalUsersFromExcel(request: ExternalUserFromExcel): Observable<unknown> {
    const formData = new FormData();
    formData.append('externalSystemId', request.externalSystemId);
    formData.append('excel', request.excel);
    return this.http.post(`${this.apiUrl}/import-from-excel`, formData);
  }

  downloadExcelTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/excel-template`, { responseType: 'blob' });
  }

  addExternalUser(request: ExternalUserRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/AddExternalUser`, request);
  }

  addExternalUsersFromExcel(request: ExternalUserFromExcel): Observable<unknown> {
    const formData = new FormData();
    formData.append('externalSystemId', request.externalSystemId);
    formData.append('excel', request.excel);
    return this.http.post(`${this.apiUrl}/AddExternalUsersFromExcel`, formData);
  }

  getSystemAccountsByEmployee(employeeId: string): Observable<SystemAccount[]> {
    return this.http.get<SystemAccount[]>(`${this.apiUrl}/ByEmployee/${employeeId}`);
  }

  removeSystemAccount(accountId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Account/${accountId}`);
  }
}
