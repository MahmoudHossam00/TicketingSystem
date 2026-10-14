import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '../Services/auth.service';
import { AuthRefreshService } from '../Services/RefreshResponse.service';
// import { AuthRefreshService } from '../Services/auth-refresh.service';

export const headerInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);
  const authService = inject(AuthService);
  const authRefreshService = inject(AuthRefreshService);

  if (req.url.includes('/Auth/Login') || req.url.includes('/Auth/Refresh')) {
    return next(req);
  }

  const token = authService.getTokenFromCookie();
  const isFormData = req.body instanceof FormData;

  const cloneReq = (t: string | null) =>
    req.clone({
      setHeaders: {
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        'X-Requested-With': 'XMLHttpRequest',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      }
    });

  if (!token) {
    return next(cloneReq(null));
  }

  if (authService.isTokenExpired(token)) {
    const refreshToken = authService.getStoredRefreshToken();

    if (!refreshToken) {
      console.error('No refresh token found', 'ERROR CAUSE');
      authService.logout('Could not renew your session. Please sign in again.');
      toastr.error('Session expired. Please login again.', 'Error');
      return throwError(() => new Error('No refresh token found'));
    }

    return authRefreshService.refreshToken(refreshToken).pipe(
      catchError(err => {
        console.error(err, 'refresh token failed');
        authService.logout('Could not renew your session. Please sign in again.');
        toastr.error('Session expired. Please login again.', 'Error');
        return throwError(() => err);
      }),
      switchMap(res => {
        authService.storeAccessToken(res.accessToken);

        if (res.refreshToken) {
          authService.storeRefreshToken(res.refreshToken);
        }

        return next(cloneReq(res.accessToken));
      })
    );
  }

  return next(cloneReq(token));
};