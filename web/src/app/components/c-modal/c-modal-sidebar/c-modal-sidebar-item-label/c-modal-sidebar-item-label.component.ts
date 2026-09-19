import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'c-modal-sidebar-item-label',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './c-modal-sidebar-item-label.component.html',
  styleUrl: './c-modal-sidebar-item-label.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class CModalSidebarItemLabelComponent {
  @Input() icon?: string;
  @Input() label: string = '';
  @Input() active: boolean = false;
  @Input() disabled: boolean = false;

  @Output() onClick = new EventEmitter<MouseEvent>();

  handleClick(event: MouseEvent) {
    if (!this.disabled) {
      this.onClick.emit(event);
    }
  }
}
