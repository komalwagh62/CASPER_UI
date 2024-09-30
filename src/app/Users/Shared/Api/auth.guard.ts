import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthServiceService } from './auth-service.service'; // Ensure you have an AuthService to manage authentication logic

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthServiceService, private router: Router) { }

  canActivate(): boolean {
    if (this.authService.isTokenExpired()) {
      alert("Session Expired.....Please Login")
      this.router.navigate(['UsersLogin']);
      return false;
    }
    return true;
  }
}
