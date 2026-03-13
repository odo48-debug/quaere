
import React from 'react';
import { IconX } from './icons';

interface LegalPageProps {
    onClose: () => void;
}

export const TermsOfService: React.FC<LegalPageProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-y-auto">
            <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 shrink-0 bg-slate-950 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <span className="font-black text-lg uppercase italic tracking-tighter text-white">Terms of Service</span>
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
                    <h1 className="text-3xl font-black text-white uppercase italic mb-4">Terms of Service</h1>
                    <p className="text-sm text-slate-500">Last Updated: March 13, 2026</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">1. Acceptance of Terms</h2>
                    <p>By accessing or using Quaere ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">2. Description of Service</h2>
                    <p>Quaere is a local-first, vector-powered memory layer for AI agents. The service provides a PostgreSQL engine running in the browser and optional cloud-based AI features for Pro subscribers.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">3. User Accounts</h2>
                    <p>You may be required to create an account via Clerk to access certain features (e.g., Pro Tier). You are responsible for maintaining the confidentiality of your account credentials.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">4. Privacy and Data</h2>
                    <p>Your privacy is important to us. Quaere is designed as a "local-first" application, meaning most data is stored directly in your browser. Cloud-based features (like embeddings) process data temporarily to provide the requested service.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">5. Subscription and Payments</h2>
                    <p>Pro Tier subscriptions are billed on a recurring basis as described during signup. All billing is handled securely through our partner, Clerk/Stripe. You can cancel your subscription at any time through your account settings.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">6. Limitation of Liability</h2>
                    <p>QUAERE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">7. Changes to Terms</h2>
                    <p>We reserve the right to modify these terms at any time. Your continued use of the Service following any changes constitutes your acceptance of the new Terms of Service.</p>
                </section>

                <footer className="pt-12 border-t border-white/10 text-xs text-slate-500">
                    &copy; 2026 Quaere. All rights reserved.
                </footer>
            </div>
        </div>
    );
};
