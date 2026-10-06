import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CButtonComponent } from '../c-button/c-button.component';

export interface CDropdownOption {
  label?: string;
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'divider' | 'item';
  value?: any;
}

export type CDropdownVariant = 'outlined' | 'fill' | 'more' | 'multi';

@Component({
  selector: 'c-dropdown',
  standalone: true,
  imports: [CommonModule, CButtonComponent],
  templateUrl: './c-dropdown.component.html',
  styleUrls: ['./c-dropdown.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CDropdownComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() variant: CDropdownVariant = 'outlined';
  @Input() direction: 'up' | 'down' = 'down';
  @Input() align: 'left' | 'right' = 'left';
  @Input() options: (CDropdownOption | string)[] = [];
  @Input() value?: string;
  @Input() icon?: string;
  @Input() disabledList: string[] = [];
  @Input() width?: string;
  @Input() menuWidth?: string;
  @Input() selectedValues: string[] = [];
  @Input() customClass: string = '';
  @Input() isOpen?: boolean;
  @Input() disabled: boolean = false;
  
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() removeValue = new EventEmitter<string>();

  @ViewChild('anchorRef') anchorRef!: ElementRef<HTMLDivElement>;
  
  internalOpen = false;
  dropdownCssVars: Record<string, string> = {};

  private menuElement?: HTMLElement;

  constructor(private elementRef: ElementRef) {}

  get open(): boolean {
    return this.isOpen !== undefined ? this.isOpen : this.internalOpen;
  }

  set open(val: boolean) {
    if (this.isOpen !== undefined) {
      this.isOpenChange.emit(val);
    } else {
      this.internalOpen = val;
    }
    if (val) {
      setTimeout(() => {
        this.updatePosition();
        this.attachToBody();
      }, 0);
    } else {
      this.detachFromBody();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        setTimeout(() => {
          this.updatePosition();
          this.attachToBody();
        }, 0);
      } else {
        this.detachFromBody();
      }
    }
  }

  ngAfterViewInit() {
    if (this.open) {
      this.updatePosition();
      this.attachToBody();
    }
  }

  ngOnDestroy() {
    this.detachFromBody();
  }

  @HostListener('window:resize')
  onResize() {
    if (this.open) {
      this.updatePosition();
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    if (this.open) {
      this.updatePosition();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.open) return;
    const target = event.target as Node;
    const isInsideAnchor = this.elementRef.nativeElement.contains(target);
    const isInsideMenu = this.menuElement ? this.menuElement.contains(target) : false;

    if (!isInsideAnchor && !isInsideMenu) {
      this.open = false;
    }
  }

  /** 드롭다운 팝업 메뉴 위치 및 너비 동적 계산 */
  updatePosition() {
    if (!this.anchorRef || !this.anchorRef.nativeElement) return;
    
    const nativeEl = this.anchorRef.nativeElement;
    /** 실제 트리거 버튼 요소 위치 및 크기 수집 */
    const clickableChild = nativeEl.querySelector('.dropdownWrapper button') || 
                           nativeEl.querySelector('button') || 
                           nativeEl.querySelector('.dropdownWrapper') || 
                           nativeEl;
    const rect = clickableChild.getBoundingClientRect();
    
    const vars: Record<string, string> = {};

    if (this.variant === 'more') {
      vars['--dropdown-min-width'] = this.menuWidth || '180px';
      vars['--dropdown-width'] = this.menuWidth || this.width || 'max-content';
    } else {
      vars['--dropdown-width'] = this.menuWidth ? this.menuWidth : (this.width ? this.width : `${rect.width}px`);
    }

    if (this.direction === 'up') {
      vars['--dropdown-bottom'] = `${window.innerHeight - rect.top + 8}px`;
      vars['--dropdown-top'] = 'auto';
    } else {
      vars['--dropdown-top'] = `${rect.bottom + 8}px`;
      vars['--dropdown-bottom'] = 'auto';
    }

    if (this.align === 'right') {
      const rightPos = Math.max(8, window.innerWidth - rect.right);
      vars['--dropdown-right'] = `${rightPos}px`;
      vars['--dropdown-left'] = 'auto';
    } else {
      const leftPos = Math.max(8, rect.left);
      vars['--dropdown-left'] = `${leftPos}px`;
      vars['--dropdown-right'] = 'auto';
    }

    this.dropdownCssVars = vars;
  }

  private attachToBody() {
    const el = this.elementRef.nativeElement.querySelector('.dropdown-portal-menu') as HTMLElement;
    if (el && el.parentElement !== document.body) {
      this.menuElement = el;
      document.body.appendChild(el);
    }
  }

  private detachFromBody() {
    if (this.menuElement && this.menuElement.parentElement === document.body) {
      document.body.removeChild(this.menuElement);
      this.menuElement = undefined;
    }
  }

  toggleDropdown() {
    if (this.disabled) return;
    this.open = !this.open;
  }

  isStringOption(opt: any): boolean {
    return typeof opt === 'string';
  }

  isDivider(opt: any): boolean {
    return opt && opt.type === 'divider';
  }

  getOptionLabel(opt: any): string {
    return this.isStringOption(opt) ? opt : (opt.label || '');
  }

  getOptionIcon(opt: any): string {
    return this.isStringOption(opt) ? '' : (opt.icon || '');
  }

  /** 옵션 활성화/비활성화 판단 */
  isOptionDisabled(opt: any): boolean {
    const label = this.getOptionLabel(opt);
    return (opt && opt.disabled) || this.disabledList.includes(label);
  }

  /** 선택된 옵션 항목 판단 로직 (label 및 value 교차 매칭으로 단일 공통 하이라이트 표현) */
  isOptionSelected(opt: any): boolean {
    if (!opt) return false;
    
    /* 객체 형태의 옵션에 selected 속성이 명시적으로 지정된 경우 */
    if (typeof opt === 'object' && opt.selected === true) {
      return true;
    }

    const label = this.isStringOption(opt) ? opt : (opt.label !== undefined ? opt.label : '');
    const value = this.isStringOption(opt) ? opt : (opt.value !== undefined ? opt.value : opt.label);

    /* 멀티 셀렉트 모드인 경우 */
    if (this.variant === 'multi') {
      return (
        (value !== undefined && this.selectedValues.includes(value)) ||
        (label !== '' && this.selectedValues.includes(label))
      );
    }

    /* 단일 셀렉트 모드인 경우 바인딩된 value와 opt의 label 및 value 교차 비교 */
    if (this.value !== undefined && this.value !== null) {
      const curStr = String(this.value).trim().toLowerCase();
      const valStr = value !== undefined ? String(value).trim().toLowerCase() : '';
      const labelStr = label !== undefined ? String(label).trim().toLowerCase() : '';

      return (valStr !== '' && curStr === valStr) || (labelStr !== '' && curStr === labelStr);
    }

    return false;
  }

  handleItemClick(event: MouseEvent, opt: any) {
    event.stopPropagation();
    if (this.isOptionDisabled(opt)) return;
    
    if (opt && typeof opt !== 'string' && opt.onClick) {
      opt.onClick();
    }
    
    if (this.isOpen === undefined && this.variant !== 'multi') {
      this.open = false;
    }
  }
}
