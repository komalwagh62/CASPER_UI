import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../Shared/Api/api.service';

@Component({
  selector: 'app-users-side-nav',
  templateUrl: './users-side-nav.component.html',
  styleUrl: './users-side-nav.component.scss'
})
export class UsersSideNavComponent {
  isloggedIn: boolean = false
  currentRoute!: string;
  constructor(private router: Router, public apiService: ApiService) {
    this.isloggedIn = !!this.apiService.token

  }

  logout() {
    this.apiService.userData.uname = "";
    this.apiService.token = "";
    this.apiService.isAuthenticated = false;
    this.apiService.userData.id = "";
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    this.router.navigate(['UsersLogin']);
  }
  navigateToProfile() {
    this.router.navigate(['UsersProfile']);
  }
}

