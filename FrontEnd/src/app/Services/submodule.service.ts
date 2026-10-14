import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateSubModuleRequest, SubModule } from '../Interfaces/submodule';
import { CreateQuestionOptionRequest, CreateQuestionRequest, Question, UpdateQuestionRequest } from '../Interfaces/question';
// import { Employee } from '../Interfaces/auth';

@Injectable({
  providedIn: 'root'
})
export class SubModuleService {
  private apiUrl = `${Environment.baseUrl}SubModule`;

  constructor(private _HttpClient: HttpClient) {}

  getAll(): Observable<SubModule[]> {
    return this._HttpClient.get<SubModule[]>(`${this.apiUrl}`);
  }
  getById(id: string): Observable<SubModule> {
    return this._HttpClient.get<SubModule>(`${this.apiUrl}/${id}`);
  }
  create(subModule: CreateSubModuleRequest): Observable<SubModule> {
    console.log(subModule,'create');
    return this._HttpClient.post<SubModule>(`${this.apiUrl}`, subModule);
  }
  update(id: string, subModule: CreateSubModuleRequest): Observable<SubModule> {
    return this._HttpClient.put<SubModule>(`${this.apiUrl}/${id}`, subModule);
  }
  delete(id: string): Observable<void> {
    return this._HttpClient.delete<void>(`${this.apiUrl}/${id}`);
  }
  getbyModuleId(moduleId: string): Observable<SubModule[]> {
    return this._HttpClient.get<SubModule[]>(`${this.apiUrl}/byModuleId/${moduleId}`);
  }



  getQuestions(id:string): Observable<Question[]> {
    return this._HttpClient.get<Question[]>(`${this.apiUrl}/${id}/questions`);
  }

  addQuestions(subModule: CreateQuestionRequest): Observable<SubModule> {
    return this._HttpClient.post<SubModule>(`${this.apiUrl}/${subModule.SubModuleId}/questions`, subModule);
  }

  DeleteQuestion(id:string,questionid:string)
  {
    return this._HttpClient.delete<void>(`${this.apiUrl}/${id}/questions/${questionid}`);
  }

  updateQuestion(
    subModuleId: string,
    questionId: string,
    req: UpdateQuestionRequest
  ): Observable<void> {
    return this._HttpClient.put<void>(
      `${this.apiUrl}/${subModuleId}/questions/${questionId}`,
      req
    );
  }

  /** POST: /{subModuleId}/questions/{questionId}/options */
  addOption(
    subModuleId: string,
    questionId: string,
    req: CreateQuestionOptionRequest
  ): Observable<void> {
    return this._HttpClient.post<void>(
      `${this.apiUrl}/${subModuleId}/questions/${questionId}/options`,
      req
    );
  }

  /** DELETE: /{subModuleId}/questions/{questionId}/options/{optionId} */
  removeOption(
    subModuleId: string,
    questionId: string,
    optionId: string
  ): Observable<void> {
    return this._HttpClient.delete<void>(
      `${this.apiUrl}/${subModuleId}/questions/${questionId}/options/${optionId}`
    );
  }
}
