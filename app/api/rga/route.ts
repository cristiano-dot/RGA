import { NextResponse } from "next/server";
import { getCurrentRep } from "@/lib/auth";
import { createRga, listRgasForRep, type LineItemInput } from "@/lib/rga";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const rgas = listRgasForRep(rep.id);
  return NextResponse.json({ rgas });
}

export async function POST(req: Request) {
  const rep = await getCurrentRep();
  if (!rep) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json();
  const { sales_rep_id, order_number, customer_number, reason, shipping, line_items } = body ?? {};

  if (!sales_rep_id || !order_number || !customer_number || !reason) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const customerNumber = String(customer_number).trim();
  if (!/^\d+$/.test(customerNumber)) {
    return NextResponse.json(
      { error: "Customer number must contain digits only." },
      { status: 400 }
    );
  }

  const shippingAmount = Number(shipping ?? 0);
  if (!Number.isFinite(shippingAmount) || shippingAmount < 0) {
    return NextResponse.json(
      { error: "Shipping must be zero or a positive number." },
      { status: 400 }
    );
  }

  if (!Array.isArray(line_items) || line_items.length === 0) {
    return NextResponse.json({ error: "At least one line item is required." }, { status: 400 });
  }

  const lineItems: LineItemInput[] = [];
  for (const raw of line_items) {
    const description = String(raw.description ?? "").trim();
    const quantity = Number(raw.quantity);
    const price = Number(raw.price);

    if (!description) {
      return NextResponse.json({ error: "Each line item needs a description." }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number." }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be zero or a positive number." }, { status: 400 });
    }

    lineItems.push({ description, quantity, price });
  }

  const rgaId = createRga({
    salesRepId: Number(sales_rep_id),
    orderNumber: String(order_number).trim(),
    customerNumber,
    reason: String(reason).trim(),
    shipping: shippingAmount,
    lineItems,
  });

  return NextResponse.json({ ok: true, id: rgaId });
}
