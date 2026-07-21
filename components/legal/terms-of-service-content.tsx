import Link from 'next/link';
import {
  LegalCallout,
  LegalDefinitionList,
  LegalDefinitionTerm,
  LegalDocumentLayout,
  LegalList,
  LegalSection,
  LegalSubheading,
  type LegalTocItem,
} from '@/components/legal/legal-document-layout';

const EFFECTIVE_DATE = 'July 21, 2026';
const LAST_UPDATED = 'July 21, 2026';

export const TERMS_TOC: LegalTocItem[] = [
  { id: 'definitions', label: '1. Definitions' },
  { id: 'eligibility', label: '2. Eligibility & Accounts' },
  { id: 'our-role', label: '3. Our Role & Services' },
  { id: 'tickets', label: '4. Listings & Purchases' },
  { id: 'payments', label: '5. Payments & Fees' },
  { id: 'refunds', label: '6. Refunds & Cancellations' },
  { id: 'transfers', label: '7. Transfers & Resale' },
  { id: 'conduct', label: '8. User Conduct' },
  { id: 'intellectual-property', label: '9. Intellectual Property' },
  { id: 'privacy', label: '10. Privacy' },
  { id: 'disclaimers', label: '11. Disclaimers' },
  { id: 'liability', label: '12. Limitation of Liability' },
  { id: 'indemnification', label: '13. Indemnification' },
  { id: 'termination', label: '14. Termination' },
  { id: 'disputes', label: '15. Dispute Resolution' },
  { id: 'governing-law', label: '16. Governing Law' },
  { id: 'miscellaneous', label: '17. Miscellaneous' },
];

export function TermsOfServiceContent() {
  return (
    <LegalDocumentLayout
      title="Terms of Service"
      description="These Terms govern your access to and use of Ticket95.com, including ticket purchases, event listings, and related platform services."
      effectiveDate={EFFECTIVE_DATE}
      lastUpdated={LAST_UPDATED}
      toc={TERMS_TOC}
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <LegalCallout>
          <p className="font-semibold">Please read these Terms carefully.</p>
          <p className="mt-2">
            By accessing or using Ticket95.com, creating an account, purchasing or selling tickets, or
            otherwise interacting with the Platform, you agree to be bound by these Terms. If you do not
            agree, do not use the Services.
          </p>
        </LegalCallout>

        <div className="mt-8 space-y-1 text-sm leading-7 text-slate-600">
          <p>
            Welcome to Ticket95.com (the &ldquo;Site&rdquo; or &ldquo;Platform&rdquo;), operated by
            Ticket95 Inc. or its affiliates (&ldquo;Ticket95,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;). These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use
            of the Site, our mobile applications, and any related services, features, or content
            (collectively, the &ldquo;Services&rdquo;).
          </p>
          <p>
            Ticket95 is an online marketplace and platform for the purchase, sale, and management of
            tickets to events, concerts, sports, theater, festivals, and other live experiences
            (&ldquo;Events&rdquo;).
          </p>
          <p>
            These Terms form a legally binding contract between you and Ticket95. We may update these
            Terms from time to time; continued use after changes constitutes acceptance. We will notify you
            of material changes via the Site, email, or other reasonable means.
          </p>
        </div>

        <LegalSection id="definitions" title="1. Definitions">
          <LegalDefinitionList>
            <LegalDefinitionTerm term="Account">
              A registered user profile on the Platform.
            </LegalDefinitionTerm>
            <LegalDefinitionTerm term="Buyer">
              A user purchasing tickets through the Services.
            </LegalDefinitionTerm>
            <LegalDefinitionTerm term="Seller">
              A user, organizer, promoter, or authorized reseller listing or selling tickets.
            </LegalDefinitionTerm>
            <LegalDefinitionTerm term="Ticket">
              A digital or physical admission credential to an Event.
            </LegalDefinitionTerm>
            <LegalDefinitionTerm term="Event Organizer">
              The entity or person hosting or responsible for the Event.
            </LegalDefinitionTerm>
            <LegalDefinitionTerm term="Content">
              Any text, images, videos, listings, reviews, or other materials you upload or submit.
            </LegalDefinitionTerm>
            <LegalDefinitionTerm term="User">
              Any individual or entity accessing or using the Services.
            </LegalDefinitionTerm>
          </LegalDefinitionList>
        </LegalSection>

        <LegalSection id="eligibility" title="2. Eligibility and User Accounts">
          <p>
            You must be at least 18 years old (or the age of majority in your jurisdiction) to use the
            Services. Users under 18 require parental or guardian consent. By using the Services, you
            represent that you meet these requirements.
          </p>
          <p>
            To access certain features, you must create an Account with accurate, complete information. You
            are responsible for maintaining the confidentiality of your login credentials and all activities
            under your Account. Notify us immediately of any unauthorized use.
          </p>
          <p>
            We reserve the right to suspend or terminate Accounts at our discretion for violations of these
            Terms or for other legitimate business or security reasons.
          </p>
        </LegalSection>

        <LegalSection id="our-role" title="3. Our Role and Services">
          <p>
            Ticket95 provides a platform facilitating transactions between Buyers and Sellers. We are not
            the creator, organizer, owner, or direct seller of most Events or Tickets unless explicitly
            stated. We act as an intermediary and are not a party to the contract between Buyers and
            Sellers or Event Organizers, except for our own fees and services.
          </p>
          <p>
            We do not guarantee the accuracy of Event details, Ticket availability, quality, safety, or
            legitimacy provided by third parties. Event Organizers are solely responsible for the
            Event&rsquo;s execution, refunds (where applicable), and compliance with applicable laws.
          </p>
        </LegalSection>

        <LegalSection id="tickets" title="4. Ticket Listings, Purchases, and Sales">
          <LegalSubheading>For Buyers</LegalSubheading>
          <LegalList>
            <li>All sales are generally final. Tickets are non-refundable except as explicitly provided in our policies, by the Event Organizer, or as required by applicable law.</li>
            <li>Tickets may be subject to additional terms from the Event Organizer or venue (for example, entry rules, prohibited items, or age restrictions).</li>
            <li>You agree not to purchase Tickets for resale in violation of applicable laws or these Terms.</li>
            <li>Delivery is typically electronic (for example, PDF or mobile barcode). Physical delivery, if offered, may incur additional fees.</li>
          </LegalList>

          <LegalSubheading>For Sellers</LegalSubheading>
          <LegalList>
            <li>You must have legal authority to sell the Tickets.</li>
            <li>Listings must be accurate and comply with all laws. Prohibited items include counterfeit, duplicate, or unauthorized Tickets, misleading information, and scalping in restricted jurisdictions.</li>
            <li>You are responsible for honoring valid sales and any refunds or transfers required.</li>
            <li>We may remove listings at our discretion.</li>
          </LegalList>

          <LegalSubheading>General</LegalSubheading>
          <LegalList>
            <li>Prices include fees; taxes may apply. We may correct pricing errors and cancel orders.</li>
            <li>Availability is not guaranteed; overbooking or cancellations by Organizers may occur.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="payments" title="5. Pricing, Payments, and Fees">
          <LegalList>
            <li>We or our payment processors handle transactions. You authorize us to charge your selected payment method.</li>
            <li>Service fees, convenience fees, and other charges are non-refundable unless stated otherwise.</li>
            <li>Sellers may receive proceeds minus our commission and applicable fees.</li>
            <li>Payment processing is subject to third-party terms. We are not responsible for payment processor errors.</li>
            <li>Currency and taxes are your responsibility.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="refunds" title="6. Refunds, Cancellations, and Postponements">
          <p>
            Refunds are governed by the Event Organizer&rsquo;s policy and applicable law. Ticket95 does
            not control Organizer policies.
          </p>
          <p>
            In case of Event cancellation, postponement, or material change, contact the Organizer or
            review our{' '}
            <Link href="/refund-policy" className="font-medium text-slate-900 underline-offset-2 hover:underline">
              Refund Policy
            </Link>
            . We may facilitate refunds where possible but assume no liability beyond our role as
            facilitator.
          </p>
          <p>
            No refunds are provided for buyer&rsquo;s remorse, weather, personal circumstances, or minor
            changes unless required by law.
          </p>
        </LegalSection>

        <LegalSection id="transfers" title="7. Transfers and Resale">
          <p>
            Tickets may be transferable per Organizer rules. Unauthorized resale or use of bots for bulk
            purchasing is prohibited. Secondary market transactions are subject to additional policies and
            risks.
          </p>
        </LegalSection>

        <LegalSection id="conduct" title="8. User Conduct and Prohibited Activities">
          <p>You agree not to:</p>
          <LegalList>
            <li>Violate any laws, including anti-scalping, fraud, or intellectual property laws.</li>
            <li>Post false, misleading, defamatory, or infringing Content.</li>
            <li>Harass, spam, or engage in fraudulent activity.</li>
            <li>Use bots, scripts, or automation to access the Services.</li>
            <li>Attempt to circumvent security measures or Ticket verification.</li>
            <li>Sell Tickets to prohibited Events or in prohibited manners.</li>
            <li>Upload viruses, malware, or harmful code.</li>
          </LegalList>
          <p>
            We may monitor, remove Content, or terminate access for violations. Report violations via our{' '}
            <Link href="/contact" className="font-medium text-slate-900 underline-offset-2 hover:underline">
              support channels
            </Link>
            .
          </p>
        </LegalSection>

        <LegalSection id="intellectual-property" title="9. Intellectual Property">
          <p>
            The Platform and its content (logos, designs, software) are owned by Ticket95 or licensors and
            protected by copyright, trademark, and other laws. You are granted a limited, revocable
            license to use the Services for personal, non-commercial purposes.
          </p>
          <p>
            By submitting Content, you grant Ticket95 a worldwide, royalty-free, perpetual, irrevocable,
            sublicensable license to use, reproduce, modify, distribute, and display it for operating,
            promoting, and improving the Services.
          </p>
          <p>
            You represent that your Content does not infringe third-party rights. We respect copyrights and
            respond to valid takedown requests where applicable.
          </p>
        </LegalSection>

        <LegalSection id="privacy" title="10. Privacy">
          <p>
            Our{' '}
            <Link href="/privacy" className="font-medium text-slate-900 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>{' '}
            governs data collection and use and is incorporated into these Terms. Please review it for
            details on how we handle personal information.
          </p>
        </LegalSection>

        <LegalSection id="disclaimers" title="11. Disclaimers">
          <p className="font-medium uppercase tracking-wide text-slate-800">
            The Services, Tickets, and Events are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
            without warranties of any kind, express or implied, including merchantability, fitness for a
            particular purpose, title, or non-infringement.
          </p>
          <p>
            We do not warrant uninterrupted access, error-free operation, or that Events will occur as
            described. Risks of loss, damage, or dissatisfaction are yours.
          </p>
        </LegalSection>

        <LegalSection id="liability" title="12. Limitation of Liability">
          <p className="font-medium uppercase tracking-wide text-slate-800">
            To the maximum extent permitted by law, Ticket95, its affiliates, officers, directors,
            employees, and agents shall not be liable for any indirect, incidental, special, consequential,
            or punitive damages, including loss of profits, data, or goodwill, arising from or related to
            the Services, Tickets, or Events, even if advised of the possibility.
          </p>
          <p>
            Our total liability shall not exceed the amount paid by you to us in the twelve (12) months
            preceding the claim. Some jurisdictions do not allow these limitations, so they may not apply
            to you.
          </p>
        </LegalSection>

        <LegalSection id="indemnification" title="13. Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless Ticket95 and its affiliates from any claims,
            damages, losses, liabilities, and expenses (including legal fees) arising from:
          </p>
          <LegalList>
            <li>Your use of the Services or Tickets.</li>
            <li>Your Content or violations of these Terms.</li>
            <li>Your interactions with Event Organizers, Sellers, or third parties.</li>
            <li>Any breach of representations or warranties.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="termination" title="14. Termination">
          <p>
            We may terminate or suspend your Account or access at any time, with or without cause or
            notice, for violations or other reasons. You may terminate by closing your Account.
          </p>
          <p>
            Provisions surviving termination include liability limitations, indemnification, intellectual
            property, and governing law.
          </p>
        </LegalSection>

        <LegalSection id="disputes" title="15. Dispute Resolution and Arbitration">
          <LegalCallout>
            <p className="font-semibold">Please read this section carefully — it affects your legal rights.</p>
          </LegalCallout>
          <p>
            Any dispute arising from these Terms, the Services, or your relationship with Ticket95 will be
            resolved by binding individual arbitration administered by JAMS under its rules, except for
            small claims court matters or where prohibited by law. You waive the right to a jury trial or
            class action participation.
          </p>
          <p>
            Arbitration will occur in the county of your billing address or another mutually agreed
            location. The arbitrator&rsquo;s decision is final. You and we each bear our own costs unless
            the arbitrator awards otherwise.
          </p>
          <p>This section survives termination.</p>
        </LegalSection>

        <LegalSection id="governing-law" title="16. Governing Law">
          <p>
            These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict
            of laws principles. Any non-arbitrable disputes shall be brought exclusively in the state or
            federal courts located in Delaware.
          </p>
        </LegalSection>

        <LegalSection id="miscellaneous" title="17. Miscellaneous">
          <LegalList>
            <li>
              <strong className="text-slate-800">Severability:</strong> If any provision is invalid, the
              remainder remains in effect.
            </li>
            <li>
              <strong className="text-slate-800">Waiver:</strong> Failure to enforce a right does not
              waive it.
            </li>
            <li>
              <strong className="text-slate-800">Assignment:</strong> We may assign these Terms; you may
              not without our consent.
            </li>
            <li>
              <strong className="text-slate-800">Entire Agreement:</strong> These Terms, our Privacy
              Policy, and other referenced policies constitute the full agreement.
            </li>
            <li>
              <strong className="text-slate-800">Contact:</strong> Questions? Email{' '}
              <a
                href="mailto:support@ticket95.com"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                support@ticket95.com
              </a>{' '}
              or use our{' '}
              <Link href="/contact" className="font-medium text-slate-900 underline-offset-2 hover:underline">
                contact form
              </Link>
              .
            </li>
            <li>
              <strong className="text-slate-800">International Users:</strong> You are responsible for
              complying with local laws. Services may not be available in all countries.
            </li>
          </LegalList>
          <p className="border-t border-slate-200/80 pt-4 text-slate-700">
            Ticket95 reserves the right to modify the Services, these Terms, fees, and policies at any time.
            Thank you for using Ticket95.com — we hope you enjoy unforgettable events.
          </p>
        </LegalSection>
      </div>
    </LegalDocumentLayout>
  );
}
