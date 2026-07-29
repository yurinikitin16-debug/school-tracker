import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

interface ApiRequestOptions {
  withCredentials?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  get<T>(path: string, query?: QueryParams, options?: ApiRequestOptions): Observable<T> {
    return this.http.get<T>(this.url(path), {
      params: this.params(query),
      withCredentials: this.withCredentials(path, options),
    });
  }

  post<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options?: ApiRequestOptions,
  ): Observable<TResponse> {
    return this.http.post<TResponse>(this.url(path), body, {
      withCredentials: this.withCredentials(path, options),
    });
  }

  patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: ApiRequestOptions,
  ): Observable<TResponse> {
    return this.http.patch<TResponse>(this.url(path), body ?? {}, {
      withCredentials: this.withCredentials(path, options),
    });
  }

  delete<T>(path: string, query?: QueryParams, options?: ApiRequestOptions): Observable<T> {
    return this.http.delete<T>(this.url(path), {
      params: this.params(query),
      withCredentials: this.withCredentials(path, options),
    });
  }

  private url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\//, '')}`;
  }

  private withCredentials(path: string, options?: ApiRequestOptions): boolean {
    return options?.withCredentials ?? path.startsWith('/api/');
  }

  private params(query?: QueryParams): HttpParams {
    let params = new HttpParams();

    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params = params.set(key, String(value));
      }
    });

    return params;
  }
}
