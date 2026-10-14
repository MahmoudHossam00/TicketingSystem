import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../Services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Only users with the ADMIN role (not MASTER-only).
 * Use for admin-only features such as old tasks Excel import.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminOnlyGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const token = this.authService.getTokenFromCookie();
    const returnUrl = state.url;

    if (!token) {
      this.authService.logout(undefined, returnUrl);
      return of(false);
    }

    if (this.authService.isTokenExpired(token)) {
      const refreshToken = this.authService.getStoredRefreshToken();
      if (!refreshToken) {
        this.authService.logout('Your session has expired.', returnUrl);
        return of(false);
      }
      return this.authService.refreshToken().pipe(
        map(() => {
          if (this.authService.isAdmin()) return true;
          this.router.navigate(['/']);
          return false;
        }),
        catchError(() => {
          this.authService.logout('Your session has expired.', returnUrl);
          return of(false);
        }),
      );
    }

    if (this.authService.isAdmin()) {
      return of(true);
    }

    this.router.navigate(['/']);
    return of(false);
  }
}
