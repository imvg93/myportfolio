"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, MessageCircle, Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactNumberModalProps {
	isOpen: boolean;
	onClose: () => void;
	phoneNumber?: string;
}

const DEFAULT_PHONE = "+91 70322 55415";

export function ContactNumberModal({ isOpen, onClose, phoneNumber = DEFAULT_PHONE }: ContactNumberModalProps) {
	const [copied, setCopied] = React.useState(false);
	const normalized = phoneNumber.replace(/\s+/g, "").replace(/[^+\d]/g, "");
	const displayNumber = phoneNumber.trim();

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(normalized);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy number", err);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
					onClick={onClose}
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.9, y: 24 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: 24 }}
						transition={{ type: "spring", stiffness: 260, damping: 24 }}
						className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						<header className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-neutral-800">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Get in touch directly</h2>
							<button
								onClick={onClose}
								className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-800"
								aria-label="Close contact details"
							>
								<X className="w-5 h-5 text-gray-500" />
							</button>
						</header>

						<div className="p-6 space-y-5">
							<div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50 p-4">
								<p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
									Primary Number
								</p>
								<div className="flex items-center justify-between gap-3">
									<span className="text-xl font-semibold text-gray-900 dark:text-white">{displayNumber}</span>
									<button
										onClick={handleCopy}
										className={cn(
											"p-2 rounded-lg border border-transparent transition-colors",
											copied ? "bg-green-100 text-green-700" : "hover:bg-white dark:hover:bg-neutral-700"
										)}
										aria-label="Copy phone number"
									>
											{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-gray-500" />}
										</button>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<a
									href={`tel:${normalized}`}
									className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-3 text-sm font-semibold hover:bg-blue-700 transition-colors"
									rel="noopener noreferrer"
								>
									<Phone className="w-4 h-4" />
									Call now
								</a>
								<a
									href={`https://wa.me/${normalized.replace('+', '')}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-center gap-2 rounded-lg border border-green-500 text-green-600 dark:text-green-400 px-4 py-3 text-sm font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
								>
									<MessageCircle className="w-4 h-4" />
									WhatsApp
								</a>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}


