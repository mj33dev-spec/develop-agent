import { Component, Input, Output, EventEmitter, ContentChildren, QueryList, AfterContentInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CTabBarItemComponent, CTabBarVariant } from '../c-tab-bar-item/c-tab-bar-item.component';
import { Subscription } from 'rxjs';

export type CTabBarSize = 'small' | 'basic' | 'large';

@Component({
  selector: 'c-tab-bar',
  standalone: true,
  imports: [CommonModule, CTabBarItemComponent],
  template: `
    <div [class]="containerClass" [class]="customClass" [attr.data-size]="size">
      <!-- Options based rendering -->
      <ng-container *ngIf="options && options.length > 0">
        <c-tab-bar-item
          *ngFor="let option of options"
          [value]="option.value !== undefined ? option.value : option"
          [count]="option.count"
          (selectItem)="onItemSelect($event)"
        >
          {{ option.label !== undefined ? option.label : option }}
        </c-tab-bar-item>
      </ng-container>

      <!-- Content projection rendering -->
      <ng-content></ng-content>
    </div>
  `,
  styleUrls: ['./c-tab-bar.component.scss']
})
export class CTabBarComponent implements AfterContentInit, OnChanges, OnDestroy {
  @Input() variant: CTabBarVariant = 'base';
  @Input() size: CTabBarSize = 'basic';
  @Input() value: any;
  @Input() options?: any[];
  @Input() customClass: string = '';

  @Output() valueChange = new EventEmitter<any>();

  @ContentChildren(CTabBarItemComponent) items!: QueryList<CTabBarItemComponent>;
  
  private subscription = new Subscription();

  get containerClass(): string {
    if (this.variant === 'segment') return 'segmentContainer';
    if (this.variant === 'folder') return 'folderContainer';
    return 'baseContainer';
  }

  ngAfterContentInit() {
    this.updateItems();
    this.subscription.add(
      this.items.changes.subscribe(() => {
        this.updateItems();
      })
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] || changes['variant']) {
      this.updateItems();
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private updateItems() {
    if (this.items) {
      this.items.forEach(item => {
        item.variant = this.variant;
        item.isActive = item.value === this.value;
        // Listen to projection item clicks if not already bound
        // Note: It's better to let CTabBarItemComponent emit selectItem and handle it there.
        // We can subscribe to each item's selectItem emitter.
        item.selectItem.subscribe((val: any) => this.onItemSelect(val));
      });
    }
  }

  onItemSelect(val: any) {
    if (this.value !== val) {
      this.value = val;
      this.valueChange.emit(this.value);
      this.updateItems(); // Update active states manually
    }
  }
}
