import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../Shared/Api/api.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr'; // Import ToastrService
import Swal from 'sweetalert2';
@Component({
  selector: 'app-usersrequest-service',
  templateUrl: './usersrequest-service.component.html',
  styleUrls: ['./usersrequest-service.component.scss']
})
export class UsersrequestServiceComponent implements OnInit {
  requestForm!: FormGroup;
  user: any = {};
  updatedUser: any = {};
 
  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private router: Router,
    private toastr: ToastrService // Inject ToastrService
  ) {}
 
  ngOnInit(): void {
    this.requestForm = this.formBuilder.group({
      service1: [false],
      service2: [false],
      service3: [false],
      service4: [false],
      service5: [false],
      service6: [false]
    });
   
 
    this.getUserDetails();
  }
 
  createRequest() {
    if (this.requestForm.valid) {
      (this.requestForm.value);  // Check the form values here
      const requestData = {
        services: JSON.stringify(this.requestForm.value),
        user_id: this.apiService.userData.id
      };
      this.apiService.createRequest(requestData).subscribe(
        (result) => {
          Swal.fire({
            title: 'Success!',
            text: `We have noted your request. Our team will contact you within 1 working day.`,
            icon: 'success',
            confirmButtonText: 'OK'
          });
        },
        (error) => {
          console.error("Error creating request:", error);
          this.toastr.error("Error creating request");
        }
      );
    } else {
      this.toastr.warning('Please select a service.');
    }
  }
 
 
  getUserDetails(): void {
    this.apiService.getUserDetails().subscribe(
      response => {
        this.apiService.userData = response;
        this.updatedUser = response;
        this.user = response;
        localStorage.setItem('user', JSON.stringify(response));
      },
      error => {
        console.error("Failed to fetch user details:", error);
        this.toastr.error("Failed to fetch user details. Please log in again.");
        this.router.navigate(['UsersLogin']);
      }
    );
  }
}