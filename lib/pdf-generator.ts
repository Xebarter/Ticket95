import jsPDF from 'jspdf';
import { MAX_EVENT_SPONSORS } from '@/lib/event-sponsors';

export interface TicketPDFData {
  eventName: string;
  eventDate: string;
  eventVenue: string;
  organizerName: string;
  organizerLogoUrl?: string;
  /** Event cover / poster used in the ticket header */
  eventImageUrl?: string;
  ticketTypeName?: string;
  ticketNumber: string;
  qrCodeDataUrl: string;
  sponsors: Array<{
    name: string;
    logoUrl?: string;
  }>;
  /** 1-based index when part of a multi-ticket PDF */
  ticketIndex?: number;
  /** Total tickets in the PDF (for “Ticket 1 of 3”) */
  ticketTotal?: number;
}

type Rgb = [number, number, number];

type HeaderTheme = {
  header: Rgb;
  headerMid: Rgb;
  headerDeep: Rgb;
  accent: Rgb;
  accentLight: Rgb;
  accentDeep: Rgb;
  badgeText: Rgb;
};

const BASE = {
  pageBg: [236, 239, 244] as Rgb,
  card: [255, 255, 255] as Rgb,
  ink: [15, 23, 42] as Rgb,
  inkMuted: [71, 85, 105] as Rgb,
  inkSoft: [100, 116, 139] as Rgb,
  border: [226, 232, 240] as Rgb,
  panel: [248, 250, 252] as Rgb,
};

/** Distinct header palettes so different ticket types are easy to tell apart when printed. */
const HEADER_THEMES: HeaderTheme[] = [
  {
    // Midnight + gold (default)
    header: [12, 18, 32],
    headerMid: [22, 30, 48],
    headerDeep: [32, 42, 64],
    accent: [154, 123, 47],
    accentLight: [212, 180, 106],
    accentDeep: [120, 94, 32],
    badgeText: [12, 18, 32],
  },
  {
    // Teal
    header: [8, 47, 52],
    headerMid: [14, 68, 74],
    headerDeep: [20, 88, 94],
    accent: [45, 212, 191],
    accentLight: [153, 246, 228],
    accentDeep: [15, 118, 110],
    badgeText: [8, 47, 52],
  },
  {
    // Burgundy
    header: [64, 16, 28],
    headerMid: [88, 28, 42],
    headerDeep: [112, 40, 56],
    accent: [244, 163, 176],
    accentLight: [254, 205, 211],
    accentDeep: [190, 64, 88],
    badgeText: [64, 16, 28],
  },
  {
    // Forest
    header: [16, 42, 28],
    headerMid: [28, 64, 42],
    headerDeep: [40, 84, 56],
    accent: [134, 239, 172],
    accentLight: [187, 247, 208],
    accentDeep: [22, 128, 72],
    badgeText: [16, 42, 28],
  },
  {
    // Indigo
    header: [28, 24, 64],
    headerMid: [42, 36, 92],
    headerDeep: [56, 48, 118],
    accent: [196, 181, 253],
    accentLight: [221, 214, 254],
    accentDeep: [109, 88, 205],
    badgeText: [28, 24, 64],
  },
  {
    // Copper / amber
    header: [56, 32, 12],
    headerMid: [78, 46, 18],
    headerDeep: [98, 58, 24],
    accent: [251, 191, 36],
    accentLight: [253, 224, 120],
    accentDeep: [180, 120, 20],
    badgeText: [56, 32, 12],
  },
  {
    // Plum
    header: [48, 20, 52],
    headerMid: [72, 32, 78],
    headerDeep: [94, 44, 100],
    accent: [232, 176, 240],
    accentLight: [245, 208, 254],
    accentDeep: [168, 85, 186],
    badgeText: [48, 20, 52],
  },
];

function hashTicketType(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Stable theme per ticket type name within a document (first unique type → palette 0, etc.). */
export function resolveHeaderTheme(
  ticketTypeName: string,
  typeOrderMap: Map<string, number>
): HeaderTheme {
  const key = ticketTypeName.trim().toLowerCase() || 'general admission';
  if (!typeOrderMap.has(key)) {
    typeOrderMap.set(key, typeOrderMap.size);
  }
  const orderIndex = typeOrderMap.get(key)!;
  return HEADER_THEMES[orderIndex % HEADER_THEMES.length];
}

function themeForStandalone(ticketTypeName: string): HeaderTheme {
  const key = ticketTypeName.trim().toLowerCase() || 'general admission';
  return HEADER_THEMES[hashTicketType(key) % HEADER_THEMES.length];
}

function safeText(value?: string, fallback = '') {
  return value && value.trim() ? value.trim() : fallback;
}

function fitText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}…` : value;
}

function setFill(doc: jsPDF, rgb: Rgb) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc: jsPDF, rgb: Rgb) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setInk(doc: jsPDF, rgb: Rgb) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

async function circularLogoDataUrl(
  source?: string,
  size = 180,
  cache?: Map<string, string | null>
): Promise<string | null> {
  if (!source) return null;
  const cacheKey = `circle:${source}:${size}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey) ?? null;

  try {
    const response = await fetch(source, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) {
      cache?.set(cacheKey, null);
      return null;
    }
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
      cache?.set(cacheKey, null);
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
    const dataUrl = canvas.toDataURL('image/png');
    cache?.set(cacheKey, dataUrl);
    return dataUrl;
  } catch {
    cache?.set(cacheKey, null);
    return null;
  }
}

/** Cover-cropped event image with rounded top corners and a soft bottom vignette. */
async function eventHeaderImageDataUrl(
  source?: string,
  width = 900,
  height = 480,
  cache?: Map<string, string | null>
): Promise<string | null> {
  if (!source) return null;
  const cacheKey = `header:${source}:${width}x${height}`;
  if (cache?.has(cacheKey)) return cache.get(cacheKey) ?? null;

  try {
    const response = await fetch(source, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) {
      cache?.set(cacheKey, null);
      return null;
    }
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(imageUrl);
      cache?.set(cacheKey, null);
      return null;
    }

    const cornerRadius = Math.round(width * 0.045);
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.lineTo(width - cornerRadius, 0);
    ctx.quadraticCurveTo(width, 0, width, cornerRadius);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.clip();

    const scale = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const dx = (width - drawWidth) / 2;
    const dy = (height - drawHeight) / 2;
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

    // Soft top-to-bottom darken so white type stays readable
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(8, 12, 22, 0.38)');
    gradient.addColorStop(0.4, 'rgba(8, 12, 22, 0.48)');
    gradient.addColorStop(1, 'rgba(8, 12, 22, 0.84)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    URL.revokeObjectURL(imageUrl);
    const dataUrl = canvas.toDataURL('image/png');
    cache?.set(cacheKey, dataUrl);
    return dataUrl;
  } catch {
    cache?.set(cacheKey, null);
    return null;
  }
}

async function prefetchLogoUrls(
  urls: Array<string | undefined>,
  cache: Map<string, string | null>
) {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
  await Promise.all(unique.map((url) => circularLogoDataUrl(url, 180, cache)));
}

async function prefetchEventImages(
  urls: Array<string | undefined>,
  cache: Map<string, string | null>
) {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
  await Promise.all(unique.map((url) => eventHeaderImageDataUrl(url, 900, 480, cache)));
}

function drawPerforation(doc: jsPDF, x: number, y: number) {
  setFill(doc, BASE.pageBg);
  doc.circle(x, y, 2.6, 'F');
  setDraw(doc, BASE.border);
  doc.setLineWidth(0.2);
  doc.circle(x, y, 2.6, 'S');
}

function drawDashedRule(doc: jsPDF, x1: number, y: number, x2: number, notchRadius: number) {
  setDraw(doc, BASE.border);
  doc.setLineWidth(0.35);
  const dash = 1.8;
  const gap = 1.4;
  let x = x1;
  while (x < x2) {
    const segmentEnd = Math.min(x + dash, x2);
    doc.line(x, y, segmentEnd, y);
    x += dash + gap;
  }

  drawPerforation(doc, x1 - notchRadius, y);
  drawPerforation(doc, x2 + notchRadius, y);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

async function drawTicketPage(
  doc: jsPDF,
  data: TicketPDFData,
  theme: HeaderTheme,
  cache: Map<string, string | null>
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 5;
  const cardX = margin;
  const cardY = margin;
  const cardWidth = pageWidth - margin * 2;
  const cardHeight = pageHeight - margin * 2;
  const headerHeight = 38;
  const notchRadius = 2.6;
  const footerHeight = 30;

  const eventName = safeText(data.eventName, 'Event Ticket');
  const organizerName = safeText(data.organizerName, 'Event Organizer');
  const ticketType = safeText(data.ticketTypeName, 'General Admission');
  const eventDate = safeText(data.eventDate, 'Date to be announced');
  const eventVenue = safeText(data.eventVenue, 'Venue to be announced');
  const ticketNumber = safeText(data.ticketNumber, 'N/A');
  const sponsors = data.sponsors || [];
  const ticketIndex = data.ticketIndex && data.ticketIndex > 0 ? data.ticketIndex : 1;
  const ticketTotal = data.ticketTotal && data.ticketTotal > 0 ? data.ticketTotal : 1;

  const [eventHeaderImage, organizerLogo] = await Promise.all([
    eventHeaderImageDataUrl(data.eventImageUrl, 900, 480, cache),
    circularLogoDataUrl(data.organizerLogoUrl, 180, cache),
  ]);

  // Page backdrop
  setFill(doc, BASE.pageBg);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer card shadow
  setFill(doc, [220, 226, 235]);
  doc.roundedRect(cardX + 0.7, cardY + 0.9, cardWidth, cardHeight, 4.5, 4.5, 'F');

  // Main card
  setFill(doc, BASE.card);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4.5, 4.5, 'F');
  setDraw(doc, BASE.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4.5, 4.5, 'S');

  // Header — event image (or themed fallback)
  setFill(doc, theme.header);
  doc.roundedRect(cardX, cardY, cardWidth, headerHeight, 4.5, 4.5, 'F');
  setFill(doc, theme.headerDeep);
  doc.rect(cardX, cardY + headerHeight - 6, cardWidth, 6, 'F');

  if (eventHeaderImage) {
    try {
      doc.addImage(eventHeaderImage, 'PNG', cardX, cardY, cardWidth, headerHeight);
      setFill(doc, BASE.card);
      doc.rect(cardX, cardY + headerHeight, cardWidth, 6, 'F');
    } catch {
      // themed fill already drawn
    }
  } else {
    setFill(doc, theme.headerMid);
    doc.rect(cardX, cardY + 8, cardWidth, headerHeight - 14, 'F');
  }

  // Accent top rails
  setFill(doc, theme.accentLight);
  doc.rect(cardX, cardY, cardWidth, 0.45, 'F');
  setFill(doc, theme.accent);
  doc.rect(cardX, cardY + 0.45, cardWidth, 1.15, 'F');
  setFill(doc, theme.accentDeep);
  doc.rect(cardX, cardY + 1.6, cardWidth, 0.35, 'F');

  // Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  setInk(doc, theme.accentLight);
  doc.text('TICKET95.COM', cardX + 5.5, cardY + 7.8);

  // Admit badge
  setFill(doc, [255, 255, 255]);
  doc.roundedRect(cardX + cardWidth - 27, cardY + 4.8, 21.5, 5.2, 1.3, 1.3, 'F');
  setFill(doc, theme.accentLight);
  doc.roundedRect(cardX + cardWidth - 27, cardY + 4.8, 21.5, 1.05, 1.3, 1.3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  setInk(doc, theme.header);
  doc.text('ADMIT ONE', cardX + cardWidth - 16.25, cardY + 8.2, { align: 'center' });

  // Ticket index — white circle, lower-right of header
  const ticketCircleR = 7.2;
  const ticketCircleCx = cardX + cardWidth - ticketCircleR - 4;
  const ticketCircleCy = cardY + headerHeight - ticketCircleR - 2.8;
  setFill(doc, [255, 255, 255]);
  doc.circle(ticketCircleCx, ticketCircleCy, ticketCircleR, 'F');
  setDraw(doc, theme.accent);
  doc.setLineWidth(0.45);
  doc.circle(ticketCircleCx, ticketCircleCy, ticketCircleR, 'S');
  setDraw(doc, theme.accentLight);
  doc.setLineWidth(0.25);
  doc.circle(ticketCircleCx, ticketCircleCy, ticketCircleR - 0.7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.4);
  setInk(doc, theme.accentDeep);
  doc.text('TICKET', ticketCircleCx, ticketCircleCy - 2.2, { align: 'center' });

  const ticketNumberLabel =
    ticketTotal > 1 ? `${ticketIndex}/${ticketTotal}` : String(ticketIndex);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(ticketNumberLabel.length > 2 ? 8.5 : 11);
  setInk(doc, theme.header);
  doc.text(ticketNumberLabel, ticketCircleCx, ticketCircleCy + 3.2, { align: 'center' });

  // Event title over image (leave room for the ticket circle)
  const titleMaxWidth = cardWidth - ticketCircleR * 2 - 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.8);
  setInk(doc, [255, 255, 255]);
  const titleLines = doc.splitTextToSize(fitText(eventName, 44), titleMaxWidth);
  doc.text(titleLines.slice(0, 2), cardX + 5.5, cardY + 18.2);

  const titleEndY = titleLines.length > 1 ? cardY + 27.2 : cardY + 22;
  setDraw(doc, theme.accent);
  doc.setLineWidth(0.35);
  doc.line(cardX + 5.5, titleEndY, cardX + 24, titleEndY);

  // Ticket type pill
  const typeBadgeY = titleEndY + 2;
  const typeBadgeWidth = Math.min(40, Math.max(20, ticketType.length * 1.55 + 5));
  setFill(doc, [255, 255, 255]);
  doc.roundedRect(cardX + 5.5, typeBadgeY, typeBadgeWidth, 4.5, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.6);
  setInk(doc, theme.header);
  doc.text(fitText(ticketType.toUpperCase(), 26), cardX + 5.5 + typeBadgeWidth / 2, typeBadgeY + 3, {
    align: 'center',
  });

  // Header bottom accent
  setFill(doc, theme.accent);
  doc.rect(cardX, cardY + headerHeight - 1.1, cardWidth, 1.1, 'F');
  setFill(doc, theme.accentLight);
  doc.rect(cardX, cardY + headerHeight - 1.1, cardWidth, 0.35, 'F');

  // Perforation
  const dividerY = cardY + headerHeight + 2.8;
  drawDashedRule(doc, cardX + 4, dividerY, cardX + cardWidth - 4, notchRadius);

  // Footer band (organizer + sponsors) — kept low so QR can grow
  const footerY = cardY + cardHeight - footerHeight;
  const contentBottom = footerY - 3.5;

  // Large QR block — frame hugs the code only; labels sit fully below it
  const qrTop = dividerY + 4;
  const qrLabelSpace = 11;
  const infoHeight = 13;
  const qrFramePad = 2.2;
  const availableForQr = contentBottom - qrTop - qrLabelSpace - infoHeight - 1.5;
  const qrSize = Math.max(36, Math.min(52, availableForQr));
  const qrX = cardX + (cardWidth - qrSize) / 2;
  const qrY = qrTop + Math.max(0, (availableForQr - qrSize) * 0.15);

  setFill(doc, BASE.panel);
  doc.roundedRect(
    qrX - qrFramePad,
    qrY - qrFramePad,
    qrSize + qrFramePad * 2,
    qrSize + qrFramePad * 2,
    2.5,
    2.5,
    'F'
  );
  setDraw(doc, theme.accent);
  doc.setLineWidth(0.5);
  doc.roundedRect(
    qrX - qrFramePad,
    qrY - qrFramePad,
    qrSize + qrFramePad * 2,
    qrSize + qrFramePad * 2,
    2.5,
    2.5,
    'S'
  );
  setFill(doc, BASE.card);
  doc.roundedRect(qrX - 0.8, qrY - 0.8, qrSize + 1.6, qrSize + 1.6, 1.2, 1.2, 'F');

  try {
    doc.addImage(data.qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  } catch (error) {
    console.error('Error adding QR code:', error);
  }

  const qrFrameBottom = qrY + qrSize + qrFramePad;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  setInk(doc, BASE.inkSoft);
  doc.text('SCAN AT ENTRY', cardX + cardWidth / 2, qrFrameBottom + 3.6, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setInk(doc, BASE.ink);
  doc.text(`#${ticketNumber}`, cardX + cardWidth / 2, qrFrameBottom + 7.8, { align: 'center' });

  const infoY = Math.min(qrFrameBottom + 9.8, contentBottom - infoHeight);
  setFill(doc, BASE.panel);
  doc.roundedRect(cardX + 4, infoY, cardWidth - 8, infoHeight, 2, 2, 'F');
  setDraw(doc, BASE.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(cardX + 4, infoY, cardWidth - 8, infoHeight, 2, 2, 'S');

  const colSplit = cardX + cardWidth / 2;
  setDraw(doc, BASE.border);
  doc.line(colSplit, infoY + 2, colSplit, infoY + infoHeight - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.3);
  setInk(doc, BASE.inkSoft);
  doc.text('DATE & TIME', cardX + 6.5, infoY + 3.8);
  doc.text('VENUE', colSplit + 2.5, infoY + 3.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  setInk(doc, BASE.ink);
  doc.text(fitText(eventDate, 22), cardX + 6.5, infoY + 7.8);
  doc.text(fitText(eventVenue, 22), colSplit + 2.5, infoY + 7.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  setInk(doc, BASE.inkMuted);
  doc.text('Arrive early · Have ID ready', cardX + 6.5, infoY + 11);
  doc.text('Non-transferable', colSplit + 2.5, infoY + 11);

  // Footer separator
  setDraw(doc, BASE.border);
  doc.setLineWidth(0.25);
  doc.line(cardX + 4, footerY - 1.2, cardX + cardWidth - 4, footerY - 1.2);

  // Footer panel
  setFill(doc, BASE.panel);
  doc.roundedRect(cardX + 3.5, footerY, cardWidth - 7, footerHeight - 5.5, 2.2, 2.2, 'F');
  setDraw(doc, BASE.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(cardX + 3.5, footerY, cardWidth - 7, footerHeight - 5.5, 2.2, 2.2, 'S');

  const footerInnerY = footerY + 1.2;
  const footerSplit = cardX + cardWidth * 0.28;
  setDraw(doc, BASE.border);
  doc.setLineWidth(0.2);
  doc.line(footerSplit, footerInnerY + 1.5, footerSplit, footerY + footerHeight - 8);

  // Organizer (left) — logo stacked above name for more sponsor room
  const orgColCenter = cardX + 3.5 + (footerSplit - cardX - 3.5) / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  setInk(doc, theme.accentDeep);
  doc.text('ORGANIZER', orgColCenter, footerInnerY + 3, { align: 'center' });

  const orgLogoSize = 8;
  const orgLogoX = orgColCenter - orgLogoSize / 2;
  const orgLogoY = footerInnerY + 4.4;
  const orgCx = orgColCenter;
  const orgCy = orgLogoY + orgLogoSize / 2;

  setFill(doc, BASE.card);
  doc.circle(orgCx, orgCy, orgLogoSize / 2 + 0.35, 'F');
  setDraw(doc, theme.accent);
  doc.setLineWidth(0.35);
  doc.circle(orgCx, orgCy, orgLogoSize / 2 + 0.35, 'S');

  if (organizerLogo) {
    try {
      doc.addImage(organizerLogo, 'PNG', orgLogoX, orgLogoY, orgLogoSize, orgLogoSize);
    } catch {
      // fall through
    }
  }

  if (!organizerLogo) {
    setFill(doc, theme.headerDeep);
    doc.circle(orgCx, orgCy, orgLogoSize / 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    setInk(doc, theme.accentLight);
    doc.text(organizerName.charAt(0).toUpperCase() || 'O', orgCx, orgCy + 1.5, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  setInk(doc, BASE.ink);
  const orgNameMaxW = footerSplit - cardX - 6;
  const orgNameLines = doc.splitTextToSize(fitText(organizerName, 20), orgNameMaxW);
  doc.text(orgNameLines.slice(0, 2), orgColCenter, orgLogoY + orgLogoSize + 2.6, {
    align: 'center',
  });

  // Sponsors (right) — wider column
  const hasSponsors = sponsors.length > 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  setInk(doc, theme.accentDeep);
  doc.text('SPONSORS', footerSplit + 3, footerInnerY + 3);

  if (hasSponsors) {
    const maxSponsors = Math.min(MAX_EVENT_SPONSORS, sponsors.length);
    const sponsorAreaLeft = footerSplit + 3;
    const sponsorAreaWidth = cardX + cardWidth - 6 - sponsorAreaLeft;
    const sponsorColWidth = sponsorAreaWidth / maxSponsors;
    const logoSize = maxSponsors >= 5 ? 5.8 : maxSponsors >= 4 ? 6.4 : 7;

    for (let i = 0; i < maxSponsors; i += 1) {
      const sponsor = sponsors[i];
      const colCenter = sponsorAreaLeft + sponsorColWidth * i + sponsorColWidth / 2;
      const logoX = colCenter - logoSize / 2;
      const logoY = footerInnerY + 5.4;
      const cx = colCenter;
      const cy = logoY + logoSize / 2;

      setFill(doc, BASE.card);
      doc.circle(cx, cy, logoSize / 2 + 0.3, 'F');
      setDraw(doc, theme.accent);
      doc.setLineWidth(0.25);
      doc.circle(cx, cy, logoSize / 2 + 0.3, 'S');

      const sponsorLogo = await circularLogoDataUrl(sponsor.logoUrl, 180, cache);
      if (sponsorLogo) {
        try {
          doc.addImage(sponsorLogo, 'PNG', logoX, logoY, logoSize, logoSize);
        } catch {
          // fall through
        }
      }

      if (!sponsorLogo) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.8);
        setInk(doc, BASE.inkMuted);
        doc.text(
          fitText((sponsor.name || 'S').trim().charAt(0).toUpperCase(), 1),
          cx,
          cy + 1.2,
          { align: 'center' }
        );
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(maxSponsors >= 5 ? 4.2 : 4.6);
      setInk(doc, BASE.ink);
      doc.text(
        fitText(sponsor.name || 'Sponsor', maxSponsors >= 5 ? 9 : 12),
        colCenter,
        logoY + logoSize + 2.6,
        {
          align: 'center',
        }
      );
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    setInk(doc, BASE.inkSoft);
    doc.text('Official event ticket', footerSplit + (cardX + cardWidth - 6 - footerSplit) / 2, footerInnerY + 11, {
      align: 'center',
    });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.6);
  setInk(doc, theme.accent);
  doc.text('ticket95.com', cardX + cardWidth / 2, cardY + cardHeight - 1.8, { align: 'center' });
}

export async function generateTicketPDF(
  data: TicketPDFData,
  logoCache?: Map<string, string | null>
): Promise<Blob> {
  return generateTicketsPDF(
    [
      {
        ...data,
        ticketIndex: data.ticketIndex ?? 1,
        ticketTotal: data.ticketTotal ?? 1,
      },
    ],
    logoCache
  );
}

/** One multi-page PDF: each page is a ticket, labelled Ticket 1, Ticket 2, … */
export async function generateTicketsPDF(
  pages: TicketPDFData[],
  logoCache?: Map<string, string | null>
): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('No tickets to generate');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a6',
  });

  const cache = logoCache ?? new Map<string, string | null>();
  await Promise.all([
    prefetchLogoUrls(
      [
        ...pages.map((page) => page.organizerLogoUrl),
        ...pages.flatMap((page) => (page.sponsors || []).map((sponsor) => sponsor.logoUrl)),
      ],
      cache
    ),
    prefetchEventImages(
      pages.map((page) => page.eventImageUrl),
      cache
    ),
  ]);

  const typeOrderMap = new Map<string, number>();
  const total = pages.length;

  for (let i = 0; i < pages.length; i += 1) {
    if (i > 0) doc.addPage();
    const page = {
      ...pages[i],
      ticketIndex: pages[i].ticketIndex ?? i + 1,
      ticketTotal: pages[i].ticketTotal ?? total,
    };
    const theme =
      total === 1 && !pages[i].ticketIndex
        ? themeForStandalone(page.ticketTypeName || 'General Admission')
        : resolveHeaderTheme(page.ticketTypeName || 'General Admission', typeOrderMap);
    await drawTicketPage(doc, page, theme, cache);
  }

  return doc.output('blob');
}

export async function downloadTicketPDF(
  filename: string,
  data: TicketPDFData,
  logoCache?: Map<string, string | null>
): Promise<void> {
  const blob = await generateTicketPDF(data, logoCache);
  triggerBlobDownload(blob, filename);
}

export async function downloadTicketsPDF(
  filename: string,
  pages: TicketPDFData[],
  logoCache?: Map<string, string | null>
): Promise<void> {
  const blob = await generateTicketsPDF(pages, logoCache);
  triggerBlobDownload(blob, filename);
}
