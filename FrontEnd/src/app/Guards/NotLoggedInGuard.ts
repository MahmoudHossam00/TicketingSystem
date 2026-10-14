import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../Services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotLoggedInGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const token = this.authService.getTokenFromCookie();
    const returnUrl = state.url;

    // No token → allow access (not logged in)
    if (!token) {
      return of(true);
    }

    // Token valid → redirect away from login/register pages
    if (!this.authService.isTokenExpired(token)) {
      this.router.navigate(['/open-ticket'], { queryParams: { returnUrl } });
      return of(false);
    }

    // Token expired → attempt refresh
    const refreshToken = this.authService.getStoredRefreshToken();
    if (!refreshToken) {
      this.authService.logout('Your session has expired.', returnUrl);
      return of(false);
    }

    return this.authService.refreshToken().pipe(
      map(() => {
        // After refresh, user is considered logged in → redirect away
        this.router.navigate(['/open-ticket'], { queryParams: { returnUrl } });
        return false;
      }),
      catchError(() => {
        // Refresh failed → logout and allow access to login/register
        this.authService.logout('Your session has expired.', returnUrl);
        return of(true);
      })
    );
  }
}