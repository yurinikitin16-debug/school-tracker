import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
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
          #control
          [attr.aria-label]="ariaLabel || label || placeholder"
          [attr.data-autofocus]="autofocus ? '' : null"
          [disabled]="disabled"
          [ngModel]="value"
          [ngModelOptions]="{ standalone: true }"
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
  @Input() autofocus = false;
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('control') private readonly control?: ElementRef<HTMLInputElement>;

  ngAfterViewInit(): void {
    if (this.autofocus) {
      this.focusControl();
      setTimeout(() => this.focusControl());
      setTimeout(() => this.focusControl(), 120);
    }
  }

  private focusControl(): void {
    this.control?.nativeElement.focus();
  }
}
