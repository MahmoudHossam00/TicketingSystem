import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, UserResponseDTO } from '../Interfaces/auth';
import { messageresponse, stringDTO } from '../Interfaces/general';
import { Module, System } from '../Interfaces/system';

@Injectable({
  providedIn: 'root'
})
export class ITSystemService {
  private apiUrl = `${Environment.baseUrl}System`;

  constructor(private _HttpClient: HttpClient) {}


  getAllSystems(): Observable<System[]> {
    return this._HttpClient.get<System[]>(`${this.apiUrl}`);
  }
  getSystemById(id: number): Observable<System> {
    return this._HttpClient.get<System>(`${this.apiUrl}/${id}`);
  }
  createSystem(system: stringDTO): Observable<System> {
    console.log(system,'mysysm');
    return this._HttpClient.post<System>(`${this.apiUrl}`, system);
  }
  updateSystem(id: string, system: stringDTO): Observable<System> {
    return this._HttpClient.put<System>(`${this.apiUrl}/${id}`, system);
  }
  deleteSystem(id: string): Observable<messageresponse> {
    return this._HttpClient.delete<messageresponse>(`${this.apiUrl}/${id}`);
  }
  getSystemAgents(id: string): Observable<UserResponseDTO[]> {
    return this._HttpClient.get<UserResponseDTO[]>(`${this.apiUrl}/${id}/agents`);
  }
  addAgent(id: string, userId: string): Observable<messageresponse> {
    return this._HttpClient.post<messageresponse>(`${this.apiUrl}/${id}/agents/${userId}`, {});
  }
  removeAgent(id: string, userId: string): Observable<messageresponse> {
    return this._HttpClient.delete<messageresponse>(`${this.apiUrl}/${id}/agents/${userId}`);
  }

  getSystemModules(id: string): Observable<Module[]> {
    return this._HttpClient.get<Module[]>(`${this.apiUrl}/${id}/modules`);
  }
  addModule(id: string, module: stringDTO): Observable<messageresponse> {
    return this._HttpClient.post<messageresponse>(`${this.apiUrl}/${id}/modules`, module);
  }
  removeModule(id: string, userId: string): Observable<messageresponse> {
    return this._HttpClient.delete<messageresponse>(`${this.apiUrl}/${id}/modules/${userId}`);
  }
}
