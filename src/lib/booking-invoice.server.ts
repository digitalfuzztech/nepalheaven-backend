type BookingInvoiceInput = {
  bookingReference: string;
  paymentReference: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCountry: string;
  packageName: string;
  tierName: string;
  destinationName: string;
  startDate: string;
  endDate: string;
  travellers: string | number;
  currency: string;
  grandTotal: string;
  paymentType: string;
  amountPaid: string;
  remainingBalance: string;
  paymentStatus: string;
  paymentMethod: string;
};

function pdfText(value: string | number) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "-")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function invoiceFilename(reference: string) {
  const safeReference = reference.replace(/[^A-Za-z0-9-]/g, "-");
  return `Nepal-Heaven-Invoice-${safeReference}.pdf`;
}

function textCommand(
  text: string,
  x: number,
  y: number,
  size = 10,
  bold = false,
) {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET`;
}

/**
 * Creates a compact, standards-compliant PDF entirely in memory. No customer
 * value is used as a path and no temporary file is left behind.
 */
export function createBookingInvoicePdf(input: BookingInvoiceInput) {
  const commands = [
    "q 0.071 0.231 0.400 rg 0 700 612 92 re f Q",
    textCommand("NEPAL HEAVEN", 42, 750, 22, true),
    textCommand("Heaven on Earth Awaits.", 42, 728, 10),
    textCommand("BOOKING INVOICE", 398, 750, 16, true),
    textCommand(`Invoice date: ${input.invoiceDate}`, 398, 728, 9),
    textCommand("Booking", 42, 670, 13, true),
    textCommand(`Booking reference: ${input.bookingReference}`, 42, 649),
    textCommand(`Payment reference: ${input.paymentReference}`, 42, 633),
    textCommand("Customer", 42, 600, 13, true),
    textCommand(`Name: ${input.customerName}`, 42, 579),
    textCommand(`Email: ${input.customerEmail}`, 42, 563),
    textCommand(`Phone: ${input.customerPhone}`, 42, 547),
    textCommand(`Country / nationality: ${input.customerCountry}`, 42, 531),
    textCommand("Journey", 42, 498, 13, true),
    textCommand(`Package: ${input.packageName}`, 42, 477),
    textCommand(`Pricing tier: ${input.tierName}`, 42, 461),
    textCommand(`Destination: ${input.destinationName}`, 42, 445),
    textCommand(`Travel dates: ${input.startDate} - ${input.endDate}`, 42, 429),
    textCommand(`Travellers: ${input.travellers}`, 42, 413),
    "q 0.957 0.941 0.906 rg 32 188 548 190 re f Q",
    textCommand("Financial summary", 42, 350, 13, true),
    textCommand(`Currency: ${input.currency}`, 42, 329),
    textCommand(`Grand total: ${input.currency} ${input.grandTotal}`, 42, 313),
    textCommand(`Payment type: ${input.paymentType}`, 42, 297),
    textCommand(`Amount paid: ${input.currency} ${input.amountPaid}`, 42, 281),
    textCommand(
      `Remaining balance: ${input.currency} ${input.remainingBalance}`,
      42,
      265,
    ),
    textCommand(`Payment status: ${input.paymentStatus}`, 42, 249),
    textCommand(`Payment method: ${input.paymentMethod}`, 42, 233),
    textCommand("Thank you for choosing Nepal Heaven.", 42, 142, 11, true),
    textCommand(
      "This invoice reflects the booking and payment snapshots recorded at confirmation.",
      42,
      124,
      9,
    ),
  ];
  const stream = `${commands.join("\n")}\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(output, "ascii"));
    output += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(output, "ascii");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return {
    filename: invoiceFilename(input.bookingReference),
    content: Buffer.from(output, "ascii"),
    contentType: "application/pdf",
  };
}
