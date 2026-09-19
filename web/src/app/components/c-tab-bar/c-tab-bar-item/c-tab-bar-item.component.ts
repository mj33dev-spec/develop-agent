import { Component, Input, HostListener, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CTabBarVariant = 'base' | 'segment' | 'folder';
export type CTabBarSize = 'small' | 'basic' | 'large';

@Component({
  selector: 'c-tab-bar-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      [class]="btnClass"
      [class.active]="isActive"
      [attr.data-size]="size"
    >
      <ng-content></ng-content>
      <span *ngIf="count !== undefined && count !== null" class="count">{{ count }}</span>
    </button>
  `,
  styleUrls: ['./c-tab-bar-item.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CTabBarItemComponent {
  @Input() value: any;
  @Input() count?: number;
  @Input() variant: CTabBarVariant = 'base';
  @Input() size: CTabBarSize = 'basic';
  @Input() isActive: boolean = false;

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
