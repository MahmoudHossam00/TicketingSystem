import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, UserResponseDTO } from '../Interfaces/auth';
import { messageresponse, stringDTO } from '../Interfaces/general';
import { Module, System } from '../Interfaces/system';
import { BasicUserDataResponse } from './auth.service';

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
  getSystemAgentsWithTasksNumber(id: string): Observable<AgentResponseWithTasksNumberDTO[]> {
    return this._HttpClient.get<AgentResponseWithTasksNumberDTO[]>(`${this.apiUrl}/${id}/AgentsWithTaskNumbers`);
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
  getSystemSupervisors(systemId: string): Observable<Record<string, string>> {
    return this._HttpClient.get<Record<string, string>>(
      `${this.apiUrl}/${systemId}/supervisors`
    );
  }
  getagentsupervisor(systemId: string, agentId: string): Observable<{id:string}> {
    return this._HttpClient.get<{id:string}>(`${this.apiUrl}/${systemId}/agents/${agentId}/supervisor`);
  }
  AddAgentSupervisor(systemId: string,userSystemAgentId: string, SupervisorSystemAgentId: string): Observable<void> {
    return this._HttpClient.post<void>(`${this.apiUrl}/Supervisor`, {systemId:systemId,agent:userSystemAgentId, supervisorAgent:SupervisorSystemAgentId});
  }
  addagentsupervisor(systemId: string,userSystemAgentId: string, supervisorSystemAgentId: string): Observable<void> {
    return this.AddAgentSupervisor(systemId,userSystemAgentId, supervisorSystemAgentId);
  }
}
export interface supervisordict
{

}

export interface AgentResponseWithTasksNumberDTO
{
  numberOfAssignedActiveTicketss:number;
  numberOfAssignedActiveProjectTasks:number;
  userdataresponse:BasicUserDataResponse;
}