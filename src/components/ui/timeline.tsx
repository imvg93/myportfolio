import {
  useScroll,
  useTransform,
  motion,
} from "framer-motion";

import React, { useEffect, useRef, useState } from "react";

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const calculateHeight = () => {
      if (ref.current && containerRef.current) {
        // Get the full scrollable height of the content
        const scrollHeight = ref.current.scrollHeight;
        const offsetHeight = ref.current.offsetHeight;
        
        // Use the maximum to ensure we account for all content
        const contentHeight = Math.max(scrollHeight, offsetHeight);
        
        // Calculate based on the last element's position plus its height plus padding
        const lastElement = ref.current.lastElementChild as HTMLElement;
        if (lastElement) {
          const lastElementBottom = lastElement.offsetTop + lastElement.offsetHeight;
          // Add minimal padding to ensure line reaches the bottom
          const finalHeight = Math.max(contentHeight, lastElementBottom + 20);
          setHeight(finalHeight);
        } else {
          setHeight(contentHeight);
        }
      }
    };

    // Calculate height initially with a delay to ensure DOM is ready
    setTimeout(calculateHeight, 100);

    // Recalculate when images load
    const images = ref.current?.querySelectorAll('img');
    const imageLoadPromises: Promise<void>[] = [];
    if (images) {
      images.forEach((img) => {
        if (!img.complete) {
          const promise = new Promise<void>((resolve) => {
            img.addEventListener('load', () => {
              calculateHeight();
              resolve();
            }, { once: true });
          });
          imageLoadPromises.push(promise);
        }
      });
    }

    // Wait for all images to load
    Promise.all(imageLoadPromises).then(() => {
      setTimeout(calculateHeight, 100);
    });

    // Recalculate on window resize
    window.addEventListener('resize', calculateHeight);

    // Use ResizeObserver to detect content changes
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(calculateHeight, 50);
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', calculateHeight);
      if (images) {
        images.forEach((img) => {
          img.removeEventListener('load', calculateHeight);
        });
      }
      resizeObserver.disconnect();
    };
  }, [ref, data]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className="w-full bg-white dark:bg-neutral-950 font-sans md:px-10"
      ref={containerRef}
    >
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-8 lg:px-10">
        <h2 className="text-lg md:text-4xl mb-4 text-black dark:text-white max-w-4xl">
        Project Panorama
        </h2>
        <p className="text-neutral-700 dark:text-neutral-300 text-sm md:text-base max-w-sm">
        A wide view of my diverse and innovative projects, showcasing creativity and skill
        </p>
      </div>
      <div ref={ref} className="relative max-w-7xl mx-auto pb-8">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-40 md:gap-10"
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-white dark:bg-black flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-2" />
              </div>
              <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-light text-black dark:text-white ">
                {item.title}
              </h3>
            </div>
            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-light text-black dark:text-white">
                {item.title}
              </h3>
              {item.content}{" "}
            </div>
          </div>
        ))}

        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-neutral-200 dark:via-neutral-700 to-transparent to-[100%]  [mask-image:linear-gradient(to_bottom,transparent_0%,black_5%,black_95%,transparent_100%)] "
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0  w-[2px] bg-gradient-to-t from-purple-500 via-blue-500 to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

