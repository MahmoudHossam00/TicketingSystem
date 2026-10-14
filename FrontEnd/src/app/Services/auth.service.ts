import { inject, Injectable, Injector, signal } from '@angular/core';
import { Environment } from '../base/environment';
import { HttpBackend, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
// import { ChangePasswordDTO, CreateAccountDTO, LoginDTO, MasterMessage, ret, userData, UserInfoDTO, UserName } from '../Interfaces/auth';
import { BehaviorSubject, Observable, catchError, filter, map, of, throwError, switchMap, tap, take, mergeMap } from 'rxjs';
import { Router } from '@angular/router';
import { AddRoleRequest, changepasswordDto, CreateAccountRequest, CreateRoleRequest, LoginToAccountRequest, RolesDictionary, TokenResponse, UpdateRoleRequest, UserDetails, userresponseviewDTO, UsersDictionary } from '../Interfaces/auth';
import { ChatMessage, TaskChatService } from './TaskChat.service';
import { TicketChatService } from './TicketChat.service';
import { ProjectChatService } from './ProjectChat.service';
import { messangermsg } from '../Interfaces/ticket';
import { UserChatService } from './userchat.service';
import { PaginatedResponse } from '../Interfaces/general';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${Environment.baseUrl}Auth`;
  /** Monotonic suffix so each GetMyPicture URL is unique (avoids browser HTTP cache after picture changes). */
  private myPictureFetchSeq = 0;
  private rawHttp: HttpClient;
  constructor(
    private _HttpClient: HttpClient,
    private router: Router,
    private toastr: ToastrService,
    private injector: Injector,
    httpBackend: HttpBackend
  ) {
    this.rawHttp = new HttpClient(httpBackend); // 👈 THIS IS rawHttp
    this.checkToken();
    }
  
   createAccount(req: CreateAccountRequest): Observable<void> {
    return this._HttpClient.post<void>(`${this.apiUrl}/CreateAccount`, req);
  }

  /** POST: api/Auth/Login */
  login(req: LoginToAccountRequest): Observable<TokenResponse> {
    console.log(req,'req');
    return this._HttpClient.post<TokenResponse>(`${this.apiUrl}/Login`, req);
  }

  /** POST: api/Auth/CreateRole */
  createRole(req: CreateRoleRequest): Observable<void> {
    return this._HttpClient.post<void>(`${this.apiUrl}/CreateRole`, req);
  }

  /** PUT: api/Auth/UpdateRole  (this calls AddPermissionToRole in backend) */
  updateRole(req: UpdateRoleRequest): Observable<void> {
    return this._HttpClient.put<void>(`${this.apiUrl}/UpdateRole`, req);
  }
  

  /** POST: api/Auth/AddRoleToUser */
  addRoleToUser(req: AddRoleRequest): Observable<void> {
    console.log(req,'reqreqreq');
    req.roleId = null;
    return this._HttpClient.post<void>(`${this.apiUrl}/AddRoleToUser`, req);
  }

  /** POST: api/Auth/GetAllRoles */
  getAllRoles(): Observable<RolesDictionary> {
    return this._HttpClient.post<RolesDictionary>(`${this.apiUrl}/GetAllRoles`, {});
  }

  getAllUsers(): Observable<UsersDictionary> {
    return this._HttpClient.get<UsersDictionary>(`${this.apiUrl}/AllUsers`);
  }
  getuserRoles(userId:string): Observable<string[]> {
    return this._HttpClient.get<string[]>(`${this.apiUrl}/UserRoles/${userId}`);
  }
  


  /*auth service login data */
  userData = new BehaviorSubject<any>(null);
  private _isLoggedIn = signal<boolean>(false);

  isLoggedIn = this._isLoggedIn;
  isLoggedIn$ = this.userData.asObservable().pipe(map((userData) => !!userData));

 
  getTokenFromCookie(): string | null {
    const cookieName = this.getCookieName('ITDepartmentuser_Token');
    const name = `${cookieName}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let cookie of cookieArray) {
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1);
      }
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length, cookie.length);
      }
    }
    return null;
  }

  private checkToken(): void {
    const token = this.getTokenFromCookie();
    if (!token) return;
    try {
      if (this.isTokenExpired(token)) {
        if (!this.getStoredRefreshToken()) {
          this.logout('Your session has expired. Please sign in again.');
          return;
        }
        this.refreshToken().subscribe({
          error: () => {
            // refreshToken() already handles logout on failure
          }
        });
        return;
      }
      const part = token.split('.')[1];
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(b64));
      this.userData.next(decoded);
      this._isLoggedIn.set(true);
    } catch {
      this.logout('Your session is invalid. Please sign in again.');
    }
  }

  isAdmin(): boolean {

    return this.getRoles()?.includes("ADMIN") ?? false;
  }
  isMaster(): boolean {
    console.log(this.getRoles(),'getRoles');
    return this.getRoles()?.includes("MASTER") ?? false;
  }

  /** Master Data UI: systems, submodules, issue types, external systems, fixed KPIs, etc. */
  isMasterDataAdmin(): boolean {
    return this.getRoles()?.includes('MASTERDATAADMIN') ?? false;
  }

  /** Create, update, or delete master data (MASTER or MASTERDATAADMIN). */
  canMutateMasterData(): boolean {
    return this.isMaster() || this.isMasterDataAdmin();
  }

  isModerator(): boolean {
    return this.getRoles()?.includes("MODERATOR") ?? false;
  }
  isEmployee(): boolean {
    return this.getRoles()?.includes("EMPLOYEE") ?? false;
  }
  private getCookieName(base: string): string {
    // ex: app1.company.com -> app1_company_com
    const siteKey = window.location.hostname.replace(/\./g, '_');
    return `${siteKey}_${base}`;
  }
  deleteCookie(baseName: string): void {
    const cookieName = this.getCookieName(baseName);
  
    // must match original cookie options: path, domain (if used), samesite, secure
    document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
  }

  logout(notifyMessage?: string,returnurl?: string): void {
    if (notifyMessage) {
      this.toastr.error(notifyMessage, 'Session', { timeOut: 8000 });
    }
    const refreshToken = this.getStoredRefreshToken();

    
    if (refreshToken) {
      this.rawHttp.post(`${this.apiUrl}/RevokeToken`, { refreshToken }).subscribe({
        next: () => console.log('Backend token revoked'),
        error: () => console.warn('Failed to revoke token on server')
      });
    }

    this.leaveallChats();
    this.deleteCookie('ITDepartmentuser_Token');
    localStorage.removeItem(this.getCookieName('ITDepartmentuser_RefreshToken'));

    this.userData.next(null);
    this._isLoggedIn.set(false);
    
    this.router.navigate(['/login'], { queryParams: { returnUrl: returnurl } });
    }
  private _ticketChatService!: TicketChatService;
  private _projectChatService!: ProjectChatService;
  private _taskChatService!: TaskChatService;

  private get ticketChatService(): TicketChatService {
    if (!this._ticketChatService) {
      this._ticketChatService = this.injector.get(TicketChatService);
    }
    return this._ticketChatService;
  }

  private get projectChatService(): ProjectChatService {
    if (!this._projectChatService) {
      this._projectChatService = this.injector.get(ProjectChatService);
    }
    return this._projectChatService;
  }

  private get taskChatService(): TaskChatService {
    if (!this._taskChatService) {
      this._taskChatService = this.injector.get(TaskChatService);
    }
    return this._taskChatService;
  }
  private _userChatService!: UserChatService;
  private get userChatService(): UserChatService {
    if (!this._userChatService) {
      this._userChatService = this.injector.get(UserChatService);
    }
    return this._userChatService;
  }
  leaveallChats(): void {
    setTimeout(() => {
      this.ticketChatService.leaveAllTickets();
      this.projectChatService.leaveAllTickets();
      this.taskChatService.leaveAllTickets();
      this.ticketChatService.stopConnection();
      this.projectChatService.stopConnection();
      this.taskChatService.stopConnection();
      this.userChatService.stopConnection();
    });
  }

  startAllChats() {
    const token = this.getTokenFromCookie();
    if (!token) return;
  
    // Ticket
    this.ticketChatService.startConnection();
    // Project
    this.projectChatService.startConnection();
    // Task
    this.taskChatService.startConnection();
  }
  setLoginState(token: string): void {
    this.deCodeUserData(token);
  }

  // login(userData: any): Observable<any> {
  //   return this._HttpClient.post(`${this.apiUrl}/login`, userData);
  // }

  // refreshtokenifexpired(token: string): Observable<boolean> {
  //   if (this.isTokenExpired(token)) {
  //     return this.refreshToken().pipe(map((res) => {
  //       this.storeAccessToken(res.accessToken);
  //       return true;
  //     }),
  //     catchError((err) => {
  //       this.logout('Could not renew your session. Please sign in again.');
  //       return of(false);
  //     }));

  //   }
  //   }

  userReady$ = this.userData.pipe(
    filter(user => !!user)
  );

  deCodeUserData(token: string): void {
    try {
      if (this.isTokenExpired(token)) {
        if (!this.getStoredRefreshToken()) {
          this.logout('Your session has expired. Please sign in again.');
          return;
        }
        this.refreshToken().subscribe({
          error: () => {
            // refreshToken() already handles logout on failure
          }
        });
        return;
      }
      const part = token.split('.')[1];
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(b64));
      this.userData.next(decoded);
      this._isLoggedIn.set(true);
    } catch {
      this.logout('Your session is invalid. Please sign in again.');
    }
  }

  getRole(): string | null {
    const token = this.getTokenFromCookie();
    if (!token) return null;

    try {
      // Simple JWT token parsing - works for basic JWT tokens
      const decoded: any = JSON.parse(atob(token.split('.')[1]));
      return decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || null;
    } catch {
      return null;
    }
  }

  getRoles(): string[] | null {
    const token = this.getTokenFromCookie();
    
    if (!token) return null;
  
    try {
      // Simple JWT token parsing - works for basic JWT tokens
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));

      const roles =
        payload['role'] ??
        payload['roles'] ??
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      console.log(roles,'roles');

      if (!roles) return null;
      return Array.isArray(roles) ? roles : [roles];
    } catch {
      return null;
    }
  }
  getUserId(): string | null {
    const nameIdSoap =
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
    const nameIdMs =
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/userid';

    const readId = (decoded: Record<string, unknown>): string | null => {
      const raw =
        decoded['sub'] ??
        decoded[nameIdSoap] ??
        decoded[nameIdMs] ??
        decoded['nameidentifier'] ??
        decoded['nameid'] ??
        decoded['userId'] ??
        decoded['UserId'];
      if (raw == null || String(raw).trim() === '') return null;
      return String(raw).trim();
    };

    const token = this.getTokenFromCookie();
    if (token) {
      try {
        const part = token.split('.')[1];
        const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const decoded = JSON.parse(atob(padded)) as Record<string, unknown>;
        const fromJwt = readId(decoded);
        if (fromJwt) return fromJwt;
      } catch {
        /* try userData */
      }
    }

    const snap = this.userData.getValue();
    if (snap && typeof snap === 'object' && !Array.isArray(snap)) {
      const fromSnap = readId(snap as Record<string, unknown>);
      if (fromSnap) return fromSnap;
    }
    return null;
  }
  addpicture(picture:File,userid:string): Observable<void> {
    const formData = new FormData();
    formData.append('file', picture);
    return this._HttpClient.post<void>(`${this.apiUrl}/AddPicture/${userid}`, formData);
  }
  changemyPicture(picture: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', picture);
    return this._HttpClient.post<void>(`${this.apiUrl}/ChangeMyPicture`, formData);
  }

  /** Refresh token lives in localStorage after login; access token is in a cookie. */
  getStoredRefreshToken(): string | null {
    return localStorage.getItem(this.getCookieName('ITDepartmentuser_RefreshToken'));
  }
  
  storeRefreshToken(token: string): void {
    localStorage.setItem(this.getCookieName('ITDepartmentuser_RefreshToken'), token);
  }
  storeAccessToken(token: string): void {
    const cookieName = this.getCookieName('ITDepartmentuser_Token');
    document.cookie = `${cookieName}=${token}; path=/; samesite=Lax`;
    this.setLoginState(token);
  }
  /**
   * GET api/Auth/GetMyPicture — returns file bytes (e.g. application/octet-stream).
   * Always sends a fresh `_cb` query param so the response is not served from the browser cache
   * after the user changes their picture (same path would otherwise reuse old bytes).
   */
  getMyPicture(cacheBust?: number): Observable<Blob> {
    const _cb =
      cacheBust != null
        ? String(cacheBust)
        : `${Date.now()}-${++this.myPictureFetchSeq}`;
    return this._HttpClient
      .get(`${this.apiUrl}/GetMyPicture`, {
        responseType: 'blob',
        params: { _cb },
      })
      .pipe(
        mergeMap(blob => {
          if (!blob || blob.size === 0) {
            return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'No picture' }));
          }
          if (blob.type === 'application/json') {
            return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not an image' }));
          }
          return of(blob);
        })
      );
  }

  ChangeMyPassword(dto:changepasswordDto): Observable<void> {
    return this._HttpClient.post<void>(`${this.apiUrl}/ChangeMyPassword`, dto);
  }
  EditAccount(dto:CreateAccountRequest): Observable<void> {
    return this._HttpClient.post<void>(`${this.apiUrl}/EditAccount`, dto);
  }

  /** GET api/Auth/GetUserDetails/{employeeId} */
  getUserDetails(employeeId: string): Observable<UserDetails> {
    return this._HttpClient.get<UserDetails>(`${this.apiUrl}/GetUserDetails/${employeeId}`);
  }



  /**
   * Raw `FirstLogin` JWT claim. Backend sets `firstLogin = !ChangedHisOwnPassword`, so the claim is
   * `"True"` / true until the user changes their password, then `"False"` / false.
   */
  isFirstLogin(): string | boolean | number | null {
    const payload = this.decodeJwtPayload();
    if (!payload) return null;
    const v = payload['FirstLogin'];
    if (v === undefined) return null;
    if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number') return v;
    return null;
  }

  /**
   * True while the user must complete a mandatory password change (matches `ForcePasswordChangeMiddleware`:
   * `!ChangedHisOwnPassword` → JWT `FirstLogin` is "True").
   */
  mustChangePassword(): boolean {
    const payload = this.decodeJwtPayload();
    if (!payload) return false;
    const fl = payload['FirstLogin'];
    if (fl === true || fl === 1) return true;
    if (fl == null || fl === '') return false;
    const s = String(fl).trim().toLowerCase();
    return s === 'true' || s === '1';
  }

  /** Base64url-safe JWT payload parse (same as role claim parsing). */
  private decodeJwtPayload(): Record<string, unknown> | null {
    const token = this.getTokenFromCookie();
    if (!token) return null;
    try {
      const raw = token.split('.')[1];
      if (!raw) return null;
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(b64)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Builds a usable `img` src from a stored picture path or URL (same rules as JWT Picture claim).
   */
  resolvePictureUrl(raw: string | null | undefined, cacheBuster?: number): string | null {
    if (raw == null || String(raw).trim() === '' || String(raw).trim() === 'Default') return null;
    const s = String(raw).trim();
    let url: string;
    if (/^https?:\/\//i.test(s) || s.startsWith('data:')) {
      url = s;
    } else if (s.startsWith('/')) {
      const root = Environment.standaloneurl.replace(/\/$/, '');
      url = root + s;
    } else {
      const base = Environment.filesUrl.replace(/\/$/, '') + '/';
      url = base + s.replace(/^\//, '');
    }
    if (cacheBuster != null) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}v=${cacheBuster}`;
    }
    return url;
  }

  /** JWT `Picture` claim resolved for `<img src>`. */
  getResolvedProfilePictureUrl(cacheBuster?: number): string | null {

    
    return this.resolvePictureUrl(this.getUserPicture(), cacheBuster);
  }

  getEmployeeNumber(): number | null {
    const token = this.getTokenFromCookie();
    if (!token) return null;
  
    try {
      const decoded: any = JSON.parse(atob(token.split('.')[1]));
      const empNumStr = decoded['EmployeeNumber'];
      const empNum = Number(empNumStr);
      return isNaN(empNum) ? null : empNum;
    } catch {
      return null;
    }
  }
  getEmployeeId(): number | null {
    const token = this.getTokenFromCookie();
    if (!token) return null;
  
    try {
      const decoded: any = JSON.parse(atob(token.split('.')[1]));
      const empNumStr = decoded['EmployeeId'];
      const empNum = Number(empNumStr);
      return isNaN(empNum) ? null : empNum;
    } catch {
      return null;
    }
  }
  
  getUserName(): string | null {
    const token = this.getTokenFromCookie();
    if (!token) return null;

    try {
      // Simple JWT token parsing - works for basic JWT tokens
      const decoded: any = JSON.parse(atob(token.split('.')[1]));
      return decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']|| decoded['name'] || null;
    } catch {
      return null;
    }
  }
  getUserPicture(): string | null {
    const token = this.getTokenFromCookie();
    if (!token) return null;
    try {
      const decoded: any = JSON.parse(atob(token.split('.')[1]));
      return decoded['Picture'] || null;
    } catch {
      return null;
    }
  }

  getUserRoles(): (string | number)[] {
    const token = this.getTokenFromCookie();
  if (!token) return [];

  try {
    const decoded: any = JSON.parse(atob(token.split('.')[1]));
    let roles =
      decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      decoded['roles'] ||
      decoded['role'] ||
      decoded['Role'];

    // Normalize to array
    if (!roles) return [];
    if (typeof roles === 'string') {
      // If comma-separated or single role string
      roles = roles.includes(',')
        ? roles.split(',').map(r => r.trim())
        : [roles];
    } else if (!Array.isArray(roles)) {
      roles = [roles];
    }

    // Convert numeric strings to numbers
    return roles.map((r: string | number) => {
      if (typeof r === 'string' && !isNaN(Number(r))) {
        return Number(r);
      }
      return r;
    });
  } catch {
    return [];
  }
  }
  // emailinUse(email:string):Observable<ret<boolean>>{
  //   return this._HttpClient.get<ret<boolean>>(`${this.apiUrl}/EmailInUse?email=${email}`);
  // }
  // getAllUsers(): Observable<UserInfoDTO[]> {
  //   return this._HttpClient.get<UserInfoDTO[]>(`${this.apiUrl}/AllUsers`);
  // }
  // ChangeMyPassword(dto:ChangePasswordDTO):Observable<ret<string>>
  // {
  //   const url = `${this.apiUrl}/ChangeMyPassword`;
  //   console.log('🌐 AuthService: Making PATCH request to:', url);
  //   console.log('📦 AuthService: Request body:', { oldPassword: '***', newPassword: '***', confirmNewPassword: '***' });
  //   return this._HttpClient.patch<ret<string>>(url, dto);
  // }

  // MyEmployeeNumberAndRole():Observable<userData>{
  //   return this._HttpClient.get<userData>(`${this.apiUrl}/MyEmployeeNumberAndRole`);
  // }

  // HasAnAccount(employeenumber:number):Observable<UserName>{
  //   return this._HttpClient.get<UserName>(`${this.apiUrl}/HasAnAccount/${employeenumber}`);
  // }
  public isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp: number | undefined = payload['exp'];
      if (!exp) {
        return false; // if exp is missing, assume not expired
      }
      const nowInSeconds = Math.floor(Date.now() / 1000);
      return exp <= nowInSeconds;
    } catch {
      return true;
    }
  }
  

  private refreshInProgress = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);



refreshToken(): Observable<TokenResponse> {
  const refreshToken = this.getStoredRefreshToken();

  if (!refreshToken) {
    this.logout('Your session has expired. Please sign in again.');
    return throwError(() => new Error('No refresh token'));
  }

  if (this.refreshInProgress) {
    return this.refreshSubject.pipe(
      filter(token => token != null),
      take(1),
      switchMap(token =>
        of<TokenResponse>({
          accessToken: token!,
          refreshToken: this.getStoredRefreshToken()!,
          expires: new Date().toISOString(),
        })
      )
    );
  }

  this.refreshInProgress = true;
  this.refreshSubject.next(null);

  return this.rawHttp
    .post<TokenResponse>(`${this.apiUrl}/Refresh`, { refreshToken })
    .pipe(
      tap((res: TokenResponse) => {
        this.storeAccessToken(res.accessToken);

        if (res.refreshToken) {
          localStorage.setItem(this.getCookieName('ITDepartmentuser_RefreshToken'), res.refreshToken);
        }

        this.refreshSubject.next(res.accessToken);
        this.refreshInProgress = false;
      }),
      catchError(err => {
        this.refreshInProgress = false;
        this.refreshSubject.next(null);
        console.error(err, 'error in refresh token');
        this.logout('Could not renew your session. Please sign in again.');
        return throwError(() => err);
      })
    );
}


  MyMessanger(): Observable<messangermsg[]> {
    return this._HttpClient.get<messangermsg[]>(`${this.apiUrl}/MyMessanger`);
  }

  /** HTTP thread load — reliable when UserChatHub <c>LoadPreviousMessages</c> is empty or mis-grouped. */

  // getDirectThreadMessages(otherUserId: string): Observable<ChatMessage[]> {
  //   const id = encodeURIComponent(otherUserId.trim());
  //   return this._HttpClient.get<ChatMessage[]>(`${this.apiUrl}/DirectMessages/${id}`);
  // }

  AllUsersWithEmployeeData(): Observable<userresponseviewDTO[]> {
    return this._HttpClient.get<userresponseviewDTO[]>(`${this.apiUrl}/AllUsersWithEmployeeData`);
  }
  Get20More(MessageId: string): Observable<messangermsg[]> {
    return this._HttpClient.get<messangermsg[]>(`${this.apiUrl}/20more/${MessageId}`);
  }
  mymsgcount(): Observable<number> {
    return this._HttpClient.get<number>(`${this.apiUrl}/MessageCount`);
  }
  getCompleteUsersBasicData(
    request: FilterDataRequest
  ): Observable<PaginatedResponse<BasicUserDataResponse>> {
    let params = new HttpParams();

    if (request.filter && request.filter.trim() !== '') {
      params = params.set('filter', request.filter);
    }

    params = params.set('page', (request.page ?? 1).toString());

    if (request.departmentIDS?.length) {
      request.departmentIDS.forEach(id => {
        params = params.append('departmentIDS', id.toString());
      });
    }

    return this._HttpClient.get<PaginatedResponse<BasicUserDataResponse>>(
      `${this.apiUrl}/CompleteUsersBasicData`,
      { params }
    );
  }
}



export interface BasicUserDataResponse {
  userId: string;
  userName: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: number;
}

export interface FilterDataRequest {
  filter?: string | null;
  page?: number;
  departmentIDS?: number[] | null;
}
