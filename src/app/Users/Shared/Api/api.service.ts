import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { User } from '../Model/users/users';
import { Airport } from '../Model/users/airport';
import { Subscription } from '../Model/subscription';
import { Nocas } from '../Model/nocas';
import { UsersPricingPlansComponent } from '../../users-pricing-plans/users-pricing-plans.component';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  [x: string]: any;
  isAuthenticated: boolean = false;
  public baseUrl: string = 'http://ec2-13-58-174-214.us-east-2.compute.amazonaws.com:8082/api';
  // public baseUrl: string = 'http://localhost:3001/api';
  public loginUserId: string = '';
  public userData!: User;
  public token: string = '';
  public airportData!: Airport;
  public subscriptionData!: Subscription;
  public nocasData!: Nocas;
  public handlePayment!: UsersPricingPlansComponent;

  constructor(public http: HttpClient) {
    this.loadFromLocalStorage();
  }

  sendOtp(email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/otp/sendOtp`, { email });
  }

  validateOtp(email: string, otp: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/otp/validateOtp`, { email, otp });
  }

  updatePassword(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/user/updatePassword`, { email, password });
  }

  getSubscriptions(userId: string): Observable<any[]> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
    return this.http.get<any[]>(`${this.baseUrl}/subscription/getAllsubscriptions?user_id=${userId}`, { headers });
  }

  private createAuthHeaders(): HttpHeaders {
    return new HttpHeaders().set("Authorization", `Bearer ${this.token}`);
  }

  getSubscriptionDetails(user_id: string): Observable<any[]> {
    const headers = this.createAuthHeaders();
    return this.http.get<any[]>(`${this.baseUrl}/subscription/getAllsubscriptions?user_id=${user_id}`, { headers });
  }

  getServiceDetails(user_id: string): Observable<any[]> {
    const headers = this.createAuthHeaders();
    return this.http.get<any[]>(`${this.baseUrl}/request/getAllService?user_id=${user_id}`, { headers });
  }

  getPermissibleDetails(user_id: string): Observable<any[]> {
    const headers = this.createAuthHeaders();
    return this.http.get<any[]>(`${this.baseUrl}/nocas/getAllNocasData?user_id=${user_id}`, { headers });
  }

  // Method to get user details
  getUserDetails(): Observable<any> {
    const headers = new HttpHeaders().set("Authorization", `Bearer ${this.token}`);
    return this.http.post<any>(`${this.baseUrl}/user/myProfile`, {}, { headers });
  }

  // Add Subscription
  addSubscription(subscriptionData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/subscription/addSubscription`, subscriptionData, {
      headers: new HttpHeaders().set("Authorization", `Bearer ${this.token}`)
    });
  }

  // Method to update user profile
  updateUserProfile(updatedUser: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/user/updateUser`, updatedUser);
  }

  // // Generate OTP
  // generateOtp(phoneNumber: string): Observable<any> {
  //   const smsApiUrl = `http://bhashsms.com/api/sendmsg.php?user=Cognitive_Navigation&CognitiveSms2024#$&sender=CNPLAS&phone=${phoneNumber}&text=Your%20Registration%20OTP%20is%20{otp}.%20Please%20do%20not%20share%20this%20code%20with%20anyone.%20To%20know%20more%20visit%20-%20www.cognitivenavigation.com%20%20By%20-%20Cognitive%20Navigation&priority=ndnd&stype=normal`;
  //   return this.http.get(smsApiUrl);
  // }

  // Create User
  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/createUser`, userData);
  }

  saveScreenshot(formData: FormData) {
    return this.http.post(`${this.baseUrl}/nocas/save-screenshot`, formData);
  }

  createNocas(requestBody: any) { const headers = new HttpHeaders().set("Authorization", `Bearer ${this.token}`); return this.http.post(`${this.baseUrl}/nocas/createNocas`, requestBody, { headers }); }

  fetchAirports(): Observable<any> {     return this.http.get<any>(`${this.baseUrl}/airports`); }

  checkPhoneNumberExists(phone_number: string): Observable<boolean> {
    return this.http.post<{ exists: boolean }>(`${this.baseUrl}/user/check-phone-number`, { phone_number })
      .pipe(map(response => response.exists));
  }

  // Create Request
  createRequest(requestData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/request/createRequest`, requestData, {
      headers: new HttpHeaders().set("Authorization", `Bearer ${this.token}`)
    });
  }



  // Method to change user password
  changeUserPassword(passwordData: { currentPassword: string, newPassword: string }): Observable<any> {
    const headers = new HttpHeaders().set("Authorization", `Bearer ${this.token}`);
    return this.http.post<any>(`${this.baseUrl}/user/changePassword`, passwordData, { headers });
  }

  private loadFromLocalStorage(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.token = token;
    }
    const userData = localStorage.getItem('userData');
    if (userData) {
      this.userData = JSON.parse(userData);
    }
  }

  // Function to parse user data
  public parseUserData(userData: any): void {
    this.userData = userData;
    localStorage.setItem('userData', JSON.stringify(userData));
  }

  // Function to clear user data and token
  clearUserData(): void {
    this.userData = {} as User;
    this.token = '';
    this.isAuthenticated = false;
    localStorage.removeItem('token');
    localStorage.removeItem('userData');

  }
}