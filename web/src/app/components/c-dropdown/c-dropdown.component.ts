import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CButtonComponent } from '../c-button/c-button.component';

export interface CDropdownOption {
  label?: string;
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'divider' | 'item';
  value?: any; // Added for Angular template tracking if needed
}

export type CDropdownVariant = 'outlined' | 'fill' | 'more' | 'multi';

@Component({
  selector: 'c-dropdown',
  standalone: true,
  imports: [CommonModule, CButtonComponent],
  templateUrl: './c-dropdown.component.html',
  styleUrls: ['./c-dropdown.component.scss']
})
export class CDropdownComponent implements AfterViewInit, OnChanges {
  @Input() variant: CDropdownVariant = 'outlined';
  @Input() direction: 'up' | 'down' = 'down';
  @Input() align: 'left' | 'right' = 'left';
  @Input() options: (CDropdownOption | string)[] = [];
  @Input() value?: string;
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
  dropdownStyle: Record<string, string> = {
    position: 'fixed',
    zIndex: '1000'
  };

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
      setTimeout(() => this.updatePosition(), 0);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      setTimeout(() => this.updatePosition(), 0);
    }
  }

  ngAfterViewInit() {
    if (this.open) {
      this.updatePosition();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.handleScrollOrResize();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.handleScrollOrResize();
  }

  private handleScrollOrResize() {
    if (this.open) {
      this.updatePosition();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open && this.isOpen === undefined) {
      // If click is outside this component, close it
      if (!this.elementRef.nativeElement.contains(event.target)) {
        this.open = false;
      }
    }
  }

  updatePosition() {
    if (!this.anchorRef || !this.anchorRef.nativeElement) return;
    
    const rect = this.anchorRef.nativeElement.getBoundingClientRect();
    
    if (this.variant === 'more') {
      this.dropdownStyle['minWidth'] = '180px';
      this.dropdownStyle['width'] = this.width || 'max-content';
    } else {
      this.dropdownStyle['width'] = this.width ? this.width : `${rect.width}px`;
    }

    if (this.direction === 'up') {
      this.dropdownStyle['bottom'] = `${window.innerHeight - rect.top + 8}px`;
      this.dropdownStyle['top'] = 'auto';
    } else {
      this.dropdownStyle['top'] = `${rect.bottom + 8}px`;
      this.dropdownStyle['bottom'] = 'auto';
    }

    if (this.align === 'right') {
      this.dropdownStyle['right'] = `${window.innerWidth - rect.right}px`;
      this.dropdownStyle['left'] = 'auto';
    } else {
      this.dropdownStyle['left'] = `${rect.left}px`;
      this.dropdownStyle['right'] = 'auto';
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
