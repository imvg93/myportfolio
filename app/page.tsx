'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../src/index.css';
import { TextShimmer } from '../src/components/ui/text-shimmer';
import { MorphingText } from '../src/components/ui/liquid-text';
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
  Sparkles,
  LoaderCircle,
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
];

type Page = 'home' | 'projects' | 'about' | 'skills' | 'connect';

function InternalPageThemeButton({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex h-11 items-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-neutral-700 shadow-lg transition hover:shadow-xl dark:bg-neutral-800 dark:text-neutral-200 sm:right-6 sm:top-6"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <SunMoon className="h-4 w-4" />
      <span className="hidden sm:inline">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}

const GREETINGS = [
  'Hello',
  'నమస్కారం',
  'नमस्ते',
  'வணக்கம்',
  'ನಮಸ್ಕಾರ',
  'നമസ്കാരം',
  'Hola',
  'Bonjour',
  'Olá',
  'Ciao',
  'こんにちは',
  '你好',
  'مرحبا',
  'Привет',
  'Merhaba',
  'สวัสดี',
  'Hallo',
  'Halo',
];

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
  const [openingAi, setOpeningAi] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const openAi = () => {
    if (openingAi) return;
    setOpeningAi(true);
    router.push('/ask-me');
  };

  // Keep the landing page light while preserving the saved theme on the other pages.
  useEffect(() => {
    const root = document.documentElement;
    const activeTheme = currentPage === 'home' ? 'light' : theme;
    root.classList.toggle('dark', activeTheme === 'dark');
    root.dataset.theme = activeTheme;
    root.style.colorScheme = activeTheme;
  }, [currentPage, theme]);

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
      openAi();
    }
  };

  if (currentPage === 'projects') {
    return (
      <div className="relative min-h-screen min-h-[100svh] w-full overflow-x-clip">
        <button
          onClick={() => setCurrentPage('home')}
          className="fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex min-h-11 items-center gap-2 rounded-full bg-white px-3 shadow-lg transition-shadow hover:shadow-xl dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white sm:left-6 sm:top-6"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <InternalPageThemeButton theme={theme} onToggle={toggleTheme} />
        <ProjectsPage />
      </div>
    );
  }

  if (currentPage === 'about') {
    return (
      <div className="relative min-h-screen min-h-[100svh] w-full overflow-x-clip">
        <button
          onClick={() => setCurrentPage('home')}
          className="fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex min-h-11 items-center gap-2 rounded-full bg-white px-3 shadow-lg transition-shadow hover:shadow-xl dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white sm:left-6 sm:top-6"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <InternalPageThemeButton theme={theme} onToggle={toggleTheme} />
        <AboutMePage />
      </div>
    );
  }

  if (currentPage === 'skills') {
    return (
      <div className="relative min-h-screen min-h-[100svh] w-full overflow-x-clip">
        <button
          onClick={() => setCurrentPage('home')}
          className="fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex min-h-11 items-center gap-2 rounded-full bg-white px-3 shadow-lg transition-shadow hover:shadow-xl dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white sm:left-6 sm:top-6"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <InternalPageThemeButton theme={theme} onToggle={toggleTheme} />
        <SkillsPage />
      </div>
    );
  }

  if (currentPage === 'connect') {
    return (
      <div className="relative min-h-screen min-h-[100svh] w-full overflow-x-clip">
        <button
          onClick={() => setCurrentPage('home')}
          className="fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex min-h-11 items-center gap-2 rounded-full bg-white px-3 shadow-lg transition-shadow hover:shadow-xl dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white sm:left-6 sm:top-6"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <InternalPageThemeButton theme={theme} onToggle={toggleTheme} />
        <ConnectRoomPage />
      </div>
    );
  }

  return (
    <main
      className="relative flex min-h-screen min-h-[100svh] w-full flex-col items-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 sm:px-6 sm:pt-8"
      style={{
        background: 'radial-gradient(ellipse 180% 120% at center top, rgba(191, 219, 254, 1) 0%, rgba(147, 197, 253, 0.65) 18%, rgba(191, 219, 254, 0.45) 35%, rgba(219, 234, 254, 0.3) 50%, rgba(239, 246, 255, 0.2) 65%, rgba(255, 255, 255, 1) 80%)',
        fontFamily: 'Be Vietnam Pro, sans-serif'
      }}
    >
      {/* Top Branding Element */}
      <div className="relative z-10 mb-2 sm:mb-4">
        <div className="flex items-center gap-3 rounded-full bg-white/85 px-5 py-2.5 shadow-sm backdrop-blur sm:gap-4 sm:px-6 sm:py-3">
          <span className="text-lg font-bold text-black" style={{ fontFamily: 'Be Vietnam Pro, sans-serif' }}>Portfolio</span>
          <div className="w-px h-4 bg-gray-300"></div>
          <TextShimmer 
            as="span" 
            className="text-xs font-normal sm:text-sm"
            duration={2}
            spread={2}
          >
            That speaks for Gireesh Veeranki.
          </TextShimmer>
        </div>
      </div>

      <section className="relative z-10 flex w-full max-w-7xl flex-1 -translate-y-3 flex-col items-center justify-center py-5 text-center sm:translate-y-0 sm:py-8" aria-labelledby="home-title">
        <h1 id="home-title" className="relative isolate text-center font-mono font-bold uppercase leading-[0.76] tracking-[-0.09em]">
          <span className="block whitespace-nowrap text-[clamp(3.25rem,14vw,9rem)]" style={{ color: '#56720A' }}>
            <BlurText text="GIREESH" animateBy="letters" delay={55} />
          </span>
          <span className="block whitespace-nowrap text-[clamp(3.25rem,14vw,9rem)]" style={{ color: '#56720A' }}>
            <BlurText text="VEERANKI" animateBy="letters" delay={55} />
          </span>

        </h1>

        <div className="relative mt-8 w-full max-w-4xl px-2 sm:mt-10">
          <Sparkles
            aria-hidden="true"
            className="absolute left-[2%] top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-500/70 sm:block"
            strokeWidth={1.6}
          />
          <MorphingText
            texts={GREETINGS}
            className="text-slate-950"
          />
          <Sparkles
            aria-hidden="true"
            className="absolute right-[2%] top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:block"
            strokeWidth={1.6}
          />
          <p className="mt-3 text-balance text-sm font-medium text-slate-600 sm:text-lg md:text-xl">
            <BlurText text="My Journey With One Touch" animateBy="words" delay={90} />
          </p>
        </div>

        <div className="mt-7 flex w-full flex-col items-center gap-2 sm:mt-8">
          <button
            type="button"
            onClick={openAi}
            disabled={openingAi}
            aria-label={openingAi ? 'Opening AI chat' : 'Ask my AI'}
            aria-busy={openingAi}
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-3 rounded-full bg-emerald-600 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/50 active:translate-y-0 disabled:cursor-wait disabled:opacity-90 sm:w-auto sm:min-w-56"
          >
            {openingAi ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Brain className="h-5 w-5" aria-hidden="true" />}
            <span>{openingAi ? 'Opening AI…' : 'Ask my AI'}</span>
            {!openingAi && <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
          </button>
          <p className="text-center text-xs text-slate-500 sm:text-sm">
            Ask about my skills, projects, experience, and more.
          </p>
        </div>

        <div className="mt-8 flex w-full justify-center sm:mt-10 md:mt-12" aria-label="Portfolio navigation">
          <Dock className="items-end gap-4 bg-transparent px-1 pb-2 sm:gap-4 sm:px-4" magnification={76} distance={140} panelHeight={64}>
            {dockData.map((item) => (
              <DockItem
                key={item.title}
                className="aspect-square rounded-full touch-manipulation max-sm:!h-14 max-sm:!w-9 max-sm:aspect-auto max-sm:flex-col"
                mobileLabel={item.title === 'Connect Room' ? 'Connect' : item.title === 'Insight AI' ? 'AI' : item.title === 'Project' ? 'Projects' : item.title === 'About Me' ? 'About' : item.title}
                onClick={() => handleDockClick(item.title)}
              >
                <DockLabel>{item.title}</DockLabel>
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

