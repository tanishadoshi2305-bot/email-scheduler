import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, Mail, Sparkles } from "lucide-react";
import BrandStamp from "../components/BrandStamp";
import StarburstIcon from "../components/StarburstIcon";
import HeroIllustration from "../components/HeroIllustration";
import StationeryPreview, {
  STATIONERY_TEMPLATES,
} from "../components/StationeryPreview";
import { useAuth } from "../context/AuthContext";

const SAMPLE_DISPATCH = {
  recipientName: "Elena Vance",
  recipientEmail: "elena@atelierpress.co",
  subject: "An Autumn Invitation for {{name}}",
  body: `Hello {{name}},

Our seasonal anthology goes to press next Tuesday morning, and we wanted your studio notes at the top of the reading list.

Feel free to reply directly to this dispatch whenever you have a quiet moment—we saved your copy under {{email}}.

Warmly,
Clara & The Dispatch Desk`,
};

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Compose & Personalize",
    description:
      "Draft your letter on cream or blush stationery, import recipients via CSV, and personalize every note with {{name}} merge tags.",
    accent: "bg-[#F3DCE6]",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "Choose the Moment",
    description:
      "Pick an exact future date and time—or space out multi-recipient dispatches gently by seconds so nothing feels rushed.",
    accent: "bg-[#B8CEDD]/55",
    icon: CalendarClock,
  },
  {
    step: "03",
    title: "Deliver & Inspect",
    description:
      "Watch live countdowns tick to zero inside your studio, trigger instant dispatches, or inspect every sent HTML card anytime.",
    accent: "bg-[#E6A8BF]/55",
    icon: Mail,
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState("editorial");

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3A2327] flex flex-col">
      {/* Top Editorial Navigation */}
      <header className="sticky top-0 z-30 bg-[#FAF6F0]/90 backdrop-blur border-b-[1.5px] border-[#3A2327]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group" aria-label="Dispatch Home">
            <BrandStamp variant="dark" size="sm" tilt="-rotate-2" />
            <span className="hidden sm:inline-block font-display text-lg font-semibold tracking-tight text-[#3A2327]">
              Dispatch Studio
            </span>
          </Link>

          <nav className="flex items-center gap-2.5 sm:gap-3">
            <a
              href="#stationery-showcase"
              className="hidden md:inline-flex items-center rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-[#3A2327]/80 hover:text-[#3A2327] transition"
            >
              Stationery
            </a>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-[#3A2327] border-[1.5px] border-[#3A2327] px-5 py-2 text-xs sm:text-sm font-semibold text-[#FAF6F0] hover:bg-[#3A2327]/90 transition shadow-editorialSm"
              >
                Open Studio
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-full bg-[#FAF6F0] border-[1.5px] border-[#3A2327] px-4 py-2 text-xs sm:text-sm font-semibold text-[#3A2327] hover:bg-[#F3DCE6]/60 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?mode=register"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#3A2327] border-[1.5px] border-[#3A2327] px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-[#FAF6F0] hover:bg-[#3A2327]/90 transition shadow-editorialSm"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12 space-y-14">
        {/* Soft Blush Hero Card */}
        <section className="rounded-3xl bg-[#F3DCE6] border-2 border-[#3A2327] shadow-editorial overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 lg:p-12">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E6A8BF] border-[1.5px] border-[#3A2327] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#3A2327]">
                ✳ SCHEDULED DISPATCH STUDIO · 2026
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[52px] font-semibold text-[#3A2327] leading-[1.08] tracking-tight">
                Write on your schedule. Arrive at the exact right moment.
              </h1>

              <p className="text-base sm:text-lg text-[#3A2327]/85 leading-relaxed max-w-xl">
                Craft thoughtful notes, seasonal invitations, and scheduled announcements on
                digital stationery. Import contacts, personalize with merge tags, and trust
                every message to send cleanly at its chosen hour.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to={isAuthenticated ? "/dashboard" : "/login?mode=register"}
                  className="inline-flex items-center gap-2 rounded-full bg-[#3A2327] border-[1.5px] border-[#3A2327] px-6 py-3.5 text-sm font-semibold text-[#FAF6F0] hover:bg-[#3A2327]/90 transition shadow-editorialSm"
                >
                  {isAuthenticated ? "Go to Dispatch Studio" : "Start Scheduling Free"}
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {!isAuthenticated ? (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-full bg-[#FAF6F0] border-[1.5px] border-[#3A2327] px-6 py-3.5 text-sm font-semibold text-[#3A2327] hover:bg-[#FAF6F0]/80 transition"
                  >
                    Sign In to Studio
                  </Link>
                ) : (
                  <a
                    href="#stationery-showcase"
                    className="inline-flex items-center gap-2 rounded-full bg-[#FAF6F0] border-[1.5px] border-[#3A2327] px-6 py-3.5 text-sm font-semibold text-[#3A2327] hover:bg-[#FAF6F0]/80 transition"
                  >
                    Browse Stationery Styles
                  </a>
                )}
              </div>
            </div>

            <div className="lg:col-span-6">
              <HeroIllustration />
            </div>
          </div>
        </section>

        {/* Interactive Stationery Studio Showcase */}
        <section id="stationery-showcase" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#B8CEDD]/55 border-[1.5px] border-[#3A2327] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em]">
                <StarburstIcon className="w-3.5 h-3.5" title="" />
                Stationery Studio Showcase
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#3A2327] tracking-tight">
                Three bespoke letter styles, tailored to every note.
              </h2>
              <p className="text-sm sm:text-base text-[#3A2327]/75">
                Preview how Dispatch turns plain text and <code className="rounded bg-[#F3DCE6] px-1.5 py-0.5 font-mono text-xs border border-[#3A2327]/30">{"{{name}}"}</code> merge tags into framed HTML correspondence.
              </p>
            </div>

            {/* Interactive Template Tabs */}
            <div
              role="tablist"
              aria-label="Stationery styles"
              className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-[#FAF6F0] border-[1.5px] border-[#3A2327] p-1.5 shadow-editorialSm"
            >
              {STATIONERY_TEMPLATES.map((tpl) => {
                const active = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition flex items-center gap-2 ${
                      active
                        ? "bg-[#3A2327] text-[#FAF6F0]"
                        : "text-[#3A2327] hover:bg-[#F3DCE6]/70"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-[#3A2327]/40 shrink-0"
                      style={{ backgroundColor: tpl.swatchColor }}
                    />
                    {tpl.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-[#3A2327] border-2 border-[#3A2327] p-4 sm:p-6 shadow-editorial">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Info Card */}
              <div className="lg:col-span-4 rounded-2xl bg-[#FAF6F0] border-[1.5px] border-[#3A2327] p-6 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-[#E6A8BF] border border-[#3A2327] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                      Sample Scheduled Dispatch
                    </span>
                    <StarburstIcon className="w-5 h-5 text-[#3A2327]" title="" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-display text-2xl font-semibold text-[#3A2327]">
                      {STATIONERY_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
                    </h3>
                    <p className="text-sm text-[#3A2327]/75 leading-relaxed">
                      {STATIONERY_TEMPLATES.find((t) => t.id === selectedTemplate)?.description}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F3DCE6]/55 border border-[#3A2327]/35 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold uppercase tracking-wider text-[#3A2327]/65">
                        Recipient
                      </span>
                      <span className="font-mono text-[#3A2327] truncate">
                        {SAMPLE_DISPATCH.recipientName} &lt;{SAMPLE_DISPATCH.recipientEmail}&gt;
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold uppercase tracking-wider text-[#3A2327]/65">
                        Merge Tag
                      </span>
                      <span className="font-mono text-[#3A2327]">
                        {"{{name}}"} → Elena Vance
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={isAuthenticated ? "/dashboard" : "/login?mode=register"}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3A2327] px-5 py-3 text-xs font-semibold text-[#FAF6F0] hover:bg-[#3A2327]/90 transition"
                >
                  Compose With This Style
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Right Live Rendered Stationery Preview */}
              <div className="lg:col-span-8 flex flex-col justify-center">
                <StationeryPreview
                  template={selectedTemplate}
                  subject={SAMPLE_DISPATCH.subject}
                  body={SAMPLE_DISPATCH.body}
                  recipientName={SAMPLE_DISPATCH.recipientName}
                  recipientEmail={SAMPLE_DISPATCH.recipientEmail}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Clean 3-Step How It Works Strip */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3A2327]/65">
                How It Works
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#3A2327] mt-1">
                From draft desk to on-time delivery in three calm steps.
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WORKFLOW_STEPS.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl bg-[#FAF6F0] border-[1.5px] border-[#3A2327] p-6 shadow-editorialSm flex flex-col justify-between gap-5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center rounded-full ${item.accent} border border-[#3A2327] px-3 py-1 text-xs font-bold tracking-wider`}
                    >
                      {item.step}
                    </span>
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#FAF6F0] border border-[#3A2327]/40">
                      <IconComponent className="w-4 h-4 text-[#3A2327]" />
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display text-xl font-semibold text-[#3A2327]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#3A2327]/75 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Minimal Editorial Footer */}
      <footer className="border-t-[1.5px] border-[#3A2327]/20 bg-[#FAF6F0] py-6 px-4 sm:px-6 mt-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#3A2327]/70">
          <div className="flex items-center gap-2.5">
            <StarburstIcon className="w-4 h-4 text-[#3A2327]" title="" />
            <span className="font-medium">
              Dispatch Studio · Crafted for Intentional Communication
            </span>
          </div>
          <span>Scheduled Correspondence · 2026</span>
        </div>
      </footer>
    </div>
  );
}
