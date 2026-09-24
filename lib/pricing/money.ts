export function toCents(value: unknown): number {
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("Preço inválido");
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 100000000)
    throw new Error("Preço fora do limite");
  return cents;
}
export function finalPrice(
  price: number,
  shipping: number | null,
  fees = 0,
  discount = 0,
) {
  for (const value of [price, shipping ?? 0, fees, discount]) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error("Valores devem ser centavos inteiros");
  }
  if (discount > price) throw new Error("Desconto excede o produto");
  return shipping === null ? null : price + shipping + fees - discount;
}
