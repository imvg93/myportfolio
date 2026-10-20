'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../src/index.css';
import { TextShimmer } from '../src/components/ui/text-shimmer';
import { Dock, DockIcon, DockItem, DockLabel } from '../src/components/ui/dock';
import HomePlaceholderModal from '../src/components/ui/home-placeholder-modal';
import { ProjectsPage } from '../src/components/ProjectsPage';
import { AboutMePage } from '../src/components/AboutMePage';
import { SkillsPage } from '../src/components/SkillsPage';
import { ConnectRoomPage } from '../src/components/ConnectRoomPage';
import { useTheme } from '../src/lib/use-theme';
import {
  User,
  Home as HomeIcon,
  FolderKanban,
  SunMoon,
  ArrowLeft,
  ArrowUpRight,
  Award,
  Users,
  Brain,
} from 'lucide-react';

const dockData = [
  {
    title: 'Home',
    icon: (
      <HomeIcon className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    hoverColor: 'text-blue-600 dark:text-blue-400',
    href: '#',
  },
  {
    title: 'Project',
    icon: (
      <FolderKanban className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    hoverColor: 'text-purple-600 dark:text-purple-400',
    href: '#',
  },
  {
    title: 'About Me',
    icon: (
      <User className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    hoverColor: 'text-indigo-600 dark:text-indigo-400',
    href: '#',
  },
  {
    title: 'Skills',
    icon: (
      <Award className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    hoverColor: 'text-pink-600 dark:text-pink-400',
    href: '#',
  },
  {
    title: 'Connect Room',
    icon: (
      <Users className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    hoverColor: 'text-orange-600 dark:text-orange-400',
    href: '#',
  },
  {
    title: 'Insight AI',
    icon: (
      <Brain className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    hoverColor: 'text-emerald-600 dark:text-emerald-400',
    href: '#',
  },
  {
    title: 'Theme',
    icon: (
      <SunMoon className='h-full w-full text-neutral-600 dark:text-neutral-300' />
    ),
    hoverColor: 'text-amber-600 dark:text-amber-400',
    href: '#',
  },
];

type Page = 'home' | 'projects' | 'about' | 'skills' | 'connect';

function BlurText({
  text,
  delay = 70,
  animateBy = 'words',
  className = '',
}: {
  text: string;
  delay?: number;
  animateBy?: 'words' | 'letters';
  className?: string;
}) {
  const [inView, setInView] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const segments = useMemo(
    () => animateBy === 'words' ? text.split(' ') : Array.from(text),
    [animateBy, text],
  );

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={textRef} className={`inline-flex flex-wrap ${className}`}>
      {segments.map((segment, index) => (
        <span
          key={`${segment}-${index}`}
          className={`inline-block ${inView ? 'home-blur-text-enter' : ''}`}
          style={{ animationDelay: `${index * delay}ms` }}
        >
          {segment}{animateBy === 'words' && index < segments.length - 1 ? '\u00a0' : ''}
        </span>
      ))}
    </span>
  );
}

export default function Home() {
  const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleDockClick = (title: string) => {
    if (title === 'Home') {
      setCurrentPage('home');
      setIsHomeModalOpen(true);
    } else if (title === 'Project') {
      setCurrentPage('projects');
    } else if (title === 'About Me') {
      setCurrentPage('about');
    } else if (title === 'Skills') {
      setCurrentPage('skills');
    } else if (title === 'Connect Room') {
      setCurrentPage('connect');
    } else if (title === 'Insight AI') {
      router.push('/ask-me');
    } else if (title === 'Theme') {
      toggleTheme();
    }
  };

  if (currentPage === 'projects') {
    return (
      <div className="min-h-screen w-full relative">
        <button
          onClick={() => setCurrentPage('home')}
          className="fixed top-6 left-6 z-50 bg-white dark:bg-neutral-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <ProjectsPage />
      </div>
    );
  }

  if (currentPage === 'about') {
    return (
      <div className="min-h-screen w-full relative">
        <button
          onClick={() => setCurrentPage('home')}
          className="fixed top-6 left-6 z-50 bg-white dark:bg-neutral-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <AboutMePage />
      </div>
    );
  }

  if (currentPage === 'skills') {
    return (
      <div className="min-h-screen w-full relative">
        <button
          onClick={() => setCurrentPage('home')}
          className="fixed top-6 left-6 z-50 bg-white dark:bg-neutral-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <SkillsPage />
      </div>
    );
  }

  if (currentPage === 'connect') {
    return (
      <div className="min-h-screen w-full relative">
        <button
          onClick={() => setCurrentPage('home')}
          className="fixed top-6 left-6 z-50 bg-white dark:bg-neutral-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <ConnectRoomPage />
      </div>
    );
  }

  return (
    <main
      className="relative flex min-h-screen min-h-[100svh] w-full flex-col items-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 sm:px-6 sm:pt-8"
      style={{
        background: theme === 'dark'
          ? 'radial-gradient(ellipse 180% 120% at center top, #1e293b 0%, #0f172a 46%, #020617 100%)'
          : 'radial-gradient(ellipse 180% 120% at center top, rgba(191, 219, 254, 1) 0%, rgba(147, 197, 253, 0.65) 18%, rgba(191, 219, 254, 0.45) 35%, rgba(219, 234, 254, 0.3) 50%, rgba(239, 246, 255, 0.2) 65%, rgba(255, 255, 255, 1) 80%)',
        fontFamily: 'Be Vietnam Pro, sans-serif'
      }}
    >
      {/* Top Branding Element */}
      <div className="relative z-10 mb-2 sm:mb-4">
        <div className="flex items-center gap-3 rounded-full bg-white/85 px-5 py-2.5 shadow-sm backdrop-blur dark:bg-neutral-900/85 sm:gap-4 sm:px-6 sm:py-3">
          <span className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'Be Vietnam Pro, sans-serif' }}>Portfolio</span>
          <div className="w-px h-4 bg-gray-300"></div>
          <TextShimmer 
            as="span" 
            className="text-sm font-normal"
            duration={2}
            spread={2}
          >
            That speaks for Gireesh Veeranki.
          </TextShimmer>
        </div>
      </div>

      <section className="relative z-10 flex w-full max-w-7xl flex-1 flex-col items-center justify-center py-5 text-center sm:py-8" aria-labelledby="home-title">
        <h1 id="home-title" className="relative isolate text-center font-mono font-bold uppercase leading-[0.76] tracking-[-0.09em]">
          <span className="block whitespace-nowrap text-[clamp(3.25rem,14vw,9rem)]" style={{ color: theme === 'dark' ? '#C3E41D' : '#56720A' }}>
            <BlurText text="GIREESH" animateBy="letters" delay={55} />
          </span>
          <span className="block whitespace-nowrap text-[clamp(3.25rem,14vw,9rem)]" style={{ color: theme === 'dark' ? '#C3E41D' : '#56720A' }}>
            <BlurText text="VEERANKI" animateBy="letters" delay={55} />
          </span>

        </h1>

        <p className="mt-8 max-w-2xl px-2 text-balance text-base font-medium text-slate-600 dark:text-slate-300 sm:mt-10 sm:text-xl md:text-2xl">
          <BlurText text="My Journey With One Touch" animateBy="words" delay={110} />
        </p>

        <div className="mt-7 flex w-full flex-col items-center gap-2 sm:mt-8">
          <button
            type="button"
            onClick={() => router.push('/ask-me')}
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-3 rounded-full bg-emerald-600 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/50 active:translate-y-0 sm:w-auto sm:min-w-56"
          >
            <Brain className="h-5 w-5" aria-hidden="true" />
            <span>Ask my AI</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Ask about my skills, projects, experience, and more.
          </p>
        </div>

        <div className="mt-8 flex w-full justify-center sm:mt-10 md:mt-12" aria-label="Portfolio navigation">
          <Dock className="items-end bg-transparent pb-2" magnification={76} distance={140} panelHeight={64}>
            {dockData.map((item) => (
              <DockItem
                key={item.title}
                className={`aspect-square rounded-full touch-manipulation max-sm:aspect-auto max-sm:h-14 max-sm:flex-col ${item.title === 'Theme' ? 'max-sm:hidden' : ''}`}
                mobileLabel={item.title === 'Connect Room' ? 'Connect' : item.title === 'Insight AI' ? 'AI' : item.title === 'Project' ? 'Projects' : item.title === 'About Me' ? 'About' : item.title === 'Theme' ? 'Theme' : item.title}
                onClick={() => handleDockClick(item.title)}
              >
                <DockLabel>{item.title === 'Theme' ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : item.title}</DockLabel>
                <DockIcon
                  hoverColor={item.hoverColor}
                  className={`max-sm:h-5 ${item.title === 'Insight AI' ? 'rounded-full bg-emerald-500/15 p-1 ring-1 ring-emerald-500/60 shadow-md shadow-emerald-500/20' : ''}`}
                >
                  {item.icon}
                </DockIcon>
              </DockItem>
            ))}
          </Dock>
        </div>
      </section>

      <HomePlaceholderModal
        isOpen={isHomeModalOpen}
        onClose={() => setIsHomeModalOpen(false)}
      />
    </main>
  );
}

