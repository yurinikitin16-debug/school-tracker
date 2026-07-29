import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/guards/auth.guard';
import { AttendancePageComponent } from './features/attendance/attendance-page.component';
import { ClassesPageComponent } from './features/classes/classes-page.component';
import { LoginPageComponent } from './features/login/login-page.component';
import { WeeklyReportsPageComponent } from './features/reports/weekly-reports-page.component';
import { SettingsPageComponent } from './features/settings/settings-page.component';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'attendance' },
      { path: 'dashboard', redirectTo: 'attendance' },
      { path: 'attendance', component: AttendancePageComponent, data: { permission: 'attendance' } },
      { path: 'classes', component: ClassesPageComponent, data: { permission: 'directories' } },
      { path: 'absence-reasons', redirectTo: 'settings' },
      { path: 'reports', component: WeeklyReportsPageComponent, data: { permission: 'reports' } },
      { path: 'settings', component: SettingsPageComponent, data: { permission: 'settings' } },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin-page.component').then((module) => module.AdminPageComponent),
        data: { permission: 'settings' },
      },
      { path: '**', redirectTo: 'attendance' },
    ],
  },
];
