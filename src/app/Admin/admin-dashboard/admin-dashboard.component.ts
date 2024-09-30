import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ApiService } from '../Service/api.service';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { DatePipe } from '@angular/common';
import { FormBuilder,FormGroup } from '@angular/forms';
import { MatSort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
 
type ServiceNames = Record<string, string>;
@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements AfterViewInit {
  private baseUrl = 'C:/Users/Public/uploads';
  fileName: any;
 
  getSnapshotUrl(snapshotFileName: string): string {
    return `${this.baseUrl}${snapshotFileName}`;
  }
 
  displayedColumns: string[] = ['createdAt','id', 'uname', 'phone_number', 'address', 'email'];
  subscriptiondisplayedColumns: string[] = ['createdAt','subscription_id','uname',  'subscription_status', 'subscription_type', 'expand'];
  expandedElement: any | null;
  permissibleDisplayedColumns: string[] = ['createdAt','request_id', 'uname', 'city', 'airport_name', 'user_id', 'latitude', 'longitude', 'site_elevation', 'distance', 'permissible_height', 'permissible_elevation',  'expand'];
  servicesDisplayedColumns: string[] = [ 'createdAt','request_id','uname','serviceNames'];
 
  dataSource = new MatTableDataSource<any>();
  subscriptionDataSource = new MatTableDataSource<any>();
  permissibleDataSource = new MatTableDataSource<any>();
  serviceDataSource = new MatTableDataSource<any>();
  userDataSource = new MatTableDataSource<any>();
 
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('subscriptionPaginator') subscriptionPaginator!: MatPaginator;
  @ViewChild('permissiblePaginator') permissiblePaginator!: MatPaginator;
  @ViewChild('servicePaginator') servicePaginator!: MatPaginator;
 
  @ViewChild(MatSort) userSort!: MatSort;
  @ViewChild(MatSort) subscriptionSort!: MatSort;
  @ViewChild(MatSort) permissibleSort!: MatSort;
  @ViewChild(MatSort) serviceSort!: MatSort;
 
  serviceNames: ServiceNames = {
    'service1': 'Site Survey (WGS-84)',
    'service2': 'NOC Application & Associated Service',
    'service3': 'Pre-aeronautical Study Assessment',
    'service4': 'Aeronautical Study Assessment Support',
    'service5': 'Documents & Process Management',
    'service6': 'Session with SME'
  };
  userDetails: any[] = [];
  subscriptionDetails: any[] = [];
  permissibleDetails: any[] = [];
 
  filteredUserDetails: any[] = [];
  filtersubscriptionDetails: any[] = [];
  filterpermissibleDetails: any[] = [];
 
  showSubscriptionDetails: boolean = false;
  showUserDetails: boolean = false;
  showPermissibleDetails: boolean = false;
  userRowCount: number = 0;
  permissibleRowCount: number = 0;
  totalSubscriptionPrice: number = 0;
  serviceRequestCount = 0;
  priceCalculation: string = '';
  showServiceRequestDetails: boolean = false;
  requestForm!: FormGroup;
  showServiceDetails: boolean = false;
  serviceDetails: any[] = [];
  filterserviceDetails: any[] = [];
 
  serviceRowCount: number = 0;
  constructor(public apiservice: ApiService, private formBuilder: FormBuilder,private datePipe: DatePipe, private http: HttpClient) { }
 
 
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.serviceSort; // Bind the sort
 
    this.getAllSubscriptions();
    this.getAllPermissible();
   
    this.serviceDataSource.sort = this.serviceSort;
    this.getAllOfServices();
   
    this.requestForm = this.formBuilder.group({
      service1: [false],
      service2: [false],
      service3: [false],
      service4: [false],
      service5: [false]
    });
 
    this.serviceDataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'serviceNames':
          return this.getActiveServiceNames(item.services);
        default:
          return item[property];
      }
    };
 
    this.getAllUsers();
  }
  exportAsExcelFile(): void {
    // Prepare the data
    const dataToExport = [
      {
        sheetName: 'Users',
        data: this.userDetails,
        columns: this.displayedColumns
      },
      // {
      //   sheetName: 'Subscriptions',
      //   data: this.subscriptionDetails,
      //   columns: this.subscriptiondisplayedColumns
      // },
      // {
      //   sheetName: 'Permissible',
      //   data: this.permissibleDetails,
      //   columns: this.permissibleDisplayedColumns
      // },
      // {
      //   sheetName: 'Services',
      //   data: this.serviceDetails,
      //   columns: this.servicesDisplayedColumns
      // }
    ];
 
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
 
    // Loop through each dataset and create a sheet
    dataToExport.forEach((exportData) => {
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(
        exportData.data.map(item => {
          const filteredItem: any = {};
          exportData.columns.forEach(col => {
            filteredItem[col] = item[col];
          });
          return filteredItem;
        })
      );
 
      XLSX.utils.book_append_sheet(wb, worksheet, exportData.sheetName);
    });
 
    // Generate the Excel file and prompt download
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'DashboardData.xlsx');
  }
 
  getActiveServiceNames(services: { [key: string]: boolean }): string[] {
    return Object.keys(services)
      .filter(key => services[key] === true)
      .map(key => this.getServiceName(key));
  }
  getServiceName(key: string): string {
    return this.serviceNames[key] || key;
  }
 
  getAllOfServices() {
    this.showSubscriptionDetails = false;
    this.showServiceDetails = true;
    this.showUserDetails = false;
    this.showPermissibleDetails = false;
 
    this.apiservice.getAllOfServices().subscribe(
      (      response: any[]) => {
        response.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          response.forEach(request => {
          const user = this.userDetails.find(u => u.id === request.user_id);
          request.uname = user ? user.uname : 'Unknown';
        });
        // Parse and map the services data, including createdAt
        this.serviceDetails = response.map(service => ({
          ...service,
          services: JSON.parse(service.services), // Ensure services is parsed as an object
          date: service.createdAt // Include the createdAt field in your mapping
        }));
        // Update MatTableDataSource
        this.updateTableData();
      },
      (      error: any) => {
        console.error('Failed to fetch services data:', error);
      }
    );
  }
 
  updateTableData() {
    this.serviceDataSource = new MatTableDataSource(this.serviceDetails);
    this.serviceDataSource.paginator = this.servicePaginator;
    this.serviceDataSource.sort = this.serviceSort;
    this.serviceRowCount = this.serviceDataSource.data.length;
  }
 
  applyServiceFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.serviceDataSource.filter = filterValue.trim().toLowerCase();
  }
 
  getAllUsers() {
    // Set flags to control visibility of different sections
    this.showSubscriptionDetails = false;
    this.showUserDetails = true;
    this.showPermissibleDetails = false;
    this.showServiceDetails = false;
    // Call API to fetch user details
    this.apiservice.getAllUsers().subscribe(
      (response: any[]) => {
        response.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Update user details arrays
        this.userDetails = response;
        this.filteredUserDetails = response;
 
        // Update dataSource with fetched data
        this.dataSource.data = response;
 
 
        // Assign paginator after data is set
        this.dataSource.paginator = this.paginator;
        // Update userRowCount with the count of rows
        this.userRowCount = this.dataSource.data.length;
        this.dataSource.sort = this.userSort;
       
      },
      (error: any) => {
        console.error('Failed to fetch user details:', error);
      }
    );
  }
 
  getAllSubscriptions() {
    this.showSubscriptionDetails = true;
    this.showUserDetails = false;
    this.showPermissibleDetails = false;
    this.showServiceDetails = false;
 
    this.totalSubscriptionPrice = 0;
    this.priceCalculation = '';
 
    this.apiservice.getAllSubscriptions().subscribe(
      (response: any[]) => {
        response.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        response.forEach((subscription, index) => {
          // Format the date fields using DatePipe
          subscription.createdAt = this.datePipe.transform(subscription.createdAt, 'dd/MM/yyyy');
 
          subscription.expiry_date = this.datePipe.transform(subscription.expiry_date, 'dd/MM/yyyy');
         
          const user = this.userDetails.find(u => u.id === subscription.user_id);
          subscription.uname = user ? user.uname : 'Unknown';
 
          // Calculate total subscription price
          const price = Number(subscription.price);
          if (!isNaN(price)) {
            this.priceCalculation += price;
            if (index < response.length - 1) {
              this.priceCalculation += ' + ';
            }
            this.totalSubscriptionPrice += price;
          } else {
            console.error('Invalid price:', subscription.price);
          }
        });
        this.subscriptionDetails = response;
        this.filtersubscriptionDetails = response;
        this.subscriptionDataSource.data = this.filtersubscriptionDetails;
        this.subscriptionDataSource.paginator = this.subscriptionPaginator;
        this.subscriptionDataSource.sort = this.subscriptionSort;
      },
      (error: any) => {
        console.error('Failed to fetch subscription details:', error);
      }
    );
  }
 
  toggleRow(element: any) {
    this.expandedElement = this.expandedElement === element ? null : element;
  }
 
  getAllPermissible() {
    this.showSubscriptionDetails = false;
    this.showUserDetails = false;
    this.showPermissibleDetails = true;
    this.showServiceDetails = false;
    this.apiservice.getAllPermissible().subscribe(
      (response: any[]) => {
        response.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        response.forEach(permissible => {
          const user = this.userDetails.find(u => u.id === permissible.user_id);
          permissible.uname = user ? user.uname : 'Unknown';
          permissible.createdAt = this.datePipe.transform(permissible.createdAt, 'dd/MM/yyyy');
        });
        this.permissibleDetails = response;
        this.filterpermissibleDetails = response;
        this.permissibleDataSource.data = this.filterpermissibleDetails;
        this.permissibleDataSource.paginator = this.permissiblePaginator;
        this.permissibleDataSource.sort = this.permissibleSort;
        this.permissibleRowCount = this.permissibleDataSource.data.length;
      },
      (error: any) => {
        console.error('Failed to fetch permissible details:', error);
      }
    );
  }
 
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredUserDetails = this.userDetails.filter(user =>
      Object.values(user).some(val =>
        String(val).toLowerCase().includes(filterValue)
      )
    );
    this.dataSource.data = this.filteredUserDetails;
  }
 
  applySubscriptionFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filtersubscriptionDetails = this.subscriptionDetails.filter(subscription =>
      Object.values(subscription).some(val =>
        String(val).toLowerCase().includes(filterValue)
      )
    );
    this.subscriptionDataSource.data = this.filtersubscriptionDetails;
  }
 
  applyPermissibleFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filterpermissibleDetails = this.permissibleDetails.filter(permissible =>
      Object.values(permissible).some(val =>
        String(val).toLowerCase().includes(filterValue)
      )
    );
    this.permissibleDataSource.data = this.filterpermissibleDetails;
  }
}