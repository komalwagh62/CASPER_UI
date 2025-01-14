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
    console.log(`Sending OTP ${this.generatedOTP} to mobile number: ${phone}`);
    
    this.http.get(smsApiUrl, { responseType: 'text' }).subscribe(
      (response: any) => {
        // Log the API response
       
          this.toastr.success('OTP sent successfully', 'Success');
    
          // Log the generated OTP for debugging
          console.log(`Generated OTP: ${this.generatedOTP}`);
    
          // Assuming you have a form control for OTP
          const enteredOtp = this.SignupForm.get('otp').value;
    
          // Check if the entered OTP matches the generated OTP
          if (enteredOtp === this.generatedOTP) {
            console.log('OTP verification successful');
            // Proceed with the next steps
          } else {
            console.log('OTP does not match');
            // Handle the mismatch, e.g., show an error message
            this.toastr.error('Invalid OTP entered. Please try again.', 'Error');
          }
        }
      
    
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
    // First, check if the form is valid
    if (this.SignupForm.invalid) {
      return;
    }
  
    // Extract the phone number and entered OTP
    const phoneNumber = this.SignupForm.get('phone_number').value;
    const enteredOtp = this.SignupForm.get('otp').value;
  
    // Check if the entered OTP matches the generated OTP
    if (enteredOtp !== this.generatedOTP) {
      this.toastr.error('Invalid OTP entered. Please try again.', 'Error');
      return; // Prevent registration
    }
  
    // Check if the phone number already exists
    this.apiService.checkPhoneNumberExists(phoneNumber).subscribe(
      (exists: boolean) => {
        console.log("Phone number exists:", exists);
        if (exists) {
          this.toastr.error('This mobile number is already registered.', 'Error');
        } else {
          // Proceed with user registration if phone number does not exist
          const userData = this.SignupForm.value;
  
          // Call your API to register the user
          this.apiService.createUser(userData).subscribe(
            (response: any) => {
              // Handle successful registration response
              console.log('User registered successfully', response);
              this.toastr.success('Registration successful!', 'Success');
              this.router.navigate(['UsersLogin']);
              // Navigate to login or another page if needed
            },
            (error: any) => {
              // Handle registration error
              console.error('Registration failed', error);
              this.toastr.error('Registration failed. Please try again.', 'Error');
            }
          );
        }
      },
      (error: any) => {
        // Handle error in checking phone number existence
        console.error('Error checking phone number', error);
        this.toastr.error('Error checking phone number. Please try again.', 'Error');
      }
    );
  }
  
  


}
