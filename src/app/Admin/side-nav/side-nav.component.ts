import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../Service/api.service';
import { MatMenuModule } from '@angular/material/menu';

import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-side-nav',
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss']
})
export class SideNavComponent {
  isloggedIn: boolean = false;
  currentRoute!: string;
  adminData: { name?: string } = {}; // Use optional chaining if name might not exist

  @ViewChild('drawer') drawer!: MatSidenav;

  constructor(private router: Router, public apiService: ApiService) {
    // Set isloggedIn based on the token when the component is initialized
    this.isloggedIn = !!this.apiService.token;
  }


  logout() {
    // Clear user data and token
  
    this.apiService.clearUserData(); // Ensure user data is cleared
    this.apiService.token = ''; // Clear the token
    this.isloggedIn = false; // Update isloggedIn when logging out
    
    this.router.navigate(['UsersLogin']).then(() => {
        window.location.reload(); // Refresh the window
        
    });
}

}
