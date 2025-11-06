"use client";

import { Ref, forwardRef, useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { motion, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Direction = "left" | "right";

interface SocialMediaItem {
  id: number;
  order: number;
  x: string;
  y: string;
  zIndex: number;
  direction: Direction;
  name: string;
  icon: React.ElementType;
  url: string;
  color: string;
  onCustomClick?: () => void; // Optional custom click handler
}

export const PhotoGallery = ({
  animationDelay = 0.5,
  socialMediaItems,
}: {
  animationDelay?: number;
  socialMediaItems: SocialMediaItem[];
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const visibilityTimer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay * 1000);

    const animationTimer = setTimeout(
      () => {
        setIsLoaded(true);
      },
      (animationDelay + 0.4) * 1000
    );

    return () => {
      clearTimeout(visibilityTimer);
      clearTimeout(animationTimer);
    };
  }, [animationDelay]);

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const photoVariants = {
    hidden: () => ({
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
    }),
    visible: (custom: { x: any; y: any; order: number }) => ({
      x: custom.x,
      y: custom.y,
      rotate: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 70,
        damping: 12,
        mass: 1,
        delay: custom.order * 0.15,
      },
    }),
  };

  return (
    <div className="mt-20 md:mt-40 relative px-4">
      <div className="absolute inset-0 max-md:hidden top-[200px] -z-10 h-[300px] w-full bg-transparent bg-[linear-gradient(to_right,#57534e_1px,transparent_1px),linear-gradient(to_bottom,#57534e_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] dark:bg-[linear-gradient(to_right,#a8a29e_1px,transparent_1px),linear-gradient(to_bottom,#a8a29e_1px,transparent_1px)]"></div>
      <p className="text-[10px] md:text-xs lg:text-md my-2 text-center font-light uppercase tracking-widest text-slate-600 dark:text-slate-400 px-4">
        Connect With Me
      </p>
      <h3 className="z-20 mx-auto max-w-2xl justify-center bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text py-2 md:py-3 text-center text-2xl md:text-4xl lg:text-7xl text-transparent dark:bg-gradient-to-r dark:from-slate-100 dark:via-slate-200 dark:to-slate-100 dark:bg-clip-text px-4">
        Let's <span className="text-rose-500">Connect</span>
      </h3>

      {/* Desktop Layout - Keep as is */}
      <div className="hidden lg:block relative mb-8 h-[350px] w-full items-center justify-center">
        <motion.div
          className="relative mx-auto flex w-full max-w-7xl justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            className="relative flex w-full justify-center"
            variants={containerVariants}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
          >
            <div className="relative h-[220px] w-[220px]">
              {[...socialMediaItems].reverse().map((item) => (
                <motion.div
                  key={item.id}
                  className="absolute left-0 top-0"
                  style={{ zIndex: item.zIndex }}
                  variants={photoVariants}
                  custom={{
                    x: item.x,
                    y: item.y,
                    order: item.order,
                  }}
                >
                  <SocialMediaIcon
                    width={220}
                    height={220}
                    name={item.name}
                    icon={item.icon}
                    url={item.url}
                    color={item.color}
                    direction={item.direction}
                    onCustomClick={item.onCustomClick}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Mobile Layout - Vertical Grid */}
      <div className="lg:hidden relative mb-8 min-h-[500px] w-full flex items-center justify-center py-8">
        <motion.div
          className="relative mx-auto flex w-full max-w-sm justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            className="relative flex flex-col items-center w-full gap-4"
            variants={containerVariants}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
          >
            {socialMediaItems.map((item, index) => (
              <motion.div
                key={item.id}
                className="relative w-full flex justify-center"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={isLoaded ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
                transition={{
                  type: "spring",
                  stiffness: 80,
                  damping: 15,
                  delay: index * 0.1,
                }}
              >
                <SocialMediaIcon
                  width={120}
                  height={120}
                  name={item.name}
                  icon={item.icon}
                  url={item.url}
                  color={item.color}
                  direction={item.direction}
                  onCustomClick={item.onCustomClick}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

function getRandomNumberInRange(min: number, max: number): number {
  if (min >= max) {
    throw new Error("Min value should be less than max value");
  }
  return Math.random() * (max - min) + min;
}

export const SocialMediaIcon = ({
  name,
  icon: Icon,
  className,
  direction,
  width,
  height,
  url,
  color,
  onCustomClick,
  ...props
}: {
  name: string;
  icon: React.ElementType;
  className?: string;
  direction?: Direction;
  width: number;
  height: number;
  url: string;
  color: string;
  onCustomClick?: () => void;
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const x = useMotionValue(200);
  const y = useMotionValue(200);

  useEffect(() => {
    const randomRotation =
      getRandomNumberInRange(1, 4) * (direction === "left" ? -1 : 1);
    setRotation(randomRotation);
  }, [direction]);

  function handleMouse(event: {
    currentTarget: { getBoundingClientRect: () => any };
    clientX: number;
    clientY: number;
  }) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  }

  const resetMouse = () => {
    x.set(200);
    y.set(200);
  };

  const handleClick = () => {
    // If custom click handler is provided, use it instead of opening URL
    if (onCustomClick) {
      onCustomClick();
      return;
    }
    if (url) {
      // Check if it's an email (doesn't start with http)
      if (url.startsWith('mailto:')) {
        window.location.href = url;
      } else if (!url.startsWith('http')) {
        // If it's just an email without mailto:, add it
        window.location.href = `mailto:${url}`;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <motion.div
      drag={width > 150} // Only enable drag on desktop (larger icons)
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      whileTap={{ scale: 1.1, zIndex: 9999 }}
      whileHover={{
        scale: width > 150 ? 1.1 : 1.05,
        rotateZ: width > 150 ? 2 * (direction === "left" ? -1 : 1) : 0,
        zIndex: 9999,
      }}
      whileDrag={{
        scale: 1.1,
        zIndex: 9999,
      }}
      initial={{ rotate: 0 }}
      animate={{ rotate: width > 150 ? rotation : 0 }}
      style={{
        width,
        height,
        perspective: 400,
        transform: `rotate(0deg) rotateX(0deg) rotateY(0deg)`,
        zIndex: 1,
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: width > 150 ? "none" : "auto",
      }}
      className={cn(
        className,
        "relative mx-auto shrink-0 cursor-pointer"
      )}
      onMouseMove={handleMouse}
      onMouseLeave={resetMouse}
      onClick={handleClick}
      draggable={false}
      tabIndex={0}
    >
      <div className="relative h-full w-full overflow-visible rounded-2xl md:rounded-3xl shadow-lg bg-white dark:bg-neutral-800 flex items-center justify-center p-6 md:p-12 hover:shadow-2xl transition-shadow group cursor-pointer">
        <Icon 
          className={cn("w-12 h-12 md:w-24 md:h-24 transition-transform group-hover:scale-110")} 
          style={{ color }}
          {...props}
        />
        {/* Tooltip showing the name */}
        <div className="absolute -bottom-8 md:-bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
          <div className="bg-black dark:bg-white text-white dark:text-black text-[10px] md:text-xs font-semibold px-2 md:px-3 py-1 md:py-1.5 rounded-md whitespace-nowrap shadow-lg">
            {name}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full">
              <div className="border-4 border-transparent border-b-black dark:border-b-white"></div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

