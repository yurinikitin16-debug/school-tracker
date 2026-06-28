import { Routes } from '@angular/router';
import { AttendancePageComponent } from './features/attendance/attendance-page.component';
import { ClassesPageComponent } from './features/classes/classes-page.component';
import { WeeklyReportsPageComponent } from './features/reports/weekly-reports-page.component';
import { SettingsPageComponent } from './features/settings/settings-page.component';
import { StudentsPageComponent } from './features/students/students-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'attendance' },
  { path: 'dashboard', redirectTo: 'attendance' },
  { path: 'attendance', component: AttendancePageComponent },
  { path: 'students', component: StudentsPageComponent },
  { path: 'classes', component: ClassesPageComponent },
  { path: 'absence-reasons', redirectTo: 'settings' },
  { path: 'reports', component: WeeklyReportsPageComponent },
  { path: 'settings', component: SettingsPageComponent },
  { path: '**', redirectTo: 'attendance' },
];
