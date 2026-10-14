import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withDebugTracing } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './Interceptors/Error/error.interceptor';
import { provideToastr } from 'ngx-toastr';
import { headerInterceptor } from './Interceptors/header.interceptor';
import { responseInterceptor } from './Interceptors/Error/response.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withDebugTracing()),
    provideAnimations(),
    provideHttpClient(
      withFetch(),
      withInterceptors([errorInterceptor,headerInterceptor,responseInterceptor])
    ),
    provideToastr({
      timeOut: 5000,
      positionClass: 'toast-bottom-left',
      // Allow multiple toasts with the same message so no notification is skipped
      preventDuplicates: false,
      closeButton: true,
      progressBar: true,
      tapToDismiss: false, // We'll handle clicks manually
      enableHtml: true
    })

  ]
};
