import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from './api-client.service';

export interface StudentDto {
  id: number;
  lastName: string;
  firstName: string;
  classId: number;
  isActive: boolean;
}

export interface CreateStudentRequest {
  lastName: string;
  firstName: string;
}

export interface BulkCreateStudentsRequest {
  students: CreateStudentRequest[];
}

export interface UpdateStudentRequest {
  lastName?: string;
  firstName?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class StudentsApiService {
  private readonly api = inject(ApiClientService);

  getClassStudents(classId: number): Observable<StudentDto[]> {
    return this.api.get<StudentDto[]>(`/api/classes/${classId}/students`);
  }

  createStudent(classId: number, request: CreateStudentRequest): Observable<StudentDto> {
    return this.api.post<StudentDto, CreateStudentRequest>(`/api/classes/${classId}/students`, request);
  }

  createStudentsBulk(classId: number, request: BulkCreateStudentsRequest): Observable<StudentDto[]> {
    return this.api.post<StudentDto[], BulkCreateStudentsRequest>(`/api/classes/${classId}/students/bulk`, request);
  }

  updateStudent(id: number, request: UpdateStudentRequest): Observable<StudentDto> {
    return this.api.patch<StudentDto, UpdateStudentRequest>(`/api/students/${id}`, request);
  }
}
