import { Injectable, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AuthServiceService implements OnInit {
  private readonly AUTH_TOKEN_KEY = 'token';
  private readonly USER_DATA_KEY = 'user_data';

  constructor(private toastr: ToastrService) {}

  ngOnInit() {
    this.startSessionTimer();
  }

  isTokenExpired(): boolean {
    const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
    if (!token) {
      return true;
    }

    const expiry = (JSON.parse(atob(token.split('.')[1]))).exp;
    return (Math.floor((new Date).getTime() / 1000)) >= expiry;
  }

  login(token: string): void {
    localStorage.setItem(this.AUTH_TOKEN_KEY, token);
    this.startSessionTimer();
  }

  getToken(): string | null {
    return localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  logout(): void {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
  }

  getUserData(): any | null {
    const userData = localStorage.getItem(this.USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  startSessionTimer(): void {
    const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
    if (token) {
      const expiry = (JSON.parse(atob(token.split('.')[1]))).exp;
      const now = Math.floor((new Date()).getTime() / 1000);
      const timeRemaining = expiry - now;
      
      // Show alert 30 seconds before expiry
      const alertTime = timeRemaining > 30 ? timeRemaining - 30 : 0;

      if (alertTime > 0) {
        setTimeout(() => {
          this.toastr.warning('Your session will expire in 30 seconds. Please save your work.', 'Session Expiry');
        }, alertTime * 1000);
      }

      // Set logout timer
      setTimeout(() => {
        this.logout();
      }, timeRemaining * 1000);
    }
  }
}
