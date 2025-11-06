"use client";

import React from "react";
import { ContainerScroll } from "./ui/container-scroll-animation";
import Image from "next/image";
import { 
  Download, 
  Mail,
  Code,
  Database,
  Layers,
  Target,
  Briefcase,
  Heart,
  Coffee,
  BookOpen,
  Video,
  Wrench,
  Users
} from "lucide-react";

export function AboutMePage() {
  const techStack = ["JS", "React", "MongoDB", "Node.js"];
  const skills = [
    "Web App Development",
    "UI/UX Implementation",
    "Database Design",
    "Business Strategy"
  ];
  const values = [
    { icon: Wrench, text: "Problem-Solver" },
    { icon: Code, text: "Lifelong Learner" },
    { icon: Users, text: "Team Player" }
  ];
  const hobbies = [
    { icon: Layers, text: "Logo Design" },
    { icon: BookOpen, text: "Tech Learning" },
    { icon: Video, text: "Content Creation" }
  ];

  return (
    <div className="flex flex-col overflow-hidden min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl font-semibold text-black dark:text-white">
              About <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
                Gireesh Veeranki
              </span>
            </h1>
          </>
        }
      >
        <div className="h-full w-full relative p-4 md:p-6">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 opacity-10 dark:opacity-5">
            <Image
              src="/myimage .jpg"
              alt="Background"
              fill
              className="object-cover rounded-lg object-[center_30%]"
              draggable={false}
            />
          </div>
          
          {/* Content Grid */}
          <div className="relative z-10 h-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {/* Left Column */}
            <div className="space-y-3 md:space-y-4">
              {/* Profile Photo & Name */}
              <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-neutral-700">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 border-2 border-gray-200 dark:border-neutral-700">
                    <Image
                      src="/mylogo.jpg"
                      alt="Profile Logo"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-black dark:text-white">
                      Gireesh Veeranki
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      MERN Stack Developer | Hyderabad
                    </p>
                  </div>
                </div>
              </div>

              {/* Short Bio */}
              <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-gray-200 dark:border-neutral-700">
                <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  I'm a Hyderabad-based MERN Stack Developer passionate about building intuitive digital experiences and launching innovative products.
                </p>
              </div>

              {/* Tech Stack */}
              <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-gray-200 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4 text-blue-500" />
                  Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {techStack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-gray-200 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  Skills
                </h3>
                <ul className="space-y-1">
                  {skills.map((skill, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3 md:space-y-4">
              {/* Experience Timeline */}
              <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-gray-200 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  Experience
                </h3>
                <div className="space-y-2">
                  <div>
                    <h4 className="text-xs md:text-sm font-semibold text-black dark:text-white">
                      Datavalley
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Currently Working</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Full Stack Developer</p>
                  </div>
                </div>
              </div>

              {/* Values */}
              <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-gray-200 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-blue-500" />
                  Values
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {values.map((value, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center text-center"
                    >
                      <value.icon className="w-5 h-5 text-blue-500 mb-1" />
                      <span className="text-[10px] md:text-xs font-medium text-black dark:text-white">
                        {value.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hobbies */}
              <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-gray-200 dark:border-neutral-700">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2 flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-blue-500" />
                  Hobbies
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {hobbies.map((hobby, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center text-center"
                    >
                      <hobby.icon className="w-5 h-5 text-blue-500 mb-1" />
                      <span className="text-[10px] md:text-xs font-medium text-black dark:text-white">
                        {hobby.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Resume
                </button>
                <button className="w-full bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 text-black dark:text-white px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  Get in Touch
                </button>
              </div>
            </div>
          </div>
        </div>
      </ContainerScroll>
      
      {/* Additional About Me Content */}
      -
    </div>
  );
}
