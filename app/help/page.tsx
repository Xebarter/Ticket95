import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CreditCard,
  HelpCircle,
  Mail,
  Phone,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'Help Center | Ticket95.com',
  description: 'Get help with buying tickets, payments, account access, and organizer workflows.',
};

const CONTACT_EMAIL = 'support@ticket95.com';
const CONTACT_WHATSAPP_PHONE = '[Insert Number]';
const CONTACT_WEBSITE = 'Ticket95.com';

export default function HelpCenterPage() {
  return (
    <StaticPageLayout
      title="Help Center"
      description="Find quick answers and practical steps for buying tickets, managing your profile, organizing events, and resolving payment issues."
      lastUpdated="July 21, 2026"
    >
      <div className="space-y-8">
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-0.5 h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Welcome to the Ticket95 Help Center</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Need help with tickets, payments, events, or your account? Find quick solutions below.
                If you still need assistance, contact our support team.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-white p-5">
          <p className="text-sm font-semibold text-foreground">How can we help you?</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            <li>
              <Link href="#buying-tickets" className="block rounded-lg border border-border/70 bg-muted/20 px-4 py-3 hover:bg-muted/30">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Ticket className="h-4 w-4 text-primary" />
                  Buying Tickets
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Purchase flow, tickets access, transfers, and event entry.
                </span>
              </Link>
            </li>
            <li>
              <Link href="#payments" className="block rounded-lg border border-border/70 bg-muted/20 px-4 py-3 hover:bg-muted/30">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Payments & Transactions
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Successful payment issues and payment failures.
                </span>
              </Link>
            </li>
            <li>
              <Link href="#tickets" className="block rounded-lg border border-border/70 bg-muted/20 px-4 py-3 hover:bg-muted/30">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Ticket className="h-4 w-4 text-primary" />
                  Tickets
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  QR codes, printing, recovery, and transfers.
                </span>
              </Link>
            </li>
            <li>
              <Link href="#organizer-support" className="block rounded-lg border border-border/70 bg-muted/20 px-4 py-3 hover:bg-muted/30">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Event Organizer Support
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Selling tickets and event hosting workflows.
                </span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Buying Tickets */}
        <section id="buying-tickets" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Buying Tickets</h2>
          <div className="space-y-3 rounded-xl border border-border/70 bg-white p-5">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="buy-1">
                <AccordionTrigger>How do I purchase a ticket?</AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Search for your preferred event.</li>
                    <li>Select the event date and ticket type.</li>
                    <li>Choose the number of tickets you need.</li>
                    <li>Complete payment.</li>
                    <li>Receive your digital ticket instantly.</li>
                  </ol>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Your ticket will be available through your Ticket95 account and sent to your registered email or phone number.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="buy-2">
                <AccordionTrigger>I cannot find an event I want. What should I do?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    If you cannot find an event:
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Check that the event name is spelled correctly.</li>
                    <li>Browse the event categories.</li>
                    <li>Check whether ticket sales have started.</li>
                    <li>Contact the event organizer or Ticket95 support.</li>
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    New events are added regularly.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="buy-3">
                <AccordionTrigger>Can I purchase tickets without creating an account?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Yes. Some events allow guest purchases. However, creating a Ticket95 account makes it easier to:
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Access your tickets anytime</li>
                    <li>Track your purchases</li>
                    <li>Receive event updates</li>
                    <li>Manage your bookings</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Payments */}
        <section id="payments" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Payments &amp; Transactions</h2>
          <div className="space-y-3 rounded-xl border border-border/70 bg-white p-5">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="pay-1">
                <AccordionTrigger>My payment was successful but I did not receive my ticket.</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    If money was deducted but your ticket was not received:
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Check your email inbox and spam folder.</li>
                    <li>Log into your Ticket95 account.</li>
                    <li>Check your ticket history.</li>
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Contact support with your payment reference.
                  </p>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-foreground">Please provide:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      <li>Transaction ID</li>
                      <li>Phone number/email used</li>
                      <li>Event name</li>
                      <li>Payment receipt</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pay-2">
                <AccordionTrigger>My payment failed. What should I do?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">Try the following:</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Confirm you have sufficient funds.</li>
                    <li>Check your internet connection.</li>
                    <li>Retry the payment.</li>
                    <li>Use another payment method.</li>
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    If the issue continues, contact Ticket95 support.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pay-3">
                <AccordionTrigger>What payment methods are available?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Ticket95 supports secure payment methods including:
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Mobile money</li>
                    <li>Debit and credit cards</li>
                    <li>Online payment solutions</li>
                    <li>Other payment options displayed during checkout</li>
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Payment options may vary depending on your country and event.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Tickets */}
        <section id="tickets" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Tickets</h2>
          <div className="space-y-3 rounded-xl border border-border/70 bg-white p-5">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="t-1">
                <AccordionTrigger>Where can I find my ticket?</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Your Ticket95 account dashboard</li>
                    <li>Confirmation email</li>
                    <li>SMS notification (where available)</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="t-2">
                <AccordionTrigger>How do I use my digital ticket?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">At the event entrance:</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Open your Ticket95 ticket.</li>
                    <li>Present the QR code or ticket confirmation.</li>
                    <li>Allow staff to scan and verify your ticket.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="t-3">
                <AccordionTrigger>I lost my ticket. Can I recover it?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">Yes. Simply:</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Log into your Ticket95 account.</li>
                    <li>Open My Tickets.</li>
                    <li>Select the event.</li>
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    If you still cannot find your ticket, contact support.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="t-4">
                <AccordionTrigger>Can I transfer my ticket to another person?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Ticket transfers depend on the event organizer&apos;s policy.
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Some tickets may be transferred.</li>
                    <li>Others may be linked to the original purchaser.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Event entry */}
        <section id="event-entry" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Event Entry &amp; Attendance</h2>
          <div className="space-y-3 rounded-xl border border-border/70 bg-white p-5">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="e-1">
                <AccordionTrigger>What should I bring when attending an event?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">Bring:</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Your digital ticket or QR code</li>
                    <li>Valid identification if required</li>
                    <li>Any event-specific requirements</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="e-2">
                <AccordionTrigger>What time should I arrive?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Arrival time depends on the event. We recommend arriving early to allow time for:
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Ticket verification</li>
                    <li>Security checks</li>
                    <li>Finding your seat/location</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="e-3">
                <AccordionTrigger>My ticket QR code is not scanning. What should I do?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">Try:</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Increasing your phone brightness.</li>
                    <li>Refreshing your ticket.</li>
                    <li>Checking that you are presenting the correct ticket.</li>
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    If the problem continues, visit the event help desk.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Refunds */}
        <section id="refunds" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Refunds &amp; Cancellations</h2>
          <div className="space-y-3 rounded-xl border border-border/70 bg-white p-5">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="r-1">
                <AccordionTrigger>Can I cancel my ticket?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Ticket cancellation depends on the event&apos;s refund policy.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Some tickets may be non-refundable after purchase.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="r-2">
                <AccordionTrigger>My event was cancelled. Will I get a refund?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    If an event is cancelled, Ticket95 will communicate the available options, which may include:
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Refund processing</li>
                    <li>Ticket transfers</li>
                    <li>Rescheduled event access</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="r-3">
                <AccordionTrigger>The event date changed. Is my ticket still valid?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    In most cases, tickets remain valid for the rescheduled date.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Ticket95 will communicate any changes from the event organizer.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Account */}
        <section id="account" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Account Support</h2>
          <div className="space-y-3 rounded-xl border border-border/70 bg-white p-5">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="a-1">
                <AccordionTrigger>How do I reset my password?</AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Select Forgot Password on the login page.</li>
                    <li>Enter your registered email.</li>
                    <li>Follow the password reset instructions.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="a-2">
                <AccordionTrigger>How do I update my account details?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">You can update your:</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Name</li>
                    <li>Email</li>
                    <li>Phone number</li>
                    <li>Password</li>
                    <li>Profile information</li>
                  </ul>
                  <p className="mt-3 text-sm text-muted-foreground">
                    from your account settings.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="a-3">
                <AccordionTrigger>How do I delete my Ticket95 account?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    To request account deletion, contact Ticket95 support.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Please note that some transaction records may need to be retained for legal and operational purposes.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Organizer */}
        <section id="organizer-support" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Event Organizer Support</h2>
          <div className="space-y-3 rounded-xl border border-border/70 bg-white p-5">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="o-1">
                <AccordionTrigger>How can I sell tickets for my event?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Event organizers can create an account and submit their events for approval.
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Sell digital tickets</li>
                    <li>Manage attendees</li>
                    <li>Track sales</li>
                    <li>Verify entry</li>
                    <li>Promote events</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="o-2">
                <AccordionTrigger>What events can be hosted on Ticket95?</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Concerts</li>
                    <li>Sports events</li>
                    <li>Movies</li>
                    <li>Theatre shows</li>
                    <li>Festivals</li>
                    <li>Conferences</li>
                    <li>School events</li>
                    <li>Corporate events</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="o-3">
                <AccordionTrigger>How do organizers receive ticket sales payments?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Payment settlement depends on the agreement between Ticket95 and the event organizer, including event completion and verification requirements.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Safety */}
        <section id="ticket-verification" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Safety &amp; Ticket Verification</h2>
          <div className="space-y-3 rounded-xl border border-border/70 bg-white p-5">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="s-1">
                <AccordionTrigger>How do I know my ticket is genuine?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Only tickets purchased through official Ticket95 channels should be trusted.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">Valid tickets contain verification details such as:</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Unique ticket ID</li>
                    <li>QR code</li>
                    <li>Event information</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="s-2">
                <AccordionTrigger>I bought a ticket from someone else. Will it work?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Tickets purchased from unofficial sellers may not be valid.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">Ticket95 recommends purchasing only through:</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Ticket95.com</li>
                    <li>Authorized event partners</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="s-3">
                <AccordionTrigger>How do I report suspicious activity?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Contact Ticket95 support if you notice:
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Fake tickets</li>
                    <li>Payment scams</li>
                    <li>Unauthorized ticket sales</li>
                    <li>Suspicious event listings</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Contact Ticket95 Support</h2>
          <div className="space-y-4 rounded-xl border border-border/70 bg-white p-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Need more help?</p>
              <p className="text-sm text-muted-foreground">
                Our support team is ready to assist you.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  Email
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <a className="font-medium text-slate-900 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  WhatsApp / Phone
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{CONTACT_WHATSAPP_PHONE}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Ticket className="h-4 w-4 text-primary" />
                Website
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{CONTACT_WEBSITE}</p>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">When contacting support, include:</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Your name</li>
                <li>Account email/phone</li>
                <li>Event name</li>
                <li>Ticket number</li>
                <li>Payment reference (if applicable)</li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                This helps us resolve your issue faster.
              </p>
            </div>
          </div>
        </section>

        {/* Popular topics */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Popular Help Topics</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Link
              href="#buying-tickets"
              className="rounded-xl border border-border/70 bg-white p-4 text-sm font-medium text-slate-900 hover:bg-muted/30"
            >
              Buy a ticket
            </Link>
            <Link
              href="#payments"
              className="rounded-xl border border-border/70 bg-white p-4 text-sm font-medium text-slate-900 hover:bg-muted/30"
            >
              Payment failed
            </Link>
            <Link
              href="#tickets"
              className="rounded-xl border border-border/70 bg-white p-4 text-sm font-medium text-slate-900 hover:bg-muted/30"
            >
              Ticket not received
            </Link>
            <Link
              href="#refunds"
              className="rounded-xl border border-border/70 bg-white p-4 text-sm font-medium text-slate-900 hover:bg-muted/30"
            >
              Request refund
            </Link>
            <Link
              href="#account"
              className="rounded-xl border border-border/70 bg-white p-4 text-sm font-medium text-slate-900 hover:bg-muted/30"
            >
              Account problems
            </Link>
            <Link
              href="#organizer-support"
              className="rounded-xl border border-border/70 bg-white p-4 text-sm font-medium text-slate-900 hover:bg-muted/30"
            >
              Sell tickets as an organizer
            </Link>
            <Link
              href="#ticket-verification"
              className="rounded-xl border border-border/70 bg-white p-4 text-sm font-medium text-slate-900 hover:bg-muted/30"
            >
              Verify a ticket
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-muted/20 p-5">
          <p className="text-sm font-semibold text-foreground">Ticket95 Support Promise</p>
          <p className="mt-2 text-sm text-muted-foreground">
            At Ticket95.com, we are committed to making event access simple, secure, and enjoyable.
            Whether you are attending a concert, cheering at a sports event, watching a movie, or
            experiencing live entertainment, our team is here to support you every step of the way.
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}

