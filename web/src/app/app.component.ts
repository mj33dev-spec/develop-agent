import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DTooltipService } from './core/services/d-tooltip.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }
  `]
})
export class AppComponent implements OnInit {
  private tooltipService = inject(DTooltipService);

  ngOnInit() {
    this.tooltipService.init();
  }
}
