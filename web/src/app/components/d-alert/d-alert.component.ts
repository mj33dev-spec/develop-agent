import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CButtonComponent, CButtonTheme } from '../c-button/c-button.component';

export type DAlertType = 'info' | 'success' | 'warn' | 'error';
export type DAlertButtonType = 'yesOnly' | 'yesNo' | 'okOnly' | 'okCancel' | 'custom';
export type DAlertDirection = 'top' | 'right' | 'bottom' | 'left' | 'center';

export interface DAlertConfig {
  title?: string;
  message: string;
  type?: DAlertType;
  buttonType?: DAlertButtonType;
  direction?: DAlertDirection;
  isPrompt?: boolean;
  promptPlaceholder?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
  // Angular-specific dynamic destroy callback
  _onDestroy?: () => void;
}

@Component({
  selector: 'd-alert',
  standalone: true,
  imports: [CommonModule, FormsModule, CButtonComponent],
  templateUrl: './d-alert.component.html',
  styleUrls: ['./d-alert.component.scss']
})
export class DAlertComponent implements OnInit, OnDestroy {
  @Input() config!: DAlertConfig;
  
  inputValue = '';
  animate = false;

  private timerId: any;
  private animationFrameId: any;

  ngOnInit() {
    this.animationFrameId = requestAnimationFrame(() => {
      this.animate = true;
    });
  }

  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.timerId) clearTimeout(this.timerId);
  }

  handleConfirm() {
    this.closeAlert();
    if (this.config.isPrompt && this.config.onConfirm) {
      this.config.onConfirm(this.inputValue);
    } else if (this.config.onConfirm) {
      this.config.onConfirm();
    }
  }

  handleCancel() {
    this.closeAlert();
    if (this.config.onCancel) {
      this.config.onCancel();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    if (this.config.buttonType !== 'yesOnly' && this.config.buttonType !== 'okOnly') {
      this.handleCancel();
    } else {
      this.handleConfirm();
    }
  }

  closeAlert() {
    this.animate = false;
    this.timerId = setTimeout(() => {
      if (this.config._onDestroy) {
        this.config._onDestroy();
      }
    }, 200); // 200ms for transition
  }

  getConfirmTheme(): CButtonTheme {
    switch (this.config.type) {
      case 'success': return 'success';
      case 'warn': return 'warn';
      case 'error': return 'error';
      case 'info':
      default: return 'primary';
    }
  }
}
