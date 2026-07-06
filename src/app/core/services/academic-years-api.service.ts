import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from './api-client.service';

export interface AcademicYearDto {
  id: number;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
}

export interface CreateAcademicYearRequest {
  name: string;
  startsOn: string;
  endsOn: string;
}

export interface UpdateAcademicYearRequest {
  name?: string;
  startsOn?: string;
  endsOn?: string;
}

@Injectable({ providedIn: 'root' })
export class AcademicYearsApiService {
  private readonly api = inject(ApiClientService);

  getAcademicYears(): Observable<AcademicYearDto[]> {
    return this.api.get<AcademicYearDto[]>('/api/academic-years');
  }

  createAcademicYear(request: CreateAcademicYearRequest): Observable<AcademicYearDto> {
    return this.api.post<AcademicYearDto, CreateAcademicYearRequest>('/api/academic-years', request);
  }

  updateAcademicYear(id: number, request: UpdateAcademicYearRequest): Observable<AcademicYearDto> {
    return this.api.patch<AcademicYearDto, UpdateAcademicYearRequest>(`/api/academic-years/${id}`, request);
  }

  setCurrentAcademicYear(id: number): Observable<{ currentAcademicYear: Omit<AcademicYearDto, 'isCurrent'> }> {
    return this.api.patch<{ currentAcademicYear: Omit<AcademicYearDto, 'isCurrent'> }>(`/api/academic-years/${id}/set-current`);
  }
}
