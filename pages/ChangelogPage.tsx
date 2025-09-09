
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { ChangelogEntry } from '../types';
import { BookText } from 'lucide-react';

const ChangelogPage: React.FC = () => {
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchChangelog = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: dbError } = await supabase
                    .from('changelog')
                    .select('*')
                    .order('date', { ascending: false });

                if (dbError) {
                    console.error("Error fetching changelog:", dbError);
                    // Manually add the first entry if table doesn't exist yet, which is a common setup error.
                    if (dbError.code === '42P01') {
                        setEntries([
                            {
                                id: 1,
                                version: "1.0.0",
                                date: new Date().toISOString().split('T')[0],
                                title: "Launch of Plans & Changelog System",
                                description: "Introduced subscription plans to replace the coin system. Users can now purchase a plan for daily earnings. Also added this changelog page to keep you updated on new features!",
                                created_at: new Date().toISOString()
                            }
                        ]);
                    } else {
                         setError("Could not load the changelog. Please try again later.");
                    }
                } else {
                    setEntries(data || []);
                }
            } catch (e: any) {
                console.error("Critical error fetching changelog:", e);
                setError("An unexpected error occurred while fetching the changelog.");
            } finally {
                setLoading(false);
            }
        };

        fetchChangelog();
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-fadeInUp">
            <header className="text-center mb-12">
                <h1 className="text-5xl font-extrabold text-white flex items-center justify-center gap-4">
                    <BookText size={48} className="text-[var(--accent-glow)]" />
                    <span>Application Changelog</span>
                </h1>
                <p className="mt-4 text-lg text-text-secondary">
                    See what's new and what has been improved in VidEarn.
                </p>
            </header>

            {loading && (
                 <div className="flex justify-center items-center py-20">
                    <div className="w-12 h-12 border-4 border-t-transparent border-[var(--accent-glow)] rounded-full animate-spin"></div>
                </div>
            )}

            {error && (
                 <div className="bg-danger/20 text-red-300 p-4 rounded-md text-center">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div className="relative border-l-2 border-[var(--border)] pl-8 space-y-12">
                     {entries.length === 0 && (
                        <div className="text-center py-10 text-text-secondary">
                            <p>No changelog entries found.</p>
                        </div>
                    )}
                    {entries.map((entry) => (
                        <div key={entry.id} className="relative">
                            <div className="absolute -left-10 top-1 h-4 w-4 bg-[var(--accent-glow)] rounded-full border-4 border-surface"></div>
                            <p className="text-sm text-text-secondary mb-1">{new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <h2 className="text-2xl font-bold text-white mb-2">{entry.title} <span className="text-sm font-mono bg-surface px-2 py-0.5 rounded-md text-[var(--accent-glow)]">{entry.version}</span></h2>
                            <p className="text-text-primary whitespace-pre-line">{entry.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChangelogPage;
