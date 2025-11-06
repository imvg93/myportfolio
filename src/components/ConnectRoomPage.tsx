"use client";

import React, { useState } from "react";
import { PhotoGallery } from "@/components/ui/gallery";
import { EmailModal } from "@/components/ui/email-modal";
import { 
  Mail, 
  Instagram, 
  Github, 
  Linkedin 
} from "lucide-react";

// Custom WhatsApp Icon Component
const WhatsAppIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
};

const socialMediaItems = [
  {
    id: 1,
    order: 0,
    x: "-320px",
    y: "15px",
    zIndex: 50,
    direction: "left" as const,
    name: "WhatsApp",
    icon: WhatsAppIcon,
    url: "https://wa.me/+917032255415", // Replace with your WhatsApp number
    color: "#25D366",
  },
  {
    id: 2,
    order: 1,
    x: "-160px",
    y: "32px",
    zIndex: 40,
    direction: "left" as const,
    name: "Gmail",
    icon: Mail,
    url: "gireeshv03@gmail.com", // Replace with your email
    color: "#EA4335",
    onCustomClick: undefined, // Will be set in component
  },
  {
    id: 3,
    order: 2,
    x: "0px",
    y: "8px",
    zIndex: 30,
    direction: "right" as const,
    name: "Instagram",
    icon: Instagram,
    url: "https://www.instagram.com/gireesh.veeranki/", // Replace with your Instagram username
    color: "#E4405F",
  },
  {
    id: 4,
    order: 3,
    x: "160px",
    y: "22px",
    zIndex: 20,
    direction: "right" as const,
    name: "GitHub",
    icon: Github,
    url: "https://github.com/imvg93", // Replace with your GitHub username
    color: "#181717",
  },
  {
    id: 5,
    order: 4,
    x: "320px",
    y: "44px",
    zIndex: 10,
    direction: "left" as const,
    name: "LinkedIn",
    icon: Linkedin,
    url: "https://www.linkedin.com/in/girish-veeranki-581979244/", // Replace with your LinkedIn username
    color: "#0077B5",
  },
];

export function ConnectRoomPage() {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Update email item with custom click handler
  const updatedSocialMediaItems = socialMediaItems.map((item) => {
    if (item.name === "Gmail") {
      return {
        ...item,
        onCustomClick: () => setIsEmailModalOpen(true),
      };
    }
    return item;
  });

  return (
    <main className="overflow-hidden min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800 py-8 md:py-20">
      <PhotoGallery socialMediaItems={updatedSocialMediaItems} />
      <EmailModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
      />
    </main>
  );
}

