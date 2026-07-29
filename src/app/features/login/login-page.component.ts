import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { UiButtonComponent } from '../../shared/ui/button/ui-button.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, UiButtonComponent, UiInputComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly login = signal('');
  readonly password = signal('');
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    const login = this.login().trim();
    const password = this.password();

    if (!login || !password || this.isSubmitting()) {
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.auth.login({ login, password }).subscribe({
      next: () => {
        void this.router.navigateByUrl('/attendance');
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error));
        this.isSubmitting.set(false);
      },
      complete: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'Невірний логін або пароль';
    }

    return 'Не вдалося увійти. Спробуйте ще раз.';
  }
}
