import { formatINR } from "./format";

interface BillData {
  customerName: string;
  amount: number;
  date: string;
  phone?: string | null;
}

export function generateBillText(data: BillData): string {
  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(data.date));

  return [
    `*Roopa's Craft Jewellery*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📋 *Due Reminder*`,
    ``,
    `Dear *${data.customerName}*,`,
    ``,
    `You have an outstanding balance of:`,
    `*${formatINR(data.amount)}*`,
    ``,
    `As of: ${formattedDate}`,
    ``,
    `Kindly clear the dues at your earliest convenience.`,
    ``,
    `Thank you! 🙏`,
    `*Roopa's Craft Jewellery*`,
  ].join("\n");
}

export function shareBill(text: string, phone?: string | null) {
  if (navigator.share) {
    navigator.share({ text }).catch(() => {
      openWhatsApp(text, phone);
    });
  } else {
    openWhatsApp(text, phone);
  }
}

function openWhatsApp(text: string, phone?: string | null) {
  const encoded = encodeURIComponent(text);
  const cleanPhone = phone?.replace(/\D/g, "") || "";
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank");
}
