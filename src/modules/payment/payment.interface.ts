export interface ICreatePaymentPayload {
  tripId: string;
  customerId: string;
}

export interface ISSLCommerzPaymentRequest {
  total_amount: number;
  currency: string;
  tran_id: string;

  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;

  cus_name: string;
  cus_email: string;
  cus_add1: string;
  cus_city: string;
  cus_postcode: string;
  cus_country: string;
  cus_phone: string;

  shipping_method: string;
  product_name: string;
  product_category: string;
  product_profile: string;
}

export interface ISSLCommerzPaymentResponse {
  status: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  redirectGatewayURL?: string;
}
