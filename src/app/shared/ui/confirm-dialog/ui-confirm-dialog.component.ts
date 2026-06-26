import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'ui-confirm-dialog',
  template: `
    @if (open) {
      <button class="confirm-dialog__backdrop" type="button" aria-label="Закрити" (click)="closed.emit()"></button>
      <section class="confirm-dialog" role="dialog" aria-modal="true" [attr.aria-label]="title">
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
        <div class="confirm-dialog__actions">
          <button class="confirm-dialog__cancel" type="button" (click)="closed.emit()">Ні, повернутися</button>
          <button class="confirm-dialog__confirm" type="button" (click)="confirmed.emit()">{{ confirmLabel }}</button>
        </div>
      </section>
    }
  `,
  styleUrl: './ui-confirm-dialog.component.scss',
})
export class UiConfirmDialogComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() description = '';
  @Input() confirmLabel = 'Підтвердити';
  @Output() confirmed = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
}
