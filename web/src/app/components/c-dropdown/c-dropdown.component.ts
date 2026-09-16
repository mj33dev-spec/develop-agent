import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
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
  styleUrls: ['./c-dropdown.component.scss']
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

  updatePosition() {
    if (!this.anchorRef || !this.anchorRef.nativeElement) return;
    
    const nativeEl = this.anchorRef.nativeElement;
    const clickableChild = nativeEl.querySelector('.dropdownWrapper') || nativeEl.querySelector('button') || nativeEl;
    const rect = clickableChild.getBoundingClientRect();
    
    const vars: Record<string, string> = {};

    if (this.variant === 'more') {
      vars['--dropdown-min-width'] = '180px';
      vars['--dropdown-width'] = this.width || 'max-content';
    } else {
      vars['--dropdown-width'] = this.width ? this.width : `${rect.width}px`;
    }

    if (this.direction === 'up') {
      vars['--dropdown-bottom'] = `${window.innerHeight - rect.top + 8}px`;
      vars['--dropdown-top'] = 'auto';
    } else {
      vars['--dropdown-top'] = `${rect.bottom + 8}px`;
      vars['--dropdown-bottom'] = 'auto';
    }

    if (this.align === 'right') {
      vars['--dropdown-right'] = `${window.innerWidth - rect.right}px`;
      vars['--dropdown-left'] = 'auto';
    } else {
      vars['--dropdown-left'] = `${rect.left}px`;
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

  isOptionDisabled(opt: any): boolean {
    const label = this.getOptionLabel(opt);
    return (opt && opt.disabled) || this.disabledList.includes(label);
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
