const DPO_COMPANY_TOKEN = process.env.DPO_COMPANY_TOKEN;
const DPO_SERVICE_TYPE = process.env.DPO_SERVICE_TYPE;
const DPO_API_URL = (
  process.env.DPO_API_URL || 'https://secure.3gdirectpay.com/API/v6/'
).replace(/\/?$/, '/');
const DPO_PAYMENT_URL = (
  process.env.DPO_PAYMENT_URL || 'https://secure.3gdirectpay.com/payv3.php?ID='
).replace(/\/$/, '');

export type CreateDpoTokenInput = {
  companyRef: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  backUrl: string;
  description: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  /** Payment time limit in hours */
  ptl?: number;
  /**
   * DPO createToken examples include a <Booking> block.
   * Some merchant ServiceTypes require these transaction-level fields.
   */
  booking?: {
    bookingRef: string;
    bookingDescription: string;
    bookingDate: string; // format: YYYY/MM/DD HH:mm
  };
};

export type DpoCreateTokenResponse = {
  result: string;
  resultExplanation: string;
  transToken: string;
  transRef: string;
  payUrl: string;
};

export type DpoVerifyTokenResponse = {
  result: string;
  resultExplanation: string;
  transactionAmount?: string;
  transactionCurrency?: string;
  companyRef?: string;
  transactionRef?: string;
  customerName?: string;
  rawXml: string;
};

function getDpoConfig() {
  if (!DPO_COMPANY_TOKEN || !DPO_SERVICE_TYPE) {
    throw new Error('Card payment is not configured. Please contact support.');
  }

  return {
    companyToken: DPO_COMPANY_TOKEN,
    serviceType: DPO_SERVICE_TYPE,
    apiUrl: DPO_API_URL,
    paymentUrl: DPO_PAYMENT_URL,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function getXmlTagValue(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(re);
  return match?.[1]?.trim() || '';
}

function formatPaymentAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid payment amount');
  }
  return amount.toFixed(2);
}

export function buildDpoPayUrl(transToken: string): string {
  const { paymentUrl } = getDpoConfig();
  // DPO_PAYMENT_URL may already end with ?ID= (from env) or not
  if (paymentUrl.includes('?ID=') || paymentUrl.includes('?id=')) {
    return `${paymentUrl}${encodeURIComponent(transToken)}`;
  }
  return `${paymentUrl}?ID=${encodeURIComponent(transToken)}`;
}

export function isDpoPaymentSuccessful(result?: string | null): boolean {
  if (!result) return false;
  const code = result.trim();
  // 000 = Transaction paid, 001 = Authorized
  return code === '000' || code === '001';
}

async function postDpoXml(xmlBody: string): Promise<string> {
  const { apiUrl } = getDpoConfig();

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      Accept: 'application/xml',
    },
    body: xmlBody,
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`DPO API request failed (${res.status})`);
  }
  if (!text.trim()) {
    throw new Error('DPO API returned an empty response');
  }
  return text;
}

export async function createDpoToken(input: CreateDpoTokenInput): Promise<DpoCreateTokenResponse> {
  const { companyToken, serviceType } = getDpoConfig();
  const amount = formatPaymentAmount(input.amount);
  const currency = (input.currency || 'UGX').toUpperCase();

  const parts = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<API3G>',
    `<CompanyToken>${escapeXml(companyToken)}</CompanyToken>`,
    '<Request>createToken</Request>',
    '<Transaction>',
    `<PaymentAmount>${escapeXml(amount)}</PaymentAmount>`,
    `<PaymentCurrency>${escapeXml(currency)}</PaymentCurrency>`,
    `<CompanyRef>${escapeXml(input.companyRef)}</CompanyRef>`,
    `<RedirectURL>${escapeXml(input.redirectUrl)}</RedirectURL>`,
    `<BackURL>${escapeXml(input.backUrl)}</BackURL>`,
    '<CompanyRefUnique>0</CompanyRefUnique>',
  ];

  if (input.ptl != null) {
    parts.push(`<PTL>${escapeXml(String(input.ptl))}</PTL>`);
  }
  if (input.customerFirstName) {
    parts.push(`<customerFirstName>${escapeXml(input.customerFirstName)}</customerFirstName>`);
  }
  if (input.customerLastName) {
    parts.push(`<customerLastName>${escapeXml(input.customerLastName)}</customerLastName>`);
  }
  if (input.customerEmail) {
    parts.push(`<customerEmail>${escapeXml(input.customerEmail)}</customerEmail>`);
  }
  if (input.customerPhone) {
    parts.push(`<customerPhone>${escapeXml(input.customerPhone)}</customerPhone>`);
  }

  parts.push('</Transaction>');

  // Services level — mandatory, at least one service
  const serviceDate = input.booking?.bookingDate || new Date().toISOString().slice(0, 16).replace('T', ' ').replace(/-/g, '/');
  const serviceDescription = input.description || 'Ticket purchase';

  parts.push(
    '<Services>',
    '<Service>',
    `<ServiceType>${escapeXml(serviceType)}</ServiceType>`,
    `<ServiceDescription>${escapeXml(serviceDescription)}</ServiceDescription>`,
    `<ServiceDate>${escapeXml(serviceDate)}</ServiceDate>`,
    '</Service>',
    '</Services>'
  );

  parts.push('</API3G>');

  const xml = await postDpoXml(parts.join(''));
  const result = getXmlTagValue(xml, 'Result');
  const resultExplanation = getXmlTagValue(xml, 'ResultExplanation') || 'Unknown error';
  const transToken = getXmlTagValue(xml, 'TransToken');
  const transRef = getXmlTagValue(xml, 'TransRef');

  if (result !== '000' || !transToken) {
    throw new Error(resultExplanation || `DPO createToken failed (${result || 'unknown'})`);
  }

  return {
    result,
    resultExplanation,
    transToken,
    transRef,
    payUrl: buildDpoPayUrl(transToken),
  };
}

export async function verifyDpoToken(input: {
  transactionToken?: string;
  companyRef?: string;
}): Promise<DpoVerifyTokenResponse> {
  const { companyToken } = getDpoConfig();
  const transactionToken = input.transactionToken?.trim() || '';
  const companyRef = input.companyRef?.trim() || '';

  if (!transactionToken && !companyRef) {
    throw new Error('Missing DPO transaction token or company reference');
  }

  const parts = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<API3G>',
    `<CompanyToken>${escapeXml(companyToken)}</CompanyToken>`,
    '<Request>verifyToken</Request>',
  ];

  if (transactionToken) {
    parts.push(`<TransactionToken>${escapeXml(transactionToken)}</TransactionToken>`);
  }
  if (companyRef) {
    parts.push(`<CompanyRef>${escapeXml(companyRef)}</CompanyRef>`);
  }

  parts.push('</API3G>');

  const xml = await postDpoXml(parts.join(''));
  const result = getXmlTagValue(xml, 'Result') || getXmlTagValue(xml, 'Code');
  const resultExplanation =
    getXmlTagValue(xml, 'ResultExplanation') || getXmlTagValue(xml, 'Explanation') || '';

  return {
    result,
    resultExplanation,
    transactionAmount: getXmlTagValue(xml, 'TransactionAmount') || undefined,
    transactionCurrency: getXmlTagValue(xml, 'TransactionCurrency') || undefined,
    companyRef: getXmlTagValue(xml, 'CompanyRef') || companyRef || undefined,
    transactionRef: getXmlTagValue(xml, 'TransactionRef') || getXmlTagValue(xml, 'TransRef') || undefined,
    customerName: getXmlTagValue(xml, 'CustomerName') || undefined,
    rawXml: xml,
  };
}

export function splitCustomerName(fullName?: string | null): {
  firstName?: string;
  lastName?: string;
} {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}
