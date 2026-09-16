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

export interface ISSLCommerzCallbackPayload {
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  status?: string;
  bank_tran_id?: string;
  card_type?: string;
}

export interface ISSLCommerzCallbackPayload {
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  status?: string;
  bank_tran_id?: string;
  card_type?: string;
  store_amount?: string;
  risk_title?: string;
  risk_level?: string;
  failedreason?: string;
  error?: string;
}

export interface ISSLCommerzValidationResponse {
  status?: string;
  tran_date?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  store_amount?: string;
  currency?: string;
  bank_tran_id?: string;
  card_type?: string;
  risk_title?: string;
  risk_level?: string;
}
