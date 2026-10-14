import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Services/auth.service';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';

export const isFirstLoginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getTokenFromCookie();
  const returnUrl = state.url; // capture the attempted URL

  // No token: logout and send returnUrl
  if (!token) {
    authService.logout(undefined, returnUrl);
    return of(false);
  }

  // Token expired: try refresh
  if (authService.isTokenExpired(token)) {
    const refreshToken = authService.getStoredRefreshToken();
    if (!refreshToken) {
      authService.logout('Your session has expired.', returnUrl);
      return of(false);
    }

    // Attempt refresh
    return authService.refreshToken().pipe(
      map(() => {
        // Refresh successful: check first login
        if (authService.mustChangePassword()) {
          router.navigate(['/changepassword'], { queryParams: { returnUrl } });
          return false;
        }
        return true;
      }),
      catchError(() => {
        // Refresh failed: logout
        authService.logout('Your session has expired.', returnUrl);
        return of(false);
      })
    );
  }

  // Token valid: check first login
  if (authService.mustChangePassword()) {
    router.navigate(['/changepassword'], { queryParams: { returnUrl } });
    return false;
  }

  return true;
};