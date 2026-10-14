import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);

  return next(req).pipe(
    tap((event: HttpEvent<any>) => {
      if (event instanceof HttpResponse && event.body?.message) {
        toastr.success(event.body.message);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const pd = error.error as any;

      const serverMsg =
        pd?.detail ||
        pd?.message ||
        pd?.title ||
        (typeof pd === 'string' ? pd : null);

      if (error.status === 403) {
        toastr.error(serverMsg ?? 'You are not authorized to access this resource.');
        return throwError(() => error);
      }

      if (error.status === 400 && pd?.errors) {
        for (const key of Object.keys(pd.errors)) {
          (pd.errors[key] as string[]).forEach(msg => toastr.error(msg));
        }
        return throwError(() => error);
      }

      if (serverMsg) {
        toastr.error(serverMsg);
      } else {
        toastr.error('An error occurred. Please try again later.');
      }

      return throwError(() => error);
    })
  );
};