import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService } from './Users/Shared/Api/api.service';
import { AuthServiceService } from './Users/Shared/Api/auth-service.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isAdminDashboard: boolean = false; // To track if the AdminDashboard is active

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthServiceService
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Ensure the event is of type NavigationEnd
        if (event instanceof NavigationEnd) {
          // Check if the current route is UsersLogin
          if (event.urlAfterRedirects === '/UsersLogin') {
            this.apiService.clearUserData(); // Clear user data on UsersLogin page
          }
          // Check if the current route is AdminDashboard
          this.isAdminDashboard = event.url === '/AdminDashboard';
        }
      });
  }
}



// import { Component, OnInit } from '@angular/core';
// import { Router, NavigationEnd } from '@angular/router';
// import { ApiService } from './Users/Shared/Api/api.service';
// import { AuthServiceService } from './Users/Shared/Api/auth-service.service';
// @Component({
//   selector: 'app-root',
//   templateUrl: './app.component.html',
//   styleUrls: ['./app.component.scss']
// })
// export class AppComponent implements OnInit {
//   constructor(private router: Router, private apiService: ApiService,private authService: AuthServiceService) {}
//   isAdminDashboard: boolean = false; // To track if the AdminDashboard is active

//   ngOnInit() {
//     this.router.events.subscribe(event => {
//       if (event instanceof NavigationEnd) {
//         if (event.urlAfterRedirects === '/UsersLogin') {
//           this.apiService.clearUserData();
//           this.isAdminDashboard = (event as NavigationEnd).url === '/AdminDashboard';
          
//         }
//       }
//     });
//   }
// }