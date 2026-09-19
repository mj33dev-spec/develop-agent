import { Component, Input, HostBinding, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'c-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: '',
  styleUrls: ['./c-skeleton.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CSkeletonComponent {
  @Input() width: string | number = '100%';
  @Input() height: string | number = '100%';
  @Input() circle: boolean = false;

  @HostBinding('class.skeleton') readonly isSkeleton = true;

  @HostBinding('class.circle')
  get isCircle() {
    return this.circle;
  }

  @HostBinding('style.width')
  get styleWidth() {
    return typeof this.width === 'number' ? `${this.width}px` : this.width;
  }

  @HostBinding('style.height')
  get styleHeight() {
    return typeof this.height === 'number' ? `${this.height}px` : this.height;
  }
}
