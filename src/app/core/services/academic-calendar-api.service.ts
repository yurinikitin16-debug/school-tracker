import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from './api-client.service';

export interface AcademicCalendarExceptionDto {
  id: number;
  academicYearId: number;
  date: string;
  isSchoolDay: boolean;
  note?: string;
}

export interface SaveAcademicCalendarExceptionsRequest {
  academicYearId: number;
  dates: string[];
  isSchoolDay: boolean;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class AcademicCalendarApiService {
  private readonly api = inject(ApiClientService);

  getExceptions(academicYearId: number): Observable<AcademicCalendarExceptionDto[]> {
    return this.api.get<AcademicCalendarExceptionDto[]>('/api/academic-calendar/exceptions', { academicYearId });
  }

  saveExceptions(request: SaveAcademicCalendarExceptionsRequest): Observable<AcademicCalendarExceptionDto[]> {
    return this.api.post<AcademicCalendarExceptionDto[], SaveAcademicCalendarExceptionsRequest>(
      '/api/academic-calendar/exceptions/bulk',
      request,
    );
  }
}
