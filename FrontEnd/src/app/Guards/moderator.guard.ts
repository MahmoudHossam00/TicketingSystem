import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../Services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminOrMasterGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const token = this.authService.getTokenFromCookie();

    const returnUrl = state.url;

    // No token → logout with returnUrl
    if (!token) {
      this.authService.logout(undefined, returnUrl);
      return of(false);
    }

    // Token expired → try refresh
    if (this.authService.isTokenExpired(token)) {
      const refreshToken = this.authService.getStoredRefreshToken();
      if (!refreshToken) {
        this.authService.logout('Your session has expired.', returnUrl);
        return of(false);
      }

      // Attempt refresh
      return this.authService.refreshToken().pipe(
        map(() => {
          // Refresh successful → check roles
          if (this.authService.isModerator() ) {
            return true;
          }
          this.router.navigate(['/']);
          return false;
        }),
        catchError(() => {
          // Refresh failed → logout
          this.authService.logout('Your session has expired.', returnUrl);
          return of(false);
        })
      );
    }

    // Token valid → check roles
    if (this.authService.isModerator() ) {
      return of(true);
    }

    this.router.navigate(['/']);
    return of(false);
  }
}