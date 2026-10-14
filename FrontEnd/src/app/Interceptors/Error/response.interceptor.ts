import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);

  return next(req).pipe(
    // tap((event: HttpEvent<any>) => {
    //   if (event instanceof HttpResponse) {
    //     // Only toast on successful responses
    //     if (event.ok) {
    //       const body: any = event.body;

    //       // ASP.NET often returns: { Message: "..." } or { message: "..." }
    //       const msg =
    //         body?.Message ??
    //         body?.message ??
    //         // sometimes APIs return plain strings
    //         (typeof body === 'string' ? body : null);

    //       toastr.success(msg ?? 'success');
    //     }
    //   }
    // })
  );
};
