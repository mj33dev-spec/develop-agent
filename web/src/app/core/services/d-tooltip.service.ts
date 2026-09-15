import { Injectable, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DTooltipService implements OnDestroy {
  private tooltipElement: HTMLDivElement | null = null;
  
  private handleMouseOver = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-tooltip], [data-tooltip-icon]');
    if (target) {
      const text = target.getAttribute('data-tooltip') || target.getAttribute('data-tooltip-icon');
      const align = (target.getAttribute('data-tooltip-align') as 'left' | 'center' | 'right') || 'left';
      const width = target.getAttribute('data-tooltip-width');
      const rect = target.getBoundingClientRect();
      
      if (text) {
        this.showTooltip({
          text,
          align,
          width,
          x: rect.left + rect.width / 2,
          y: rect.top
        });
      }
    }
  };

  private handleMouseOut = () => {
    this.hideTooltip();
  };

  private handleScroll = () => {
    this.hideTooltip();
  };

  init() {
    if (typeof window !== 'undefined') {
      document.addEventListener('mouseover', this.handleMouseOver);
      document.addEventListener('mouseout', this.handleMouseOut);
      window.addEventListener('scroll', this.handleScroll, true);
    }
  }

  private showTooltip(tooltip: { text: string; align: 'left' | 'center' | 'right'; width: string | null; x: number; y: number }) {
    if (!this.tooltipElement) {
      this.tooltipElement = document.createElement('div');
      this.tooltipElement.className = 'globalTooltip';
      document.body.appendChild(this.tooltipElement);
    }
    
    this.tooltipElement.style.left = `${tooltip.x}px`;
    this.tooltipElement.style.top = `${tooltip.y}px`;
    this.tooltipElement.style.textAlign = tooltip.align;
    this.tooltipElement.style.display = 'block';
    
    if (tooltip.width) {
      this.tooltipElement.style.width = tooltip.width;
      this.tooltipElement.style.maxWidth = tooltip.width === 'max-content' ? 'none' : tooltip.width;
      this.tooltipElement.style.whiteSpace = tooltip.width === 'max-content' ? 'nowrap' : 'normal';
    } else {
      this.tooltipElement.style.width = '';
      this.tooltipElement.style.maxWidth = '';
      this.tooltipElement.style.whiteSpace = 'normal';
    }
    
    this.tooltipElement.innerHTML = tooltip.text;
  }

  private hideTooltip() {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      document.removeEventListener('mouseover', this.handleMouseOver);
      document.removeEventListener('mouseout', this.handleMouseOut);
      window.removeEventListener('scroll', this.handleScroll, true);
    }
    if (this.tooltipElement && this.tooltipElement.parentNode) {
      this.tooltipElement.parentNode.removeChild(this.tooltipElement);
      this.tooltipElement = null;
    }
  }
}
