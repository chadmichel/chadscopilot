import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ThemeService } from './services/theme.service';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  isPopout = false;

  constructor(private themeService: ThemeService, private router: Router) { }

  ngOnInit() {
    this.themeService.init();
    this.updateInitialState();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateSidebarVisibility();
    });
  }

  private updateInitialState() {
    this.isPopout = window.location.hash.includes('popout=1') || window.location.search.includes('popout=1');
    this.updateSidebarVisibility();
  }

  private updateSidebarVisibility() {
    const url = this.router.url;
    const isSpecialView = url.includes('plan-editor') || url.includes('mermaid-builder');
    this.isPopout = window.location.hash.includes('popout=1') || window.location.search.includes('popout=1') || isSpecialView;
  }
}
