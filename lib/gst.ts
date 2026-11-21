export interface GstState {
  code: string;
  name: string;
}

export const GST_STATES: GstState[] = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
];

export function stateNameByCode(code: string | null | undefined): string {
  if (!code) {
    return "";
  }
  const found = GST_STATES.find((state) => state.code === code);
  return found ? found.name : "";
}

export function stateLabel(code: string | null | undefined): string {
  if (!code) {
    return "";
  }
  const name = stateNameByCode(code);
  return name ? `${name} (${code})` : code;
}

export function normalizeId(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function isValidPan(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
}

export function isValidGstinFormat(g: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g);
}

function charValue(ch: string): number {
  if (ch >= "0" && ch <= "9") {
    return ch.charCodeAt(0) - "0".charCodeAt(0);
  }
  if (ch >= "A" && ch <= "Z") {
    return ch.charCodeAt(0) - "A".charCodeAt(0) + 10;
  }
  return -1;
}

export function gstinChecksumOk(g: string): boolean {
  if (!isValidGstinFormat(g)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const value = charValue(g[i]);
    if (value < 0) {
      return false;
    }
    const multiplier = i % 2 === 0 ? 1 : 2;
    const v = value * multiplier;
    sum += Math.floor(v / 36) + (v % 36);
  }

  const expectedValue = (36 - (sum % 36)) % 36;
  const actualValue = charValue(g[14]);
  return actualValue === expectedValue;
}

export function panFromGstin(g: string): string {
  return g.slice(2, 12);
}

export function stateFromGstin(g: string): string {
  return g.slice(0, 2);
}

export function isValidPhone(p: string): boolean {
  let digits = p.replace(/[\s+]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  return /^[6-9][0-9]{9}$/.test(digits);
}

export function isValidPin(p: string): boolean {
  return /^[1-9][0-9]{5}$/.test(p);
}

export function isValidEmail(e: string): boolean {
  const value = e.trim();
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
