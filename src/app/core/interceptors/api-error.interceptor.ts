import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const isExpectedAuthError = isExpectedAuthRequest(request.url);

        if (error.status === 401 && !isExpectedAuthError) {
          auth.clearSession();
          void router.navigateByUrl('/login');
        } else if (error.status === 403) {
          toast.showError('Немає доступу');
        } else if (!isExpectedAuthError) {
          toast.showError();
        }
      }

      return throwError(() => error);
    }),
  );
};

function isExpectedAuthRequest(url: string): boolean {
  return url.includes('/api/me') || url.includes('/api/auth/login');
}
