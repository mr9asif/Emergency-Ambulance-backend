import { Response } from "express";
import httpStatus from "http-status";
import PDFDocument from "pdfkit";

import { AppError } from "../../error/AppError.js";
import { PaymentStatus, UserRole } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

const generatePaymentReceiptPDF = async (
  userId: string,
  role: UserRole,
  paymentId: string,
  res: Response,
) => {
  // 1. Find payment and authorize the user
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,

      OR: [
        // Customer can access their own payment
        ...(role === UserRole.CUSTOMER ? [{ customerId: userId }] : []),

        // Driver can access payment for trips they drove
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

  // 2. Payment not found / user is not authorized
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  // 3. Receipt only for successful payments
  if (payment.status !== PaymentStatus.SUCCESS) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Receipt is only available for successful payments",
    );
  }

  // 4. Hospital is required
  if (!payment.trip.emergencyRequest.hospital) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Hospital information is not available for this trip",
    );
  }

  // 5. Tell browser this is a PDF
  res.setHeader("Content-Type", "application/pdf");

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="receipt-${payment.paymentNumber}.pdf"`,
  );

  // 6. Create PDF
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  // Send PDF directly to response
  doc.pipe(res);

  // ==========================================
  // HEADER
  // ==========================================

  doc.fontSize(22).font("Helvetica-Bold").text("EMERGENCY AMBULANCE", {
    align: "center",
  });

  doc.fontSize(16).font("Helvetica").text("PAYMENT RECEIPT", {
    align: "center",
  });

  doc.moveDown();

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();

  doc.moveDown();

  // ==========================================
  // PAYMENT INFORMATION
  // ==========================================

  doc.fontSize(13).font("Helvetica-Bold").text("Payment Information");

  doc.moveDown(0.5);

  doc.fontSize(11).font("Helvetica");

  doc.text(`Payment Number: ${payment.paymentNumber}`);

  doc.text(`Payment Status: ${payment.status}`);

  doc.text(
    `Paid At: ${
      payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "N/A"
    }`,
  );

  doc.text(`Payment Gateway: ${payment.gateway}`);

  doc.moveDown();

  // ==========================================
  // PATIENT
  // ==========================================

  doc.fontSize(13).font("Helvetica-Bold").text("Patient Information");

  doc.moveDown(0.5);

  doc.fontSize(11).font("Helvetica");

  doc.text(`Name: ${payment.trip.emergencyRequest.patient.name}`);

  doc.text(`Phone: ${payment.trip.emergencyRequest.patient.phone}`);

  doc.moveDown();

  // ==========================================
  // DRIVER
  // ==========================================

  doc.fontSize(13).font("Helvetica-Bold").text("Driver Information");

  doc.moveDown(0.5);

  doc.fontSize(11).font("Helvetica");

  doc.text(`Name: ${payment.trip.driver.user.name}`);

  doc.text(`Phone: ${payment.trip.driver.user.phone}`);

  doc.moveDown();

  // ==========================================
  // AMBULANCE
  // ==========================================

  doc.fontSize(13).font("Helvetica-Bold").text("Ambulance Information");

  doc.moveDown(0.5);

  doc.fontSize(11).font("Helvetica");

  doc.text(`Registration Number: ${payment.trip.ambulance.registrationNumber}`);

  doc.moveDown();

  // ==========================================
  // TRIP
  // ==========================================

  doc.fontSize(13).font("Helvetica-Bold").text("Trip Information");

  doc.moveDown(0.5);

  doc.fontSize(11).font("Helvetica");

  doc.text(`Trip Number: ${payment.trip.tripNumber}`);

  doc.text(`Pickup Address: ${payment.trip.emergencyRequest.pickupAddress}`);

  doc.text(
    `Distance: ${
      payment.trip.distanceKm !== null ? `${payment.trip.distanceKm} km` : "N/A"
    }`,
  );

  doc.text(`Hospital: ${payment.trip.emergencyRequest.hospital.name}`);

  doc.text(
    `Hospital Address: ${payment.trip.emergencyRequest.hospital.address}`,
  );

  doc.moveDown();

  // ==========================================
  // TOTAL
  // ==========================================

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();

  doc.moveDown();

  doc.fontSize(16).font("Helvetica-Bold");

  doc.text(`TOTAL: ${payment.amount} ${payment.currency}`, {
    align: "right",
  });

  doc.moveDown();

  doc.fontSize(14).font("Helvetica-Bold");

  doc.text("PAID", {
    align: "center",
  });

  doc.moveDown(2);

  doc
    .fontSize(9)
    .font("Helvetica")
    .text("Thank you for using Emergency Ambulance Dispatch.", {
      align: "center",
    });

  // Finish PDF
  doc.end();
};

export const paymentPdfService = {
  generatePaymentReceiptPDF,
};
