import { Component, Input, HostListener, Output, EventEmitter, Optional, Inject, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CTabBarVariant = 'base' | 'segment' | 'folder';

@Component({
  selector: 'c-tab-bar-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      [class]="btnClass"
      [class.active]="isActive"
    >
      <ng-content></ng-content>
      <span *ngIf="count !== undefined" class="count">{{ count }}</span>
    </button>
  `,
  styleUrls: ['./c-tab-bar-item.component.scss']
})
export class CTabBarItemComponent {
  @Input() value: any;
  @Input() count?: number;
  
  // Injected by parent CTabBarComponent
  variant: CTabBarVariant = 'base';
  isActive: boolean = false;

  @Output() selectItem = new EventEmitter<any>();

  get btnClass(): string {
    if (this.variant === 'segment') return 'segmentBtn';
    if (this.variant === 'folder') return 'folderBtn';
    return 'baseBtn';
  }

  @HostListener('click')
  onClick() {
    this.selectItem.emit(this.value);
  }
}
