import { api } from "@/lib/api";

const PAID = new Set(["paid", "success", "captured", "completed"]);
const FAILED = new Set(["failed", "cancelled", "canceled"]);

export async function waitForPaymentStatus(
  orderId: number,
  tries = 10,
  delayMs = 1500,
): Promise<"paid" | "failed" | "pending"> {
  for (let i = 0; i < tries; i++) {
    const data = (await api.customer.order(orderId)) as {
      order?: { payment_status?: string | null };
    };
    const st = String(data.order?.payment_status || "").toLowerCase();
    if (PAID.has(st)) return "paid";
    if (FAILED.has(st)) return "failed";
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return "pending";
}
