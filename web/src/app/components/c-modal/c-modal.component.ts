import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CButtonComponent } from '../c-button/c-button.component';

@Component({
  selector: 'c-modal',
  standalone: true,
  imports: [CommonModule, CButtonComponent],
  templateUrl: './c-modal.component.html',
  styleUrls: ['./c-modal.component.scss']
})
export class CModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() subTitle?: string;
  @Input() submitLabel: string = '저장';
  @Input() cancelLabel: string = '취소';
  @Input() submitTheme: 'primary' | 'error' | 'success' | 'warn' | 'neutral' | 'secondary' = 'primary';
  @Input() submitDisabled: boolean = false;
  @Input() width?: string;
  @Input() height?: string;
  @Input() hideCancel: boolean = false;
  @Input() isForm: boolean = false;

  @Input() customFooter: boolean = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<Event>();

  constructor(private el: ElementRef) {}

  ngOnInit() {
    if (this.el.nativeElement && this.el.nativeElement.parentNode !== document.body) {
      document.body.appendChild(this.el.nativeElement);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
    if (this.el.nativeElement && this.el.nativeElement.parentNode) {
      this.el.nativeElement.parentNode.removeChild(this.el.nativeElement);
    }
  }

  handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.onClose.emit();
    }
  }

  handleSubmit(e?: Event) {
    if (e) {
      e.preventDefault();
    }
    if (!this.submitDisabled) {
      this.onSubmit.emit(e);
    }
  }
}
