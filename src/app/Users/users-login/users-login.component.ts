import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../Shared/Api/api.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-users-login',
  templateUrl: './users-login.component.html',
  styleUrls: ['./users-login.component.scss'] // Fixed property name 'styleUrl' to 'styleUrls'
})
export class UsersLoginComponent implements OnInit { // Implement OnInit interface
  LogInForm: FormGroup | any;
  email: string = '';
  password: string = '';
  loginError: string = '';
  isAuthenticated: boolean = false;
  isAdmin: boolean = false; // Property to determine if the user is an admin
  user: any = {};

  constructor(
    private formbuilder: FormBuilder,
    private router: Router,
    private apiservice: ApiService,
    private toastr: ToastrService
  ) { }

  public showPassword: boolean = false;

  ngOnInit(): void {
    this.LogInForm = this.formbuilder.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(/([a-zA-Z0-9]+)([\_\.\-{1}])?([a-zA-Z0-9]+)\@([a-zA-Z0-9]+)([\.])([a-zA-Z\.]+)/g)]],
      password: new FormControl('', [Validators.required, Validators.nullValidator])
    });
  }

  login() {
    const credentials = this.LogInForm.value;
  
    this.checkAdmin(credentials.email).subscribe(
      adminResponse => {
        if (adminResponse && adminResponse.isAdmin) {
          this.apiservice.isAdmin = true; // Set admin status
          this.performAdminLogin(credentials); // Redirect to Admin Dashboard
        } else {
          this.apiservice.isAdmin = false; // Set as regular user
          this.performUserLogin(credentials); // Redirect to User Dashboard
        }
      },
      error => {
        this.toastr.error('Error checking admin status. Please try again.');
        console.error('Check admin error:', error);
      }
    );
  }
  
  

  // Ensure this method is defined in the class
  performUserLogin(credentials: { email: string; password: string }) {
    this.apiservice.http.post<any>(`${this.apiservice.baseUrl}/user/userLogin`, credentials).subscribe(
      response => {
        if (response.success) {
          localStorage.setItem('token', response.jwttoken);
          this.apiservice.token = response.jwttoken;
          this.router.navigate(['UsersProfile']); // Redirect as needed
          this.toastr.success("Login successful");
        } else {
          this.toastr.error('Invalid email or password.');
        }
      },
      error => {
        this.toastr.error('Failed to login. Please try again.');
        console.error('User login error:', error);
      }
    );
  }

  
performAdminLogin(credentials: { email: string; password: string }) {
    this.apiservice.http.post<any>(`${this.apiservice.baseUrl}/admin/adminLogin`, credentials).subscribe(
        response => {
            if (response.success) {
                localStorage.setItem('token', response.jwttoken);
                this.apiservice.token = response.jwttoken;
                this.router.navigate(['AdminDashboard']); // Redirect or navigate as needed
                this.toastr.success("Admin login successful");
            } else {
                this.toastr.error('Invalid email or password for admin.');
            }
        },
        error => {
            this.toastr.error('Failed to login as admin. Please try again.');
            console.error('Admin login error:', error);
        }
    );
}


  checkAdmin(email: string) {
    const adminCheckUrl = `${this.apiservice.baseUrl}/admin/checkAdmin`;
    return this.apiservice.http.post<any>(adminCheckUrl, { email });
  }
}
