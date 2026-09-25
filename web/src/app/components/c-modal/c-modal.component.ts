import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy, ElementRef, ViewEncapsulation, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CButtonComponent } from '../c-button/c-button.component';

@Component({
  selector: 'c-modal',
  standalone: true,
  imports: [CommonModule, CButtonComponent],
  templateUrl: './c-modal.component.html',
  styleUrls: ['./c-modal.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ transform: booleanAttribute }) isOpen: boolean = false;
  @Input() title: string = '';
  @Input() subTitle?: string;
  @Input() submitLabel: string = '저장';
  @Input() cancelLabel: string = '취소';
  @Input() submitTheme: 'primary' | 'error' | 'success' | 'warn' | 'neutral' | 'secondary' = 'primary';
  @Input({ transform: booleanAttribute }) submitDisabled: boolean = false;
  @Input() width?: string;
  @Input() height?: string;
  @Input({ transform: booleanAttribute }) hideCancel: boolean = false;
  @Input({ transform: booleanAttribute }) isForm: boolean = false;

  @Input({ transform: booleanAttribute }) hasSidebar: boolean = false;
  @Input({ transform: booleanAttribute }) hideHeader: boolean = false;
  @Input({ transform: booleanAttribute }) hideFooter: boolean = false;

  @Input({ transform: booleanAttribute }) customFooter: boolean = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<Event>();

  constructor(private el: ElementRef) {}

  ngOnInit() {
    // 뷰포트 고정 오버레이용 컴포넌트 렌더링
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
