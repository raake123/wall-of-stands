"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Mail, Trash2, Flag } from "lucide-react";
import { useTheme } from "../lib/theme-context";
import {
  OPERATOR_NAME,
  OPERATOR_EMAIL,
  OPERATOR_AREA,
  GRIEVANCE_REPLY_DAYS,
} from "../lib/operator";
import { GCC_LABEL } from "../lib/filing";

export default function PrivacyPage() {
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, BG, CARD, BORDER, MUTED } = colors;

  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h2 className="text-sm font-black uppercase tracking-wide mb-2" style={{ color: GOLD }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed" style={{ color: MUTED }}>
        {children}
      </div>
    </div>
  );

  const Item = ({ children }) => (
    <li className="mb-1.5 flex gap-2">
      <span style={{ color: GOLD }}>•</span>
      <span style={{ wordBreak: "break-word" }}>{children}</span>
    </li>
  );

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: BG }}>
      <div className="max-w-md mx-auto px-4 py-6">
        <Link href="/" className="text-sm mb-5 inline-flex items-center gap-1 font-bold" style={{ color: MUTED }}>
          <ArrowLeft size={14} />
          Back to the wall
        </Link>

        <h1 className="text-2xl font-black uppercase tracking-tight mb-1" style={{ color: WHITE }}>
          Privacy & <span style={{ color: RED }}>rules</span>
        </h1>
        <p className="text-xs mb-6" style={{ color: MUTED }}>
          Wall of Stands is run by one resident of {OPERATOR_AREA}, not a company.
        </p>

        <div
          className="rounded-lg p-3 mb-6 text-xs flex items-start gap-2"
          style={{ border: "1px solid " + GREEN, color: GREEN, backgroundColor: CARD }}
        >
          <ShieldCheck size={15} className="flex-shrink-0 mt-0.5" />
          <span>
            We never ask for Aadhaar, any ID document, a photo of your face, or a
            payment detail. There is nothing to pay for and nothing to sell.
          </span>
        </div>

        <Section title="What we keep">
          <ul>
            <Item>Your name and username, as you typed them.</Item>
            <Item>Your email address, used only to sign you in.</Item>
            <Item>
              Your area — neighbourhood, city, state. Either detected from your
              phone when you tap the button, or typed by you. It decides whether
              your support counts as coming from inside an affected area.
            </Item>
            <Item>The stands you file: words, photos, video, location.</Item>
            <Item>Your voice recordings, up to 15 seconds each.</Item>
            <Item>Which stands you have stood with.</Item>
            <Item>Who vouched for you, if you joined with an invite code.</Item>
          </ul>
        </Section>

        <Section title="What we never keep">
          <ul>
            <Item>Aadhaar, PAN, ration card, voter ID or any other document.</Item>
            <Item>A photograph of your face for verification.</Item>
            <Item>Card, bank or payment details.</Item>
            <Item>Your exact GPS coordinates — only the area name is stored.</Item>
            <Item>Any tracking of you across other apps or websites.</Item>
          </ul>
        </Section>

        <Section title="Who can see it">
          <p className="mb-2">
            Your name, area, stands and voices are visible to every approved member.
            This is deliberate: a stand carries weight precisely because real named
            residents put their names to it. Anonymous counts persuade nobody.
          </p>
          <p>
            When a stand is filed with {GCC_LABEL} over WhatsApp, the message contains
            the issue, the area, and how many residents back it — not the list of who
            they are.
          </p>
        </Section>

        <Section title="Nothing is sold or shared">
          <p>
            Your data is never sold, rented, or handed to advertisers. It is stored
            with Supabase and served through Vercel, who host it on our behalf and
            nothing more. It may be disclosed only where the law actually requires it.
          </p>
        </Section>

        <Section title="Removing things">
          <ul>
            <Item>A voice recording — delete it yourself on the stand, any time.</Item>
            <Item>A stand you filed — delete it from your profile.</Item>
            <Item>
              Your whole account — the <strong style={{ color: WHITE }}>Delete my account</strong>{" "}
              button on your profile. It removes your profile, your login and every
              voice recording immediately.
            </Item>
          </ul>
          <div
            className="rounded-lg p-3 mt-3 text-xs flex items-start gap-2"
            style={{ border: "1px solid " + BORDER, color: MUTED, backgroundColor: CARD }}
          >
            <Trash2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: RED }} />
            <span>
              Stands you filed stay on the wall with your name taken off them. Other
              people have joined those stands and recorded their own voices on them,
              and some have been filed with the Corporation as public complaints —
              erasing them would erase other people's record too.
            </span>
          </div>
        </Section>

        <Section title="Reporting something">
          <p className="mb-2">
            Every stand and every voice has a{" "}
            <Flag size={12} className="inline" style={{ color: GOLD }} /> Report button.
            Reports go to the grievance officer below, who will hide anything false,
            abusive, off-area, or exposing someone's private details.
          </p>
          <p>
            Complaints are answered within {GRIEVANCE_REPLY_DAYS} days, as the
            Information Technology Rules 2021 require.
          </p>
        </Section>

        <Section title="Grievance officer">
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: CARD, border: "1.5px solid " + GOLD }}
          >
            <p className="font-black text-base mb-0.5" style={{ color: WHITE }}>
              {OPERATOR_NAME}
            </p>
            <p className="text-xs mb-2" style={{ color: MUTED }}>
              {OPERATOR_AREA}
            </p>
            <a
              href={`mailto:${OPERATOR_EMAIL}`}
              className="text-sm font-bold inline-flex items-center gap-1.5"
              style={{ color: GOLD, wordBreak: "break-all" }}
            >
              <Mail size={14} className="flex-shrink-0" />
              {OPERATOR_EMAIL}
            </a>
          </div>
        </Section>

        <Section title="Using this wall">
          <ul>
            <Item>File real issues from your own area. Nothing invented.</Item>
            <Item>
              No abuse, no threats, no naming private individuals, no campaigning for
              a party or a candidate.
            </Item>
            <Item>One account per person. Invites are for neighbours you know.</Item>
            <Item>
              An account that breaks these can be removed, and its stands hidden.
            </Item>
          </ul>
        </Section>

        <p className="text-[11px] mt-8" style={{ color: BORDER }}>
          This is a free, non-commercial app run by a resident for their own
          neighbourhood. Last updated 29 July 2026.
        </p>
      </div>
    </div>
  );
}
