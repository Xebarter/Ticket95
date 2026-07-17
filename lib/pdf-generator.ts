import jsPDF from 'jspdf';

interface TicketPDFData {
  eventName: string;
  eventDate: string;
  eventVenue: string;
  organizerName: string;
  organizerLogoUrl?: string;
  ticketNumber: string;
  qrCodeDataUrl: string;
  sponsors: Array<{
    name: string;
    logoUrl?: string;
  }>;
}

export async function generateTicketPDF(data: TicketPDFData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a6',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 6;
  const cardX = margin;
  const cardY = margin;
  const cardWidth = pageWidth - margin * 2;
  const cardHeight = pageHeight - margin * 2;
  const headerHeight = 32;

  const safeText = (value?: string, fallback = '') => (value && value.trim() ? value.trim() : fallback);

  const fitText = (value: string, maxLength: number) =>
    value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}…` : value;

  const circularLogoDataUrl = async (source?: string, size = 180): Promise<string | null> => {
    if (!source) return null;
    try {
      const response = await fetch(source);
      if (!response.ok) return null;
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(imageUrl);
        return null;
      }

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const scale = Math.max(size / image.width, size / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const dx = (size - drawWidth) / 2;
      const dy = (size - drawHeight) / 2;
      ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
      ctx.restore();

      URL.revokeObjectURL(imageUrl);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  // Base page and ticket card
  doc.setFillColor(245, 247, 252);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4, 4, 'F');
  doc.setDrawColor(223, 229, 240);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4, 4, 'S');

  // Header
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(cardX, cardY, cardWidth, headerHeight, 4, 4, 'F');
  doc.setFillColor(30, 41, 59);
  doc.rect(cardX, cardY + 8, cardWidth, 8, 'F');
  doc.setFillColor(51, 65, 85);
  doc.rect(cardX, cardY + 16, cardWidth, 8, 'F');
  doc.setFillColor(8, 145, 178);
  doc.rect(cardX, cardY + headerHeight - 3, cardWidth, 3, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(cardX + cardWidth - 8, cardY + 5, 1.2, 'F');
  doc.circle(cardX + cardWidth - 12, cardY + 7.5, 0.8, 'F');

  // Header badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cardX + cardWidth - 27, cardY + 4, 22, 5, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(6.3);
  doc.setFont(undefined, 'bold');
  doc.text('EVENT PASS', cardX + cardWidth - 16, cardY + 7.4, { align: 'center' });

  // Organizer logo
  const organizerLogo = await circularLogoDataUrl(data.organizerLogoUrl);
  const organizerLogoSize = 11;
  const organizerLogoX = cardX + 4;
  const organizerLogoY = cardY + 4;
  if (organizerLogo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.circle(organizerLogoX + organizerLogoSize / 2, organizerLogoY + organizerLogoSize / 2, organizerLogoSize / 2 + 0.7, 'F');
      doc.setDrawColor(148, 163, 184);
      doc.circle(organizerLogoX + organizerLogoSize / 2, organizerLogoY + organizerLogoSize / 2, organizerLogoSize / 2 + 0.7, 'S');
      doc.addImage(organizerLogo, 'PNG', organizerLogoX, organizerLogoY, organizerLogoSize, organizerLogoSize);
    } catch {
      // ignore logo drawing error
    }
  } else {
    doc.setFillColor(255, 255, 255);
    doc.circle(organizerLogoX + organizerLogoSize / 2, organizerLogoY + organizerLogoSize / 2, organizerLogoSize / 2, 'F');
    doc.setTextColor(23, 37, 84);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('ORG', organizerLogoX + organizerLogoSize / 2, organizerLogoY + organizerLogoSize / 2 + 1.5, { align: 'center' });
  }

  // Title and organizer
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12.5);
  doc.setFont(undefined, 'bold');
  doc.text(fitText(safeText(data.eventName, 'Event Ticket'), 32), cardX + 18, cardY + 9);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(`by ${fitText(safeText(data.organizerName, 'Organizer'), 34)}`, cardX + 18, cardY + 14.2);
  doc.setDrawColor(148, 163, 184);
  doc.line(cardX + 18, cardY + 16.2, cardX + cardWidth - 5, cardY + 16.2);

  // QR block (high contrast for scanners)
  const qrBlockSize = 40;
  const qrBlockX = cardX + (cardWidth - qrBlockSize) / 2;
  const qrBlockY = cardY + headerHeight + 5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrBlockX - 2, qrBlockY - 2, qrBlockSize + 4, qrBlockSize + 4, 2, 2, 'F');
  doc.setDrawColor(214, 220, 232);
  doc.roundedRect(qrBlockX - 2, qrBlockY - 2, qrBlockSize + 4, qrBlockSize + 4, 2, 2, 'S');
  try {
    doc.addImage(data.qrCodeDataUrl, 'PNG', qrBlockX, qrBlockY, qrBlockSize, qrBlockSize);
  } catch (error) {
    console.error('Error adding QR code:', error);
  }

  // Ticket number
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(7.5);
  doc.text('TICKET ID', cardX + cardWidth / 2, qrBlockY + qrBlockSize + 6, { align: 'center' });
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text(fitText(safeText(data.ticketNumber, 'N/A'), 24), cardX + cardWidth / 2, qrBlockY + qrBlockSize + 11, { align: 'center' });
  doc.setFont(undefined, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Present this code at entry', cardX + cardWidth / 2, qrBlockY + qrBlockSize + 14.8, { align: 'center' });

  // Event info block
  const infoY = qrBlockY + qrBlockSize + 17;
  doc.setFillColor(248, 250, 255);
  doc.roundedRect(cardX + 4, infoY, cardWidth - 8, 20, 2, 2, 'F');
  doc.setDrawColor(229, 233, 242);
  doc.roundedRect(cardX + 4, infoY, cardWidth - 8, 20, 2, 2, 'S');

  doc.setFontSize(6.8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('DATE & TIME', cardX + 7, infoY + 4.5);
  doc.text('VENUE', cardX + 7, infoY + 13);

  doc.setFontSize(8.3);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(fitText(safeText(data.eventDate, 'Date to be announced'), 38), cardX + 7, infoY + 8.5);
  doc.text(fitText(safeText(data.eventVenue, 'Venue to be announced'), 38), cardX + 7, infoY + 17);

  // Sponsors at bottom in circular frames
  const sponsorY = cardY + cardHeight - 16;
  doc.setDrawColor(229, 233, 242);
  doc.line(cardX + 4, sponsorY - 3, cardX + cardWidth - 4, sponsorY - 3);
  doc.setFontSize(6.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('SPONSORS', cardX + 4, sponsorY - 4.5);

  const sponsors = data.sponsors || [];
  const maxSponsors = Math.min(4, sponsors.length);
  const sponsorCircleSize = 9;
  const sponsorGap = 4;
  const rowWidth = maxSponsors * sponsorCircleSize + Math.max(0, maxSponsors - 1) * sponsorGap;
  const sponsorStartX = cardX + (cardWidth - rowWidth) / 2;

  for (let i = 0; i < maxSponsors; i++) {
    const sponsor = sponsors[i];
    const x = sponsorStartX + i * (sponsorCircleSize + sponsorGap);
    const y = sponsorY;
    const cx = x + sponsorCircleSize / 2;
    const cy = y + sponsorCircleSize / 2;

    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, sponsorCircleSize / 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.circle(cx, cy, sponsorCircleSize / 2, 'S');

    const sponsorLogo = await circularLogoDataUrl(sponsor.logoUrl);
    if (sponsorLogo) {
      try {
        doc.addImage(sponsorLogo, 'PNG', x + 0.4, y + 0.4, sponsorCircleSize - 0.8, sponsorCircleSize - 0.8);
      } catch {
        // fallback to initial
      }
    } else {
      doc.setFontSize(6.2);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 65, 85);
      const initials = fitText((sponsor.name || 'S').trim().charAt(0).toUpperCase(), 1);
      doc.text(initials, cx, cy + 1.6, { align: 'center' });
    }
  }

  if (sponsors.length === 0) {
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('No sponsors listed', cardX + cardWidth / 2, sponsorY + 6, { align: 'center' });
  }

  // Footer
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);
  doc.text('Ticket95.com', cardX + cardWidth / 2, cardY + cardHeight - 1.5, { align: 'center' });

  return doc.output('blob');
}

export async function downloadTicketPDF(
  filename: string,
  data: TicketPDFData
): Promise<void> {
  const blob = await generateTicketPDF(data);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
