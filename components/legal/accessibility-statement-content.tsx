import Link from 'next/link';
import {
  LegalCallout,
  LegalDocumentLayout,
  LegalList,
  LegalSection,
  LegalSubheading,
  type LegalTocItem,
} from '@/components/legal/legal-document-layout';

const EFFECTIVE_DATE = 'July 27, 2026';
const LAST_UPDATED = 'July 27, 2026';

const ACCESSIBILITY_EMAIL = 'accessibility@ticket95.com';

export const ACCESSIBILITY_TOC: LegalTocItem[] = [
  { id: 'commitment', label: '1. Our Commitment' },
  { id: 'conformance', label: '2. Conformance Status' },
  { id: 'features', label: '3. Accessibility Features' },
  { id: 'limitations', label: '4. Known Limitations' },
  { id: 'compatibility', label: '5. Browser & Assistive Tech' },
  { id: 'technical', label: '6. Technical Specifications' },
  { id: 'assessment', label: '7. Assessment Approach' },
  { id: 'feedback', label: '8. Feedback and Contact' },
  { id: 'improvement', label: '9. Continuous Improvement' },
  { id: 'complaints', label: '10. Formal Complaints' },
];

export function AccessibilityStatementContent() {
  return (
    <LegalDocumentLayout
      title="Accessibility Statement"
      description="Ticket95.com is committed to digital accessibility for people with disabilities. This statement describes our standards, current features, known limitations, and how to report barriers."
      effectiveDate={EFFECTIVE_DATE}
      lastUpdated={LAST_UPDATED}
      toc={ACCESSIBILITY_TOC}
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <LegalCallout>
          <p className="font-semibold">We welcome your feedback.</p>
          <p className="mt-2">
            If you encounter an accessibility barrier on Ticket95, please contact us at{' '}
            <a
              href={`mailto:${ACCESSIBILITY_EMAIL}`}
              className="font-medium underline-offset-2 hover:underline"
            >
              {ACCESSIBILITY_EMAIL}
            </a>{' '}
            or through our{' '}
            <Link href="/contact" className="font-medium underline-offset-2 hover:underline">
              Contact page
            </Link>
            . We aim to respond within 5–10 business days.
          </p>
        </LegalCallout>

        <div className="mt-8 space-y-4 text-sm leading-7 text-slate-600">
          <p>
            Ticket95.com (&ldquo;Ticket95,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;) is committed to ensuring digital accessibility for people with
            disabilities. We are continually improving the user experience for everyone and applying
            the relevant accessibility standards so that our website, mobile site, and related
            services (collectively, the &ldquo;Site&rdquo;) can be used by as many people as possible,
            including those who rely on assistive technologies.
          </p>
          <p>
            This Accessibility Statement applies to ticket95.com and covers the purchase of sports,
            movie, concert, theatre, and live-event tickets.
          </p>
        </div>

        <LegalSection id="commitment" title="1. Our Commitment">
          <p>
            We aim to make Ticket95 accessible to all users, regardless of ability or the technology
            they use. Our goal is to conform to the Web Content Accessibility Guidelines (WCAG) 2.2
            Level AA (or the latest published version of WCAG that is widely adopted). We also strive
            to meet applicable legal requirements in the jurisdictions where we operate, including
            the Americans with Disabilities Act (ADA), the Equality Act 2010 (UK), the European
            Accessibility Act, and other relevant national and regional accessibility laws.
          </p>
        </LegalSection>

        <LegalSection id="conformance" title="2. Conformance Status">
          <p>
            The Site is <strong className="text-slate-800">partially conformant</strong> with WCAG 2.2
            Level AA.
          </p>
          <p>
            &ldquo;Partially conformant&rdquo; means that some parts of the content do not fully meet
            the accessibility standard. We are actively working to address known issues and improve
            overall conformance.
          </p>
          <p>We regularly test key user journeys, including:</p>
          <LegalList>
            <li>Searching and browsing events (sports, movies, concerts, theatre)</li>
            <li>Viewing event details, seating maps, and ticket options</li>
            <li>Adding tickets to the basket / cart</li>
            <li>Account creation, login, and account management</li>
            <li>Checkout and payment flows</li>
            <li>Order confirmation and ticket delivery / download pages</li>
            <li>Contact and support pages</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="features" title="3. Accessibility Features Currently in Place">
          <p>We have implemented (or are continually improving) the following features:</p>
          <LegalList>
            <li>
              Semantic HTML and proper heading structure so screen readers can navigate content
              logically
            </li>
            <li>
              Keyboard accessibility for all primary interactive elements (search, filters, ticket
              selection, forms, buttons, and navigation)
            </li>
            <li>
              Visible focus indicators so keyboard users can see which element is currently selected
            </li>
            <li>
              Alternative text for meaningful images, icons, and event artwork (decorative images are
              marked appropriately)
            </li>
            <li>
              Sufficient colour contrast for text and interactive elements against their backgrounds
            </li>
            <li>
              Resizable text that can be enlarged up to 200% without loss of content or functionality
              (in most browsers)
            </li>
            <li>
              Form labels and error identification that are clear and associated with the correct
              fields
            </li>
            <li>ARIA landmarks, roles, and labels where needed to improve screen-reader support</li>
            <li>Skip-to-content links to allow users to bypass repeated navigation</li>
            <li>Responsive design that works across desktop, tablet, and mobile devices</li>
            <li>
              Support for browser and operating-system accessibility settings (high contrast, reduced
              motion, etc., where feasible)
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="limitations" title="4. Known Limitations and Areas for Improvement">
          <p>
            While we work continuously to improve accessibility, some limitations currently exist:
          </p>
          <LegalList>
            <li>
              Certain third-party embedded content (payment providers, seating charts from venues,
              video trailers, social media widgets, or live chat tools) may not fully meet WCAG 2.2 AA.
            </li>
            <li>
              Complex interactive seating maps or dynamic ticket availability displays can present
              challenges for some screen-reader and keyboard users.
            </li>
            <li>Some older event pages or archived content may not yet have been fully updated.</li>
            <li>
              PDF tickets or downloadable documents may not always be fully accessible; we are working
              toward providing accessible alternatives where possible.
            </li>
            <li>
              Occasional issues with colour contrast or focus order may appear after content updates;
              these are prioritised for remediation.
            </li>
          </LegalList>
          <p>
            We document known issues and track them for resolution as part of our ongoing accessibility
            programme.
          </p>
        </LegalSection>

        <LegalSection id="compatibility" title="5. Compatibility with Browsers and Assistive Technologies">
          <p>The Site is designed to be compatible with:</p>
          <LegalList>
            <li>Recent versions of major browsers (Chrome, Firefox, Safari, Edge)</li>
            <li>
              Common assistive technologies, including screen readers (JAWS, NVDA, VoiceOver,
              TalkBack), screen magnifiers, and voice-control software
            </li>
            <li>Keyboard-only navigation</li>
            <li>Mobile accessibility features on iOS and Android</li>
          </LegalList>
          <p>
            We test with a combination of automated tools, manual keyboard testing, and
            assistive-technology testing. Full compatibility cannot be guaranteed with every assistive
            technology or browser version, especially older ones.
          </p>
        </LegalSection>

        <LegalSection id="technical" title="6. Technical Specifications">
          <p>Accessibility of Ticket95 relies on the following technologies to work:</p>
          <LegalList>
            <li>HTML</li>
            <li>WAI-ARIA</li>
            <li>CSS</li>
            <li>JavaScript</li>
          </LegalList>
          <p>These technologies are relied upon for conformance with the accessibility standards used.</p>
        </LegalSection>

        <LegalSection id="assessment" title="7. Assessment Approach">
          <p>We assess the accessibility of Ticket95 through a combination of:</p>
          <LegalList>
            <li>Automated accessibility scanning tools</li>
            <li>Manual keyboard and screen-reader testing</li>
            <li>Periodic expert reviews</li>
            <li>User feedback</li>
            <li>
              Continuous monitoring of key user journeys (search → event page → basket → checkout)
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="feedback" title="8. Feedback and Contact">
          <p>
            We welcome your feedback on the accessibility of Ticket95. If you encounter any barriers,
            have difficulty using any part of the Site, or need information in an alternative format,
            please let us know:
          </p>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            <li>
              <strong className="text-slate-800">Email:</strong>{' '}
              <a
                href={`mailto:${ACCESSIBILITY_EMAIL}`}
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                {ACCESSIBILITY_EMAIL}
              </a>{' '}
              (or the address listed on our{' '}
              <Link href="/contact" className="font-medium text-slate-900 underline-offset-2 hover:underline">
                Contact page
              </Link>
              )
            </li>
            <li>
              <strong className="text-slate-800">Subject line suggestion:</strong> Accessibility
              Feedback – [brief description]
            </li>
          </ul>

          <LegalSubheading>When contacting us, please include:</LegalSubheading>
          <LegalList>
            <li>The web page or feature you were trying to use</li>
            <li>A description of the problem</li>
            <li>The assistive technology (if any) and browser/device you were using</li>
            <li>Your preferred method of contact</li>
          </LegalList>

          <p>
            We aim to respond to accessibility feedback within 5–10 business days and will work with
            you to find a suitable solution.
          </p>
          <p>
            If you are not satisfied with our response, you may also have the right to contact the
            relevant equality or disability rights body in your country.
          </p>
        </LegalSection>

        <LegalSection id="improvement" title="9. Continuous Improvement">
          <p>Accessibility is an ongoing effort. We:</p>
          <LegalList>
            <li>Include accessibility considerations in new feature design and development</li>
            <li>Provide training and resources to our product, design, and engineering teams</li>
            <li>Prioritise remediation of reported issues based on severity and user impact</li>
            <li>Review and update this Accessibility Statement as our Site and practices evolve</li>
          </LegalList>
        </LegalSection>

        <LegalSection id="complaints" title="10. Formal Complaints">
          <p>
            If you believe you have experienced discrimination related to accessibility and are not
            satisfied with our response, you may escalate the matter to the appropriate enforcement
            body in your jurisdiction (for example, the Equality and Human Rights Commission in the UK,
            or the relevant authority under the ADA or European Accessibility Act).
          </p>
        </LegalSection>
      </div>
    </LegalDocumentLayout>
  );
}
