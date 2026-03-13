
import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useIsPro } from '../lib/useIsPro';

export const SettingsView: React.FC = () => {
    const { user } = useUser();
    const isPro = useIsPro();
    const planId = (user?.publicMetadata as any)?.planId || 'None';

    const handleManageBilling = () => {
        // This is where you would redirect to the Stripe Customer Portal
        // For now, we'll alert instructions
        alert("Redirecting to Stripe Billing Portal... (Ensure your Stripe Secret Key and Customer Portal is configured in Clerk)");
    };

    return (
        <div className="flex flex-col gap-8 max-w-2xl mx-auto py-12 px-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-black uppercase italic tracking-tighter">Settings</h1>
                <p className="text-slate-500 text-sm">Manage your account and subscription preferences.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="font-black uppercase text-xs tracking-widest text-slate-400 mb-1">Subscription Plan</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-bold">{isPro ? 'Quaere Pro' : 'Quaere Free'}</span>
                            {isPro && (
                                <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-black uppercase rounded-full tracking-widest">Active</span>
                            )}
                        </div>
                    </div>
                    {!isPro && (
                        <button
                            onClick={() => window.open('https://dashboard.clerk.com', '_blank')}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-black uppercase tracking-widest rounded-lg transition-all"
                        >
                            Upgrade to Pro
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-800">Billing Management</p>
                            <p className="text-xs text-slate-500">Access invoices and change payment methods.</p>
                        </div>
                        <button
                            onClick={handleManageBilling}
                            className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all"
                        >
                            Manage Billing
                        </button>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-800">Account ID (Clerk)</p>
                                <p className="font-mono text-[10px] text-slate-400">{user?.id}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-800">Plan Reference</p>
                                <p className="font-mono text-[10px] text-slate-400 lowercase">{planId}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white text-center">
                <p className="text-indigo-400 font-black uppercase text-[10px] tracking-[0.2em] mb-2">Pro Perks</p>
                <h3 className="text-lg font-bold mb-4">You have {isPro ? 'unlimited' : '10,000'} memory capacity</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                    Pro users get access to the Brain Control Panel, semantic search powered by Gemini 2, and zero-latency auto-embeddings.
                </p>
            </div>
        </div>
    );
};
