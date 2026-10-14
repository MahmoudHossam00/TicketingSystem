import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../base/environment';

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthRefreshService {
  private http: HttpClient;
  private refreshUrl = `${Environment.baseUrl}Auth/Refresh`;

  constructor(handler: HttpBackend) {
    this.http = new HttpClient(handler);
  }

  refreshToken(refreshToken: string): Observable<RefreshResponse> {
    return this.http.post<RefreshResponse>(this.refreshUrl, { refreshToken });
  }
  
}