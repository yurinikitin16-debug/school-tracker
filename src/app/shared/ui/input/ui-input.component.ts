import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiIconComponent, UiIconName } from '../icon/ui-icon.component';

@Component({
  selector: 'ui-input',
  imports: [FormsModule, UiIconComponent],
  template: `
    <label class="field">
      @if (label) {
        <span class="field__label">{{ label }}</span>
      }
      <span class="field__control">
        @if (icon) {
          <ui-icon class="field__icon" [name]="icon" />
        }
        <input
          [attr.aria-label]="ariaLabel || label || placeholder"
          [disabled]="disabled"
          [ngModel]="value"
          [placeholder]="placeholder"
          [type]="type"
          (ngModelChange)="valueChange.emit($event)"
        />
      </span>
    </label>
  `,
  styleUrl: './ui-input.component.scss',
})
export class UiInputComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() ariaLabel = '';
  @Input() type = 'text';
  @Input() value = '';
  @Input() icon: UiIconName | '' = '';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
}
