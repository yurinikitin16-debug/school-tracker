import { Component, inject } from '@angular/core';

import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'ui-toast',
  template: `
    @if (toast.message(); as message) {
      <aside
        class="toast"
        [class.toast--error]="message.tone === 'error'"
        [class.toast--success]="message.tone === 'success'"
        role="status"
        aria-live="polite"
      >
        {{ message.text }}
      </aside>
    }
  `,
  styleUrl: './ui-toast.component.scss',
})
export class UiToastComponent {
  readonly toast = inject(ToastService);
}
