import { NextResponse } from "next/server";
import { RentPayment } from "@/lib/mongoose/models/rentPayment.model";
import connectDB from "@/lib/mongodb/client";

export async function PUT(
  req: Request,
  { params }: { params: { rentPaymentId: string } }
) {
  try {
    await connectDB();
    const { rentPaymentId } = params;
    const { amount, status, paymentMethod, message } = await req.json();

    console.log("Received data:", { amount, status, paymentMethod, message });
    console.log("Payment ID:", rentPaymentId);

    const payment = await RentPayment.findById(rentPaymentId);
    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Create change log entry
    const changeLog = {
      type: 'edit',
      date: new Date(),
      changes: {
        amount: amount !== payment.amount ? { from: payment.amount, to: amount } : undefined,
        status: status !== payment.status ? { from: payment.status, to: status } : undefined,
        paymentMethod: paymentMethod !== payment.paymentMethod ? { from: payment.paymentMethod, to: paymentMethod } : undefined,
      },
      message,
    };

    // Update payment details
    const updatedPayment = await RentPayment.findByIdAndUpdate(
      rentPaymentId,
      {
        $set: {
          amount,
          status,
          paymentMethod,
          ...(status === 'paid' && { paidDate: new Date() }),
        },
        $push: { changeLog },
      },
      { new: true }
    );

    if (!updatedPayment) {
      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPayment);
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}