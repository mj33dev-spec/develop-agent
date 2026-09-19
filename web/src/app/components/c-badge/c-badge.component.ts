import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'c-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="badge"
      [class]="customClass"
      [attr.data-size]="size"
      [attr.data-variant]="variant"
    >
      {{ label }}
      <ng-content></ng-content>
    </span>
  `,
  styleUrls: ['./c-badge.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CBadgeComponent {
  @Input() label: string = '';
  @Input() variant: BadgeVariant = 'neutral';
  @Input() size: BadgeSize = 'md';
  @Input() customClass: string = '';
}
