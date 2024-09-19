import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, AfterViewInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ApiService } from '../Shared/Api/api.service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DatePipe } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
 
 
 
type ServiceNames = Record<string, string>;
 
@Component({
  selector: 'app-users-home',
  templateUrl: './users-home.component.html',
  styleUrls: ['./users-home.component.scss'],
  providers: [DatePipe],
  encapsulation: ViewEncapsulation.None
})
export class UsersHomeComponent implements OnInit {
 
  subscriptionDataSource = new MatTableDataSource<any>();
  permissibleDataSource = new MatTableDataSource<any>();
  serviceDataSource = new MatTableDataSource<any>();
  serviceDisplayedColumns: string[] = ['serviceNames', 'createdAt'];
 
 
  @ViewChild('subscriptionPaginator') subscriptionPaginator!: MatPaginator;
  @ViewChild('permissiblePaginator') permissiblePaginator!: MatPaginator;
  @ViewChild('servicePaginator') servicePaginator!: MatPaginator;
  @ViewChild(MatSort) subscriptionSort!: MatSort;
  @ViewChild(MatSort) permissibleSort!: MatSort;
  @ViewChild(MatSort) serviceSort!: MatSort;
  //  @ViewChild(MatSort) sort!: MatSort;
 
  subscriptiondisplayedColumns: string[] = ['subscription_id', 'subscription_status','allowed_requests','remaining_requests', 'createdAt', 'expiry_date', 'subscription_type', 'price', 'expand'];
  expandedElement: any | null;
  permissibleDisplayedColumns: string[] = ['city', 'airport_name', 'download','Apply NOC', 'expand'];
  subscriptionDetails: any[] = [];
 
  serviceDetails: any[] = [];
  permissibleDetails: any[] = [];
  showSubscriptionDetails: boolean = false;
  showServiceDetails: boolean = false;
  showPermissibleDetails: boolean = false;
  selectedSubscription: any;
  showReceiptDetails: boolean = false;
  permissibleRowCount: number = 0;
  serviceRowCount: number = 0;
  subscriptionRowCount: number = 0;
  totalSubscriptionPrice: number = 0;
  priceCalculation: string = '';
  filtersubscriptionDetails: any[] = [];
  filterpermissibleDetails: any[] = [];
  filterserviceDetails: any[] = [];
  serviceNames: ServiceNames = {
    'service1': 'Site Survey (WGS-84)',
    'service2': 'NOC Application & Associated Service',
    'service3': 'Pre-aeronautical Study Assessment',
    'service4': 'Aeronautical Study Assessment Support',
    'service5': 'Documents & Process Management',
    'service6': 'Session with SME'
  };
  nocas: any;
  airport: any;
  request: any;
  sort!: MatSort | null;
  requestForm!: FormGroup;
  constructor(private toastr: ToastrService,private formBuilder: FormBuilder,private http: HttpClient, public apiservice: ApiService, private datePipe: DatePipe) { }
 
  ngOnInit(): void {
    this.detailsOfServices();
    this.detailsOfSubscription();
    this.detailsOfPermissible();
    this.requestForm = this.formBuilder.group({
      service1: [false],
      service2: [false],
      service3: [false],
      service4: [false],
      service5: [false]
    });
    // Define custom sorting logic
    this.serviceDataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'serviceNames':
          return this.getActiveServiceNames(item.services);
        default:
          return item[property];
      }
    };
 
  }
 
 
 
 
  bufferToBase64(buffer: any) {
    return btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
  }
 
  detailsOfSubscription() {
    this.showSubscriptionDetails = true;
    this.showServiceDetails = false;
    this.showPermissibleDetails = false;
    this.totalSubscriptionPrice = 0;
    this.subscriptionRowCount = 0;
    const headers = new HttpHeaders().set("Authorization", `Bearer ${this.apiservice.token}`);
    const user_id = this.apiservice.userData.id;
    this.apiservice.getSubscriptionDetails(user_id).subscribe(
        response => {
          response.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          let priceCalculation = '';
          response.forEach((subscription, index) => {
            subscription.expiry_date = this.datePipe.transform(subscription.expiry_date, 'dd/MM/yyyy');
            subscription.createdAt = this.datePipe.transform(subscription.createdAt, 'dd/MM/yyyy');
            const price = Number(subscription.price);
            if (!isNaN(price)) {
              priceCalculation += price;
              if (index < response.length - 1) {
                priceCalculation += ' + ';
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
        error => {
          console.error('Failed to fetch subscription data:', error);
        }
      );
  }
 
  detailsOfServices() {
    this.showSubscriptionDetails = false;
    this.showServiceDetails = true;
    this.showPermissibleDetails = false;
 
    const headers = new HttpHeaders().set("Authorization", `Bearer ${this.apiservice.token}`);
    const user_id = this.apiservice.userData.id;
 
    this.apiservice.getServiceDetails(user_id).subscribe(
      response => {
        response.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.serviceDetails = response.map(service => ({
          ...service,
          services: JSON.parse(service.services),
          date: service.createdAt
        }));
        this.filterServices();
        this.updateTableData();
      },
      error => {
        console.error('Failed to fetch services data:', error);
      }
    );
  }
 
 
  filterServices() {
    this.filterserviceDetails = this.serviceDetails.filter(service => {
      return Object.values(service.services).some(value => value === true);
    }).map(service => ({
      ...service,
      activeServiceNames: this.getActiveServiceNames(service.services)
    }));
 
  }
 
  getActiveServiceNames(services: { [key: string]: boolean }): string[] {
    return Object.keys(services)
      .filter(key => services[key] === true)
      .map(key => this.getServiceName(key));
  }
 
  getServiceName(key: string): string {
    return this.serviceNames[key] || key;
  }
 
  updateTableData() {
    this.serviceDataSource = new MatTableDataSource(this.filterserviceDetails);
 
    // Set custom filter predicate for date and service name filtering
    this.serviceDataSource.filterPredicate = (data: any, filter: string) => {
      const transformedFilter = filter.trim().toLowerCase();
      const dateStr = this.datePipe.transform(data.createdAt, 'dd/MM/yyyy');
      return (
        data.activeServiceNames.join(' ').toLowerCase().includes(transformedFilter) ||
        (dateStr && dateStr.includes(transformedFilter))
      );
    };
 
    // Update the paginator and sorting for the table
    this.serviceDataSource.paginator = this.servicePaginator;
    this.serviceDataSource.sort = this.serviceSort;
 
    // Update row count
    this.serviceRowCount = this.serviceDataSource.data.length;
  }
 
  applyServiceFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.serviceDataSource.filter = filterValue.trim().toLowerCase();
  }
 
  getServiceKeys(services: any) {
    return Object.keys(services);
  }
 
  toggleRow(element: any) {
    this.expandedElement = this.expandedElement === element ? null : element;
  }
 
  detailsOfPermissible() {
    this.showSubscriptionDetails = false;
    this.showServiceDetails = false;
    this.showPermissibleDetails = true;
    const headers = new HttpHeaders().set("Authorization", `Bearer ${this.apiservice.token}`);
    const user_id = this.apiservice.userData.id;
    this.apiservice.getPermissibleDetails(user_id).subscribe(
        response => {
          this.permissibleDetails = response;
          this.filterpermissibleDetails = response;
          this.permissibleDataSource.data = this.filterpermissibleDetails;
          this.permissibleDataSource.paginator = this.permissiblePaginator;
          this.permissibleRowCount = this.permissibleDataSource.data.length;
          this.permissibleDataSource.sort = this.permissibleSort;
        },
        error => {
          console.error('Failed to fetch Nocas data:', error);
        }
      );
  }
  downloadPDF(nocas: any) {
    const doc = new jsPDF();
    const logo = new Image();
    logo.src = 'assets/icon/CASPER_LOGO.png';
 
    // Add the logo to the PDF
    logo.onload = () => {
      doc.addImage(logo, 'PNG', 10, 10, 50, 20); // Adjust the coordinates and size as needed
 
      const data = {
        applicant_name: this.apiservice.userData.uname,
        city: nocas.city,
        airport_name: nocas.airport_name,
        latitude: nocas.latitude,
        longitude: nocas.longitude,
        site_elevation: nocas.site_elevation,
        distance: nocas.distance,
        permissible_height: nocas.permissible_height,
        permissible_elevation: nocas.permissible_elevation,
        snapshot: nocas.snapshot
      };
 
      // Add title
      doc.text('Site Details', 10, 40);
 
      // Define table headers and rows
      const headers = [['Details', 'Value']];
      const rows = [
        ['Applicant Name', data.applicant_name],
        ['City', data.city],
        ['Airport Name', data.airport_name],
        ['Site Latitude', data.latitude],
        ['Site Longitude', data.longitude],
        ['Site Elevation', data.site_elevation],
        ['Distance From ARP', `${data.distance} Km`],
        ['Permissible Height (AGL)', `${data.permissible_height} M`],
        ['Permissible Elevation (AMSL)', data.permissible_elevation]
      ];
 
      // Add table to the PDF
      (doc as any).autoTable({
        head: headers,
        body: rows,
        startY: 50, // Start below the title
        theme: 'striped',
        styles: {
          fontSize: 12,
          cellPadding: 2,
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 'auto' }
        }
      });
 
      // Save the PDF
      doc.save('siteDetails.pdf');
    };
  }
 
  applySubscriptionFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.subscriptionDataSource.filter = filterValue.trim().toLowerCase();
  }
 
  applyPermissibleFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.permissibleDataSource.filter = filterValue.trim().toLowerCase();
  }
  applyForNOC() {
    // Automatically set the service2 checkbox to true
    this.requestForm.patchValue({
      service2: true
    });
 
    // Now, submit the form
    this.createRequest();
  }
 
 
  createRequest() {
    if (this.requestForm.valid) {
      const requestData = {
        services: JSON.stringify(this.requestForm.value),
        user_id: this.apiservice.userData.id
      };
 
      this.apiservice.createRequest(requestData).subscribe(
        (result: any) => {
 
           Swal.fire({
      title: 'Success!',
      text: `We have noted your request. Our team will contact you within 1 working day.`,
      icon: 'success',
      confirmButtonText: 'OK'
    });
   
          // Optionally, navigate to another page or perform additional actions here
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
}