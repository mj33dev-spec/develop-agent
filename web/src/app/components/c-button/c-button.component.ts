import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CButtonTheme = 
  | 'primary' | 'outlinedPrimary'
  | 'secondary' | 'outlinedSecondary'
  | 'success' | 'outlinedSuccess'
  | 'error' | 'outlinedError'
  | 'warn' | 'outlinedWarn'
  | 'neutral' | 'outlinedNeutral'
  | 'icon';

export type CButtonSize = 'small' | 'medium' | 'large' | 'more';

@Component({
  selector: 'c-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './c-button.component.html',
  styleUrls: ['./c-button.component.scss']
})
export class CButtonComponent {
  @Input() theme: CButtonTheme = 'primary';
  @Input() size: CButtonSize = 'medium';
  @Input() icon?: string;
  @Input() iconAlign: 'left' | 'right' = 'left';
  @Input() disabled = false;
  @Input() customClass = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() validate?: () => string | undefined | null | false;

  @Output() onClick = new EventEmitter<MouseEvent>();

  get themeClass(): string {
    const map: Record<CButtonTheme, string> = {
      primary: 'btn-primary',
      outlinedPrimary: 'btn-outlined-primary',
      secondary: 'btn-secondary',
      outlinedSecondary: 'btn-outlined-secondary',
      success: 'btn-success',
      outlinedSuccess: 'btn-outlined-success',
      error: 'btn-error',
      outlinedError: 'btn-outlined-error',
      warn: 'btn-warning',
      outlinedWarn: 'btn-outlined-warning',
      neutral: 'btn-neutral',
      outlinedNeutral: 'btn-outlined-neutral',
      icon: 'btn-icon',
    };
    return map[this.theme] || 'btn-primary';
  }

  get sizeClass(): string {
    const map: Record<CButtonSize, string> = {
      small: 'btn-small',
      medium: '',
      large: 'btn-large',
      more: 'btn-icon'
    };
    return map[this.size] || '';
  }

  handleClick(event: MouseEvent) {
    if (this.disabled) {
      event.preventDefault();
      return;
    }

    if (this.validate) {
      const errorMsg = this.validate();
      if (typeof errorMsg === 'string' && errorMsg.trim() !== '') {
        alert(errorMsg); // DAlert replacement
        event.preventDefault();
        return;
      }
    }

    this.onClick.emit(event);
  }
}
