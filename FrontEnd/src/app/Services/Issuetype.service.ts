import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, UserResponseDTO } from '../Interfaces/auth';
import { messageresponse, stringDTO } from '../Interfaces/general';
import { issueType, Module, System } from '../Interfaces/system';

@Injectable({
  providedIn: 'root'
})
export class IssuetypeService {
  private apiUrl = `${Environment.baseUrl}IssueType`;

  constructor(private _HttpClient: HttpClient) {}


  getAllIssueTypes(): Observable<issueType[]> {
    return this._HttpClient.get<issueType[]>(`${this.apiUrl}`);
  }
  getIssueTypeById(id: number): Observable<issueType> {
    return this._HttpClient.get<issueType>(`${this.apiUrl}/${id}`);
  }
  createIssueType(issueType: stringDTO): Observable<issueType> {
    console.log(issueType,'mysysm');
    return this._HttpClient.post<issueType>(`${this.apiUrl}`, issueType);
  }
  updateIssueType(id: string, issueType: stringDTO): Observable<issueType> {
    return this._HttpClient.put<issueType>(`${this.apiUrl}/${id}`, issueType);
  }
  deleteSystem(id: string): Observable<messageresponse> {
    return this._HttpClient.delete<messageresponse>(`${this.apiUrl}/${id}`);
  }
  
}
