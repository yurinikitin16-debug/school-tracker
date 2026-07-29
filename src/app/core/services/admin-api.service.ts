import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { UserRole } from '../models/auth.models';
import { ApiClientService } from './api-client.service';

export interface AdminUserDto {
  id: number;
  fullName: string;
  login: string;
  role: UserRole;
  isActive: boolean;
}

export interface CreateAdminUserRequest {
  fullName: string;
  login: string;
  password: string;
  role: UserRole;
}

export interface UpdateAdminUserRequest {
  fullName?: string;
  login?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ClassTeacherAssignmentDto {
  id: number;
  teacherId: number;
  classId: number;
  academicYearId: number;
  isActive: boolean;
}

export interface CreateClassTeacherAssignmentRequest {
  teacherId: number;
  classId: number;
  academicYearId: number;
}

export interface UpdateClassTeacherAssignmentRequest {
  teacherId?: number;
  classId?: number;
  academicYearId?: number;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly api = inject(ApiClientService);

  getUsers(): Observable<AdminUserDto[]> {
    return this.api.get<AdminUserDto[]>('/api/users');
  }

  createUser(request: CreateAdminUserRequest): Observable<AdminUserDto> {
    return this.api.post<AdminUserDto, CreateAdminUserRequest>('/api/users', request);
  }

  updateUser(id: number, request: UpdateAdminUserRequest): Observable<AdminUserDto> {
    return this.api.patch<AdminUserDto, UpdateAdminUserRequest>(`/api/users/${id}`, request);
  }

  getClassTeacherAssignments(academicYearId: number): Observable<ClassTeacherAssignmentDto[]> {
    return this.api.get<ClassTeacherAssignmentDto[]>('/api/class-teachers', { academicYearId });
  }

  createClassTeacherAssignment(
    request: CreateClassTeacherAssignmentRequest,
  ): Observable<ClassTeacherAssignmentDto> {
    return this.api.post<ClassTeacherAssignmentDto, CreateClassTeacherAssignmentRequest>('/api/class-teachers', request);
  }

  updateClassTeacherAssignment(
    id: number,
    request: UpdateClassTeacherAssignmentRequest,
  ): Observable<ClassTeacherAssignmentDto> {
    return this.api.patch<ClassTeacherAssignmentDto, UpdateClassTeacherAssignmentRequest>(
      `/api/class-teachers/${id}`,
      request,
    );
  }
}
