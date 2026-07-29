import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AcademicYearService } from './core/services/academic-year.service';
import { AuthService } from './core/services/auth.service';
import { UiToastComponent } from './shared/ui/toast/ui-toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiToastComponent],
  template: '<router-outlet /><ui-toast />',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'school-tracker';

  private readonly academicYear = inject(AcademicYearService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    this.academicYear.loadAppContext();
  }
}
