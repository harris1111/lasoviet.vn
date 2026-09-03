export type CheckoutOrder = {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: "VND";
  description: string;
  successUrl: string;
  errorUrl: string;
  cancelUrl: string;
};

export type HostedCheckout = {
  action: string;
  fields: Record<string, string>;
};

export type PaymentProvider = {
  createPayment(order: CheckoutOrder): HostedCheckout;
};
