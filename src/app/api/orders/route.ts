import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createOrder, getAllOrders } from "@/lib/db";

// GET /api/orders - Admin retrieves list of customer orders
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session.isAuthenticated || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator permissions required." },
        { status: 401 }
      );
    }

    const orders = await getAllOrders();
    return NextResponse.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error: unknown) {
    console.error("GET /api/orders error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch orders.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/orders - Record new customer order/inquiry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productName = String(body.productName || "").trim();

    if (!productName) {
      return NextResponse.json(
        { success: false, error: "Product name is required for order recording." },
        { status: 400 }
      );
    }

    const order = await createOrder({
      customerName: body.customerName ? String(body.customerName).trim() : undefined,
      customerPhone: body.customerPhone ? String(body.customerPhone).trim() : undefined,
      productId: body.productId ? String(body.productId).trim() : undefined,
      productName,
      quantity: typeof body.quantity === "number" && body.quantity > 0 ? body.quantity : 1,
      unitPrice: typeof body.unitPrice === "number" ? body.unitPrice : null,
      totalAmount: typeof body.totalAmount === "number" ? body.totalAmount : null,
      notes: body.notes ? String(body.notes).trim() : undefined,
      source: body.source ? String(body.source).trim() : "whatsapp",
    });

    return NextResponse.json(
      {
        success: true,
        data: order,
        message: "Order inquiry recorded successfully.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/orders error:", error);
    const message = error instanceof Error ? error.message : "Failed to record order.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
