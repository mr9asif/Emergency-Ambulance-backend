import config from "../../config/index.js";

import {
  ISSLCommerzPaymentRequest,
  ISSLCommerzPaymentResponse,
  ISSLCommerzValidationResponse,
} from "./payment.interface.js";

const getSslcommerzInitUrl = () => {
  if (config.sslcommerz_is_sandbox) {
    return "https://sandbox-gw.sslcommerz.com/gwprocess/v4/api.php";
  }

  return "https://securepay.sslcommerz.com/gwprocess/v4/api.php";
};

const getSslcommerzValidationUrl = () => {
  if (config.sslcommerz_is_sandbox) {
    return "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";
  }

  return "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";
};

// ======================================================
// 1. INITIATE PAYMENT
// ======================================================

const initiatePayment = async (
  payload: ISSLCommerzPaymentRequest,
): Promise<ISSLCommerzPaymentResponse> => {
  const formData = new URLSearchParams();

  formData.append("store_id", config.sslcommerz_store_id);
  formData.append("store_passwd", config.sslcommerz_store_password);

  formData.append("total_amount", payload.total_amount.toFixed(2));

  formData.append("currency", payload.currency);
  formData.append("tran_id", payload.tran_id);

  formData.append("success_url", payload.success_url);
  formData.append("fail_url", payload.fail_url);
  formData.append("cancel_url", payload.cancel_url);
  formData.append("ipn_url", payload.ipn_url);

  formData.append("cus_name", payload.cus_name);
  formData.append("cus_email", payload.cus_email);
  formData.append("cus_add1", payload.cus_add1);
  formData.append("cus_city", payload.cus_city);
  formData.append("cus_postcode", payload.cus_postcode);
  formData.append("cus_country", payload.cus_country);
  formData.append("cus_phone", payload.cus_phone);

  formData.append("shipping_method", payload.shipping_method);

  formData.append("product_name", payload.product_name);

  formData.append("product_category", payload.product_category);

  formData.append("product_profile", payload.product_profile);

  const response = await fetch(getSslcommerzInitUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const responseText = await response.text();

  console.log("========== SSLCOMMERZ HTTP RESPONSE ==========");

  console.log("HTTP STATUS:", response.status);

  console.log("RESPONSE:", responseText);

  console.log("===============================================");

  if (!response.ok) {
    throw new Error(
      `SSLCOMMERZ request failed with HTTP status ${response.status}: ${responseText}`,
    );
  }

  let data: ISSLCommerzPaymentResponse;

  try {
    data = JSON.parse(responseText) as ISSLCommerzPaymentResponse;
  } catch {
    throw new Error(`Invalid JSON response from SSLCOMMERZ: ${responseText}`);
  }

  return data;
};

// ======================================================
// 2. VALIDATE PAYMENT
// ======================================================

const validatePayment = async (
  valId: string,
): Promise<ISSLCommerzValidationResponse> => {
  const formData = new URLSearchParams();

  formData.append("val_id", valId);

  formData.append("store_id", config.sslcommerz_store_id);

  formData.append("store_passwd", config.sslcommerz_store_password);

  formData.append("format", "json");

  const response = await fetch(getSslcommerzValidationUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const responseText = await response.text();

  console.log("========== SSLCOMMERZ VALIDATION ==========");

  console.log("HTTP STATUS:", response.status);

  console.log("VALIDATION RESPONSE:", responseText);

  console.log("============================================");

  if (!response.ok) {
    throw new Error(
      `SSLCOMMERZ validation request failed with HTTP status ${response.status}: ${responseText}`,
    );
  }

  let data: ISSLCommerzValidationResponse;

  try {
    data = JSON.parse(responseText) as ISSLCommerzValidationResponse;
  } catch {
    throw new Error(
      `Invalid JSON validation response from SSLCOMMERZ: ${responseText}`,
    );
  }

  return data;
};

// ======================================================
// EXPORT
// ======================================================

export const sslcommerzService = {
  initiatePayment,
  validatePayment,
};
