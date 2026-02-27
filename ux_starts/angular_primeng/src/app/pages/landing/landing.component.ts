import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  template: ``,
})
export class LandingComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const target = this.authService.isLoggedIn() ? '/todo' : '/auth';
    this.router.navigateByUrl(target);
  }
}

