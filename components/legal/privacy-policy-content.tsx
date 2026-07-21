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

export const PRIVACY_TOC: LegalTocItem[] = [
  { id: 'information-we-collect', label: '1. Information We Collect' },
  { id: 'how-we-use', label: '2. How We Use Information' },
  { id: 'sharing', label: '3. Sharing & Disclosure' },
  { id: 'cookies', label: '4. Cookies & Tracking' },
  { id: 'security', label: '5. Data Security' },
  { id: 'retention', label: '6. Data Retention' },
  { id: 'your-rights', label: '7. Your Rights & Choices' },
  { id: 'children', label: '8. Children\'s Privacy' },
  { id: 'international', label: '9. International Transfers' },
  { id: 'third-party-links', label: '10. Third-Party Links' },
  { id: 'changes', label: '11. Policy Changes' },
  { id: 'contact', label: '12. Contact Us' },
];

export function PrivacyPolicyContent() {
  return (
    <LegalDocumentLayout
      title="Privacy Policy"
      description="This policy explains how Ticket95.com collects, uses, discloses, and protects your personal information when you use our platform and services."
      effectiveDate={EFFECTIVE_DATE}
      lastUpdated={LAST_UPDATED}
      toc={PRIVACY_TOC}
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <LegalCallout>
          <p className="font-semibold">Your privacy matters to us.</p>
          <p className="mt-2">
            By using the Services, you consent to the practices described in this Privacy Policy. If you
            do not agree, please do not use the Services. This Policy is incorporated into and forms part
            of our{' '}
            <Link href="/terms" className="font-medium underline-offset-2 hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </LegalCallout>

        <div className="mt-8 space-y-4 text-sm leading-7 text-slate-600">
          <p>
            Ticket95 Inc. and its affiliates (&ldquo;Ticket95,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;) respect your privacy. This Privacy Policy explains how we collect, use,
            disclose, and protect your personal information when you visit or use Ticket95.com (the
            &ldquo;Site&rdquo;), our mobile applications, and related services (collectively, the
            &ldquo;Services&rdquo;). It also describes your rights and choices regarding your information.
          </p>
        </div>

        <LegalSection id="information-we-collect" title="1. Information We Collect">
          <p>
            We collect information you provide directly, automatically, and from third parties.
          </p>

          <LegalSubheading>Information You Provide</LegalSubheading>
          <LegalList>
            <li>
              <strong className="text-slate-800">Account details:</strong> Name, email address, phone
              number, username, password, date of birth, and profile information.
            </li>
            <li>
              <strong className="text-slate-800">Transaction information:</strong> Payment details
              (processed by third-party providers), billing and shipping addresses, purchase history, and
              Ticket information.
            </li>
            <li>
              <strong className="text-slate-800">Event-related data:</strong> Preferences, saved searches,
              reviews, ratings, and communications with Sellers or Organizers.
            </li>
            <li>
              <strong className="text-slate-800">Content you submit:</strong> Event listings, photos,
              videos, messages, support inquiries, and survey responses.
            </li>
            <li>
              <strong className="text-slate-800">Identity verification:</strong> Government-issued ID or
              other documents if required for compliance (for example, age-restricted Events or anti-fraud
              measures).
            </li>
          </LegalList>

          <LegalSubheading>Automatically Collected Information</LegalSubheading>
          <LegalList>
            <li>
              <strong className="text-slate-800">Device and usage data:</strong> IP address, browser type,
              operating system, device identifiers, access times, pages viewed, and clickstream data.
            </li>
            <li>
              <strong className="text-slate-800">Cookies and similar technologies:</strong> See the
              &ldquo;Cookies and Tracking&rdquo; section below.
            </li>
            <li>
              <strong className="text-slate-800">Location information:</strong> Approximate location derived
              from IP address or precise location if you enable it (for example, for nearby Events).
            </li>
          </LegalList>

          <LegalSubheading>Information from Third Parties</LegalSubheading>
          <LegalList>
            <li>
              Event Organizers, Sellers, payment processors, identity verification services, analytics
              providers, advertising partners, and social media platforms (if you connect accounts).
            </li>
            <li>Publicly available data or data from business partners.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="how-we-use" title="2. How We Use Your Information">
          <p>We use your information for the following purposes:</p>
          <LegalList>
            <li>To provide, operate, maintain, and improve the Services, including processing transactions and delivering Tickets.</li>
            <li>To create and manage your Account and authenticate you.</li>
            <li>To communicate with you: send confirmations, receipts, updates, marketing messages (with your consent where required), and respond to inquiries.</li>
            <li>To personalize your experience: recommend Events, tailor content, and show relevant advertisements.</li>
            <li>For security and fraud prevention: verify identity, detect suspicious activity, and enforce our Terms.</li>
            <li>For compliance: meet legal obligations, respond to subpoenas, court orders, or regulatory requests.</li>
            <li>For analytics and research: understand usage patterns, improve features, and conduct internal business analysis.</li>
            <li>To facilitate transfers or resales where permitted.</li>
            <li>For other purposes with your consent or as permitted by law.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="sharing" title="3. Sharing and Disclosure of Information">
          <p>We may share your information in these circumstances:</p>
          <LegalList>
            <li>
              <strong className="text-slate-800">With Service Providers:</strong> Payment processors,
              hosting providers, email services, analytics companies, customer support tools, and marketing
              platforms that process data on our behalf under contractual obligations.
            </li>
            <li>
              <strong className="text-slate-800">With Event Organizers and Sellers:</strong> Necessary
              information to fulfill Ticket purchases, manage Events, or handle disputes and refunds.
            </li>
            <li>
              <strong className="text-slate-800">For Legal Reasons:</strong> When required by law, to
              protect our rights, safety, or property, or in response to legal process.
            </li>
            <li>
              <strong className="text-slate-800">Business Transfers:</strong> In mergers, acquisitions, or
              asset sales, your information may be transferred as part of the transaction.
            </li>
            <li>
              <strong className="text-slate-800">With Your Consent:</strong> Or at your direction, such as
              when you publicly post reviews or connect to social media.
            </li>
            <li>
              <strong className="text-slate-800">Aggregated or Anonymized Data:</strong> In
              non-identifiable form for analytics or advertising.
            </li>
          </LegalList>
          <p>
            We do not sell your personal information for monetary compensation in the traditional sense.
            However, we may share data with advertising partners for targeted advertising (subject to your
            choices).
          </p>
        </LegalSection>

        <LegalSection id="cookies" title="4. Cookies and Tracking Technologies">
          <p>We use cookies, pixels, web beacons, and similar technologies to:</p>
          <LegalList>
            <li>Authenticate users and remember preferences.</li>
            <li>Analyze usage and improve performance.</li>
            <li>Deliver personalized ads on and off our Site.</li>
          </LegalList>
          <p>
            You can manage cookie preferences through your browser settings. We also honor &ldquo;Do Not
            Track&rdquo; signals where feasible. For more details, see our{' '}
            <Link href="/cookies" className="font-medium text-slate-900 underline-offset-2 hover:underline">
              Cookie Policy
            </Link>
            .
          </p>

          <LegalSubheading>Third-Party Analytics and Advertising</LegalSubheading>
          <LegalList>
            <li>Google Analytics, Meta Pixels, or similar services help us understand traffic and user behavior.</li>
            <li>Advertising partners may collect data for interest-based advertising.</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="security" title="5. Data Security">
          <p>
            We implement reasonable administrative, technical, and physical safeguards to protect your
            personal information (for example, encryption for transmissions and access controls). However,
            no security system is infallible. You are responsible for keeping your Account credentials
            secure.
          </p>
        </LegalSection>

        <LegalSection id="retention" title="6. Data Retention">
          <p>
            We retain your information for as long as necessary to fulfill the purposes outlined, comply
            with legal obligations, resolve disputes, and enforce agreements. When no longer needed, we
            securely delete or anonymize it.
          </p>
        </LegalSection>

        <LegalSection id="your-rights" title="7. Your Rights and Choices">
          <p>Depending on your location, you may have rights regarding your personal data:</p>
          <LegalList>
            <li>Access, correction, deletion, or portability of your data.</li>
            <li>Opt-out of marketing communications (unsubscribe link in emails).</li>
            <li>Limit processing or object to certain uses.</li>
            <li>Withdraw consent where applicable.</li>
          </LegalList>

          <LegalSubheading>California Residents (CCPA/CPRA)</LegalSubheading>
          <p>
            You have additional rights including the right to know, delete, and opt-out of
            &ldquo;sales&rdquo; of personal information. We do not sell personal information but allow
            sharing for targeted advertising. Submit requests via{' '}
            <a
              href="mailto:privacy@ticket95.com"
              className="font-medium text-slate-900 underline-offset-2 hover:underline"
            >
              privacy@ticket95.com
            </a>
            .
          </p>

          <LegalSubheading>EU/UK/EEA Residents (GDPR)</LegalSubheading>
          <p>
            You have rights to access, rectify, erase, restrict processing, data portability, and object.
            Contact our Data Protection Officer if designated.
          </p>

          <LegalSubheading>Other Jurisdictions</LegalSubheading>
          <p>Similar rights may apply under local laws.</p>

          <p>
            To exercise rights, email{' '}
            <a
              href="mailto:privacy@ticket95.com"
              className="font-medium text-slate-900 underline-offset-2 hover:underline"
            >
              privacy@ticket95.com
            </a>{' '}
            or use our{' '}
            <Link href="/contact" className="font-medium text-slate-900 underline-offset-2 hover:underline">
              privacy request form
            </Link>
            . We will respond within applicable timeframes and may verify your identity.
          </p>
        </LegalSection>

        <LegalSection id="children" title="8. Children's Privacy">
          <p>
            The Services are not directed to children under 13 (or 16 in certain jurisdictions). We do not
            knowingly collect personal information from children without verifiable parental consent. If we
            learn we have collected such data, we will delete it.
          </p>
          <p>
            Parents and guardians: contact us if you believe your child has provided information.
          </p>
        </LegalSection>

        <LegalSection id="international" title="9. International Data Transfers">
          <p>
            Ticket95 is based in the United States. Your data may be transferred to and processed in
            countries outside your jurisdiction, which may have different data protection standards. We use
            appropriate safeguards (for example, Standard Contractual Clauses) for such transfers.
          </p>
        </LegalSection>

        <LegalSection id="third-party-links" title="10. Links to Third-Party Sites">
          <p>
            Our Services may contain links to third-party websites or services. We are not responsible for
            their privacy practices. Review their policies before providing information.
          </p>
        </LegalSection>

        <LegalSection id="changes" title="11. Changes to This Privacy Policy">
          <p>
            We may update this Policy periodically. We will notify you of material changes by posting the
            updated Policy with a new &ldquo;Last Updated&rdquo; date, emailing you, or through other
            prominent notice. Continued use after changes constitutes acceptance.
          </p>
        </LegalSection>

        <LegalSection id="contact" title="12. Contact Us">
          <p>For questions, concerns, or to exercise your rights:</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            <li>
              <strong className="text-slate-800">Email:</strong>{' '}
              <a
                href="mailto:privacy@ticket95.com"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                privacy@ticket95.com
              </a>
            </li>
            <li>
              <strong className="text-slate-800">Mail:</strong> Ticket95 Inc., Attn: Privacy Officer —
              please{' '}
              <Link href="/contact" className="font-medium text-slate-900 underline-offset-2 hover:underline">
                contact us
              </Link>{' '}
              for mailing address details.
            </li>
          </ul>
          <p className="border-t border-slate-200/80 pt-4 text-slate-700">
            We will endeavor to address your concerns promptly.
          </p>
        </LegalSection>
      </div>
    </LegalDocumentLayout>
  );
}
