import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, UserResponseDTO } from '../Interfaces/auth';
import { messageresponse, stringDTO } from '../Interfaces/general';
import { createkpirequest, fixedKPI, Module, System } from '../Interfaces/system';

@Injectable({
  providedIn: 'root'
})
export class fixedKPIService {
  private apiUrl = `${Environment.baseUrl}FixedKPI`;

  constructor(private _HttpClient: HttpClient) {}


  getAllfixedKPIs(): Observable<fixedKPI[]> {
    return this._HttpClient.get<fixedKPI[]>(`${this.apiUrl}`);
  }
  getfixedKPIById(id: number): Observable<fixedKPI> {
    return this._HttpClient.get<fixedKPI>(`${this.apiUrl}/${id}`);
  }
  createfixedKPI(fixedKPI: stringDTO): Observable<fixedKPI> {
    console.log(fixedKPI,'mysysm');
    return this._HttpClient.post<fixedKPI>(`${this.apiUrl}`, fixedKPI);
  }
  updatefixedKPI(id: string, fixedKPI: stringDTO): Observable<fixedKPI> {
    return this._HttpClient.put<fixedKPI>(`${this.apiUrl}/${id}`, fixedKPI);
  }
  deleteSystem(id: string): Observable<messageresponse> {
    return this._HttpClient.delete<messageresponse>(`${this.apiUrl}/${id}`);
  }
  CreateKPI(kpi: createkpirequest): Observable<{guid:string}> {
    return this._HttpClient.post<{guid:string}>(`${this.apiUrl}/CreateKPI`, kpi);
  }
}
