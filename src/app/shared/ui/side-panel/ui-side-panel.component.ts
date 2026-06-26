import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiIconComponent } from '../icon/ui-icon.component';

@Component({
  selector: 'ui-side-panel',
  imports: [UiIconComponent],
  template: `
    @if (open) {
      <button class="backdrop" type="button" aria-label="Закрити панель" (click)="closed.emit()"></button>
      <aside class="panel" role="dialog" aria-modal="true" [attr.aria-label]="title">
        <header>
          <h2>{{ title }}</h2>
          <button type="button" aria-label="Закрити панель" (click)="closed.emit()">
            <ui-icon name="x" />
          </button>
        </header>
        <div class="panel__body">
          <ng-content />
        </div>
      </aside>
    }
  `,
  styleUrl: './ui-side-panel.component.scss',
})
export class UiSidePanelComponent {
  @Input() open = false;
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();
}
