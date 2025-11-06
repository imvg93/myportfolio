"use client";

import React, { useEffect, useState } from "react";
import { Timeline } from "./ui/timeline";
import ProjectsNoticeModal from "./ui/projects-notice-modal";

export function ProjectsPage() {
  const [isNoticeOpen, setIsNoticeOpen] = useState(true);

  const data = [
    {
      title: "Coders World",
      content: (
        <div>
          <p className="text-black dark:text-white text-xs md:text-sm font-normal mb-8">
          Coders World is a unified learning and project ecosystem where developers, students, and mentors collaborate to enhance coding skills through real-world projects, challenges, and AI-powered trainin
          </p>
          <p className="text-black dark:text-white text-xs md:text-sm font-normal mb-8">
            <a 
              href="https://codersworld.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Visit Coders World
            </a>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/Screenshot 2025-11-05 183610.png"
                alt="Coders World screenshot 1"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/Screenshot 2025-11-05 183707.png"
                alt="Coders World screenshot 2"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/Screenshot 2025-11-05 183755.png"
                alt="Coders World screenshot 3"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/Screenshot 2025-11-05 183816.png"
                alt="Coders World screenshot 4"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Business Presence",
      content: (
        <div>
          <p className="text-black dark:text-white text-xs md:text-sm font-normal mb-8">
          Created a client-requested salon website with online booking and responsive design to enhance customer experience. Delivered a tailored solution to match the salon’s unique brand and business needs.
          </p>
          <p className="text-black dark:text-white text-xs md:text-sm font-normal mb-8">
            <a 
              href="https://catwalksalon.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Visit catwalk salon 
            </a>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/salon/Screenshot 2025-11-06 104518.png"
                alt="Business Presence screenshot 1"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/salon/Screenshot 2025-11-06 104554.png"
                alt="Business Presence screenshot 2"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/salon/Screenshot 2025-11-06 104619.png"
                alt="Business Presence screenshot 3"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/salon/Screenshot 2025-11-06 104641.png"
                alt="Business Presence screenshot 4"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      ),
    },
    

    {
      title: "Payment Portal",
      content: (
        <div>
          <p className="text-black dark:text-white text-xs md:text-sm font-normal mb-8">
          Developed a secure, password-based payment portal with distinct owner and worker access. Workers can upload bills, while owners track transactions and manage business insights in real time as per client requirements.
          </p>
          <p className="text-black dark:text-white text-xs md:text-sm font-normal mb-8">
            <a 
              href="https://catwalk-billing.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Visit Billing Portal 
            </a>
            </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/billing/Screenshot 2025-11-06 105515.png"
                alt="Payment Portal screenshot 1"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/billing/Screenshot 2025-11-06 105730.png"
                alt="Payment Portal screenshot 2"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/billing/Screenshot 2025-11-06 105807.png"
                alt="Payment Portal screenshot 3"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/billing/Screenshot 2025-11-06 105910.png"
                alt="Payment Portal screenshot 4"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Development Project",
      content: (
        <div>
          <p className="text-black dark:text-white text-xs md:text-sm font-normal mb-8">
          Developed WebResFolio, a professional website development platform offering tailored web solutions for businesses and individuals. Specializes in delivering visually appealing, user-friendly sites designed to boost online presence and client success.
          </p>
          <p className="text-black dark:text-white text-xs md:text-sm font-normal mb-8">
            <a 
              href="https://www.webresfolio.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Visit WebResFolio 
            </a>
            </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px] ml-4 md:ml-0">
              <img
                src="/projects/webresfolio/Screenshot 2025-11-06 111538.png"
                alt="WebResFolio screenshot 1"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/webresfolio/Screenshot 2025-11-06 111548.png"
                alt="WebResFolio screenshot 2"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/webresfolio/Screenshot 2025-11-06 111602.png"
                alt="WebResFolio screenshot 3"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] flex items-stretch min-h-[80px] md:min-h-[176px] lg:min-h-[240px]">
              <img
                src="/projects/webresfolio/Screenshot 2025-11-06 111613.png"
                alt="WebResFolio screenshot 4"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      ),
    },
   
  ];

  return (
    <div className="w-full ">
      <ProjectsNoticeModal isOpen={isNoticeOpen} onCloseAction={() => setIsNoticeOpen(false)} />
      <Timeline data={data} />
    </div>
  );
}

