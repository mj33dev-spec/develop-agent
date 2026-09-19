import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'c-modal-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './c-modal-sidebar.component.html',
  styleUrl: './c-modal-sidebar.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class CModalSidebarComponent {}
