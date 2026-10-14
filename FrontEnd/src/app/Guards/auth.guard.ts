import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../Services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const token = this.authService.getTokenFromCookie();
    console.log('AuthGuard: Checking access to:', state.url);
    console.log('AuthGuard: Token exists:', !!token);
    console.log('authguard got here 1');
    if (!token) {
      this.authService.logout(undefined, state.url);
      console.log('authguard got here 2');
      return of(false);
    }
    console.log('authguard got here 3');
    // Token valid
    if (!this.authService.isTokenExpired(token)) {
      console.log('authguard got here 4');
      return of(true);
    }

    // Token expired → try refresh
    console.log('authguard got here 5');
    const refreshToken = this.authService.getStoredRefreshToken();
    if (!refreshToken) {
      this.authService.logout('Your session has expired.');
      console.log('authguard got here 6');
      return of(false);
    }
    console.log('authguard got here 7');
    return this.authService.refreshToken().pipe(
      map(() => {
        // Refresh successful
        return true;
      }),
      catchError(() => {
        // Refresh failed
        this.authService.logout('Your session has expired.');
        return of(false);
      })
    );
  }
}