/** ponytail: assert checkout field names stay aligned with backend CheckoutIn */
import assert from "node:assert/strict";

const checkoutKeys = [
  "address_id",
  "delivery_date",
  "delivery_slot",
  "customer_phone",
  "delivery_instructions",
  "contactless",
  "payment_method",
  "coupon_code",
];

const addressKeys = [
  "label",
  "full_name",
  "phone",
  "line1",
  "line2",
  "landmark",
  "city",
  "state",
  "pincode",
  "latitude",
  "longitude",
  "is_default",
];

const src = await import("node:fs").then((fs) =>
  fs.readFileSync(new URL("../src/lib/api-client.ts", import.meta.url), "utf8"),
);

for (const key of checkoutKeys) {
  assert.match(src, new RegExp(key), `missing CheckoutIn field: ${key}`);
}
for (const key of addressKeys) {
  assert.match(src, new RegExp(key), `missing AddressIn field: ${key}`);
}
assert.match(src, /\/customer\/checkout/);
assert.match(src, /\/customer\/payments\/confirm/);
assert.match(src, /\/cart\/items\/\$\{itemId\}/);
console.log("customer api surface ok");
