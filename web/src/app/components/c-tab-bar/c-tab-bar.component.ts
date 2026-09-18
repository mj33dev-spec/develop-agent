import { Component, Input, Output, EventEmitter, ContentChildren, QueryList, AfterContentInit, OnChanges, SimpleChanges, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CTabBarItemComponent, CTabBarVariant, CTabBarSize } from '../c-tab-bar-item/c-tab-bar-item.component';
import { Subscription } from 'rxjs';

export type { CTabBarSize } from '../c-tab-bar-item/c-tab-bar-item.component';

@Component({
  selector: 'c-tab-bar',
  standalone: true,
  imports: [CommonModule, CTabBarItemComponent],
  templateUrl: './c-tab-bar.component.html',
  styleUrls: ['./c-tab-bar.component.scss'],
  encapsulation: ViewEncapsulation.None
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
  private itemSubscriptions = new Subscription();

  get containerClass(): string {
    if (this.variant === 'segment') return 'segmentContainer';
    if (this.variant === 'folder') return 'folderContainer';
    return 'baseContainer';
  }

  getOptionValue(option: any): any {
    if (typeof option === 'object' && option !== null && 'value' in option) {
      return option.value;
    }
    return option;
  }

  getOptionLabel(option: any): string {
    if (typeof option === 'object' && option !== null && 'label' in option) {
      return option.label;
    }
    return String(option);
  }

  getOptionCount(option: any): number | undefined {
    if (typeof option === 'object' && option !== null && 'count' in option) {
      return option.count;
    }
    return undefined;
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
    if (changes['value'] || changes['variant'] || changes['size']) {
      this.updateItems();
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.itemSubscriptions.unsubscribe();
  }

  private updateItems() {
    this.itemSubscriptions.unsubscribe();
    this.itemSubscriptions = new Subscription();

    if (this.items) {
      this.items.forEach(item => {
        item.variant = this.variant;
        item.size = this.size;
        item.isActive = item.value === this.value;
        this.itemSubscriptions.add(
          item.selectItem.subscribe((val: any) => this.onItemSelect(val))
        );
      });
    }
  }

  onItemSelect(val: any) {
    if (this.value !== val) {
      this.value = val;
      this.valueChange.emit(this.value);
      this.updateItems();
    }
  }
}
