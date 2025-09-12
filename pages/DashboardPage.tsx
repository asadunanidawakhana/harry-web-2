

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { Video, Transaction, Withdrawal, Plan, ReferredUser } from '../types';
import { PlayCircle, DollarSign, History, Upload, CheckCircle, XCircle, Clock, X, Banknote, Film, Crown, Shield, Users, Copy } from 'lucide-react';

const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    let videoId: string | null = null;
    try {
        const standardUrlMatch = url.match(/[?&]v=([^&]+)/);
        if (standardUrlMatch) {
            videoId = standardUrlMatch[1];
        } else {
            const shortUrlMatch = url.match(/youtu\.be\/([^?]+)/);
            if (shortUrlMatch) {
                videoId = shortUrlMatch[1];
            } else {
                const embedUrlMatch = url.match(/embed\/([^?]+)/);
                if (embedUrlMatch) {
                    videoId = embedUrlMatch[1];
                }
            }
        }
    } catch (e) {
        console.error("Could not parse YouTube URL", e);
        return null;
    }
    return videoId;
};


const VideoPlayerModal: React.FC<{
    video: Video;
    onClose: () => void;
    onWatched: (videoId: number) => void;
}> = ({ video, onClose, onWatched }) => {
    const videoId = getYouTubeVideoId(video.video_url);
    const [countdown, setCountdown] = useState(video.watch_duration_seconds);
    const [isWatched, setIsWatched] = useState(false);
    const [timerActive, setTimerActive] = useState(false);
    const playerRef = useRef<any>(null);

    useEffect(() => {
        if (!timerActive) return;

        if (countdown > 0) {
            const timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (!isWatched) {
            setIsWatched(true);
            onWatched(video.id);
        }
    }, [countdown, isWatched, onWatched, video.id, timerActive]);

    useEffect(() => {
        if (!videoId) return;

        const onPlayerStateChange = (event: any) => {
            // event.data states: 1 for Playing, 2 for Paused
            if (event.data === 1) { // Playing
                setTimerActive(true);
            } else { // Paused, Ended, Buffering etc.
                setTimerActive(false);
            }
        };

        const createPlayer = () => {
             if (playerRef.current) return; // Don't create multiple players
             playerRef.current = new (window as any).YT.Player('youtube-player-container', {
                videoId,
                playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
                events: {
                    onStateChange: onPlayerStateChange,
                },
            });
        };

        if ((window as any).YT && (window as any).YT.Player) {
            createPlayer();
        } else {
            (window as any).onYouTubeIframeAPIReady = createPlayer;
        }

        return () => {
            if (playerRef.current && playerRef.current.destroy) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [videoId]);


    const progress = video.watch_duration_seconds > 0 ? ((video.watch_duration_seconds - countdown) / video.watch_duration_seconds) * 100 : 100;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeInUp">
            <div className="bg-surface/80 backdrop-blur-lg rounded-xl shadow-2xl max-w-3xl w-full border border-[var(--border)]">
                <div className="flex justify-between items-center p-5 border-b border-[var(--border)]">
                    <h3 className="text-xl font-bold text-white">{video.title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors"><X size={24} /></button>
                </div>
                <div className="p-5">
                    {videoId ? (
                         <div className="aspect-video bg-black rounded-lg">
                            <div id="youtube-player-container" className="w-full h-full"></div>
                        </div>
                    ) : <p className="text-danger text-center p-8">Invalid video link.</p>}
                    <div className="mt-4">
                        {isWatched ? (
                            <div className="text-center text-green-400 font-bold p-3 bg-success/20 rounded-lg flex items-center justify-center gap-2">
                                <CheckCircle size={20}/> Video Watched! You can now close this window.
                            </div>
                        ) : (
                            <div>
                                <div className="text-center text-text-secondary mb-2">
                                     {timerActive
                                        ? `Watch for ${countdown} more second${countdown !== 1 ? 's' : ''} to complete...`
                                        : `Press play on the video to start the watch timer.`
                                    }
                                </div>
                                <div className="w-full bg-background/50 rounded-full h-2.5">
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// Sub-component for Watching Videos
const WatchVideos: React.FC = () => {
    const { profile, refetchProfile } = useAuth();
    const [videos, setVideos] = useState<Video[]>([]);
    const [watchedTodayIds, setWatchedTodayIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [hasClaimedToday, setHasClaimedToday] = useState(false);

    const isPlanActive = profile?.isPlanCurrentlyActive;
    const plan = profile?.plans;

    const fetchWatchedVideos = useCallback(async () => {
        if (!profile || !isPlanActive) return;
        setLoading(true);
        setError('');
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { data: watchedData, error: watchedError } = await supabase
                .from('watched_videos')
                .select('video_id')
                .eq('user_id', profile.id)
                .gte('watched_at', today.toISOString());
            if (watchedError) throw watchedError;
            
            if (watchedData) {
                setWatchedTodayIds(watchedData.map(v => v.video_id));
            }

            const { data: claimsData, error: claimsError } = await supabase
                .from('daily_claims')
                .select('id')
                .eq('user_id', profile.id)
                .gte('claimed_at', today.toISOString())
                .limit(1);

            if (claimsError) throw claimsError;
            
            setHasClaimedToday(claimsData && claimsData.length > 0);

        } catch (e: any) {
            setError("Could not load your video history. Please refresh.");
        } finally {
            setLoading(false);
        }
    }, [profile, isPlanActive]);


    useEffect(() => {
        const fetchVideos = async () => {
            const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
            if (error) setError("Could not load videos.");
            else setVideos(data || []);
        };
        fetchVideos();
        fetchWatchedVideos();
    }, [fetchWatchedVideos]);
    
    const handleWatchVideo = (video: Video) => {
        setSelectedVideo(video);
    };

    const handleVideoWatched = async (videoId: number) => {
        if (watchedTodayIds.includes(videoId) || !profile) return;
        try {
            const { error } = await supabase.from('watched_videos').insert({ user_id: profile.id, video_id: videoId });
            if (error) throw error;
            // Optimistically update UI
            setWatchedTodayIds(prev => [...prev, videoId]);
        } catch(e: any) {
            console.error("Failed to record watch history", e);
            setError("Could not save watch progress. Please try again.");
        }
    };


    const handleClaimReward = async () => {
        if(!plan) return;
        setIsClaiming(true);
        setError('');
        setMessage('');

        try {
            const { error: rpcError } = await supabase.rpc('claim_daily_reward');
            if (rpcError) throw new Error(rpcError.message);
            
            await refetchProfile();
            setMessage(`Successfully claimed PKR ${plan.daily_earning}!`);
            setHasClaimedToday(true);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsClaiming(false);
        }
    };

    const canClaim = plan && watchedTodayIds.length >= plan.videos_per_day && !hasClaimedToday;

    if (!isPlanActive) {
        return (
             <div className="text-center py-20 bg-surface/50 rounded-lg border border-dashed border-[var(--border)]">
                <Crown size={48} className="mx-auto text-text-secondary" />
                <h3 className="mt-4 text-xl font-semibold">No Active Plan</h3>
                <p className="mt-1 text-text-secondary">Please purchase a plan to start watching videos and earning.</p>
            </div>
        )
    }

    return (
        <div className="animate-fadeInUp">
            <div className="bg-surface p-6 rounded-xl border border-[var(--border)] mb-8">
                <h2 className="text-2xl font-bold mb-4">Your Daily Goal</h2>
                {error && <p className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
                {message && <p className="bg-success/20 text-green-300 p-3 rounded-md mb-4 text-sm">{message}</p>}
                
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-full bg-background/50 rounded-full h-4">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full" style={{ width: `${Math.min(100, (watchedTodayIds.length / (plan?.videos_per_day || 1)) * 100)}%` }}></div>
                    </div>
                    <span className="font-bold text-lg">{watchedTodayIds.length}/{plan?.videos_per_day}</span>
                </div>

                 <button
                    onClick={handleClaimReward}
                    disabled={!canClaim || isClaiming}
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                    {isClaiming ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div> : hasClaimedToday ? <><CheckCircle size={16}/> Claimed for Today</> : `Claim Daily Earning (PKR ${plan?.daily_earning})`}
                 </button>
            </div>


            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="w-12 h-12 border-4 border-t-transparent border-[var(--accent-glow)] rounded-full animate-spin"></div>
                </div>
            ) : videos.length === 0 ? (
                <div className="text-center py-20 bg-surface/50 rounded-lg border border-dashed border-[var(--border)]">
                    <Film size={48} className="mx-auto text-text-secondary" />
                    <h3 className="mt-4 text-xl font-semibold">No Videos Available</h3>
                    <p className="mt-1 text-text-secondary">Please check back later for new videos to watch.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((video, index) => (
                        <div key={video.id} className={`bg-surface/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-[var(--border)] flex flex-col justify-between transition-all duration-300 animate-fadeInUp ${watchedTodayIds.includes(video.id) ? 'opacity-50' : 'hover:border-[var(--accent-glow)]/50 hover:-translate-y-1'}`} style={{ animationDelay: `${index * 50}ms`}}>
                            <div>
                                <h3 className="text-xl font-semibold text-white">{video.title}</h3>
                                <p className="text-text-secondary mt-2 mb-4 h-12 overflow-hidden">{video.description}</p>
                            </div>
                            <div className="flex justify-end items-center mt-4 pt-4 border-t border-[var(--border)]">
                                <button
                                    onClick={() => handleWatchVideo(video)}
                                    disabled={watchedTodayIds.includes(video.id)}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2 px-4 rounded-lg transition hover:opacity-90 flex items-center gap-2 min-w-[120px] justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
                                >
                                {watchedTodayIds.includes(video.id) ? (
                                    <><CheckCircle size={16}/> Watched</>
                                ) : (
                                    <><PlayCircle size={16}/> Watch</>
                                )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {selectedVideo && (
                <VideoPlayerModal 
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                    onWatched={handleVideoWatched}
                />
            )}
        </div>
    );
};


// Sub-component for Buying Plans
const BuyPlan: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [tid, setTid] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        const fetchPlans = async () => {
            const { data, error } = await supabase.from('plans').select('*');
            if (error) setError("Could not load plans.");
            else setPlans(data || []);
        };
        fetchPlans();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tid || !screenshot || !user || !selectedPlan) {
            setError('Please fill all fields and upload a screenshot.');
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        
        const filePath = `${user.id}/${Date.now()}_${screenshot.name}`;

        try {
            const { error: uploadError } = await supabase.storage.from('screenshots').upload(filePath, screenshot);
            if (uploadError) throw new Error(`Screenshot upload failed: ${uploadError.message}`);
            
            const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(filePath);
            if (!publicUrl) throw new Error("Could not get public URL for the screenshot.");
            
            const { error: insertError } = await supabase.from('transactions').insert({
                user_id: user.id,
                plan_id: selectedPlan.id,
                amount: selectedPlan.price,
                tid: tid,
                screenshot_url: publicUrl,
                status: 'pending'
            });

            if (insertError) throw new Error(`Submission failed: ${insertError.message}`);

            setMessage('Your request has been submitted successfully! Please wait for admin approval.');
            setTid('');
            setScreenshot(null);
            setSelectedPlan(null);
            const fileInput = document.getElementById('screenshot-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (e: any) {
            console.error("Plan purchase submission failed:", e);
            let userMessage = "An unknown error occurred. Please try again.";
            if (e.message) {
                if (e.message.includes("Upload failed")) {
                    userMessage = "There was a problem uploading your screenshot. Please check the file and try again.";
                } else if (e.message.includes("Submission failed")) {
                    userMessage = "Your request could not be saved to the database. Please try again later.";
                } else {
                    userMessage = e.message;
                }
            }
            setError(userMessage);
        } finally {
            setLoading(false);
        }
    };
    
    if (selectedPlan) {
        return (
             <div className="animate-fadeInUp">
                <button onClick={() => setSelectedPlan(null)} className="text-sm text-text-secondary hover:text-white mb-4">&larr; Back to all plans</button>
                <h2 className="text-3xl font-bold mb-6">Purchase: {selectedPlan.name}</h2>
                {message && <p className="bg-success/20 text-green-300 p-3 rounded-md mb-4 text-sm">{message}</p>}
                {error && <p className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
                <div className="bg-surface p-8 rounded-xl border border-[var(--border)] max-w-2xl mx-auto">
                    <div className="mb-8 p-5 bg-background/50 border border-[var(--accent-glow)]/30 rounded-lg">
                        <h3 className="text-lg font-semibold text-[var(--accent-glow)] mb-2">Payment Instructions</h3>
                        <p className="text-text-secondary">Please send <strong className="text-white">PKR {selectedPlan.price}</strong> to the following account:</p>
                        <ul className="list-none mt-2 space-y-1 text-text-primary">
                            <li><strong>Name:</strong> Maria</li>
                            <li><strong>Account Number:</strong> 03296779224</li>
                            <li><strong>Services:</strong> Jazzcash / EasyPaisa</li>
                        </ul>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="text-sm font-bold text-text-secondary block mb-2">Transaction ID (TID)</label>
                            <input type="text" value={tid} onChange={(e) => setTid(e.target.value)} required className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-text-secondary block mb-2">Payment Screenshot</label>
                            <input id="screenshot-input" type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files ? e.target.files[0] : null)} required className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent-glow)]/10 file:text-[var(--accent-glow)] hover:file:bg-[var(--accent-glow)]/20 cursor-pointer" />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <Upload size={16} /> {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Choose Your Plan</h2>
            {error && <p className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-surface p-8 rounded-xl border border-[var(--border)] flex flex-col hover:border-[var(--accent-glow)] transition-all">
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{plan.name}</h3>
                        <p className="text-4xl font-extrabold my-4">PKR {plan.price}</p>
                        <ul className="space-y-3 text-text-secondary mb-8 flex-grow">
                            <li className="flex items-center gap-3"><CheckCircle size={16} className="text-green-400" /> Daily Earning: PKR {plan.daily_earning}</li>
                            <li className="flex items-center gap-3"><CheckCircle size={16} className="text-green-400" /> {plan.videos_per_day} Videos Per Day</li>
                            <li className="flex items-center gap-3"><CheckCircle size={16} className="text-green-400" /> Validity: {plan.validity_days} Days</li>
                             <li className="flex items-center gap-3"><CheckCircle size={16} className="text-green-400" /> Weekly Withdrawals</li>
                        </ul>
                        <button onClick={() => setSelectedPlan(plan)} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-md transition">
                            Choose Plan
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Sub-component for Withdrawals
const WithdrawTab: React.FC = () => {
    const { profile, user, refetchProfile } = useAuth();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('EasyPaisa');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const canWithdraw = () => {
        if (!profile) return { available: false, nextDate: null };
        if (!profile.last_withdraw) return { available: true, nextDate: null };

        const lastDate = new Date(profile.last_withdraw);
        
        const today = new Date();
        const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, etc.
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);

        const nextWeekStart = new Date(startOfWeek);
        nextWeekStart.setDate(startOfWeek.getDate() + 7);

        // If the last withdrawal was within the current week (from Sunday onwards)
        if (lastDate >= startOfWeek) {
            return { available: false, nextDate: nextWeekStart };
        }
        
        return { available: true, nextDate: null };
    };

    const { available, nextDate } = canWithdraw();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!available) {
            setError("You can only withdraw once per week.");
            return;
        }

        const numericAmount = parseFloat(amount);
        if (!profile || !user) {
            setError("You must be logged in.");
            return;
        }
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError("Please enter a valid amount.");
            return;
        }
        if (numericAmount < 200) {
            setError("Minimum withdrawal amount is 200 PKR.");
            return;
        }
        if (numericAmount > profile.balance) {
            setError("You do not have enough balance for this withdrawal.");
            return;
        }
        if (!method || !accountNumber || !accountName) {
            setError("Please fill in all account details.");
            return;
        }

        setLoading(true);
        try {
            const { error: insertError } = await supabase
                .from('withdrawals')
                .insert({
                    user_id: user.id,
                    amount: numericAmount,
                    payment_method: method,
                    account_number: accountNumber,
                    account_name: accountName,
                    status: 'pending'
                });

            if (insertError) {
                throw new Error(`Could not submit request: ${insertError.message}`);
            }
            
            // To update the UI to show the new weekly restriction immediately,
            // we manually insert a temporary `last_withdraw` into the profile state
            // and then refetch in the background for consistency.
            if(profile){
                 profile.last_withdraw = new Date().toISOString();
            }

            await refetchProfile();
            setMessage('Your withdrawal request has been submitted successfully!');
            setAmount('');
            setAccountNumber('');
            setAccountName('');
        } catch (e: any) {
             console.error("Withdrawal request failed:", e);
             setError(e.message || "An unknown error occurred while submitting your request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Request Withdrawal</h2>
             {!available && nextDate && (
                <div className="bg-warning/20 text-yellow-300 p-4 rounded-md mb-6 text-center">
                     You can make one withdrawal per week (Sun - Sat). Your next opportunity starts on <span className="font-bold">{nextDate.toLocaleDateString()}</span>.
                </div>
            )}
            {message && <p className="bg-success/20 text-green-300 p-3 rounded-md mb-4 text-sm">{message}</p>}
            {error && <p className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
            <div className="bg-surface p-8 rounded-xl border border-[var(--border)] max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                     <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Withdrawal Amount (PKR)</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="Minimum 200" disabled={!available} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition disabled:opacity-50" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Payment Method</label>
                        <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={!available} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition disabled:opacity-50">
                            <option value="EasyPaisa">EasyPaisa</option>
                            <option value="JazzCash">JazzCash</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Account Number</label>
                        <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required placeholder="e.g., 03001234567" disabled={!available} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition disabled:opacity-50" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Account Display Name</label>
                        <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} required placeholder="e.g., John Doe" disabled={!available} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition disabled:opacity-50" />
                    </div>
                    <button type="submit" disabled={loading || !available} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        <Banknote size={16} /> {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// Sub-component for Transaction History
const HistoryTab: React.FC = () => {
    const [history, setHistory] = useState<(Transaction | Withdrawal)[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    
    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [txResponse, wdResponse] = await Promise.all([
                supabase.from('transactions').select('*, plans(name)').eq('user_id', user.id),
                supabase.from('withdrawals').select('*').eq('user_id', user.id)
            ]);
            
            if (txResponse.error) console.error("Error fetching transactions:", txResponse.error);
            if (wdResponse.error) console.error("Error fetching withdrawals:", wdResponse.error);

            const txData = txResponse.data || [];
            const wdData = wdResponse.data || [];

            const combined = [
                ...txData.map(t => ({ ...t, type: 'transaction' })),
                ...wdData.map(w => ({ ...w, type: 'withdrawal' }))
            ];

            combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setHistory(combined as (Transaction | Withdrawal)[]);

        } catch (e) {
            console.error("Failed to fetch history:", e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const isTransaction = (item: any): item is Transaction => item.type === 'transaction';

    const StatusBadge: React.FC<{status: string}> = ({status}) => {
        const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5";
        if (status === 'approved') return <span className={`${baseClasses} bg-success/20 text-green-300`}><CheckCircle size={12}/> Approved</span>;
        if (status === 'rejected') return <span className={`${baseClasses} bg-danger/20 text-red-300`}><XCircle size={12}/> Rejected</span>;
        return <span className={`${baseClasses} bg-warning/20 text-yellow-300`}><Clock size={12}/> Pending</span>;
    }

    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">History</h2>
            <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-background/50">
                            <tr>
                                <th className="p-4 text-left font-semibold text-text-secondary">Date</th>
                                <th className="p-4 text-left font-semibold text-text-secondary">Type</th>
                                <th className="p-4 text-left font-semibold text-text-secondary">Amount</th>
                                <th className="p-4 text-left font-semibold text-text-secondary">Details</th>
                                <th className="p-4 text-left font-semibold text-text-secondary">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {loading ? (
                                <tr><td colSpan={5} className="text-center p-12"><div className="w-8 h-8 border-2 border-t-transparent mx-auto rounded-full animate-spin"></div></td></tr>
                            ) : history.length > 0 ? history.map(item => (
                                <tr key={`${isTransaction(item) ? 'tx' : 'wd'}-${item.id}`} className="hover:bg-background/30 transition-colors">
                                    <td className="p-4 whitespace-nowrap text-text-secondary">{new Date(item.created_at).toLocaleString()}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        {isTransaction(item) ? (
                                            <span className="font-semibold text-sky-400">Plan Purchase</span>
                                        ) : (
                                            <span className="font-semibold text-rose-400">Withdrawal</span>
                                        )}
                                    </td>
                                    <td className="p-4 whitespace-nowrap font-bold text-green-400">PKR {isTransaction(item) ? item.amount : (item as Withdrawal).amount.toFixed(2)}</td>
                                    <td className="p-4 whitespace-nowrap text-text-secondary">{isTransaction(item) ? `Plan: ${item.plans?.name || 'N/A'}` : `${(item as Withdrawal).payment_method}: ${(item as Withdrawal).account_number}`}</td>
                                    <td className="p-4 whitespace-nowrap"><StatusBadge status={item.status} /></td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-12 text-text-secondary">No history found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Sub-component for Referrals
const ReferralsTab: React.FC = () => {
    const { profile } = useAuth();
    const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        const fetchReferredUsers = async () => {
            if (!profile?.id) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('id, username, created_at, plan_id')
                    .eq('referred_by', profile.id);

                if (error) throw error;
                setReferredUsers(data || []);
            } catch (e: any) {
                setError('Could not fetch your referred users.');
            } finally {
                setLoading(false);
            }
        };
        fetchReferredUsers();
    }, [profile]);

    const handleCopy = () => {
        if (profile?.referral_code) {
            navigator.clipboard.writeText(profile.referral_code).then(() => {
                setCopySuccess('Copied!');
                setTimeout(() => setCopySuccess(''), 2000);
            }, () => {
                setCopySuccess('Failed to copy.');
            });
        }
    };

    if (!profile) return null;

    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Referral Program</h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="bg-surface p-6 rounded-xl border border-[var(--border)]">
                    <h3 className="text-xl font-semibold text-white mb-3">Your Referral Code</h3>
                    <p className="text-text-secondary mb-4">Share this code with your friends. When they sign up and purchase their first plan, you'll receive a bonus of 100 PKR!</p>
                    <div className="flex items-center gap-2 bg-background p-3 rounded-lg border border-[var(--border)]">
                        <input
                            type="text"
                            value={profile.referral_code || 'No code generated yet.'}
                            readOnly
                            className="bg-transparent w-full text-lg font-mono text-text-primary focus:outline-none"
                        />
                        <button onClick={handleCopy} disabled={!profile.referral_code} className="bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-primary-500 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                            {copySuccess ? <CheckCircle size={14} /> : <Copy size={14} />}
                            {copySuccess || 'Copy'}
                        </button>
                    </div>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-[var(--border)] grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                    <div>
                        <h3 className="text-lg font-semibold text-text-secondary mb-2">Total Referral Earnings</h3>
                        <p className="text-4xl font-extrabold text-green-400">PKR {profile.referral_earnings?.toFixed(2) || '0.00'}</p>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-text-secondary mb-2">Total Referrals</h3>
                        <p className="text-4xl font-extrabold text-blue-400">{referredUsers.length}</p>
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-bold mb-4">Users You've Referred</h3>
             <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-background/50">
                            <tr>
                                <th className="p-4 text-left font-semibold text-text-secondary">Username</th>
                                <th className="p-4 text-left font-semibold text-text-secondary">Date Joined</th>
                                <th className="p-4 text-left font-semibold text-text-secondary">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {loading ? (
                                <tr><td colSpan={3} className="text-center p-12"><div className="w-8 h-8 border-2 border-t-transparent mx-auto rounded-full animate-spin"></div></td></tr>
                            ) : error ? (
                                <tr><td colSpan={3} className="text-center p-12 text-danger">{error}</td></tr>
                            ) : referredUsers.length > 0 ? referredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-background/30 transition-colors">
                                    <td className="p-4 font-medium text-text-primary">{user.username}</td>
                                    <td className="p-4 text-text-secondary">{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        {user.plan_id ? (
                                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-success/20 text-green-300">Plan Active</span>
                                        ) : (
                                             <span className="px-3 py-1 text-xs font-semibold rounded-full bg-warning/20 text-yellow-300">Joined</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="text-center p-12 text-text-secondary">You haven't referred anyone yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


// Main Dashboard Page
const DashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('watch');
    const { profile } = useAuth();

    const renderTabContent = () => {
        switch (activeTab) {
            case 'watch': return <WatchVideos />;
            case 'plans': return <BuyPlan />;
            case 'withdraw': return <WithdrawTab />;
            case 'history': return <HistoryTab />;
            case 'referrals': return <ReferralsTab />;
            default: return <WatchVideos />;
        }
    };
    
    if(!profile) return null;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };
    const greeting = getGreeting();

    const getPlanExpiryDate = () => {
        if (!profile.plan_activated_at || !profile.plans) return null;
        const activationDate = new Date(profile.plan_activated_at);
        activationDate.setDate(activationDate.getDate() + profile.plans.validity_days);
        return activationDate.toLocaleDateString();
    }
    const expiryDate = getPlanExpiryDate();

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <header className="mb-10 animate-fadeInUp">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white">{greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{profile.username}</span>!</h1>
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4 items-center bg-surface/50 backdrop-blur-sm border border-[var(--border)] p-6 rounded-xl">
                    <div className="text-lg">Balance: <span className="font-bold text-green-400 text-2xl">PKR {profile.balance.toFixed(2)}</span></div>
                    {profile.isPlanCurrentlyActive && profile.plans ? (
                        <>
                        <div className="text-lg">Current Plan: <span className="font-bold text-yellow-400 text-2xl">{profile.plans.name}</span></div>
                        {expiryDate && <div className="text-lg">Expires on: <span className="font-bold text-text-primary text-2xl">{expiryDate}</span></div>}
                        </>
                    ) : (
                         <div className="text-lg">Current Plan: <span className="font-bold text-text-secondary text-2xl">None</span></div>
                    )}
                </div>
            </header>

            <div className="relative border-b border-[var(--border)] mb-8">
                 <div className="flex overflow-x-auto -mb-px">
                    <button onClick={() => setActiveTab('watch')} className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'watch' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><PlayCircle size={18}/> Watch Videos</button>
                    <button onClick={() => setActiveTab('plans')} className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'plans' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Shield size={18}/> Plans</button>
                    <button onClick={() => setActiveTab('withdraw')} className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'withdraw' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Banknote size={18}/> Withdraw</button>
                    <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'history' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><History size={18}/> History</button>
                    <button onClick={() => setActiveTab('referrals')} className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'referrals' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Users size={18}/> Referrals</button>
                </div>
            </div>
            
            <div>{renderTabContent()}</div>

        </div>
    );
};

export default DashboardPage;