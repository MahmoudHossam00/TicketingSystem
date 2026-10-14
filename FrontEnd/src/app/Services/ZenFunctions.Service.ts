import { Injectable } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Calls Zen and main API endpoints to sync employee data.
 *
 * - **Sync employees (main API)** — pulls employee records from Zen into this system’s database.
 * - **Zen server** — refreshes the employee branches table on the Zen side.
 * - **Fetch from Zen endpoints** — reads/pulls data using the main Zen HTTP service (e.g. counts or staging).
 */
@Injectable({
  providedIn: 'root',
})
export class ZenFunctionsService {
  /** Zen: e.g. `…/EmployeeCount` — gets data from the main Zen service endpoints. */
  private readonly zenEmployeeCountUrl = `${Environment.zenUrl}EmployeeCount`;

  /** Zen: `…/ZenServer` — updates the employee branches table on Zen. */
  private readonly zenServerUrl = `${Environment.zenUrl}ZenServer`;

  /** Main app API: `…/api/Employee` — fetches employees into the current (this) system. */
  private readonly mainApiEmployeeUrl = `${Environment.baseUrl}Employee`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches employees into the current system (main API).
   * POST empty body to the application Employee endpoint.
   */
  syncEmployeesToCurrentSystem(): Observable<void> {
    return this.http.post<void>(this.mainApiEmployeeUrl, {});
  }

  /**
   * Updates the employee branches table on the Zen server.
   * POST empty body to the Zen ZenServer endpoint.
   */
  GenerateMultipleTokens(email:string,password:string): Observable<void> {
    return this.http.post<void>(this.zenServerUrl, { email:email, password:password });
  }

  ReplaceCurrent(password:string):Observable<void> {
    return this.http.post<void>(this.zenServerUrl, { passKey:password });
  }



  updateZenServer(): Observable<void> {
    return this.http.post<void>(this.zenServerUrl, {});
  }
  /**
   * Gets data from the main Zen HTTP endpoints (e.g. employee count / pull from Zen service).
   * POST empty body to the Zen EmployeeCount endpoint.
   */
  fetchFromZenEndpoints(): Observable<void> {
    return this.http.post<void>(this.zenEmployeeCountUrl, {});
  }

  /** @deprecated Use {@link syncEmployeesToCurrentSystem} */
  syncemployees(): Observable<void> {
    return this.syncEmployeesToCurrentSystem();
  }

  /** @deprecated Use {@link fetchFromZenEndpoints} */
  updateEmployees(): Observable<void> {
    return this.fetchFromZenEndpoints();
  }

  
}
