import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostBinding, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CPanelDirection = 'top' | 'right' | 'bottom' | 'left';

@Component({
  selector: 'c-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="shouldRender" class="panelOverlay" [class.active]="animate" (click)="handleOverlayClick($event)">
      <div 
        class="panelContent" 
        [ngClass]="[direction]" 
        [class.active]="animate" 
        [style.width]="widthStyle"
        [style.height]="heightStyle"
        [style.maxWidth]="maxWidthStyle"
        [style.maxHeight]="maxHeightStyle"
        (click)="$event.stopPropagation()"
      >
        <div class="panelHeader">
          <h2 *ngIf="title" class="panelTitle">{{ title }}</h2>
          <button type="button" (click)="onClose.emit()" class="closeBtn" aria-label="Close panel">
            ✕
          </button>
        </div>

        <div class="panelBody">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./c-panel.component.scss']
})
export class CPanelComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() title?: string;
  @Input() direction: CPanelDirection = 'right';
  @Input() size?: string;

  @Output() onClose = new EventEmitter<void>();

  isRetained = false;
  hasEntered = false;
  private readonly PANEL_TRANSITION_DURATION_MS = 300;

  get shouldRender(): boolean {
    return this.isOpen || this.isRetained;
  }

  get animate(): boolean {
    return this.isOpen && this.hasEntered;
  }

  get widthStyle(): string | null {
    if (this.size && (this.direction === 'left' || this.direction === 'right')) {
      return this.size;
    }
    return null;
  }

  get maxWidthStyle(): string | null {
    if (this.size && (this.direction === 'left' || this.direction === 'right')) {
      return '100vw';
    }
    return null;
  }

  get heightStyle(): string | null {
    if (this.size && (this.direction === 'top' || this.direction === 'bottom')) {
      return this.size;
    }
    return null;
  }

  get maxHeightStyle(): string | null {
    if (this.size && (this.direction === 'top' || this.direction === 'bottom')) {
      return '100vh';
    }
    return null;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        window.requestAnimationFrame(() => {
          this.isRetained = true;
          this.hasEntered = true;
        });
      } else {
        window.requestAnimationFrame(() => this.hasEntered = false);
        setTimeout(() => {
          this.isRetained = false;
        }, this.PANEL_TRANSITION_DURATION_MS);
      }
    }
  }

  handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.onClose.emit();
    }
  }
}
