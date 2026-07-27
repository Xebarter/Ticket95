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

const EFFECTIVE_DATE = 'July 27, 2026';
const LAST_UPDATED = 'July 27, 2026';

const POSTAL_ADDRESS = 'Mutungo Zone 1, Nakawa, Kampala, Uganda';

const COOKIE_CATEGORIES = [
  {
    category: 'Strictly Necessary',
    purpose: 'Site functionality, security, cart, payments',
    duration: 'Session or up to 1 year',
    examples:
      'Ticket95 session IDs, CSRF tokens, payment gateway cookies (e.g. Stripe, PayPal, Adyen)',
  },
  {
    category: 'Performance / Analytics',
    purpose: 'Site usage statistics & improvements',
    duration: 'Up to 2 years',
    examples:
      'Google Analytics, Google Tag Manager, Hotjar or similar heat-mapping tools',
  },
  {
    category: 'Functionality',
    purpose: 'Remember preferences & recent activity',
    duration: 'Up to 1 year',
    examples: 'Language/currency cookies, recent searches, favourited events',
  },
  {
    category: 'Advertising / Marketing',
    purpose: 'Personalised ads & campaign measurement',
    duration: 'Up to 2 years',
    examples:
      'Google Ads, Meta (Facebook/Instagram), TikTok, programmatic partners, retargeting pixels',
  },
  {
    category: 'Social / Sharing',
    purpose: 'Social login & content sharing',
    duration: 'Varies',
    examples: 'Facebook, X (Twitter), Instagram, YouTube, and similar platforms',
  },
] as const;

export const COOKIES_TOC: LegalTocItem[] = [
  { id: 'what-are-cookies', label: '1. What Are Cookies?' },
  { id: 'why-we-use', label: '2. Why We Use Cookies' },
  { id: 'cookies-we-use', label: '3. Cookies We Commonly Use' },
  { id: 'third-party', label: '4. Third-Party Cookies' },
  { id: 'duration', label: '5. How Long Cookies Last' },
  { id: 'manage', label: '6. How to Manage Cookies' },
  { id: 'dnt', label: '7. Do Not Track & GPC' },
  { id: 'personal-data', label: '8. Cookies & Personal Data' },
  { id: 'children', label: "9. Children's Privacy" },
  { id: 'updates', label: '10. Updates to This Policy' },
  { id: 'contact', label: '11. Contact Us' },
];

export function CookiesPolicyContent() {
  return (
    <LegalDocumentLayout
      title="Cookies Policy"
      description="This policy explains how Ticket95.com uses cookies and similar technologies on our website, mobile site, and related services."
      effectiveDate={EFFECTIVE_DATE}
      lastUpdated={LAST_UPDATED}
      toc={COOKIES_TOC}
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <LegalCallout>
          <p className="font-semibold">By continuing to use the Site, you consent to cookies.</p>
          <p className="mt-2">
            This Cookies Policy should be read together with our{' '}
            <Link href="/privacy" className="font-medium underline-offset-2 hover:underline">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="font-medium underline-offset-2 hover:underline">
              Terms of Service
            </Link>
            . You may disable cookies where your browser or device allows; note that essential cookies
            are required for core features such as login and ticket purchase.
          </p>
        </LegalCallout>

        <div className="mt-8 space-y-4 text-sm leading-7 text-slate-600">
          <p>
            Ticket95.com (&ldquo;Ticket95,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            is a ticket marketplace for sports events, movies, concerts, theatre, and live entertainment.
            This Cookies Policy explains how we use cookies and similar technologies on our website,
            mobile site, and related services (collectively, the &ldquo;Site&rdquo;).
          </p>
        </div>

        <LegalSection id="what-are-cookies" title="1. What Are Cookies?">
          <p>
            Cookies are small text files that are placed on your device (computer, tablet, or mobile)
            when you visit a website. They allow the site to recognise your device and store certain
            information about your preferences or past actions.
          </p>
          <p>Similar technologies we may use include:</p>
          <LegalList>
            <li>Local storage / session storage</li>
            <li>Pixel tags / web beacons</li>
            <li>SDK identifiers (on any mobile apps)</li>
            <li>Fingerprinting or device identifiers (in limited cases and only where permitted)</li>
          </LegalList>
          <p>Collectively we refer to these as &ldquo;cookies.&rdquo;</p>
        </LegalSection>

        <LegalSection id="why-we-use" title="2. Why We Use Cookies">
          <p>We use cookies for the following essential and legitimate purposes:</p>

          <LegalDefinitionList>
            <LegalDefinitionTerm term="Strictly Necessary / Essential Cookies">
              These are required for the Site to function. They enable core features such as security,
              network management, accessibility, shopping cart / basket functionality, account login,
              payment processing, fraud prevention, and load balancing. Without these cookies, key parts
              of Ticket95 (including purchasing tickets) cannot work properly. These cookies do not
              require consent under most privacy laws.
            </LegalDefinitionTerm>
            <LegalDefinitionTerm term="Performance & Analytics Cookies">
              These help us understand how visitors use the Site (pages visited, time spent, bounce
              rates, ticket search behaviour, conversion funnels, device types, and similar metrics). We
              use this data to improve site speed, navigation, search relevance, and overall user
              experience. Data is typically aggregated and anonymised or pseudonymised.
            </LegalDefinitionTerm>
            <LegalDefinitionTerm term="Functionality / Preference Cookies">
              These remember choices you make (language, currency, preferred sports teams or venues,
              recent searches, location settings, accessibility preferences) so we can provide a more
              personalised experience on return visits.
            </LegalDefinitionTerm>
            <LegalDefinitionTerm term="Advertising, Marketing & Targeting Cookies">
              These allow us (and selected partners) to deliver relevant advertisements about sports
              events, movies, concerts, and other tickets both on Ticket95 and on third-party sites. They
              also help measure the effectiveness of campaigns, limit how often you see the same ad, and
              prevent fraudulent clicks. Some of these cookies track browsing activity across sites.
            </LegalDefinitionTerm>
            <LegalDefinitionTerm term="Social Media & Sharing Cookies">
              If you interact with social sharing buttons or embedded content (for example, event
              trailers or team pages), the relevant social platforms may set cookies.
            </LegalDefinitionTerm>
          </LegalDefinitionList>
        </LegalSection>

        <LegalSection id="cookies-we-use" title="3. Cookies We Commonly Use">
          <p>
            The exact cookies in use may change as we update the Site or work with new partners. Below is
            a representative overview of categories and typical providers:
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 font-semibold text-slate-900">Category</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Purpose</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">Typical Duration</th>
                  <th className="px-4 py-3 font-semibold text-slate-900">
                    Examples of Providers / Cookies
                  </th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_CATEGORIES.map((row) => (
                  <tr key={row.category} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 align-top font-medium text-slate-800">{row.category}</td>
                    <td className="px-4 py-3 align-top text-slate-600">{row.purpose}</td>
                    <td className="px-4 py-3 align-top text-slate-600">{row.duration}</td>
                    <td className="px-4 py-3 align-top text-slate-600">{row.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            We may also use first-party cookies set directly by Ticket95 and third-party cookies set by
            our trusted partners.
          </p>
        </LegalSection>

        <LegalSection id="third-party" title="4. Third-Party Cookies">
          <p>
            Some cookies are placed by third parties that provide services on our behalf or whose content
            appears on the Site (payment processors, analytics providers, advertising networks, social
            platforms, and event partners). These third parties have their own privacy and cookie
            policies. We do not control their cookies and recommend reviewing their policies.
          </p>
          <p>
            Examples of partners that may set cookies include major payment providers, Google, Meta,
            analytics platforms, and advertising networks used to promote sports, movie, and live-event
            tickets.
          </p>
        </LegalSection>

        <LegalSection id="duration" title="5. How Long Cookies Last">
          <LegalList>
            <li>
              <strong className="text-slate-800">Session cookies</strong> — deleted when you close your
              browser.
            </li>
            <li>
              <strong className="text-slate-800">Persistent cookies</strong> — remain for a set period
              (from a few days up to two years, depending on the cookie) or until you delete them.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="manage" title="6. How to Manage or Disable Cookies">
          <p>
            You can control and/or delete cookies through your browser settings. Most browsers allow you
            to:
          </p>
          <LegalList>
            <li>See what cookies are stored and delete them individually or all at once</li>
            <li>Block third-party cookies</li>
            <li>Block cookies from specific sites</li>
            <li>Block all cookies</li>
            <li>Delete all cookies when you close the browser</li>
          </LegalList>

          <LegalSubheading>Popular browser guides</LegalSubheading>
          <LegalList>
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                Google Chrome
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                Mozilla Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                Apple Safari
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                Microsoft Edge
              </a>
            </li>
          </LegalList>

          <LegalSubheading>Industry opt-out tools</LegalSubheading>
          <LegalList>
            <li>
              <a
                href="https://optout.networkadvertising.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                Network Advertising Initiative (NAI) opt-out
              </a>
            </li>
            <li>
              <a
                href="https://optout.aboutads.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                Digital Advertising Alliance (DAA) opt-out
              </a>
            </li>
            <li>
              <a
                href="https://www.youronlinechoices.eu/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                European Interactive Digital Advertising Alliance (EDAA) Your Online Choices
              </a>
            </li>
            <li>
              <a
                href="https://adssettings.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                Google Ads Settings
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/adpreferences/ad_settings"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                Meta Ad Preferences
              </a>
            </li>
          </LegalList>

          <LegalSubheading>Important notes</LegalSubheading>
          <LegalList>
            <li>
              Blocking strictly necessary cookies will prevent you from logging in, adding tickets to
              your basket, or completing purchases on Ticket95.
            </li>
            <li>
              Disabling analytics or advertising cookies will not stop ads entirely; it will mainly
              reduce personalisation.
            </li>
            <li>
              If you use multiple devices or browsers, you will need to manage cookie settings on each
              one.
            </li>
            <li>
              Some mobile operating systems and apps have additional privacy controls (for example,
              Limit Ad Tracking / App Tracking Transparency).
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="dnt" title="7. Do Not Track and Global Privacy Controls">
          <p>
            Some browsers offer a &ldquo;Do Not Track&rdquo; (DNT) signal. There is currently no uniform
            standard for how websites should respond to DNT. Ticket95 does not currently alter its cookie
            practices solely in response to DNT signals. Where required by law (for example, certain U.S.
            state laws or the GDPR), we honour recognised Global Privacy Control (GPC) signals for
            applicable rights.
          </p>
        </LegalSection>

        <LegalSection id="personal-data" title="8. Cookies and Personal Data">
          <p>
            Where cookies collect or are linked to personal data (for example, a unique identifier
            combined with IP address, device information, or account details), that processing is covered
            by our{' '}
            <Link href="/privacy" className="font-medium text-slate-900 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>{' '}
            and applicable data protection laws (including the GDPR, UK GDPR, CCPA/CPRA, and other
            relevant regulations). You have rights regarding your personal data as described in the
            Privacy Policy.
          </p>
        </LegalSection>

        <LegalSection id="children" title="9. Children's Privacy">
          <p>
            Ticket95 is not directed at children under 16 (or the applicable age of digital consent in
            your jurisdiction). We do not knowingly collect personal information or set cookies for the
            purpose of profiling children. If you believe a child has provided us with personal data,
            please{' '}
            <Link href="/contact" className="font-medium text-slate-900 underline-offset-2 hover:underline">
              contact us
            </Link>{' '}
            so we can delete it.
          </p>
        </LegalSection>

        <LegalSection id="updates" title="10. Updates to This Cookies Policy">
          <p>
            We may update this Cookies Policy from time to time to reflect changes in technology, law, or
            our practices. The &ldquo;Last Updated&rdquo; date at the top will indicate when changes were
            made. Material changes will be highlighted on the Site or communicated by other appropriate
            means. Continued use of the Site after changes constitutes acceptance of the revised policy.
          </p>
        </LegalSection>

        <LegalSection id="contact" title="11. Contact Us">
          <p>If you have questions about our use of cookies or this policy, please contact us:</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            <li>
              <strong className="text-slate-800">Ticket95.com</strong>
            </li>
            <li>
              <strong className="text-slate-800">Email:</strong>{' '}
              <a
                href="mailto:privacy@ticket95.com"
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                privacy@ticket95.com
              </a>
              {' '}
              (or the address listed on our{' '}
              <Link href="/contact" className="font-medium text-slate-900 underline-offset-2 hover:underline">
                Contact
              </Link>{' '}
              /{' '}
              <Link href="/privacy" className="font-medium text-slate-900 underline-offset-2 hover:underline">
                Privacy
              </Link>{' '}
              page)
            </li>
            <li>
              <strong className="text-slate-800">Postal address:</strong> {POSTAL_ADDRESS}
            </li>
          </ul>
          <p className="border-t border-slate-200/80 pt-4 text-slate-700">
            For data protection queries in the EU/UK you may also contact our Data Protection Officer (if
            appointed) or the relevant supervisory authority.
          </p>
        </LegalSection>
      </div>
    </LegalDocumentLayout>
  );
}
