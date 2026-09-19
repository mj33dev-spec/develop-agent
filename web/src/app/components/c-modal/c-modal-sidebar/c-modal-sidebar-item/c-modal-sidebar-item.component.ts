import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'c-modal-sidebar-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './c-modal-sidebar-item.component.html',
  styleUrl: './c-modal-sidebar-item.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class CModalSidebarItemComponent {
  @Input() label: string = '';
}
