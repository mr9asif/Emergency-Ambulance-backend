import httpStatus from "http-status";

import {
  EmergencyRequestStatus,
  PaymentGateway,
  PaymentStatus,
  TripStatus,
  UserRole,
} from "../../generated/prisma/client.js";

import config from "../../config/index.js";
import { AppError } from "../../error/AppError.js";
import { prisma } from "../../lib/prisma.js";

import { getIO } from "../../socket/socket.js";
import {
  ICreatePaymentPayload,
  ISSLCommerzCallbackPayload,
} from "./payment.interface.js";
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

// handle payment success
// handle payment success

const handlePaymentSuccess = async (payload: ISSLCommerzCallbackPayload) => {
  // 1. Check transaction ID
  if (!payload.tran_id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Transaction ID is missing");
  }

  // 2. Check validation ID
  if (!payload.val_id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Validation ID is missing");
  }

  // 3. Find our payment
  const payment = await prisma.payment.findUnique({
    where: {
      paymentNumber: payload.tran_id,
    },

    include: {
      trip: {
        include: {
          emergencyRequest: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  // 4. Don't process an already successful payment again
  if (payment.status === PaymentStatus.SUCCESS) {
    return payment;
  }

  // 5. Validate transaction with SSLCOMMERZ
  const validationResponse = await sslcommerzService.validatePayment(
    payload.val_id,
  );

  console.log("========== SSLCOMMERZ VALIDATION ==========");

  console.log(validationResponse);

  console.log("============================================");

  // 6. Gateway must say VALID
  if (
    validationResponse.status !== "VALID" &&
    validationResponse.status !== "VALIDATED"
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "SSLCOMMERZ payment validation failed",
    );
  }

  // 7. Transaction ID must match
  if (validationResponse.tran_id !== payment.paymentNumber) {
    throw new AppError(httpStatus.BAD_REQUEST, "Transaction ID does not match");
  }

  // 8. Amount must match
  const gatewayAmount = Number(validationResponse.amount);

  const paymentAmount = Number(payment.amount);

  if (Number.isNaN(gatewayAmount) || gatewayAmount !== paymentAmount) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment amount does not match");
  }

  // 9. Currency must match
  if (validationResponse.currency !== payment.currency) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Payment currency does not match",
    );
  }

  // ==========================================
  // 10. UPDATE DATABASE ATOMICALLY
  // ==========================================

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: {
        id: payment.id,
      },

      data: {
        status: PaymentStatus.SUCCESS,

        transactionId:
          validationResponse.bank_tran_id ||
          payload.bank_tran_id ||
          validationResponse.tran_id ||
          null,

        gatewayReference: validationResponse.val_id || payload.val_id || null,

        paidAt: new Date(),

        failureReason: null,
      },
    });

    // Complete trip
    await tx.trip.update({
      where: {
        id: payment.tripId,
      },

      data: {
        status: TripStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Complete emergency request
    await tx.emergencyRequest.update({
      where: {
        id: payment.trip.emergencyRequestId,
      },

      data: {
        status: EmergencyRequestStatus.COMPLETED,
      },
    });

    // Release ambulance
    await tx.ambulance.update({
      where: {
        id: payment.trip.ambulanceId,
      },

      data: {
        status: "AVAILABLE",
      },
    });

    // Release driver
    await tx.operatorProfile.update({
      where: {
        id: payment.trip.driverId,
      },

      data: {
        isAvailable: true,
      },
    });

    return updatedPayment;
  });

  // ==========================================
  // 11. STOP REAL-TIME TRACKING
  // ==========================================

  const io = getIO();

  const tripRoom = `trip:${payment.tripId}`;

  // Tell customer + driver that tracking has stopped
  io.to(tripRoom).emit("trip:tracking_stopped", {
    tripId: payment.tripId,
    reason: "TRIP_COMPLETED",
  });

  // Remove everyone from this trip room
  io.in(tripRoom).socketsLeave(tripRoom);

  console.log(`🛑 Trip tracking stopped: ${payment.tripId}`);

  console.log(`🚪 Users removed from trip room: ${tripRoom}`);

  return result;
};

// failed payment
const handlePaymentFail = async (payload: ISSLCommerzCallbackPayload) => {
  if (!payload.tran_id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Transaction ID is missing");
  }

  const payment = await prisma.payment.findUnique({
    where: {
      paymentNumber: payload.tran_id,
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  // Never change a successful payment to FAILED
  if (payment.status === PaymentStatus.SUCCESS) {
    return payment;
  }

  const updatedPayment = await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      status: PaymentStatus.FAILED,
      failureReason:
        payload.failedreason || payload.error || "Payment failed at SSLCOMMERZ",
    },
  });

  return updatedPayment;
};

// cencel payment
const handlePaymentCancel = async (payload: ISSLCommerzCallbackPayload) => {
  if (!payload.tran_id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Transaction ID is missing");
  }

  const payment = await prisma.payment.findUnique({
    where: {
      paymentNumber: payload.tran_id,
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  // Never change a successful payment to CANCELLED
  if (payment.status === PaymentStatus.SUCCESS) {
    return payment;
  }

  const updatedPayment = await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      status: PaymentStatus.CANCELLED,
      failureReason: "Payment cancelled by customer",
    },
  });

  return updatedPayment;
};

const handlePaymentIPN = async (payload: ISSLCommerzCallbackPayload) => {
  console.log("========== SSLCOMMERZ IPN ==========");
  console.log("IPN BODY:", payload);
  console.log("=====================================");

  switch (payload.status) {
    case "VALID":
      return handlePaymentSuccess(payload);

    case "FAILED":
      return handlePaymentFail(payload);

    case "CANCELLED":
      return handlePaymentCancel(payload);

    default:
      console.log(`Unhandled SSLCOMMERZ IPN status: ${payload.status}`);

      return payload;
  }
};

// ==========================================
// CUSTOMER PAYMENT HISTORY
// ==========================================

const getCustomerPaymentHistory = async (customerId: string) => {
  const payments = await prisma.payment.findMany({
    where: {
      customerId,
    },
    orderBy: {
      paidAt: "desc",
    },
    include: {
      trip: {
        select: {
          id: true,
          tripNumber: true,
          status: true,
          startedAt: true,
          pickedUpAt: true,
          arrivedAtHospitalAt: true,
          completedAt: true,
          distanceKm: true,
          fareAmount: true,

          emergencyRequest: {
            select: {
              id: true,
              pickupAddress: true,
              patient: {
                select: {
                  name: true,
                  phone: true,
                },
              },
              hospital: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },

          ambulance: {
            select: {
              id: true,
              registrationNumber: true,
            },
          },

          driver: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return payments;
};

// ==========================================
// GET SINGLE PAYMENT / RECEIPT DETAILS
// ==========================================

// ==========================================
// GET SINGLE PAYMENT DETAILS
// CUSTOMER + DRIVER
// ==========================================

const getCustomerPaymentDetails = async (
  userId: string,
  role: UserRole,
  paymentId: string,
) => {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,

      OR: [
        // Customer can see their own payment
        ...(role === UserRole.CUSTOMER
          ? [
              {
                customerId: userId,
              },
            ]
          : []),

        // Driver can see payment for trips they drove
        ...(role === UserRole.OPERATOR
          ? [
              {
                trip: {
                  driver: {
                    userId,
                  },
                },
              },
            ]
          : []),
      ],
    },

    include: {
      trip: {
        include: {
          emergencyRequest: {
            include: {
              patient: true,
              hospital: true,
            },
          },

          ambulance: true,

          driver: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Payment not found or you are not allowed to access this payment",
    );
  }

  return payment;
};

// ==========================================
// CUSTOMER PAYMENT RECEIPT
// ==========================================

// ==========================================
// PAYMENT RECEIPT
// CUSTOMER + DRIVER
// ==========================================

const getCustomerPaymentReceipt = async (
  userId: string,
  role: UserRole,
  paymentId: string,
) => {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,

      OR: [
        // Customer can see their own payment
        ...(role === UserRole.CUSTOMER
          ? [
              {
                customerId: userId,
              },
            ]
          : []),

        // Driver can see payment for trips they drove
        ...(role === UserRole.OPERATOR
          ? [
              {
                trip: {
                  driver: {
                    userId,
                  },
                },
              },
            ]
          : []),
      ],
    },

    include: {
      trip: {
        include: {
          emergencyRequest: {
            include: {
              patient: true,
              hospital: true,
            },
          },

          ambulance: true,

          driver: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Payment not found or you are not allowed to access this payment",
    );
  }

  if (payment.status !== PaymentStatus.SUCCESS) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Receipt is only available for successful payments",
    );
  }

  if (!payment.trip.emergencyRequest.hospital) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Hospital information is not available for this trip",
    );
  }

  return {
    receipt: {
      paymentNumber: payment.paymentNumber,
      status: payment.status,
      paidAt: payment.paidAt,
      amount: payment.amount,
      currency: payment.currency,
    },

    patient: {
      name: payment.trip.emergencyRequest.patient.name,
      phone: payment.trip.emergencyRequest.patient.phone,
    },

    driver: {
      name: payment.trip.driver.user.name,
      phone: payment.trip.driver.user.phone,
    },

    ambulance: {
      registrationNumber: payment.trip.ambulance.registrationNumber,
    },

    trip: {
      tripNumber: payment.trip.tripNumber,
      distanceKm: payment.trip.distanceKm,
      pickupAddress: payment.trip.emergencyRequest.pickupAddress,
    },

    hospital: {
      name: payment.trip.emergencyRequest.hospital.name,
      address: payment.trip.emergencyRequest.hospital.address,
    },
  };
};
// ==========================================
// DRIVER PAYMENT HISTORY
// ==========================================

const getDriverPaymentHistory = async (userId: string) => {
  const payments = await prisma.payment.findMany({
    where: {
      trip: {
        driver: {
          userId,
        },
      },
    },

    orderBy: {
      paidAt: "desc",
    },

    include: {
      trip: {
        select: {
          id: true,
          tripNumber: true,
          status: true,
          startedAt: true,
          pickedUpAt: true,
          arrivedAtHospitalAt: true,
          completedAt: true,
          distanceKm: true,
          fareAmount: true,

          emergencyRequest: {
            select: {
              id: true,
              pickupAddress: true,

              patient: {
                select: {
                  name: true,
                  phone: true,
                },
              },

              hospital: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },

          ambulance: {
            select: {
              id: true,
              registrationNumber: true,
            },
          },
        },
      },
    },
  });

  return payments;
};

export const paymentService = {
  createPayment,
  handlePaymentSuccess,
  handlePaymentFail,
  handlePaymentCancel,
  handlePaymentIPN,
  getCustomerPaymentHistory,
  getCustomerPaymentDetails,
  getCustomerPaymentReceipt,
  getDriverPaymentHistory,
};
