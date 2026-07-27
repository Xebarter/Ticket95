import type { Metadata } from 'next';
import { AccessibilityStatementContent } from '@/components/legal/accessibility-statement-content';

export const metadata: Metadata = {
  title: 'Accessibility Statement | Ticket95.com',
  description:
    'Ticket95.com accessibility statement covering WCAG conformance, features, known limitations, and how to report barriers.',
};

export default function AccessibilityPage() {
  return <AccessibilityStatementContent />;
}
