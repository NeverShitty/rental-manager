import { Transaction } from '@shared/schema';

const API_KEY = process.env.CHARGE_AUTOMATION_API_KEY;
const CLIENT_ID = process.env.CHARGE_AUTOMATION_CLIENT_ID;

interface PaymentRequest {
  amount: number;
  propertyId: number;
  tenantId: number;
  description: string;
  dueDate: Date;
}

interface PaymentResponse {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  processingFee: number;
  transactionDate: Date;
}

export async function processPayment(request: PaymentRequest): Promise<PaymentResponse> {
  const response = await fetch('https://api.chargeautomation.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY!,
      'X-Client-Id': CLIENT_ID!
    },
    body: JSON.stringify({
      amount: request.amount,
      property_id: request.propertyId,
      tenant_id: request.tenantId,
      description: request.description,
      due_date: request.dueDate.toISOString()
    })
  });

  if (!response.ok) {
    throw new Error(`Payment processing failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.payment_id,
    status: data.status,
    amount: data.amount,
    processingFee: data.processing_fee,
    transactionDate: new Date(data.transaction_date)
  };
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
  const response = await fetch(`https://api.chargeautomation.com/v1/payments/${paymentId}`, {
    headers: {
      'X-Api-Key': API_KEY!,
      'X-Client-Id': CLIENT_ID!
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get payment status: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.payment_id,
    status: data.status,
    amount: data.amount,
    processingFee: data.processing_fee,
    transactionDate: new Date(data.transaction_date)
  };
}
