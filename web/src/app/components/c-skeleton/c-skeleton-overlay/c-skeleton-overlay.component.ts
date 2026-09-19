import { Component, Input, OnChanges, SimpleChanges, HostBinding, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'c-skeleton-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="overlay"
      [class.hidden]="!show"
      [style.transitionDuration]="duration + 'ms'"
    >
      <ng-content></ng-content>
    </div>
  `,
  styleUrls: ['./c-skeleton-overlay.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CSkeletonOverlayComponent implements OnChanges {
  @Input() show: boolean = false;
  @Input() duration: number = 400;

  isRetained = false;
  
  @HostBinding('style.display')
  get display() {
    return (this.show || this.isRetained) ? 'block' : 'none';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['show']) {
      if (this.show) {
        window.requestAnimationFrame(() => this.isRetained = true);
      } else {
        setTimeout(() => this.isRetained = false, this.duration);
      }
    }
  }
}
