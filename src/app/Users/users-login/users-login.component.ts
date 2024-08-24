import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../Shared/Api/api.service';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-users-login',
  templateUrl: './users-login.component.html',
  styleUrl: './users-login.component.scss'
})
export class UsersLoginComponent {
  LogInForm: FormGroup | any;
  email: string = '';
  password: string = '';
  loginError: string = '';
  isAuthenticated: boolean = false;
  user: any = {};

  constructor(private formbuilder: FormBuilder, private router: Router, private apiservice: ApiService,private toastr: ToastrService) { }
  public showPassword: boolean = false;
  ngOnInit(): void {
    this.LogInForm = this.formbuilder.group({
      email: new FormControl('', [Validators.required, Validators.email, Validators.nullValidator]),
      password: new FormControl('', [Validators.required, Validators.nullValidator])
    });
  }

  login() {
    if (this.LogInForm.valid) {
      const credentials = { email: this.LogInForm.value.email, password: this.LogInForm.value.password };
      let url = this.apiservice.baseUrl + '/user/userLogin';
      this.apiservice.http.post<any>(url, credentials)
        .subscribe(
          response => {
            if (response.success) {
              localStorage.setItem('token', response.jwttoken);
              this.apiservice.token = response.jwttoken;

              this.router.navigate(['UsersProfile']);
              this.toastr.success("Login Successfully")
            } else {
              this.toastr.error('Invalid email or password. Please try again.');
            }
          },
          error => {
            // console.error('Error during login:', error);
            this.toastr.error('Failed to login. Please try again.');
          }
        );
    } else {
      this.toastr.error('Please fill in all required fields and ensure they are valid.');
    }
  }
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

}
