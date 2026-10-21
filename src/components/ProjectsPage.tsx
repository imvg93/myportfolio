"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Braces,
  Globe2,
  Layers3,
  Sparkles,
} from "lucide-react";

const projects = [
  {
    number: "02",
    name: "Coders World",
    kind: "Learning platform",
    description:
      "A shared space for developers, students, and mentors to learn through coding practice, real projects, and AI-powered training.",
    href: "https://codersworld.dev",
    linkLabel: "Visit Coders World",
    icon: Braces,
    accent: "from-emerald-400/20 to-lime-300/5",
  },
  {
    number: "03",
    name: "VAB ERP",
    kind: "Manufacturing ERP",
    description:
      "An ERP platform for manufacturing operations, built to support the workflows and information needs of a manufacturing business.",
    href: "https://vaberp.com",
    linkLabel: "Visit VAB ERP",
    icon: Layers3,
    accent: "from-amber-400/20 to-orange-300/5",
  },
  {
    number: "04",
    name: "Business Presence",
    kind: "Client website · Salon",
    description:
      "A tailored salon website with online booking and a responsive layout designed around the client’s brand and customer experience.",
    href: "https://catwalksalons.webresfolio.com",
    linkLabel: "Visit Catwalk Salon",
    icon: Globe2,
    accent: "from-rose-400/20 to-orange-300/5",
  },
  {
    number: "05",
    name: "WebResFolio",
    kind: "Web development",
    description:
      "A web development platform offering tailored websites for businesses and individuals, with a focus on usability and a polished online presence.",
    href: "https://www.webresfolio.com",
    linkLabel: "Visit WebResFolio",
    icon: Layers3,
    accent: "from-violet-400/20 to-fuchsia-300/5",
  },
];

const assistantStack = ["Next.js", "OpenAI", "Supabase", "Pinecone"];

export function ProjectsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f5f0] text-[#17201d] dark:bg-[#080d0d] dark:text-[#edf5f2]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.22] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, black, transparent 78%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-24 sm:px-8 sm:pt-28 lg:px-12 lg:pb-28">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 sm:mb-14 sm:gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#17201d]/10 bg-white/65 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#40534b] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-emerald-100/75">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#34d399]" />
            Selected work · 2024—26
          </div>
          <a
            href="#other-work"
            className="group inline-flex items-center gap-2 text-xs font-semibold text-[#596960] transition hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300 sm:text-sm"
          >
            Explore projects
            <ArrowDownRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
          </a>
        </header>

        <section aria-labelledby="projects-heading" className="mb-12 sm:mb-16">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
            Ideas, built into useful things
          </p>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <h1
              id="projects-heading"
              className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-7xl"
            >
              Work that makes
              <span className="block text-[#84948b] dark:text-[#637b70]">an idea tangible.</span>
            </h1>
            <p className="max-w-sm pb-1 text-sm leading-6 text-[#596960] dark:text-slate-400 sm:text-base sm:leading-7">
              A collection of products and experiences shaped around real people,
              clear problems, and thoughtful engineering.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="insight-ai-heading"
          className="group relative isolate overflow-hidden rounded-[2rem] border border-[#dce4de] bg-[#101a19] text-white shadow-[0_28px_90px_-38px_rgba(16,38,31,0.48)] dark:border-white/10 dark:shadow-[0_30px_100px_-45px_rgba(0,0,0,0.9)]"
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_48%,rgba(34,211,238,0.16),transparent_33%),radial-gradient(ellipse_at_89%_82%,rgba(139,92,246,0.16),transparent_31%),linear-gradient(120deg,#101a19_12%,#122526_58%,#171b2b)]" />
          <div className="absolute -right-24 top-0 -z-10 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl transition duration-700 group-hover:bg-cyan-300/20" />
          <div className="grid min-h-0 items-center md:min-h-[440px] md:grid-cols-[1.05fr_0.95fr] lg:min-h-[500px]">
            <div className="relative z-10 px-5 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-10 lg:px-14 lg:py-14">
              <div className="mb-8 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100 sm:text-[11px]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured project
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/55 sm:text-[11px]">
                  01 / AI · RAG
                </span>
              </div>

              <h2
                id="insight-ai-heading"
                className="max-w-xl text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-[4.25rem] lg:leading-[0.98]"
              >
                Insight AI
                <span className="mt-2 block text-emerald-200">A portfolio with a point of view.</span>
              </h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
                A conversational guide to my work. It retrieves approved portfolio
                knowledge from Pinecone, keeps the source records in Supabase, and
                uses OpenAI to shape useful answers.
              </p>

              <div className="mt-7 flex flex-wrap gap-2" aria-label="Technology used">
                {assistantStack.map((technology) => (
                  <span
                    key={technology}
                    className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 font-mono text-[10px] tracking-wide text-slate-300 sm:text-[11px]"
                  >
                    {technology}
                  </span>
                ))}
              </div>

              <a
                href="/ask-me"
                className="group/link mt-9 inline-flex min-h-12 items-center gap-3 rounded-full bg-[#d9f99d] px-5 py-3 text-sm font-semibold text-[#15231a] transition duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
              >
                Explore Insight AI
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
              </a>
              <p className="mt-3 text-[11px] text-white/45">Opens the AI assistant</p>
            </div>

            <div className="relative hidden min-h-[260px] items-center justify-center overflow-hidden md:flex md:min-h-full">
              <div
                aria-hidden="true"
                className="absolute right-[8%] top-[12%] h-64 w-64 rounded-full border border-cyan-100/10 sm:h-80 sm:w-80"
              />
              <div
                aria-hidden="true"
                className="absolute right-[15%] top-[19%] h-48 w-48 rounded-full border border-violet-100/10 sm:h-64 sm:w-64"
              />
              <div className="absolute right-[12%] top-[28%] h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl sm:h-60 sm:w-60" />
              <img
                src="/gireesh-brain-cutout.png"
                alt="Glowing abstract brain representing Insight AI"
                className="relative z-10 w-[78%] max-w-[430px] -translate-y-1 object-contain drop-shadow-[0_0_55px_rgba(34,211,238,0.24)] transition duration-700 group-hover:scale-[1.035] md:w-[100%]"
              />
              <div className="absolute bottom-6 right-6 z-20 hidden rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-[10px] leading-5 text-cyan-100/75 shadow-xl backdrop-blur-md sm:block lg:bottom-10 lg:right-10">
                <span className="text-emerald-200">●</span> RETRIEVAL READY
                <br />
                <span className="text-white/40">source → context → answer</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45 sm:px-10 lg:px-14">
            <span>Portfolio assistant</span>
            <span className="inline-flex items-center gap-2">
              Built to make the work easier to explore
              <span className="h-1 w-1 rounded-full bg-emerald-300" />
            </span>
          </div>
        </section>

        <section id="other-work" aria-labelledby="other-work-heading" className="mt-20 scroll-mt-10 sm:mt-28">
          <div className="mb-8 flex items-end justify-between gap-5 border-b border-[#cdd7d0] pb-5 dark:border-white/10 sm:mb-10">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                More from the workshop
              </p>
              <h2 id="other-work-heading" className="text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">
                Other projects
              </h2>
            </div>
            <span className="font-mono text-xs text-[#718078] dark:text-slate-500">02—05</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => {
              const Icon = project.icon;
              return (
                <article
                  key={project.number}
                  className="group relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-[1.5rem] border border-[#dce4de] bg-white/70 p-6 shadow-[0_8px_30px_-24px_rgba(20,40,30,0.25)] transition duration-300 hover:-translate-y-1 hover:border-emerald-600/30 hover:bg-white hover:shadow-[0_24px_50px_-32px_rgba(20,40,30,0.38)] dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none dark:hover:border-emerald-200/20 dark:hover:bg-white/[0.06] sm:p-7"
                >
                  <div className={`pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${project.accent} opacity-70 blur-3xl transition duration-500 group-hover:opacity-100`} />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#dce4de] bg-[#f5f7f3] text-[#4e6258] dark:border-white/10 dark:bg-white/[0.05] dark:text-emerald-100">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                      </div>
                      <span className="font-mono text-[11px] text-[#8a9890] dark:text-slate-500">/{project.number}</span>
                    </div>
                    <span className="rounded-full border border-[#dce4de] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#66776d] dark:border-white/10 dark:text-slate-400">
                      {project.kind}
                    </span>
                  </div>

                  <div className="relative mt-10">
                    <h3 className="text-2xl font-semibold tracking-[-0.045em] sm:text-[1.7rem]">{project.name}</h3>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-[#5f6e66] dark:text-slate-400">
                      {project.description}
                    </p>
                  </div>

                  <a
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative mt-7 inline-flex w-fit items-center gap-2 text-xs font-semibold text-[#385548] transition hover:text-emerald-700 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 dark:text-emerald-200 dark:hover:text-emerald-100"
                  >
                    {project.linkLabel}
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="mt-14 flex items-center justify-between border-t border-[#cdd7d0] pt-5 text-[10px] uppercase tracking-[0.16em] text-[#87948d] dark:border-white/10 dark:text-slate-600">
          <span>Gireesh Veeranki</span>
          <span>Made with curiosity <span aria-hidden="true">✳</span></span>
        </footer>
      </div>
    </main>
  );
}
