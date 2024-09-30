import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Admin } from '../Model/admin';
 
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3001/api';
  public adminData!: Admin;
  public token: string = '';
  isAuthenticated!: boolean;

 
  constructor(private http: HttpClient) { }
 
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/user/getAllUsers`);
  }
 
  getAllSubscriptions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/subscription/getAllSubscription`);
  }
 
  getAllPermissible(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/nocas/getAllPermissible`);
  }
 
 
  getAllOfServices(): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:3001/api/request/getAllServiceRequest`);
  }
  // Function to clear user data and token
  clearUserData(): void {
    this.adminData = {} as Admin;
    this.token = '';
    this.isAuthenticated = false;
    localStorage.removeItem('token');
    localStorage.removeItem('adminData');
    

  }
}