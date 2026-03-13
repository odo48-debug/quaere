
import React from 'react';
import { IconX } from './icons';

interface LegalPageProps {
    onClose: () => void;
}

export const PrivacyPolicy: React.FC<LegalPageProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-y-auto">
            <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 shrink-0 bg-slate-950 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <span className="font-black text-lg uppercase italic tracking-tighter text-white">Privacy Policy</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                    <IconX className="w-6 h-6" />
                </button>
            </header>

            <div className="max-w-3xl mx-auto px-6 py-12 text-slate-300 space-y-8 leading-relaxed">
                <section>
                    <h1 className="text-3xl font-black text-white uppercase italic mb-4">Privacy Policy</h1>
                    <p className="text-sm text-slate-500">Last Updated: March 13, 2026</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">1. Information We Collect</h2>
                    <p>Quaere is built on a "Privacy by Default" principle. Most of the information you process with Quaere never leaves your device.</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Local Data:</strong> All SQL data, memories, and documents are stored in your browser's IndexedDB. We do not have access to this data.</li>
                        <li><strong>Account Data:</strong> If you sign up for a Pro account, we collect your email address and basic profile information through Clerk for authentication and billing.</li>
                        <li><strong>AI Processing:</strong> When using Pro features (auto-embeddings), the text content is sent to Google Gemini APIs to generate vectors. This data is not used for training.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">2. How We Use Information</h2>
                    <p>We use the collected information solely to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Provide and maintain the Service.</li>
                        <li>Manage your subscription and billing.</li>
                        <li>Provide customer support.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">3. Data Security</h2>
                    <p>We implement industry-standard security measures to protect your account information. Since your core data is local, the security of that data mostly depends on your device's security.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">4. Third-Party Services</h2>
                    <p>The Service uses the following third-party processors:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Clerk:</strong> For authentication and user management.</li>
                        <li><strong>Stripe:</strong> For payment processing.</li>
                        <li><strong>Google Gemini:</strong> For AI-powered vector generation.</li>
                        <li><strong>Vercel:</strong> For hosting the application.</li>
                    </ul>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">5. Your Rights</h2>
                    <p>You have the right to access, export, or delete your account information at any time through your account dashboard.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">6. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us through our official channels.</p>
                </section>

                <footer className="pt-12 border-t border-white/10 text-xs text-slate-500">
                    &copy; 2026 Quaere. All rights reserved.
                </footer>
            </div>
        </div>
    );
};
