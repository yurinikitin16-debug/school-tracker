import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from './api-client.service';

export interface ClassDto {
  id: number;
  name: string;
  academicYearId: number;
  studentsCount: number;
  isActive: boolean;
}

export interface CreateClassRequest {
  name: string;
  academicYearId: number;
}

export interface UpdateClassRequest {
  name?: string;
  isActive?: boolean;
}

export interface PromoteClassRequest {
  targetAcademicYearId: number;
  newName: string;
}

@Injectable({ providedIn: 'root' })
export class ClassesApiService {
  private readonly api = inject(ApiClientService);

  getClasses(academicYearId: number): Observable<ClassDto[]> {
    return this.api.get<ClassDto[]>('/api/classes', { academicYearId });
  }

  createClass(request: CreateClassRequest): Observable<ClassDto> {
    return this.api.post<ClassDto, CreateClassRequest>('/api/classes', request);
  }

  updateClass(id: number, request: UpdateClassRequest): Observable<ClassDto> {
    return this.api.patch<ClassDto, UpdateClassRequest>(`/api/classes/${id}`, request);
  }

  disableClass(id: number): Observable<ClassDto> {
    return this.updateClass(id, { isActive: false });
  }

  promoteClass(id: number, request: PromoteClassRequest): Observable<ClassDto> {
    return this.api.post<ClassDto, PromoteClassRequest>(`/api/classes/${id}/promote`, request);
  }
}
