import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface UiSelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'ui-select',
  imports: [FormsModule],
  template: `
    <label class="field">
      @if (label) {
        <span class="field__label">{{ label }}</span>
      }
      <select
        [attr.aria-label]="ariaLabel || label"
        [disabled]="disabled"
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
      >
        @for (option of options; track option.value) {
          <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
    </label>
  `,
  styleUrl: './ui-select.component.scss',
})
export class UiSelectComponent {
  @Input() label = '';
  @Input() ariaLabel = '';
  @Input() value = '';
  @Input() options: UiSelectOption[] = [];
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
}
