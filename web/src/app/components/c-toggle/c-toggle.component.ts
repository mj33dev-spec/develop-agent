import { Component, Input, Output, EventEmitter, forwardRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type CToggleSize = 'small' | 'basic' | 'large';

@Component({
  selector: 'c-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './c-toggle.component.html',
  styleUrls: ['./c-toggle.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CToggleComponent),
      multi: true
    }
  ]
})
export class CToggleComponent implements ControlValueAccessor {
  @Input() checked: boolean = false;
  @Input() disabled: boolean = false;
  @Input() size: CToggleSize = 'basic';

  @Output() checkedChange = new EventEmitter<boolean>();
  @Output() onChange = new EventEmitter<boolean>();

  private onChangeFn: (value: boolean) => void = () => {};
  private onTouchedFn: () => void = () => {};

  toggle() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.onChangeFn(this.checked);
    this.onTouchedFn();
    this.checkedChange.emit(this.checked);
    this.onChange.emit(this.checked);
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    this.checked = !!value;
  }

  registerOnChange(fn: any): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouchedFn = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
