import Link from 'next/link';
import {
  LegalCallout,
  LegalDocumentLayout,
  LegalList,
  LegalSection,
  LegalSubheading,
  type LegalTocItem,
} from '@/components/legal/legal-document-layout';

const EFFECTIVE_DATE = 'July 21, 2026';
const LAST_UPDATED = 'July 21, 2026';

export const REFUND_TOC: LegalTocItem[] = [
  { id: 'general-principles', label: '1. General Principles' },
  { id: 'when-refunds', label: '2. When Refunds Apply' },
  { id: 'how-to-request', label: '3. How to Request' },
  { id: 'processing', label: '4. Refund Processing' },
  { id: 'non-refundable', label: '5. Non-Refundable Items' },
  { id: 'transfers-resales', label: '6. Transfers & Resales' },
  { id: 'legal-rights', label: '7. Legal Rights' },
  { id: 'organizer-modifications', label: '8. Organizer Changes' },
  { id: 'contact', label: '9. Contact Us' },
];

export function RefundPolicyContent() {
  return (
    <LegalDocumentLayout
      title="Refund Policy"
      description="This policy explains when refunds may be issued for tickets and purchases made through Ticket95.com, and how refund requests are handled."
      effectiveDate={EFFECTIVE_DATE}
      lastUpdated={LAST_UPDATED}
      toc={REFUND_TOC}
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <LegalCallout>
          <p className="font-semibold">Please read before you purchase.</p>
          <p className="mt-2">
            This Refund Policy is part of and incorporated into our{' '}
            <Link href="/terms" className="font-medium underline-offset-2 hover:underline">
              Terms of Service
            </Link>
            . All purchases are subject to this Policy, the Terms, and any additional terms provided by
            the Event Organizer.
          </p>
        </LegalCallout>

        <div className="mt-8 space-y-4 text-sm leading-7 text-slate-600">
          <p>
            This Refund Policy explains the conditions under which refunds may be issued for tickets,
            services, or other purchases made through Ticket95.com (the &ldquo;Site&rdquo; or
            &ldquo;Services&rdquo;). Ticket95 operates as a platform connecting buyers with event
            organizers, promoters, and sellers. We do not control most events or set organizer-specific
            refund rules.
          </p>
        </div>

        <LegalSection id="general-principles" title="1. General Principles">
          <LegalList>
            <li>
              Tickets are generally non-refundable and non-exchangeable. Due to the nature of event
              tickets (limited capacity, time-sensitive), most sales are final once the purchase is
              completed.
            </li>
            <li>
              Refunds are only available in specific circumstances outlined below or as required by
              applicable law.
            </li>
            <li>
              Service fees, convenience fees, delivery fees, and processing charges are typically
              non-refundable, even if a refund is issued for the ticket face value.
            </li>
            <li>
              Ticket95 does not issue refunds directly unless we are the primary seller or as explicitly
              stated. Refunds are usually handled by the Event Organizer or Seller.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="when-refunds" title="2. When Refunds May Be Available">
          <p>Refunds may be considered in the following situations:</p>

          <LegalSubheading>Event Cancellation</LegalSubheading>
          <p>
            If the Event Organizer officially cancels an event before it occurs, Ticket95 will facilitate
            refunds where possible. You will typically receive a full refund of the ticket face value
            (excluding non-refundable fees) to the original payment method. Processing time may take 7–30
            business days depending on the payment provider.
          </p>

          <LegalSubheading>Event Postponement or Date Change</LegalSubheading>
          <LegalList>
            <li>
              If the event is postponed to a new date and you cannot attend, you may be eligible for a
              refund if requested within the timeframe specified by the Organizer (often 30 days from the
              announcement).
            </li>
            <li>
              If no new date is announced within a reasonable period, it may be treated as a
              cancellation.
            </li>
          </LegalList>

          <LegalSubheading>Material Change to Event</LegalSubheading>
          <p>
            Significant changes (for example, venue change to a substantially different location, major
            artist lineup change) may qualify for a refund at the Organizer&rsquo;s discretion. Minor
            changes (for example, opening act, weather-related adjustments) do not qualify.
          </p>

          <LegalSubheading>Buyer-Initiated Cancellations</LegalSubheading>
          <LegalList>
            <li>
              Generally not eligible for refunds (&ldquo;buyer&rsquo;s remorse,&rdquo; change of plans,
              scheduling conflicts, travel issues, etc.).
            </li>
            <li>
              Exceptions may apply for purchases made within a short window (for example, 24–48 hours) if
              explicitly offered during checkout for specific events.
            </li>
          </LegalList>

          <LegalSubheading>Health, Safety, or Force Majeure</LegalSubheading>
          <p>
            Refunds or credits may be issued in cases of government-mandated closures, public health
            emergencies, natural disasters, or other uncontrollable events affecting the Event, subject to
            Organizer policies and local laws.
          </p>

          <LegalSubheading>Unauthorized or Fraudulent Purchases</LegalSubheading>
          <p>
            If a ticket was purchased fraudulently or without authorization, contact us immediately. We
            may cancel the ticket and issue a refund after investigation.
          </p>

          <LegalSubheading>Seller / Secondary Market Tickets</LegalSubheading>
          <p>
            Refunds for resale or secondary tickets depend on the individual Seller&rsquo;s terms and our
            resale policies. Buyers should review Seller terms before purchase. Ticket95 may offer buyer
            protection in limited cases (for example, invalid or duplicate tickets).
          </p>
        </LegalSection>

        <LegalSection id="how-to-request" title="3. How to Request a Refund">
          <LegalList>
            <li>Log into your Ticket95 Account.</li>
            <li>Go to &ldquo;My Tickets&rdquo; or &ldquo;Purchases.&rdquo;</li>
            <li>
              Select the relevant order and follow the refund request prompts, or contact the Event
              Organizer directly if applicable.
            </li>
            <li>
              Provide supporting documentation (for example, cancellation notice or proof of material
              change).
            </li>
          </LegalList>
          <p>
            Alternatively, email{' '}
            <a
              href="mailto:support@ticket95.com"
              className="font-medium text-slate-900 underline-offset-2 hover:underline"
            >
              support@ticket95.com
            </a>{' '}
            with your order number, event details, and reason for the request.
          </p>
          <p>
            <strong className="text-slate-800">Deadline:</strong> Refund requests must generally be
            submitted within 30 days of the event date (or cancellation announcement), unless otherwise
            specified. Late requests may be denied.
          </p>
        </LegalSection>

        <LegalSection id="processing" title="4. Refund Processing">
          <LegalList>
            <li>Approved refunds will be issued to the original payment method.</li>
            <li>
              Credit and debit card refunds typically process in 5–10 business days (up to 30 days
              depending on your bank).
            </li>
            <li>Digital wallets or other methods follow their respective timelines.</li>
            <li>Partial refunds may apply if only certain fees or portions are eligible.</li>
          </LegalList>
          <p>
            Ticket95 reserves the right to refuse refunds in cases of suspected abuse, ticket misuse,
            violation of Terms of Service, or where prohibited by law.
          </p>
        </LegalSection>

        <LegalSection id="non-refundable" title="5. Non-Refundable Items and Fees">
          <LegalList>
            <li>Service and convenience fees.</li>
            <li>Shipping or delivery fees for physical tickets (unless the ticket is invalid).</li>
            <li>Insurance or add-on products (subject to their own terms).</li>
            <li>Tickets used, scanned, or redeemed in any way.</li>
            <li>Donations or charitable components.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="transfers-resales" title="6. Ticket Transfers and Resales">
          <LegalList>
            <li>Transferred tickets follow the original refund eligibility.</li>
            <li>For resale purchases, refer to the specific resale terms at the time of purchase.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="legal-rights" title="7. Legal Rights and Consumer Protection">
          <p>
            This Policy does not limit any rights you may have under applicable consumer protection laws
            in your jurisdiction. For example:
          </p>
          <LegalList>
            <li>
              Residents of certain states or countries may have additional refund rights for purchases
              made within specific cooling-off periods.
            </li>
            <li>In the EU/UK, you may have statutory rights for certain digital services.</li>
          </LegalList>
          <p>
            If you believe you are entitled to a refund under local law, contact us with relevant details.
          </p>
        </LegalSection>

        <LegalSection id="organizer-modifications" title="8. Modifications to Events by Organizers">
          <p>
            Event Organizers retain the right to make changes to their events. Ticket95 is not liable for
            Organizer decisions regarding refunds or event modifications. We encourage you to review the
            Event Organizer&rsquo;s specific policies (often linked on the event page) before purchasing.
          </p>
        </LegalSection>

        <LegalSection id="contact" title="9. Contact Us">
          <p>For refund inquiries:</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            <li>
              <strong className="text-slate-800">Email:</strong>{' '}
              <a
                href="mailto:support@ticket95.com"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                support@ticket95.com
              </a>
            </li>
          </ul>
          <p>
            Include your order number, full name, and event details in all communications. We aim to
            respond to refund requests within 48–72 hours, but resolution times vary based on Organizer
            involvement.
          </p>

          <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-700 sm:px-5">
            <p className="font-semibold text-slate-900">Important notes</p>
            <LegalList>
              <li>
                This Refund Policy works in conjunction with our{' '}
                <Link href="/terms" className="font-medium text-slate-900 underline-offset-2 hover:underline">
                  Terms of Service
                </Link>
                ,{' '}
                <Link href="/privacy" className="font-medium text-slate-900 underline-offset-2 hover:underline">
                  Privacy Policy
                </Link>
                , and any event-specific terms.
              </li>
              <li>
                Ticket95 reserves the right to update this Policy at any time. Continued use of the
                Services after changes constitutes acceptance.
              </li>
              <li>
                Recommendation: Always review event details, Organizer policies, and this Refund Policy
                before completing a purchase. Ticket purchases carry risk due to the unique nature of live
                events.
              </li>
            </LegalList>
          </div>
        </LegalSection>
      </div>
    </LegalDocumentLayout>
  );
}
