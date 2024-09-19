import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ApiService } from '../Shared/Api/api.service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-transaction-details',
  templateUrl: './transaction-details.component.html',
  styleUrls: ['./transaction-details.component.scss']
})
export class TransactionDetailsComponent implements OnInit {
  receiptDetails: any;
  subscriptionDetails: any[] = [];
  showReceiptDetails: boolean = false;
  selectedSubscription: any;
  displayedColumns: string[] = [
    'razorpay_payment_id',
    'createdAt',
    'subscription_status',
    'allowed_requests',
    'remaining_requests',
    'expiry_date',
    'subscription_type',
    'price',
    'action'
  ];
  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private router: Router,
    public apiService: ApiService
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.receiptDetails = navigation?.extras?.state?.['receiptDetails'];
  }

  ngOnInit(): void {
    this.detailsOfSubscription();
    if (!this.receiptDetails) {
      this.router.navigate(['UsersPricingPlans']);
    }
  }

  detailsOfSubscription() {
    const userId = this.apiService.userData.id;
    this.apiService.getSubscriptions(userId).subscribe(
      response => {
        this.subscriptionDetails = response.map(subscription => ({
          ...subscription,
          razorpay_payment_id: subscription.razorpay_payment_id,
          createdAt: subscription.createdAt,
          subscription_status: subscription.subscription_status,
          expiry_date: subscription.expiry_date,
          subscription_type: subscription.subscription_type,
          price: subscription.price,
          allowed_requests: subscription.allowed_requests,
          remaining_requests: subscription.remaining_requests
        }));
        console.log(this.subscriptionDetails,"wergth")
        this.dataSource = new MatTableDataSource(this.subscriptionDetails);
        this.dataSource.paginator = this.paginator;
        setTimeout(() => {
          this.dataSource.sort = this.sort;
        });
      },
      error => {
        console.error('Failed to fetch subscription data:', error);
      }
    );
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  addressLines = [
    '606, Town Centre-2, Mittal Estate',
    'Andheri Kurla Road',
    'Andheri (East), Mumbai 400059'
  ];

  downloadReceipt(subscription: any) {
    this.selectedSubscription = subscription;
    this.showReceiptDetails = true;
  
    // Assuming the price stored is already the total price (including GST), we can calculate the breakdown.
    const gstRate = 0.18;
    const totalAmount = parseFloat(subscription.price); // Total amount including GST
    const baseAmount = totalAmount / (1 + gstRate); // Calculate base amount excluding GST
    const gstAmount = totalAmount - baseAmount; // Calculate GST amount
  
    const doc = new jsPDF();
    const logo = new Image();
    logo.src = 'assets/cropped-C_Name.png';
  
    logo.onload = () => {
      doc.addImage(logo, 'PNG', 10, 10, 40, 10);
      doc.setFontSize(18);
      doc.text('Invoice', 95, 40);
  
      const invoiceDate = new Date().toLocaleDateString();
      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
      const uniqueId = uuidv4().split('-')[0];
      const invoiceNumber = `CASPER-${datePart}-${uniqueId}`;
      const gstinnumber = `qwdefrgtyujiouyhtgrfed`;
      doc.setFontSize(12);
      doc.text(`Invoice Date: ${invoiceDate}                                         Invoice No: ${invoiceNumber}`, 10, 60);
      doc.text(`                                                                               GSTIN No: ${gstinnumber}`, 10, 70);
      doc.text(`To:`, 10, 80);
      doc.text(this.apiService.userData.uname, 10, 90);
      doc.text(this.apiService.userData.email, 10, 100);
  
      doc.setFontSize(10);
      let yPosition = 120;
      const labelX = 10;
      const valueX = 140;
  
      // Subscription details
      doc.text('Subscription Details', labelX, yPosition);
      yPosition += 10;
      doc.text('Subscription ID', labelX, yPosition);
      doc.text(subscription.subscription_id, valueX, yPosition);
      yPosition += 10;
      doc.text('Status', labelX, yPosition);
      doc.text(subscription.subscription_status, valueX, yPosition);
      yPosition += 10;
      doc.text('Expiry Date', labelX, yPosition);
      doc.text(subscription.expiry_date, valueX, yPosition);
      yPosition += 10;
      doc.text('Subscription Type', labelX, yPosition);
      doc.text(subscription.subscription_type, valueX, yPosition);
      yPosition += 10;
      doc.text('Payment ID', labelX, yPosition);
      doc.text(subscription.razorpay_payment_id, valueX, yPosition);
  
      // Amount details (Subtotal, GST, Total)
      yPosition += 20;
      doc.text('----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------', 10, yPosition);
      yPosition += 7;
  
      doc.text('Subtotal (Excluding GST):', labelX, yPosition);
      doc.text(baseAmount.toFixed(2), valueX, yPosition); // Base amount excluding GST
      yPosition += 10;
  
      doc.text('GST (18%):', labelX, yPosition);
      doc.text(gstAmount.toFixed(2), valueX, yPosition); // GST amount
      yPosition += 10;
  
      doc.text('Total Amount (Including GST):', labelX, yPosition);
      doc.text(totalAmount.toFixed(2), valueX, yPosition); // Total amount including GST
      yPosition += 10;
  
      doc.text('----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------', 10, yPosition);
  
      yPosition += 20;
      doc.text('Please retain for your records.', 10, doc.internal.pageSize.getHeight() - 55);
      doc.text('Company Name: Cognitive Navigation Pvt Ltd.', 10, doc.internal.pageSize.getHeight() - 50);
      doc.text('Company Address:', 10, doc.internal.pageSize.getHeight() - 45);
  
      let yOffset = doc.internal.pageSize.getHeight() - 40;
      this.addressLines.forEach(line => {
        doc.text(line, 10, yOffset);
        yOffset += 5;
      });
  
      doc.text('Note: For Any Query Contact on email : connect@cognitivenavigation.com And phone number :  +91 98202 09864 ', 10, doc.internal.pageSize.getHeight() - 15);
  
      doc.save(`${invoiceNumber}.pdf`);
    };
  }
  
}
