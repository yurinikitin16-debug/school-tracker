import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  get<T>(path: string, query?: QueryParams): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.params(query) });
  }

  post<TResponse, TBody = unknown>(path: string, body: TBody): Observable<TResponse> {
    return this.http.post<TResponse>(this.url(path), body);
  }

  patch<TResponse, TBody = unknown>(path: string, body?: TBody): Observable<TResponse> {
    return this.http.patch<TResponse>(this.url(path), body ?? {});
  }

  delete<T>(path: string, query?: QueryParams): Observable<T> {
    return this.http.delete<T>(this.url(path), { params: this.params(query) });
  }

  private url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\//, '')}`;
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
