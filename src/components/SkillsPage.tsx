"use client";

import { Code, Database, Layers, Target, Zap, Palette, Globe, Smartphone, Server, GitBranch, Cloud, Shield } from "lucide-react";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const skillsTimelineData = [
  {
    id: 1,
    title: "Frontend",
    date: "2022",
    content: "React, Angular, Next.js, TypeScript, Tailwind CSS, HTML5, CSS3. Building responsive and interactive user interfaces.",
    category: "Development",
    icon: Code,
    relatedIds: [2, 3],
    status: "completed" as const,
    energy: 95,
  },
  {
    id: 2,
    title: "Backend",
    date: "2023",
    content: "Python, Node.js, Express, RESTful APIs, Server-side rendering. Creating robust server architectures.",
    category: "Development",
    icon: Server,
    relatedIds: [1, 4],
    status: "completed" as const,
    energy: 90,
  },
  {
    id: 3,
    title: "Database",
    date: "2023",
    content: "MongoDB, PostgreSQL, Database design, Query optimization. Managing data efficiently.",
    category: "Database",
    icon: Database,
    relatedIds: [1, 2, 4],
    status: "completed" as const,
    energy: 85,
  },
  {
    id: 4,
    title: "Full Stack",
    date: "2024",
    content: "MERN Stack development, End-to-end application development, System integration.",
    category: "Development",
    icon: Layers,
    relatedIds: [1, 2, 3, 5],
    status: "in-progress" as const,
    energy: 88,
  },
  {
    id: 5,
    title: "UI/UX",
    date: "2024",
    content: "User interface design, User experience optimization, Design systems, Prototyping.",
    category: "Design",
    icon: Palette,
    relatedIds: [1, 4],
    status: "in-progress" as const,
    energy: 75,
  },
  {
    id: 6,
    title: "Web Apps",
    date: "2024",
    content: "Progressive Web Apps, Responsive design, Cross-browser compatibility, Performance optimization.",
    category: "Development",
    icon: Globe,
    relatedIds: [1, 4, 5],
    status: "in-progress" as const,
    energy: 80,
  },
  {
    id: 7,
    title: "Mobile",
    date: "2024",
    content: "React Native, Mobile-first design, Touch interactions, Mobile performance.",
    category: "Development",
    icon: Smartphone,
    relatedIds: [5, 6],
    status: "in-progress" as const,
    energy: 65,
  },
  {
    id: 8,
    title: "DevOps",
    date: "2024",
    content: "Git, CI/CD, Cloud deployment, Docker, Version control, Automated workflows.",
    category: "Operations",
    icon: GitBranch,
    relatedIds: [2, 4],
    status: "in-progress" as const,
    energy: 70,
  },
  {
    id: 9,
    title: "Cloud",
    date: "2025",
    content: "AWS, Cloud services, Scalable infrastructure, Serverless architecture.",
    category: "Operations",
    icon: Cloud,
    relatedIds: [4, 8],
    status: "pending" as const,
    energy: 50,
  },
  {
    id: 10,
    title: "Security",
    date: "2025",
    content: "Web security, Authentication, Authorization, Data protection, Best practices.",
    category: "Security",
    icon: Shield,
    relatedIds: [2, 4, 9],
    status: "pending" as const,
    energy: 40,
  },
];

export function SkillsPage() {
  return (
    <div className="min-h-[100svh] w-full relative">
      <section className="min-h-[100svh] bg-black px-4 pb-12 pt-24 text-white md:hidden" aria-labelledby="skills-mobile-title">
        <header className="mx-auto mb-6 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Skills timeline</p>
          <h1 id="skills-mobile-title" className="mt-2 text-3xl font-semibold tracking-tight">What I work with</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Open a skill to see the tools and experience behind it.</p>
        </header>
        <div className="mx-auto max-w-xl space-y-3">
          {skillsTimelineData.map((item) => {
            const Icon = item.icon;
            const status = item.status === "completed" ? "Complete" : item.status === "in-progress" ? "In progress" : "Exploring";
            return (
              <details key={item.id} className="group rounded-2xl border border-white/10 bg-white/[0.045] open:border-cyan-300/40 open:bg-white/[0.07]">
                <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-200/15 bg-cyan-200/[0.08] text-cyan-200"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.title}</span>
                    <span className="mt-1 block text-xs text-slate-400">{item.date} · {status}</span>
                  </span>
                  <span aria-hidden="true" className="text-lg text-slate-400 transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="border-t border-white/10 px-4 pb-4 pt-3">
                  <p className="text-sm leading-6 text-slate-300">{item.content}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                    <span>Experience focus</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: `${item.energy}%` }} /></span>
                    <span className="font-mono">{item.energy}%</span>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>
      <RadialOrbitalTimeline timelineData={skillsTimelineData} />
    </div>
  );
}

