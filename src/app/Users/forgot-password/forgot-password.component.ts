import { Component } from '@angular/core';
 
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../Shared/Api/api.service';
 
@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  email: string = '';
  otp: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  passwordsMatch: boolean = false;
 
  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
    private toastr: ToastrService
  ) { }
 
  sendOTP() {
    this.apiService.sendOtp(this.email).subscribe(
      response => {
        console.log(response);
        this.toastr.success("An OTP has been sent to your email address. Please check your email.");
        this.showOTPForm();
      },
      error => {
        console.error('Error sending OTP:', error);
        this.toastr.error("Failed to send OTP. Please check your email ID.");
      }
    );
  }
 
  submitOTP() {
    this.apiService.validateOtp(this.email, this.otp).subscribe(
      response => {
        console.log(response);
        if (response.valid) {
          this.toastr.success("OTP validated successfully. Please set a new password.");
          this.showPasswordForm();
        } else {
          this.toastr.error("Invalid OTP. Please check the OTP and try again.");
          console.error('Invalid OTP');
        }
      },
      error => {
        console.error('Error validating OTP:', error);
        this.toastr.error("Failed to validate OTP. Please try again.");
      }
    );
  }
 
  validatePassword() {
    this.passwordsMatch = this.newPassword === this.confirmPassword && !!this.newPassword;
  }
 
  submitNewPassword() {
    this.apiService.updatePassword(this.email, this.newPassword).subscribe(
      response => {
        console.log(response);
        if (response.success) {
          this.toastr.success("Your password has been updated successfully. You will be redirected to the login page.");
          this.router.navigate(['UsersLogin']);
        } else {
          this.toastr.error("Failed to update password. Please try again.");
        }
      },
      error => {
        console.error('Error updating password:', error);
        this.toastr.error("Failed to update password. Please try again later.");
      }
    );
  }
 
  showOTPForm() {
    const emailForm = document.getElementById('emailForm');
    const otpForm = document.getElementById('otpForm');
    if (emailForm && otpForm) {
      emailForm.style.display = 'none';
      otpForm.style.display = 'block';
    }
  }
 
  showPasswordForm() {
    const otpForm = document.getElementById('otpForm');
    const passwordForm = document.getElementById('passwordForm');
    if (otpForm && passwordForm) {
      otpForm.style.display = 'none';
      passwordForm.style.display = 'block';
    }
  }
}