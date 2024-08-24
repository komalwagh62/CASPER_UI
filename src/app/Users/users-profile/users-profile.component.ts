import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../Shared/Api/api.service';
import { ToastrService } from 'ngx-toastr';
 
@Component({
  selector: 'app-users-profile',
  templateUrl: './users-profile.component.html',
  styleUrls: ['./users-profile.component.scss']
})
export class UsersProfileComponent implements OnInit {
  user: any = {};
  updatedUser: any = {};
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  passwordsMatch: boolean = false;
  imageUrl: string = '';
  imageName: string = '';
  selectedFile: File | undefined;
  airports: any[] = [];
 
  constructor(
    private route: ActivatedRoute,
    public apiservice: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {}
 
  ngOnInit(): void {
    this.getUserDetails();
  }
 
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    this.selectedFile = file;
    this.imageName = file.name;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (_event) => {
      this.imageUrl = reader.result as string;
    };
  }
 
  saveChanges(): void {
    this.apiservice.updateUserProfile(this.updatedUser).subscribe({
      next: (response) => {
        this.apiservice.parseUserData(response.updatedUser);
        this.updatedUser = { ...response.updatedUser };
        this.user = { ...response.updatedUser };
        this.toastr.success(response.message);
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.toastr.error('Failed to update profile. Please try again.');
      }
    });
  }
 
  logout() {
    this.router.navigate(['UserLogin']);
  }
 
  navigateToProfile() {
    this.router.navigate(['users-profile']);
  }
 
  getUserDetails(): void {
    this.apiservice.getUserDetails().subscribe({
      next: (response) => {
        this.apiservice.parseUserData(response);
        this.updatedUser = { ...response };
        this.user = { ...response };
      },
      error: (error) => {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        this.cdr.detectChanges();
        this.toastr.error("Failed to retrieve profile. Please login again.");
        this.router.navigate(['UsersLogin']);
      }
    });
  }
 
  validatePassword() {
    this.passwordsMatch = this.newPassword === this.confirmPassword && !!this.newPassword;
  }
 
  changePassword(): void {
    if (!this.passwordsMatch) {
      this.toastr.warning("Passwords do not match.");
      return;
    }
 
    const passwordData = {
      currentPassword: this.currentPassword,
      newPassword: this.confirmPassword
    };
 
    this.apiservice.changeUserPassword(passwordData).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
      },
      error: (error) => {
        this.toastr.error('Failed to change password. Please try again.');
      }
    });
  }
}