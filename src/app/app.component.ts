import { Component } from '@angular/core';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { UiToastComponent } from './shared/ui/toast/ui-toast.component';

@Component({
  selector: 'app-root',
  imports: [AppShellComponent, UiToastComponent],
  template: '<app-shell /><ui-toast />',
  styleUrl: './app.component.scss'
})
export class AppComponent {
}
