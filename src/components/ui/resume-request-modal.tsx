"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, User, Loader2, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResumeRequestModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function ResumeRequestModal({ isOpen, onClose }: ResumeRequestModalProps) {
	const [name, setName] = React.useState("");
	const [email, setEmail] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);
	const [success, setSuccess] = React.useState(false);
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		if (!isOpen) {
			setName("");
			setEmail("");
			setError(null);
			setSuccess(false);
			setLoading(false);
		}
	}, [isOpen]);

	const validate = () => {
		if (!name.trim()) return "Please enter your name.";
		const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
		if (!emailRegex.test(email.trim())) return "Please provide a valid email address.";
		return null;
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		const validationError = validate();
		if (validationError) {
			setError(validationError);
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const response = await fetch("/api/resume-request", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: name.trim(), email: email.trim() }),
			});
			const json = await response.json();
			if (!response.ok || !json?.ok) {
				throw new Error(json?.error || "Unable to submit request.");
			}
			setSuccess(true);
		} catch (err: any) {
			setError(err?.message || "Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
						onClick={onClose}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.92, y: 24 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.92, y: 24 }}
							transition={{ type: "spring", stiffness: 260, damping: 25 }}
							className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
							onClick={(e) => e.stopPropagation()}
						>
							<header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-800">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
										<Mail className="w-5 h-5 text-blue-600 dark:text-blue-300" />
									</div>
									<div>
										<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Request Resume</h2>
										<p className="text-sm text-gray-500 dark:text-gray-400">Share your details and I will email it to you.</p>
									</div>
								</div>
								<button
									onClick={onClose}
									className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center justify-center"
									aria-label="Close resume request"
								>
									<X className="w-5 h-5 text-gray-500" />
								</button>
							</header>

							<div className="p-6 space-y-4">
								{success ? (
									<div className="flex flex-col items-center text-center gap-3 py-6">
										<CheckCircle2 className="w-12 h-12 text-green-500" />
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Request received!</h3>
										<p className="text-sm text-gray-600 dark:text-gray-300">
											Thanks {name.split(" ")[0] || "there"}! I’ll send my resume to {email} shortly.
										</p>
										<button
											onClick={onClose}
											className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
										>
											Close
										</button>
									</div>
								) : (
									<form onSubmit={handleSubmit} className="space-y-4">
										<div>
											<label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2" htmlFor="resume-name">
												<User className="w-4 h-4 text-blue-500" />
												Full name
											</label>
											<input
												id="resume-name"
												type="text"
												value={name}
												onChange={(event) => setName(event.target.value)}
												className="mt-2 w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
												placeholder="Jane Doe"
											required
											/>
										</div>
										<div>
											<label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2" htmlFor="resume-email">
												<Mail className="w-4 h-4 text-blue-500" />
												Email address
											</label>
											<input
												id="resume-email"
												type="email"
												value={email}
												onChange={(event) => setEmail(event.target.value)}
												className="mt-2 w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
												placeholder="jane@example.com"
											required
											/>
										</div>

										{error && (
											<p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
												{error}
											</p>
										)}

										<button
											type="submit"
											disabled={loading}
											className={cn(
												"w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors",
												loading && "opacity-75 cursor-not-allowed"
											)}
										>
											{loading ? (
												<>
													<Loader2 className="w-4 h-4 animate-spin" />
													Submitting...
												</>
											) : (
												"Send request"
											)}
										</button>
									</form>
								)}
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}


