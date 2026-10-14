import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, UserResponseDTO } from '../Interfaces/auth';
import { messageresponse, stringDTO } from '../Interfaces/general';
import { company, Module, System } from '../Interfaces/system';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private apiUrl = `${Environment.baseUrl}company`;

  constructor(private _HttpClient: HttpClient) {}


  getAllcompanys(): Observable<company[]> {
    return this._HttpClient.get<company[]>(`${this.apiUrl}`);
  }
  getcompanyById(id: number): Observable<company> {
    return this._HttpClient.get<company>(`${this.apiUrl}/${id}`);
  }
  createcompany(company: stringDTO): Observable<company> {
    console.log(company,'mysysm');
    return this._HttpClient.post<company>(`${this.apiUrl}`, company);
  }
  updatecompany(id: string, company: stringDTO): Observable<company> {
    return this._HttpClient.put<company>(`${this.apiUrl}/${id}`, company);
  }
  deleteSystem(id: string): Observable<messageresponse> {
    return this._HttpClient.delete<messageresponse>(`${this.apiUrl}/${id}`);
  }
}
