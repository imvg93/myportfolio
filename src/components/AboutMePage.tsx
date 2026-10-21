"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Code2,
  Coffee,
  Database,
  Download,
  Layers3,
  Mail,
  Palette,
  Target,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import { ResumeRequestModal } from "@/components/ui/resume-request-modal";
import { ContactNumberModal } from "@/components/ui/contact-number-modal";

const technologies = ["React.js", "Angular", "JavaScript", "Python", "Node.js", "MongoDB", "Cloud", "Full Stack Development", "Mobile App Development"];
const workHistory = [
  {
    period: "2024 — Jan 2026",
    role: "MERN Stack Developer",
    summary: "Started my professional software development career, contributed to software projects, collaborated with a team, and strengthened my full-stack foundation.",
    tools: ["MongoDB", "Express", "React.js", "Node.js", "JavaScript"],
  },
  {
    period: "Feb 2026 — Present",
    role: "React.js Developer / Full Stack Developer",
    summary: "Continued building software projects and mobile applications while growing my React.js and full-stack development experience.",
    tools: ["React.js", "JavaScript", "Full Stack", "Mobile App Development"],
  },
];
const capabilities = [
  { title: "Web app development", detail: "Building intuitive digital experiences from interface to application logic.", icon: Code2 },
  { title: "UI/UX implementation", detail: "Turning product ideas and designs into clear, responsive interfaces.", icon: Layers3 },
  { title: "Database design", detail: "Structuring application data to support reliable product experiences.", icon: Database },
  { title: "Business strategy", detail: "Connecting product decisions with practical business goals.", icon: Target },
];
const values = [
  { title: "Problem solver", detail: "Breaks down challenges and works toward practical solutions.", icon: Wrench },
  { title: "Lifelong learner", detail: "Keeps exploring tools, ideas, and better ways to build.", icon: BookOpen },
  { title: "Team player", detail: "Values collaboration and shared progress.", icon: Users },
];
const interests = [
  { title: "Logo design", icon: Palette },
  { title: "Technology learning", icon: BookOpen },
  { title: "Content creation", icon: Video },
];

export function AboutMePage() {
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f3ef] pb-12 pt-24 text-[#17232e] dark:bg-[#0c1218] dark:text-[#f2f4f3] sm:pb-16 sm:pt-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
        <header className="mb-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#68737a] dark:text-[#a0abb1] sm:mb-8">
          <span className="h-px w-8 bg-[#dc6b3d]" />
          <span>Profile / 01</span>
          <span className="ml-auto tracking-[0.12em]">Hyderabad, India</span>
        </header>

        <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#172630] px-6 py-9 text-white shadow-[0_24px_70px_rgba(17,31,39,0.18)] sm:rounded-[2.25rem] sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 -z-10 h-[25rem] w-[25rem] rounded-full border border-white/10 sm:-right-12 sm:-top-40 sm:h-[34rem] sm:w-[34rem]" />
          <div aria-hidden="true" className="pointer-events-none absolute right-8 top-12 -z-10 h-40 w-40 rounded-full border border-[#e88459]/40 sm:right-24 sm:top-16 sm:h-56 sm:w-56" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 -z-10 h-1.5 w-2/5 bg-[#de7048]" />

          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)] lg:gap-14">
            <div>
              <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f0a27f]">
                <span className="h-2 w-2 rounded-full bg-[#f0a27f]" />
                Full Stack Developer
              </p>
              <h1 className="max-w-3xl font-display text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[5.2rem]">
                Gireesh<br className="hidden sm:block" /> Veeranki<span className="text-[#e98157]">.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#d5dcdd] sm:mt-8 sm:text-lg sm:leading-8">
                I’m a Hyderabad-based MERN Stack Developer passionate about building intuitive digital experiences and launching innovative products.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 sm:mt-10">
                <button onClick={() => setIsResumeModalOpen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#e98157] px-5 text-sm font-semibold text-[#172630] transition hover:bg-[#f19a72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#172630]">
                  <Download className="h-4 w-4" /> Request my resume
                </button>
                <button onClick={() => setIsContactModalOpen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <Mail className="h-4 w-4" /> Get in touch
                </button>
              </div>
            </div>

            <aside className="border-t border-white/15 pt-5 lg:ml-auto lg:w-full lg:max-w-[19rem] lg:border-l lg:border-t-0 lg:pb-1 lg:pl-7 lg:pt-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f0a27f]">Work profile</p>
              <div className="mt-4 flex items-start gap-3">
                <BriefcaseBusiness className="mt-1 h-5 w-5 shrink-0 text-[#e98157]" />
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Professional experience</h2>
                  <p className="mt-1 text-sm text-[#c1cbce]">MERN · React.js · Full Stack</p>
                  <p className="mt-3 text-xs font-medium text-[#c1cbce]">Web and mobile application development</p>
                </div>
              </div>
              <div className="mt-8 border-t border-white/15 pt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f0a27f]">Approach</p>
                <p className="mt-2 text-sm leading-6 text-[#d5dcdd]">Thoughtful interfaces, useful web products, and ideas with room to grow.</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-8 border-b border-[#d8d8d1] py-10 dark:border-white/10 sm:py-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#bd5c37] dark:text-[#f0a27f]">01 / Work history</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Experience built through doing</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#68737a] dark:text-[#a0abb1]">My career so far, focused on real software work and steady growth.</p>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {workHistory.map((work, index) => (
              <article key={work.role} className="relative overflow-hidden rounded-2xl border border-[#d9d9d2] bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.035] sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#bd5c37] dark:text-[#f0a27f]">Role 0{index + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight sm:text-xl">{work.role}</h3>
                  </div>
                  <span className="w-fit shrink-0 rounded-full bg-[#eeeae1] px-3 py-1.5 text-[11px] font-semibold text-[#47545a] dark:bg-white/[0.07] dark:text-[#cbd3d2]">{work.period}</span>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68737a] dark:text-[#a0abb1]">{work.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2" aria-label={`Technologies and focus for ${work.role}`}>
                  {work.tools.map((tool) => <span key={tool} className="rounded-full border border-[#d9d9d2] px-2.5 py-1 text-[10px] font-medium text-[#46545a] dark:border-white/10 dark:text-[#c6d0d0]">{tool}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-[#d8d8d1] py-10 dark:border-white/10 sm:py-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#bd5c37] dark:text-[#f0a27f]">02 / Toolkit</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Technologies and focus</h2>
          </div>
          <div className="flex flex-wrap content-start gap-2.5 sm:gap-3">
            {technologies.map((technology, index) => (
              <span key={technology} className="inline-flex min-h-11 max-w-full items-center gap-3 rounded-xl border border-[#d9d9d2] bg-white/70 px-3.5 text-xs font-semibold text-[#293942] shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e9e8] sm:px-4 sm:text-sm">
                <span className="font-mono text-[10px] text-[#bd5c37] dark:text-[#f0a27f]">{String(index + 1).padStart(2, "0")}</span>{technology}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-[#d8d8d1] py-10 dark:border-white/10 sm:py-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#bd5c37] dark:text-[#f0a27f]">03 / Capabilities</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">From idea to experience</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#68737a] dark:text-[#a0abb1]">A product-minded approach across the details that make digital products useful.</p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-[#d9d9d2] bg-[#d9d9d2] dark:border-white/10 dark:bg-white/10 sm:grid-cols-2">
            {capabilities.map(({ title, detail, icon: Icon }, index) => (
              <article key={title} className="group min-h-40 bg-[#fbfaf7] p-5 transition hover:bg-white dark:bg-[#111a21] dark:hover:bg-[#15212a] sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#bd5c37] dark:text-[#f0a27f]">0{index + 1}</span>
                  <Icon className="h-4 w-4 text-[#bd5c37] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:text-[#f0a27f]" />
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#68737a] dark:text-[#a0abb1]">{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-[#d8d8d1] py-10 dark:border-white/10 sm:py-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#bd5c37] dark:text-[#f0a27f]">04 / How I work</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Good work, built together</h2>
          </div>
          <div className="divide-y divide-[#d8d8d1] dark:divide-white/10">
            {values.map(({ title, detail, icon: Icon }, index) => (
              <article key={title} className="flex gap-4 py-4 first:pt-0 last:pb-0 sm:gap-6 sm:py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9e6de] text-[#bd5c37] dark:bg-white/[0.06] dark:text-[#f0a27f]"><Icon className="h-4 w-4" /></span>
                <div className="flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-8">
                  <h3 className="text-sm font-semibold sm:text-base">{title}</h3>
                  <p className="mt-1 max-w-md text-sm leading-6 text-[#68737a] dark:text-[#a0abb1] sm:mt-0">{detail}</p>
                </div>
                <span className="hidden font-mono text-[10px] text-[#929994] sm:block">0{index + 1}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#bd5c37] dark:text-[#f0a27f]">05 / Outside the screen</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Curiosity, kept active</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#68737a] dark:text-[#a0abb1]">Interests that keep the creative side of building in motion.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {interests.map(({ title, icon: Icon }) => (
              <article key={title} className="flex min-h-28 items-center gap-3 rounded-2xl border border-[#d9d9d2] bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4e5dc] text-[#bd5c37] dark:bg-[#e98157]/10 dark:text-[#f0a27f]"><Icon className="h-4 w-4" /></span>
                <h3 className="text-sm font-semibold leading-5">{title}</h3>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-5 rounded-[1.5rem] bg-[#e8e5dd] p-5 dark:bg-[#131e26] sm:flex-row sm:items-center sm:justify-between sm:rounded-[2rem] sm:p-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#bd5c37] dark:text-[#f0a27f]">Have a project in mind?</p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">Let’s make something useful.</h2>
          </div>
          <button onClick={() => setIsContactModalOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-[#172630] px-5 text-sm font-semibold text-white transition hover:bg-[#263d49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e98157] dark:bg-[#e98157] dark:text-[#172630] dark:hover:bg-[#f19a72] sm:self-auto">
            Start a conversation <ArrowUpRight className="h-4 w-4" />
          </button>
        </footer>

        <div className="mt-8 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-[#929994]">
          <span>Gireesh Veeranki</span>
          <span className="inline-flex items-center gap-2"><Coffee className="h-3.5 w-3.5" /> Built with curiosity</span>
        </div>
      </div>

      <ResumeRequestModal isOpen={isResumeModalOpen} onClose={() => setIsResumeModalOpen(false)} />
      <ContactNumberModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </main>
  );
}
