export type UserRole = 'admin' | 'class_teacher';
export type ClassScopeType = 'all' | 'assigned';

export interface AuthPermissions {
  attendance: boolean;
  reports: boolean;
  settings: boolean;
  directories: boolean;
}

export interface ClassScope {
  type: ClassScopeType;
  classIds: number[];
}

export interface AuthenticatedUser {
  id: number;
  fullName: string;
  login: string;
  role: UserRole;
  permissions: AuthPermissions;
  classScope: ClassScope;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  user: Pick<AuthenticatedUser, 'id' | 'fullName' | 'login' | 'role'> & Partial<AuthenticatedUser>;
  token?: string;
  accessToken?: string;
}

export interface LogoutResponse {
  ok: true;
}
