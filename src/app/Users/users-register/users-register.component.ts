import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../Shared/Api/api.service';
import { Observable } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';


@Component({
  selector: 'app-users-register',
  templateUrl: './users-register.component.html',
  styleUrls: ['./users-register.component.scss']
})
export class UsersRegisterComponent implements OnInit {
  SignupForm: FormGroup | any;
  otpSent: boolean = false;
  public showPassword: boolean = false;
  generatedOTP: string | undefined;

  constructor(
    private apiService: ApiService, // Inject ApiService
    private formBuilder: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.SignupForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(/([a-zA-Z0-9]+)([\_\.\-{1}])?([a-zA-Z0-9]+)\@([a-zA-Z0-9]+)([\.])([a-zA-Z\.]+)/g)]],
      phone_number: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10), Validators.pattern(/^[6789]\d{9}$/)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)]],
      otp: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      uname: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s]+$/)]],
      address: ['', [Validators.required]],
    });
  }
  

  onOtpKeyPress(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  onNameInput(event: any): void {
    const input = event.target.value;
    const regex = /^[a-zA-Z\s]*$/;
    if (!regex.test(input)) {
      event.target.value = input.replace(/[^a-zA-Z\s]/g, '');
    }
  }

  onPhoneNumberKeyPress(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  generateOTP() {
    // Generate a 4-digit OTP
    this.generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();

    // API credentials and details
    const user = 'Cognitive_Navigation';
    const pass = 'CognitiveSms2024$';
    const sender = 'CNPLAS';
    const phone = this.SignupForm.value.phone_number;
    const priority = 'ndnd';
    const stype = 'normal';
 
    // Construct the message text
    const text = `Your Registration OTP is ${this.generatedOTP}. Please do not share this code with anyone. To know more, visit www.cognitivenavigation.com.\n\nBy - Cognitive Navigation`;

    // Encode the text for URL
    const encodedText = encodeURIComponent(text);

    // Construct the API URL
    const smsApiUrl = `https://bhashsms.com/api/sendmsg.php?user=${user}&pass=${pass}&sender=${sender}&phone=${phone}&text=${encodedText}&priority=${priority}&stype=${stype}`;

    this.http.get(smsApiUrl, { responseType: 'text' }).subscribe(
      (response: any) => {
        // Log the API response
        if (response.includes("SOME_ERROR_MESSAGE") || response.includes("error")) { // Check for any error message in the response
          // this.toastr.error("Failed to send OTP: " + response, 'Error');
        } else {
          this.toastr.success('OTP sent successfully', 'Success');
        }
      },
      
    );
   
}


  regenerateOtp() {
    const phoneNumberControl = this.SignupForm.get('phone_number');
    if (phoneNumberControl && phoneNumberControl.valid) {
      this.generateOTP();
      this.otpSent = true;
    } else {
      this.otpSent = false;
      this.toastr.error('Please enter a valid phone number', 'Error');
    }
  }

  onPhoneNumberChange() {
    const phoneNumberControl = this.SignupForm.get('phone_number');
    if (phoneNumberControl && phoneNumberControl.valid) {
      // Check if the phone number already exists
      this.apiService.checkPhoneNumberExists(phoneNumberControl.value).subscribe(
        (exists: boolean) => {
          if (exists) {
            // Phone number already exists, show error
            this.otpSent = false;
            this.toastr.error('This mobile number is already registered.', 'Error');
          } else {
            // Phone number is valid and does not exist, generate OTP
            this.generateOTP();
            this.otpSent = true;
          }
        },
        (error: any) => {
          // Handle error from the API call
          console.error("Error checking phone number:", error);
          this.toastr.error('There was an error verifying the phone number. Please try again.', 'Error');
        }
      );
    } else {
      this.otpSent = false;
      this.toastr.error('Please enter a valid phone number', 'Error');
    }
  }


  validateOtpAndRegister() {
    const enteredOtp = this.SignupForm.get('otp').value;
    if (enteredOtp === this.generatedOTP) {
      this.createUser();
    } else {
      this.toastr.error('Invalid OTP. Please try again.', 'Error');
    }
  }



  createUser() {
    if (this.SignupForm.valid) {
      const phoneNumber = this.SignupForm.value.phone_number;

      this.apiService.checkPhoneNumberExists(phoneNumber).subscribe(
        (exists: boolean) => {
          console.log("Phone number exists:", exists);
          if (exists) {
            this.toastr.error('This mobile number is already registered.', 'Error');
          } else {
            this.apiService.createUser({
              uname: this.SignupForm.value.uname,
              phone_number: phoneNumber,
              address: this.SignupForm.value.address,
              email: this.SignupForm.value.email,
              password: this.SignupForm.value.password
            }).subscribe(
              (resultData: any) => {
                console.log("User registration response:", resultData);
                this.toastr.success('User registered successfully', 'Success');
                this.router.navigate(['UsersLogin']);
              },
              (error: any) => {
                console.error("Error registering user:", error);
                this.toastr.error(error.error.message, 'Error');
              }
            );
          }
        },
        (error: any) => {
          console.error("Error checking phone number:", error);
          this.toastr.error('There was an error verifying the phone number. Please try again.', 'Error');
        }
      );
    } else {
      this.toastr.error('Please fill in all required fields and ensure they are valid.', 'Error');
    }
  }



}
