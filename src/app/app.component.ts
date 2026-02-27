import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ThemeService } from './services/theme.service';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  isPopout = false;
  windowTitle = 'What Is Done';

  constructor(
    private themeService: ThemeService,
    private router: Router,
    private titleService: Title
  ) { }

  ngOnInit() {
    this.themeService.init();
    this.updateInitialState();

    // Set initial title from document
    setTimeout(() => {
      this.windowTitle = this.titleService.getTitle();
    }, 0);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateSidebarVisibility();
      // Wait for TitleStrategy to finish updating the document title
      setTimeout(() => {
        this.windowTitle = this.titleService.getTitle();
      }, 0);
    });
  }

  private updateInitialState() {
    this.isPopout = window.location.hash.includes('popout=1') || window.location.search.includes('popout=1');
    this.updateSidebarVisibility();
  }

  private updateSidebarVisibility() {
    const url = this.router.url;
    const isSpecialView = url.includes('plan-editor') || url.includes('mermaid-builder') || url.includes('work-process-runner') || url.includes('ux-design-runner');
    this.isPopout = window.location.hash.includes('popout=1') || window.location.search.includes('popout=1') || isSpecialView;
  }
}
