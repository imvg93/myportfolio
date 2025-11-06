'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../src/index.css';
import { TextShimmer } from '../src/components/ui/text-shimmer';
import { Dock, DockIcon, DockItem, DockLabel } from '../src/components/ui/dock';
import HomePlaceholderModal from '../src/components/ui/home-placeholder-modal';
import { ProjectsPage } from '../src/components/ProjectsPage';
import { AboutMePage } from '../src/components/AboutMePage';
import { SkillsPage } from '../src/components/SkillsPage';
import { ConnectRoomPage } from '../src/components/ConnectRoomPage';
import {
  Activity,
  User,
  Home as HomeIcon,
  Mail,
  FolderKanban,
  ScrollText,
  SunMoon,
  ArrowLeft,
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

export default function Home() {
  const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const router = useRouter();

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
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 180% 120% at center top, rgba(191, 219, 254, 1) 0%, rgba(147, 197, 253, 0.65) 18%, rgba(191, 219, 254, 0.45) 35%, rgba(219, 234, 254, 0.3) 50%, rgba(239, 246, 255, 0.2) 65%, rgba(255, 255, 255, 1) 80%)',
        fontFamily: 'Be Vietnam Pro, sans-serif'
      }}
    >
      {/* Top Branding Element */}
      <div className="mb-12 md:mb-16 relative z-10">
        <div className="bg-white rounded-full px-6 py-3 shadow-sm flex items-center gap-4">
          <span className="font-bold text-black text-lg" style={{ fontFamily: 'Be Vietnam Pro, sans-serif' }}>Portfolio</span>
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

      {/* Main Content */}
      <div className="flex flex-col items-center text-center max-w-4xl relative z-10">
        {/* Dock Component */}
        <div className="mb-8 md:mb-10 w-full flex justify-center">
          <Dock className='items-end pb-3 bg-transparent' magnification={120} distance={200}>
            {dockData.map((item, idx) => {
              // Create onClick handler for Home and Project items
              if (item.title === 'Home') {
                return (
                  <DockItem
                    key={idx}
                    className='aspect-square rounded-full'
                    onClick={() => {
                      setCurrentPage('home');
                      setIsHomeModalOpen(true);
                    }}
                  >
                    <DockLabel>{item.title}</DockLabel>
                    <DockIcon hoverColor={item.hoverColor}>{item.icon}</DockIcon>
                  </DockItem>
                );
              } else if (item.title === 'Project') {
                return (
                  <DockItem
                    key={idx}
                    className='aspect-square rounded-full'
                    onClick={() => {
                      console.log('Project icon clicked! Navigating to projects page...');
                      setCurrentPage('projects');
                    }}
                  >
                    <DockLabel>{item.title}</DockLabel>
                    <DockIcon hoverColor={item.hoverColor}>{item.icon}</DockIcon>
                  </DockItem>
                );
              } else if (item.title === 'About Me') {
                return (
                  <DockItem
                    key={idx}
                    className='aspect-square rounded-full'
                    onClick={() => {
                      console.log('About Me icon clicked! Navigating to about page...');
                      setCurrentPage('about');
                    }}
                  >
                    <DockLabel>{item.title}</DockLabel>
                    <DockIcon hoverColor={item.hoverColor}>{item.icon}</DockIcon>
                  </DockItem>
                );
              } else if (item.title === 'Skills') {
                return (
                  <DockItem
                    key={idx}
                    className='aspect-square rounded-full'
                    onClick={() => {
                      console.log('Skills icon clicked! Navigating to skills page...');
                      setCurrentPage('skills');
                    }}
                  >
                    <DockLabel>{item.title}</DockLabel>
                    <DockIcon hoverColor={item.hoverColor}>{item.icon}</DockIcon>
                  </DockItem>
                );
              } else if (item.title === 'Connect Room') {
                return (
                  <DockItem
                    key={idx}
                    className='aspect-square rounded-full'
                    onClick={() => {
                      console.log('Connect Room icon clicked! Navigating to connect page...');
                      setCurrentPage('connect');
                    }}
                  >
                    <DockLabel>{item.title}</DockLabel>
                    <DockIcon hoverColor={item.hoverColor}>{item.icon}</DockIcon>
                  </DockItem>
                );
              } else if (item.title === 'Insight AI') {
                return (
                  <DockItem
                    key={idx}
                    className='aspect-square rounded-full'
                    onClick={() => router.push('/ask-me')}
                  >
                    <DockLabel>{item.title}</DockLabel>
                    <DockIcon hoverColor={item.hoverColor}>{item.icon}</DockIcon>
                  </DockItem>
                );
              } else {
                return (
                  <DockItem
                    key={idx}
                    className='aspect-square rounded-full'
                  >
                    <DockLabel>{item.title}</DockLabel>
                    <DockIcon hoverColor={item.hoverColor}>{item.icon}</DockIcon>
                  </DockItem>
                );
              }
            })}
          </Dock>
        </div>

        {/* Home Placeholder Modal */}
        <HomePlaceholderModal 
          isOpen={isHomeModalOpen} 
          onClose={() => setIsHomeModalOpen(false)} 
        />

        {/* Main Headline */}
        

        {/* Sub-headline */}
        <p  className="text-4xl md:text-5xl lg:text-6xl font-bold text-black leading-tight mb-5 text-center mx-auto"
          style={{ fontFamily: 'Be Vietnam Pro, sans-serif', textAlign: 'center' }}>
        My Journey With One Touch
        </p>

        {/* CTA Buttons */}
        
      </div>
    </div>
  );
}

