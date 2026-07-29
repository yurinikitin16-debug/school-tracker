import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';

import {
  AuthPermissions,
  AuthenticatedUser,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
} from '../models/auth.models';
import { ApiClientService } from './api-client.service';

const AUTH_REQUEST_OPTIONS = { withCredentials: true };
const AUTH_TOKEN_STORAGE_KEY = 'school-track-auth-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClientService);

  readonly currentUser = signal<AuthenticatedUser | null>(null);
  private readonly authToken = signal<string | null>(readStoredToken());
  readonly isLoading = signal(false);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly permissions = computed<AuthPermissions | null>(() => this.currentUser()?.permissions ?? null);

  login(request: LoginRequest): Observable<AuthenticatedUser> {
    this.isLoading.set(true);

    return this.api
      .post<LoginResponse, LoginRequest>('/api/auth/login', request, AUTH_REQUEST_OPTIONS)
      .pipe(
        tap((response) => {
          this.setToken(response.token ?? response.accessToken ?? null);
        }),
        map((response) => normalizeUser(response.user)),
        tap((user) => {
          this.currentUser.set(user);
        }),
        finalize(() => this.isLoading.set(false)),
      );
  }

  logout(): Observable<LogoutResponse> {
    return this.api
      .post<LogoutResponse, Record<string, never>>('/api/auth/logout', {}, AUTH_REQUEST_OPTIONS)
      .pipe(
        tap(() => {
          this.clearSession();
        }),
      );
  }

  loadCurrentUser(): Observable<AuthenticatedUser | null> {
    this.isLoading.set(true);

    return this.me().pipe(
      tap((user) => {
        this.currentUser.set(user);
      }),
      catchError(() => {
        this.currentUser.set(null);

        return of(null);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  clearSession(): void {
    this.currentUser.set(null);
    this.setToken(null);
  }

  hasPermission(permission: keyof AuthPermissions): boolean {
    return this.permissions()?.[permission] ?? false;
  }

  token(): string | null {
    return this.authToken();
  }

  private me(): Observable<AuthenticatedUser> {
    return this.api.get<AuthenticatedUser>('/api/me', undefined, AUTH_REQUEST_OPTIONS).pipe(map(normalizeUser));
  }

  private setToken(token: string | null): void {
    this.authToken.set(token);

    try {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    } catch {
      // Storage can be unavailable in privacy modes; in-memory token still covers the current tab.
    }
  }
}

function normalizeUser(user: LoginResponse['user']): AuthenticatedUser {
  const isAdmin = user.role === 'admin';

  return {
    ...user,
    permissions: user.permissions ?? {
      attendance: true,
      reports: isAdmin,
      settings: isAdmin,
      directories: isAdmin,
    },
    classScope: {
      type: user.classScope?.type ?? (isAdmin ? 'all' : 'assigned'),
      classIds: user.classScope?.classIds ?? [],
    },
  };
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}
