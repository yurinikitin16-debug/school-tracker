import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';

import { AuthPermissions, AuthenticatedUser } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

type GuardResult = boolean | UrlTree;

export const authGuard: CanActivateFn = (): Observable<GuardResult> | GuardResult => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const currentUser = auth.currentUser();

  if (currentUser) {
    return true;
  }

  return auth.loadCurrentUser().pipe(map((user) => (user ? true : router.parseUrl('/login'))));
};

export const permissionGuard: CanActivateChildFn = (route): Observable<GuardResult> | GuardResult => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredPermission = route.data['permission'] as keyof AuthPermissions | undefined;
  const currentUser = auth.currentUser();

  if (!requiredPermission) {
    return true;
  }

  if (currentUser) {
    return canAccess(currentUser, requiredPermission) ? true : router.parseUrl('/attendance');
  }

  return auth
    .loadCurrentUser()
    .pipe(
      map((user) =>
        user && canAccess(user, requiredPermission) ? true : router.parseUrl(user ? '/attendance' : '/login'),
      ),
    );
};

function canAccess(user: AuthenticatedUser, permission: keyof AuthPermissions): boolean {
  return user.permissions[permission];
}
