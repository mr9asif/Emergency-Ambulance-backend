import httpStatus from "http-status";

import {
  PaymentGateway,
  PaymentStatus,
} from "../../generated/prisma/client.js";

import config from "../../config/index.js";
import { AppError } from "../../error/AppError.js";
import { prisma } from "../../lib/prisma.js";

import { ICreatePaymentPayload } from "./payment.interface.js";
import { sslcommerzService } from "./sslCommerz.js";

const generatePaymentNumber = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<string> => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const prefix = `PAY-${year}${month}${day}`;

  const lastPayment = await tx.payment.findFirst({
    where: {
      paymentNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      paymentNumber: "desc",
    },
  });

  let sequence = 1;

  if (lastPayment) {
    const lastSequence =
      Number(lastPayment.paymentNumber.split("-").pop()) || 0;

    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, "0")}`;
};

const createPayment = async (
  customerId: string,
  payload: ICreatePaymentPayload,
) => {
  // 1. Find customer's trip
  const trip = await prisma.trip.findUnique({
    where: {
      id: payload.tripId,
    },
    include: {
      emergencyRequest: {
        include: {
          customer: true,
          patient: true,
          hospital: true,
        },
      },
    },
  });

  if (!trip) {
    throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
  }

  // 2. Make sure this trip belongs to the customer
  if (trip.emergencyRequest.customerId !== customerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to pay for this trip",
    );
  }

  // 3. Emergency must have arrived at hospital
  if (trip.emergencyRequest.status !== "ARRIVED_AT_HOSPITAL") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment is only available after the ambulance arrives at the hospital",
    );
  }

  // 4. Trip must still be in progress
  if (trip.status !== "IN_PROGRESS") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This trip is not available for payment",
    );
  }

  // 5. Fare must exist
  if (trip.fareAmount === null) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Trip fare has not been calculated yet",
    );
  }

  // 6. Check if payment already exists for this trip
  const existingPayment = await prisma.payment.findUnique({
    where: {
      tripId: trip.id,
    },
  });

  // Payment already completed
  if (existingPayment?.status === PaymentStatus.SUCCESS) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment has already been completed for this trip",
    );
  }

  // Payment is currently being processed
  if (
    existingPayment &&
    (existingPayment.status === PaymentStatus.PENDING ||
      existingPayment.status === PaymentStatus.PROCESSING)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment is already being processed for this trip",
    );
  }

  // 7. Generate a new payment number
  // This is also used when retrying a failed/cancelled payment.
  const paymentNumber = await prisma.$transaction(async (tx) => {
    return generatePaymentNumber(tx);
  });

  let payment;

  // 8. Create a new payment OR reuse the failed/cancelled payment
  if (existingPayment) {
    // Previous payment was FAILED or CANCELLED.
    // Reuse the same Payment row because tripId is unique.
    payment = await prisma.payment.update({
      where: {
        id: existingPayment.id,
      },
      data: {
        paymentNumber,
        amount: trip.fareAmount,
        currency: "BDT",
        gateway: PaymentGateway.SSLCOMMERZ,
        status: PaymentStatus.PENDING,
        failureReason: "",
      },
    });
  } else {
    // First payment attempt
    payment = await prisma.payment.create({
      data: {
        paymentNumber,
        tripId: trip.id,
        customerId,
        amount: trip.fareAmount,
        currency: "BDT",
        gateway: PaymentGateway.SSLCOMMERZ,
        status: PaymentStatus.PENDING,
      },
    });
  }

  try {
    // 9. Prepare SSLCOMMERZ request
    const sslcommerzResponse = await sslcommerzService.initiatePayment({
      total_amount: Number(trip.fareAmount),
      currency: "BDT",

      // SSLCOMMERZ transaction ID
      tran_id: payment.paymentNumber,

      success_url: config.sslcommerz_success_url,
      fail_url: config.sslcommerz_fail_url,
      cancel_url: config.sslcommerz_cancel_url,
      ipn_url: config.sslcommerz_ipn_url,

      cus_name: trip.emergencyRequest.customer.name,

      cus_email: trip.emergencyRequest.customer.email || "customer@example.com",

      cus_add1: trip.emergencyRequest.pickupAddress,

      // Temporary test values
      cus_city: "Rangpur",
      cus_postcode: "5400",
      cus_country: "Bangladesh",

      cus_phone: trip.emergencyRequest.customer.phone,

      shipping_method: "NO",

      product_name: "Emergency Ambulance Service",
      product_category: "Ambulance",
      product_profile: "general",
    });

    // Debug: see the actual SSLCOMMERZ response
    console.log("SSLCOMMERZ RESPONSE:", sslcommerzResponse);

    // 10. Check SSLCOMMERZ response
    if (
      sslcommerzResponse.status !== "SUCCESS" ||
      !sslcommerzResponse.sessionkey ||
      !sslcommerzResponse.GatewayPageURL
    ) {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            sslcommerzResponse.failedreason ||
            "Failed to initialize SSLCOMMERZ payment",
        },
      });

      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Failed to initialize payment with SSLCOMMERZ",
      );
    }

    // 11. Save session key and mark as PROCESSING
    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        sessionKey: sslcommerzResponse.sessionkey,
        status: PaymentStatus.PROCESSING,
      },
    });

    // 12. Return payment + gateway URL
    return {
      payment: updatedPayment,
      gatewayPageUrl: sslcommerzResponse.GatewayPageURL,
    };
  } catch (error) {
    console.error("========== PAYMENT ERROR ==========");
    console.error(error);
    console.error("===================================");

    if (error instanceof AppError) {
      throw error;
    }

    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: PaymentStatus.FAILED,
        failureReason:
          error instanceof Error
            ? error.message
            : "Payment initialization failed",
      },
    });

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Unable to connect to SSLCOMMERZ",
    );
  }
};

export const paymentService = {
  createPayment,
};
