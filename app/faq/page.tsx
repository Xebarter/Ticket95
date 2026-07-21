import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, Mail, Phone, ShieldCheck, Ticket } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'FAQ | Ticket95.com',
  description: 'Frequently asked questions about accounts, tickets, refunds, and organizer workflows.',
};

export default function FaqPage() {
  return (
    <StaticPageLayout
      title="Frequently Asked Questions"
      description="Quick answers for buyers, organizers, and event staff using Ticket95.com."
      lastUpdated="July 21, 2026"
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-5">
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Need help?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse the answers below. If you still need assistance, visit{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  Contact support
                </Link>{' '}
                and include your order details.
              </p>
            </div>
          </div>
        </div>

        {/* General Questions */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-white/60 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Ticket className="h-4 w-4 text-primary" />
            General Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger>What is Ticket95.com?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Ticket95.com is an online ticketing platform that makes it easy for customers to
                  discover, purchase, and manage tickets for concerts, sports events, movies, theatre
                  performances, festivals, and other entertainment experiences.
                </p>
                <p className="mt-3">
                  We connect event organizers with audiences by providing a secure and convenient way
                  to sell and access event tickets.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q2">
              <AccordionTrigger>What types of events can I find on Ticket95.com?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Ticket95.com offers tickets for a wide range of events, including:
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Music concerts and live performances</li>
                  <li>Sports events</li>
                  <li>Movie screenings</li>
                  <li>Theatre and comedy shows</li>
                  <li>Festivals and cultural events</li>
                  <li>Conferences and exhibitions</li>
                  <li>Corporate and entertainment events</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q3">
              <AccordionTrigger>Do I need an account to buy tickets?</AccordionTrigger>
              <AccordionContent>
                <p>
                  No. You may be able to purchase tickets as a guest depending on the event settings.
                  However, creating an account is recommended because it allows you to:
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Easily access your tickets</li>
                  <li>View your purchase history</li>
                  <li>Receive event updates</li>
                  <li>Manage your profile</li>
                  <li>Enjoy faster checkout for future purchases</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q4">
              <AccordionTrigger>How do I get started on Ticket95.com?</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Click Sign In</li>
                  <li>Enter your details</li>
                  <li>If this is your first time, your profile will be created automatically</li>
                  <li>Start discovering and purchasing tickets</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Buying Tickets */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-white/60 p-5">
          <h2 className="text-base font-semibold text-foreground">Buying Tickets</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q5">
              <AccordionTrigger>How do I buy a ticket on Ticket95.com?</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Browse available events</li>
                  <li>Select your preferred event</li>
                  <li>Choose your ticket category or seat (where applicable)</li>
                  <li>Click Buy Ticket</li>
                  <li>Complete your payment</li>
                  <li>Receive your ticket confirmation</li>
                </ol>
                <p className="mt-3">
                  Your ticket will be available through your Ticket95.com account and/or sent to your email.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q6">
              <AccordionTrigger>
                How do I know if my ticket purchase was successful?
              </AccordionTrigger>
              <AccordionContent>
                <p>After successful payment, you will receive:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>A confirmation message</li>
                  <li>Your ticket details</li>
                  <li>A digital ticket or QR code</li>
                  <li>Purchase information through your registered email or account</li>
                </ul>
                <p className="mt-3">
                  If you do not receive confirmation after payment, contact Ticket95.com support.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q7">
              <AccordionTrigger>Can I buy multiple tickets?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Yes. You can purchase multiple tickets for most events, depending on availability and any limits set by the event organizer.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q8">
              <AccordionTrigger>Can I choose my seat?</AccordionTrigger>
              <AccordionContent>
                <p>For events with reserved seating, you can select available seats during checkout.</p>
                <p className="mt-3">
                  For general admission events, tickets grant access to the event area without assigned seating.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q9">
              <AccordionTrigger>Can I buy tickets on behalf of someone else?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Yes. You can purchase tickets for another person. However, ensure that the ticket details and attendee information are accurate where required.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Payments */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-white/60 p-5">
          <h2 className="text-base font-semibold text-foreground">Payments</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q10">
              <AccordionTrigger>What payment methods does Ticket95.com accept?</AccordionTrigger>
              <AccordionContent>
                <p>Ticket95.com supports secure digital payment methods, which may include:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Mobile money payments</li>
                  <li>Debit and credit cards</li>
                  <li>Online payment platforms</li>
                  <li>Other available payment options displayed during checkout</li>
                </ul>
                <p className="mt-3">
                  Available payment methods may vary depending on your location.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q11">
              <AccordionTrigger>Is my payment information secure?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Yes. Ticket95.com uses secure payment processing systems designed to protect customer payment information and transactions.
                </p>
                <p className="mt-3">
                  Ticket95.com does not store sensitive payment details such as card PINs.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q12">
              <AccordionTrigger>What happens if my payment fails?</AccordionTrigger>
              <AccordionContent>
                <p>If payment fails:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Confirm that you have sufficient funds</li>
                  <li>Check your internet connection</li>
                  <li>Try again using another payment method</li>
                </ul>
                <p className="mt-3">
                  If money was deducted but you did not receive a ticket, contact customer support with your transaction details.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q13">
              <AccordionTrigger>
                I was charged but did not receive my ticket. What should I do?
              </AccordionTrigger>
              <AccordionContent>
                <p>Please contact Ticket95.com support with:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Your name</li>
                  <li>Phone number/email used during purchase</li>
                  <li>Transaction reference</li>
                  <li>Event name</li>
                  <li>Payment receipt</li>
                </ul>
                <p className="mt-3">Our team will verify the payment and assist you.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Tickets & Access */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-white/60 p-5">
          <h2 className="text-base font-semibold text-foreground">Tickets &amp; Access</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q14">
              <AccordionTrigger>How do I receive my ticket?</AccordionTrigger>
              <AccordionContent>
                <p>Tickets may be delivered through:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Email confirmation</li>
                  <li>Your Ticket95.com account</li>
                  <li>SMS notifications</li>
                  <li>Mobile app (where available)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q15">
              <AccordionTrigger>Can I use a digital ticket at the event entrance?</AccordionTrigger>
              <AccordionContent>
                <p>Yes. Most Ticket95.com tickets can be presented digitally using:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>QR codes</li>
                  <li>Digital ticket passes</li>
                  <li>Mobile confirmations</li>
                </ul>
                <p className="mt-3">Event staff will scan and verify your ticket before entry.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q16">
              <AccordionTrigger>Can I print my ticket?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Yes, where applicable. However, digital tickets are usually accepted and provide a faster entry experience.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q17">
              <AccordionTrigger>What happens if I lose my ticket?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Do not worry. Log into your Ticket95.com account to access your purchased tickets. You can also contact support for assistance.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q18">
              <AccordionTrigger>Can I transfer my ticket to another person?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Ticket transfer depends on the event organizer&apos;s policy. Some tickets can be transferred while others are assigned to a specific person.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Refunds & Cancellations */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-white/60 p-5">
          <h2 className="text-base font-semibold text-foreground">Refunds &amp; Cancellations</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q19">
              <AccordionTrigger>Can I get a refund after buying a ticket?</AccordionTrigger>
              <AccordionContent>
                <p>Refund policies depend on the event organizer and the terms of the event.</p>
                <p className="mt-3">Tickets are generally non-refundable unless:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>The event is cancelled</li>
                  <li>The event organizer approves refunds</li>
                  <li>There are exceptional circumstances covered under the refund policy</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q20">
              <AccordionTrigger>What happens if an event is cancelled?</AccordionTrigger>
              <AccordionContent>
                <p>
                  If an event is cancelled, Ticket95.com will communicate available options, which may include:
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Refund processing</li>
                  <li>Ticket transfers</li>
                  <li>Rescheduled event arrangements</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q21">
              <AccordionTrigger>What happens if an event date changes?</AccordionTrigger>
              <AccordionContent>
                <p>If an event is postponed or rescheduled:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Your ticket may remain valid for the new date</li>
                  <li>You will receive updates from Ticket95.com or the organizer</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Event Organizers */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-white/60 p-5">
          <h2 className="text-base font-semibold text-foreground">Event Organizers</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q22">
              <AccordionTrigger>Can I sell tickets for my event on Ticket95.com?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Yes. Ticket95.com provides event organizers with tools to create, manage, promote, and sell tickets for their events.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q23">
              <AccordionTrigger>How can I list my event on Ticket95.com?</AccordionTrigger>
              <AccordionContent>
                <p>To list an event:</p>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Register as an organizer</li>
                  <li>Submit your event details</li>
                  <li>Provide required information</li>
                  <li>Set ticket categories and pricing</li>
                  <li>Publish your event after approval</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q24">
              <AccordionTrigger>What types of organizers can use Ticket95.com?</AccordionTrigger>
              <AccordionContent>
                <p>Ticket95.com supports:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Concert promoters</li>
                  <li>Sports organizers</li>
                  <li>Theatre groups</li>
                  <li>Schools and universities</li>
                  <li>Churches and communities</li>
                  <li>Corporate event planners</li>
                  <li>Entertainment companies</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q25">
              <AccordionTrigger>How does Ticket95.com help event organizers?</AccordionTrigger>
              <AccordionContent>
                <p>Ticket95.com helps organizers with:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Online ticket sales</li>
                  <li>Digital ticket verification</li>
                  <li>Event promotion</li>
                  <li>Customer management</li>
                  <li>Sales tracking</li>
                  <li>Attendance management</li>
                  <li>Security &amp; Trust</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Security & Trust */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-white/60 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Security &amp; Trust
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q26">
              <AccordionTrigger>How do I know my Ticket95.com ticket is genuine?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Tickets purchased directly through Ticket95.com contain unique verification details such as QR codes or ticket identifiers.
                  Avoid buying tickets from unofficial sellers.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q27">
              <AccordionTrigger>Can someone use my ticket before me?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Each ticket has unique verification details. Once scanned successfully, duplicate copies may not be accepted.
                  Keep your ticket information secure.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q28">
              <AccordionTrigger>What should I do if I suspect ticket fraud?</AccordionTrigger>
              <AccordionContent>
                <p>Contact Ticket95.com immediately if:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>You purchased from an unauthorized seller</li>
                  <li>Your ticket appears invalid</li>
                  <li>Someone is using your ticket details</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Support */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-white/60 p-5">
          <h2 className="text-base font-semibold text-foreground">Support</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q29">
              <AccordionTrigger>How do I contact Ticket95.com support?</AccordionTrigger>
              <AccordionContent>
                <p>You can contact our support team through:</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <a
                      className="font-medium text-slate-900 hover:underline"
                      href="mailto:support@ticket95.com"
                    >
                      support@ticket95.com
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span>Phone/WhatsApp:</span>
                    <Link href="/contact" className="font-medium text-primary hover:underline">
                      contact support
                    </Link>
                  </li>
                  <li>
                    Website support portal:{' '}
                    <Link href="/contact" className="font-medium text-primary hover:underline">
                      Ticket95.com
                    </Link>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q30">
              <AccordionTrigger>How quickly does Ticket95.com respond to support requests?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Our support team aims to respond as quickly as possible, especially for urgent event-day issues.
                  Response times may vary depending on the volume of requests.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* For Event Day */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-white/60 p-5">
          <h2 className="text-base font-semibold text-foreground">For Event Day</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q31">
              <AccordionTrigger>What should I bring to the event?</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Your digital ticket or QR code</li>
                  <li>Valid identification if required</li>
                  <li>Any event-specific requirements communicated by the organizer</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q32">
              <AccordionTrigger>How early should I arrive?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Arrival time depends on the event. We recommend arriving early to allow time for:
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Ticket verification</li>
                  <li>Security checks</li>
                  <li>Finding your seat or event area</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q33">
              <AccordionTrigger>What happens if my QR code does not scan?</AccordionTrigger>
              <AccordionContent>
                <p>Ensure:</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Your screen brightness is high</li>
                  <li>The QR code is clear</li>
                  <li>You have the correct ticket</li>
                </ul>
                <p className="mt-3">
                  If the issue continues, approach the event support desk.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </StaticPageLayout>
  );
}
