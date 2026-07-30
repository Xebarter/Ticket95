import type { Metadata } from 'next';
import { AccessibilityStatementContent } from '@/components/legal/accessibility-statement-content';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Accessibility Statement',
  description:
    'Ticket95 accessibility statement covering WCAG conformance, features, known limitations, and how to report barriers.',
  path: '/accessibility',
});

export default function AccessibilityPage() {
  return <AccessibilityStatementContent />;
}
