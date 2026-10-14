import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, UserResponseDTO } from '../Interfaces/auth';
import { messageresponse, stringDTO } from '../Interfaces/general';
import { IssueStatusCreateRequest } from '../Interfaces/issuestatus';
import { issuestatus } from '../Interfaces/issuestatus';

@Injectable({
  providedIn: 'root'
})
export class IssueStatusService {
  private apiUrl = `${Environment.baseUrl}IssueStatus`;

  constructor(private _HttpClient: HttpClient) {}


  getAllIssueStatuses(): Observable<issuestatus[]> {
    return this._HttpClient.get<issuestatus[]>(`${this.apiUrl}`);
  }
  getissuestatusById(id: number): Observable<issuestatus> {
    return this._HttpClient.get<issuestatus>(`${this.apiUrl}/${id}`);
  }
  createIssueStatus(issuestatus: IssueStatusCreateRequest): Observable<issuestatus> {
    console.log(issuestatus,'mysysm');
    return this._HttpClient.post<issuestatus>(`${this.apiUrl}`, issuestatus);
  }
  updateissuestatus(id: string, issuestatus: IssueStatusCreateRequest): Observable<issuestatus> {
    return this._HttpClient.put<issuestatus>(`${this.apiUrl}/${id}`, issuestatus);
  }
  deleteissuestatus(id: string): Observable<messageresponse> {
    return this._HttpClient.delete<messageresponse>(`${this.apiUrl}/${id}`);
  }

}
