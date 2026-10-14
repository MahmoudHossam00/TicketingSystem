import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee } from '../Interfaces/auth';
import { AddEmpProfileRequest, Department, EmployeeCache, EmpSiteData } from '../Interfaces/employee';
import { PaginatedResponse } from '../Interfaces/general';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = `${Environment.baseUrl}Employee`;

  constructor(private _HttpClient: HttpClient) {}

  getAllEmployees(): Observable<Employee[]> {
    return this._HttpClient.get<Employee[]>(`${this.apiUrl}`);
  }
  getFiltered(
    filter: string,
    page: number,
    departmentIds?: number[]
  ): Observable<PaginatedResponse<EmployeeCache>> {
    let params: HttpParams = new HttpParams().set('pagenum', String(page));
    const q = filter?.trim();
    if (q) {
      params = params.set('filter', q);
    }
    console.log(departmentIds,'departmentIds');
    if (departmentIds != null && departmentIds.length > 0) {
      departmentIds.forEach(id => {
        params = params.append('DepartmentIds', id.toString());
      });
    }
console.log(params,'params');

    return this._HttpClient.get<PaginatedResponse<EmployeeCache>>(
      `${this.apiUrl}/Filtered`,
      { params }
    );
  }
  getAllDepartments(): Observable<Department[]> {
    return this._HttpClient.get<Department[]>(`${this.apiUrl}/Departments`);
  }
  getById(id:string): Observable<EmployeeCache> {
    return this._HttpClient.get<EmployeeCache>(`${this.apiUrl}/${id}`);
  }


  DownloadAddProfilesTemplate():Observable<Blob>{
    return this._HttpClient.get(`${this.apiUrl}/DownloadAddProfilesTemplate`, {
      responseType: 'blob'
    });
    }
    AddProfilesByExcel(file: File): Observable<unknown> {
      const formData = new FormData();
      formData.append('Excel', file);
    
      return this._HttpClient.post(`${this.apiUrl}/AddProfilesByExcel`, formData);
    }
    AddProfile(profile: AddEmpProfileRequest): Observable<unknown> {
      return this._HttpClient.post(`${this.apiUrl}/AddProfile`, profile);
    }
    GetProfilesInsertedData(): Observable<EmpSiteData[]> {
      return this._HttpClient.get<EmpSiteData[]>(`${this.apiUrl}/GetProfileInsertedData`);
    }
}
