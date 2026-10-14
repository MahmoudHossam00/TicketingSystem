import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../Services/auth.service';
import { catchError, map, of } from 'rxjs';

/** Allows `/changepassword` only when logged in and password change is still required. */
export const changePasswordPageGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getTokenFromCookie();
  const returnUrl = state.url; // capture the attempted URL

  // No token or expired: logout and redirect to login
  if (!token) {
    auth.logout(undefined, returnUrl);
    return false;
  }

  if (auth.isTokenExpired(token)) {
    const refreshToken = auth.getStoredRefreshToken();
    if (!refreshToken) {
      auth.logout('Your session has expired.', returnUrl);
      return false;
    }

    // Attempt refresh
    return auth.refreshToken().pipe(
      map(() => {
        if (!auth.mustChangePassword()) {
          router.navigate(['/'], { queryParams: { returnUrl } });
          return false;
        }
        return true;
      }),
      catchError(() => {
        auth.logout('Your session has expired.', returnUrl);
        return of(false);
      })
    );
  }

  // Token valid: check password requirement
  if (!auth.mustChangePassword()) {
    router.navigate(['/'], { queryParams: { returnUrl } });
    return false;
  }

  return true;
};