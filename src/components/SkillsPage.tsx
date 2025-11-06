"use client";

import { Code, Database, Layers, Target, Zap, Palette, Globe, Smartphone, Server, GitBranch, Cloud, Shield } from "lucide-react";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const skillsTimelineData = [
  {
    id: 1,
    title: "Frontend",
    date: "2022",
    content: "React, Next.js, TypeScript, Tailwind CSS, HTML5, CSS3. Building responsive and interactive user interfaces.",
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
    content: "Node.js, Express, RESTful APIs, Server-side rendering. Creating robust server architectures.",
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
    <div className="min-h-screen w-full relative">
      <RadialOrbitalTimeline timelineData={skillsTimelineData} />
    </div>
  );
}

