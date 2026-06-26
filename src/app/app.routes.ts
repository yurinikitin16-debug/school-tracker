import { Routes } from '@angular/router';
import { AttendancePageComponent } from './features/attendance/attendance-page.component';
import { ClassesPageComponent } from './features/classes/classes-page.component';
import { PlaceholderPageComponent } from './features/placeholder-page/placeholder-page.component';
import { ReportsPageComponent } from './features/reports/reports-page.component';
import { SchedulePageComponent } from './features/schedule/schedule-page.component';
import { SettingsPageComponent } from './features/settings/settings-page.component';
import { StudentsPageComponent } from './features/students/students-page.component';
import { SubjectsPageComponent } from './features/subjects/subjects-page.component';
import { TeachersPageComponent } from './features/teachers/teachers-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'attendance' },
  { path: 'dashboard', component: PlaceholderPageComponent, data: { title: 'Головна' } },
  { path: 'attendance', component: AttendancePageComponent },
  { path: 'schedule', component: SchedulePageComponent },
  { path: 'lessons', component: PlaceholderPageComponent, data: { title: 'Уроки' } },
  { path: 'students', component: StudentsPageComponent },
  { path: 'classes', component: ClassesPageComponent },
  { path: 'subjects', component: SubjectsPageComponent },
  { path: 'teachers', component: TeachersPageComponent },
  { path: 'absence-reasons', redirectTo: 'settings' },
  { path: 'reports', component: ReportsPageComponent },
  { path: 'settings', component: SettingsPageComponent },
  { path: '**', redirectTo: 'attendance' },
];
