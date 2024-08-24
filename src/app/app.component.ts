import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from './Users/Shared/Api/api.service';
import { AuthServiceService } from './Users/Shared/Api/auth-service.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private router: Router, private apiService: ApiService,private authService: AuthServiceService) {}

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (event.urlAfterRedirects === '/UsersLogin') {
          this.apiService.clearUserData();
        }
      }
    });
  }
}
