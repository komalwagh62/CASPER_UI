import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {

  constructor() { }

  generateReceipt(paymentDetails: any): void {
    const doc = new jsPDF();

    // Add text to the PDF
    doc.text('Receipt', 10, 10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 20);
    doc.text(`Transaction ID: ${paymentDetails.razorpay_payment_id}`, 10, 30);
    doc.text(`Amount Paid: ${paymentDetails.amount / 100} INR`, 10, 40);
    doc.text(`Plan: ${paymentDetails.description}`, 10, 50);
    doc.text(`User: ${paymentDetails.prefill.name}`, 10, 60);
    
    // Save the PDF
    doc.save('receipt.pdf');
  }

  generateFailureReceipt(paymentDetails: any): void {
    const doc = new jsPDF();

    // Add text to the PDF
    doc.text('Payment Failure Receipt', 10, 10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 20);
    doc.text(`Transaction ID: ${paymentDetails.razorpay_payment_id}`, 10, 30);
    doc.text(`Attempted Amount: ${paymentDetails.amount / 100} INR`, 10, 40);
    doc.text(`Plan: ${paymentDetails.description}`, 10, 50);
    doc.text(`User: ${paymentDetails.prefill.name}`, 10, 60);
    doc.text(`Reason for Failure: ${paymentDetails.error_reason}`, 10, 70);

    // Save the PDF
    doc.save('failure_receipt.pdf');
  }
}
