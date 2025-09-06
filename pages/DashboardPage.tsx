import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import type { Video, Transaction, Withdrawal } from '../types';
import { PlayCircle, DollarSign, History, Upload, CheckCircle, XCircle, Clock, X, Banknote, Film } from 'lucide-react';

const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        let videoId = urlObj.searchParams.get('v');
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        }
        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
        }
        return url; // Fallback for other video urls
    } catch (e) {
        console.error("Invalid video URL", e);
        return url; // Return original url on error
    }
};


const VideoPlayerModal: React.FC<{
    video: Video;
    onClose: () => void;
    onClaim: (video: Video) => void;
    isClaiming: boolean;
    claimError: string;
}> = ({ video, onClose, onClaim, isClaiming, claimError }) => {
    const embedUrl = getYouTubeEmbedUrl(video.video_url);
    const [countdown, setCountdown] = useState(video.watch_duration_seconds || 30);
    const [timerFinished, setTimerFinished] = useState(false);

    useEffect(() => {
        if (countdown <= 0) {
            setTimerFinished(true);
            return;
        }
        const timerId = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [countdown]);


    const handleClaim = () => {
        if (!isClaiming) {
            onClaim(video);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeInUp">
            <div className="bg-surface/80 backdrop-blur-lg rounded-xl shadow-2xl max-w-3xl w-full border border-[var(--border)]">
                <div className="flex justify-between items-center p-5 border-b border-[var(--border)]">
                    <h3 className="text-xl font-bold text-white">{video.title}</h3>
                    <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors"><X size={24} /></button>
                </div>
                <div className="p-5">
                    {embedUrl ? (
                         <div className="aspect-video mb-4">
                            <iframe
                                src={embedUrl}
                                title={video.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full rounded-lg"
                            ></iframe>
                        </div>
                    ) : <p className="text-danger text-center p-8">Invalid video link.</p>}
                   
                    <div className="mb-4 text-center h-8 flex items-center justify-center">
                        {!timerFinished ? (
                             <p className="text-yellow-400 flex items-center gap-2"><Clock size={16} className="animate-spin" style={{animationDuration: '2s'}}/> Please watch for <span className="font-bold text-xl">{countdown}</span> more seconds to claim.</p>
                        ) : (
                            <p className="text-green-400 font-bold text-lg flex items-center gap-2"><CheckCircle size={20}/> You can now claim your reward!</p>
                        )}
                    </div>
                    
                    {claimError && <p className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm">{claimError}</p>}
                    
                    <button 
                        onClick={handleClaim}
                        disabled={isClaiming || !embedUrl || !timerFinished}
                        className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                         {isClaiming ? (
                            <>
                                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div>
                                Claiming...
                            </>
                         ) : `Claim Reward (PKR ${video.earning_pkr})`}
                    </button>
                </div>
            </div>
        </div>
    );
};


// Sub-component for Watching Videos
const WatchVideos: React.FC = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [watchedVideos, setWatchedVideos] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const { profile, refetchProfile } = useAuth();
    const [error, setError] = useState('');
    const [openingVideo, setOpeningVideo] = useState<number | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [isClaimingReward, setIsClaimingReward] = useState(false);
    const [claimError, setClaimError] = useState('');


    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data: videoData, error: videoError } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
            if (videoError) throw videoError;
            if (videoData) setVideos(videoData);

            if (!profile) return;
            const { data: watchedData, error: watchedError } = await supabase.from('watched_videos').select('video_id').eq('user_id', profile.id);
            if (watchedError) throw watchedError;
            if(watchedData) setWatchedVideos(watchedData.map(v => v.video_id));
        } catch (e: any) {
            setError("Could not load videos. Please try refreshing the page.");
            console.error("Error fetching video data:", e);
        } finally {
            setLoading(false);
        }
    }, [profile]);
    
    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);
    
    const handleOpenVideo = async (video: Video) => {
        setError('');
        if (!profile) {
            setError("You must be logged in to watch videos.");
            return;
        }
        if (watchedVideos.includes(video.id)) {
            setError("You have already watched this video.");
            return;
        }
        if (profile.coins < video.required_coins) {
            setError("You don't have enough coins to watch this video.");
            return;
        }

        setOpeningVideo(video.id);
        try {
            const newCoins = profile.coins - video.required_coins;
            const { error: updateError } = await supabase.from('users').update({ coins: newCoins }).eq('id', profile.id);
            if(updateError) throw updateError;
            
            await refetchProfile();
            setSelectedVideo(video);
        } catch (e: any) {
            console.error("Failed to deduct coins:", e);
            let message = 'An unknown error occurred.';
            if (e instanceof Error) {
                message = e.message;
            }
            setError(`Error starting video: ${message}. Please refresh and try again.`);
            await refetchProfile();
        } finally {
            setOpeningVideo(null);
        }
    };

    const handleClaimReward = async (video: Video) => {
        if (!profile) {
            setClaimError("You must be logged in to claim rewards.");
            return;
        }
    
        setIsClaimingReward(true);
        setClaimError('');

        try {
            const { error: rpcError } = await supabase.rpc('claim_video_reward', { 
                video_id_to_claim: video.id 
            });
        
            if (rpcError) {
                console.error('Claim Reward RPC Error:', rpcError);
                const userMessage = rpcError.message.includes('unique constraint') || rpcError.message.includes('duplicate key')
                    ? 'You have already claimed the reward for this video.'
                    : `Failed to claim reward: ${rpcError.message}`;
                throw new Error(userMessage);
            }
            
            // Success
            await refetchProfile();
            setWatchedVideos(prev => [...prev, video.id]);
            setSelectedVideo(null); // This closes the modal
        } catch (e: any) {
            setClaimError(e.message);
        } finally {
            setIsClaimingReward(false);
        }
    };

    const handleCloseModal = () => {
        setSelectedVideo(null);
        setClaimError(''); // Also clear error on close
    };

    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Watch & Earn</h2>
            {error && <p className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}

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
                        <div key={video.id} className={`bg-surface/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-[var(--border)] flex flex-col justify-between transition-all duration-300 animate-fadeInUp ${watchedVideos.includes(video.id) ? 'opacity-50' : 'hover:border-[var(--accent-glow)]/50 hover:-translate-y-1'}`} style={{ animationDelay: `${index * 50}ms`}}>
                            <div>
                                <h3 className="text-xl font-semibold text-white">{video.title}</h3>
                                <p className="text-text-secondary mt-2 mb-4 h-12 overflow-hidden">{video.description}</p>
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--border)]">
                                <div className="text-sm">
                                    <p className="text-text-secondary">Cost: <span className="font-bold text-yellow-400">{video.required_coins} Coins</span></p>
                                    <p className="text-text-secondary">Reward: <span className="font-bold text-green-400">PKR {video.earning_pkr}</span></p>
                                </div>
                                <button
                                    onClick={() => handleOpenVideo(video)}
                                    disabled={watchedVideos.includes(video.id) || (profile?.coins ?? 0) < video.required_coins || openingVideo === video.id}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2 px-4 rounded-lg transition hover:opacity-90 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
                                >
                                {openingVideo === video.id ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Starting...</span>
                                    </>
                                ) : watchedVideos.includes(video.id) ? (
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
                    onClose={handleCloseModal}
                    onClaim={handleClaimReward}
                    isClaiming={isClaimingReward}
                    claimError={claimError}
                />
            )}
        </div>
    );
};


// Sub-component for Buying Coins
const BuyCoins: React.FC = () => {
    const [pkg, setPkg] = useState(5000);
    const [tid, setTid] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { user } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tid || !screenshot || !user) {
            setError('Please fill all fields and upload a screenshot.');
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        
        const filePath = `${user.id}/${Date.now()}_${screenshot.name}`;

        try {
            const { error: uploadError } = await supabase.storage.from('screenshots').upload(filePath, screenshot);

            if (uploadError) {
                throw new Error(`Screenshot upload failed: ${uploadError.message}`);
            }
            
            const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(filePath);
            
            if (!urlData || !urlData.publicUrl) {
                // Cleanup orphaned file
                await supabase.storage.from('screenshots').remove([filePath]);
                throw new Error("Could not get public URL for the screenshot. Please try again.");
            }
            
            const publicUrl = urlData.publicUrl;

            const { error: insertError } = await supabase.from('transactions').insert({
                user_id: user.id,
                package: pkg,
                tid: tid,
                screenshot_url: publicUrl,
                status: 'pending'
            });

            if (insertError) {
                throw new Error(`Submission failed: ${insertError.message}`);
            }

            setMessage('Your request has been submitted successfully! Please wait for admin approval.');
            setTid('');
            setScreenshot(null);
            // Reset the file input visually
            const fileInput = document.getElementById('screenshot-input') as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }

        } catch (e: any) {
            setError(e.message);
            console.error("Buy Coins Error:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Buy Coins</h2>
            {message && <p className="bg-success/20 text-green-300 p-3 rounded-md mb-4 text-sm">{message}</p>}
            {error && <p className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
            <div className="bg-surface p-8 rounded-xl border border-[var(--border)] max-w-2xl mx-auto">
                <div className="mb-8 p-5 bg-background/50 border border-[var(--accent-glow)]/30 rounded-lg">
                    <h3 className="text-lg font-semibold text-[var(--accent-glow)] mb-2">Payment Instructions</h3>
                    <p className="text-text-secondary">Please send your payment to the following account:</p>
                    <ul className="list-none mt-2 space-y-1 text-text-primary">
                        <li><strong>Name:</strong> Maria</li>
                        <li><strong>Account Number:</strong> 03296779224</li>
                        <li><strong>Services:</strong> Jazzcash / EasyPaisa</li>
                    </ul>
                    <p className="text-xs text-text-secondary mt-3">After payment, please fill out the form below with your Transaction ID (TID) and a screenshot of your receipt.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Select Package</label>
                        <select value={pkg} onChange={(e) => setPkg(Number(e.target.value))} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition">
                            <option value={5000}>5000 Coins</option>
                            <option value={6000}>6000 Coins</option>
                            <option value={7000}>7000 Coins</option>
                            <option value={8000}>8000 Coins</option>
                            <option value={9000}>9000 Coins</option>
                            <option value={10000}>10000 Coins</option>
                        </select>
                    </div>
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

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
            const newBalance = profile.balance - numericAmount;

            const { error: updateError } = await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('id', user.id);

            if (updateError) throw new Error(`Could not update balance: ${updateError.message}`);

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
                // Attempt to rollback balance change
                await supabase.from('users').update({ balance: profile.balance }).eq('id', user.id);
                throw new Error(`Could not submit request: ${insertError.message}`);
            }

            await refetchProfile();
            setMessage('Your withdrawal request has been submitted successfully!');
            setAmount('');
            setAccountNumber('');
            setAccountName('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Request Withdrawal</h2>
            {message && <p className="bg-success/20 text-green-300 p-3 rounded-md mb-4 text-sm">{message}</p>}
            {error && <p className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
            <div className="bg-surface p-8 rounded-xl border border-[var(--border)] max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Withdrawal Amount (PKR)</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="Minimum 200" className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Payment Method</label>
                        <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition">
                            <option value="EasyPaisa">EasyPaisa</option>
                            <option value="JazzCash">JazzCash</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Account Number</label>
                        <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required placeholder="e.g., 03001234567" className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Account Display Name</label>
                        <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} required placeholder="e.g., John Doe" className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
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
    const { user } = useAuth();
    
    const fetchHistory = useCallback(async () => {
        if (!user) return;
        
        const { data: txData, error: txError } = await supabase.from('transactions').select('*').eq('user_id', user.id);
        if (txError) console.error("Error fetching transactions:", txError);

        const { data: wdData, error: wdError } = await supabase.from('withdrawals').select('*').eq('user_id', user.id);
        if (wdError) console.error("Error fetching withdrawals:", wdError);
        
        const combined = [...(txData || []), ...(wdData || [])];
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setHistory(combined);
    }, [user]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const isTransaction = (item: Transaction | Withdrawal): item is Transaction => 'package' in item;

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
                            {history.map(item => (
                                <tr key={`${isTransaction(item) ? 'tx' : 'wd'}-${item.id}`} className="hover:bg-background/30 transition-colors">
                                    <td className="p-4 whitespace-nowrap text-text-secondary">{new Date(item.created_at).toLocaleString()}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        {isTransaction(item) ? (
                                            <span className="font-semibold text-sky-400">Coin Purchase</span>
                                        ) : (
                                            <span className="font-semibold text-rose-400">Withdrawal</span>
                                        )}
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                         {isTransaction(item) ? (
                                            <span className="font-bold text-yellow-400">{item.package} Coins</span>
                                        ) : (
                                            <span className="font-bold text-green-400">PKR {item.amount.toFixed(2)}</span>
                                        )}
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-text-secondary">{isTransaction(item) ? `TID: ${item.tid}` : `${item.payment_method}: ${item.account_number}`}</td>
                                    <td className="p-4 whitespace-nowrap"><StatusBadge status={item.status} /></td>
                                </tr>
                            ))}
                             {history.length === 0 && (
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


// Main Dashboard Page
const DashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('watch');
    const { profile, refetchProfile } = useAuth();

    useEffect(() => {
        const handleFocus = () => {
            refetchProfile();
        };
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [refetchProfile]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'watch': return <WatchVideos />;
            case 'buy': return <BuyCoins />;
            case 'withdraw': return <WithdrawTab />;
            case 'history': return <HistoryTab />;
            default: return <WatchVideos />;
        }
    };
    
    if(!profile) return null;

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <header className="mb-10 animate-fadeInUp">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white">Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{profile.username}</span>!</h1>
                <div className="mt-6 flex flex-wrap gap-6 items-center bg-surface/50 backdrop-blur-sm border border-[var(--border)] p-6 rounded-xl">
                    <div className="text-lg">Coins: <span className="font-bold text-yellow-400 text-2xl">{profile.coins}</span></div>
                    <div className="text-lg">Balance: <span className="font-bold text-green-400 text-2xl">PKR {profile.balance.toFixed(2)}</span></div>
                </div>
            </header>

            <div className="relative border-b border-[var(--border)] mb-8">
                 <div className="flex overflow-x-auto -mb-px">
                    <button onClick={() => setActiveTab('watch')} className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'watch' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><PlayCircle size={18}/> Watch Videos</button>
                    <button onClick={() => setActiveTab('buy')} className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'buy' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><DollarSign size={18}/> Buy Coins</button>
                    <button onClick={() => setActiveTab('withdraw')} className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'withdraw' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Banknote size={18}/> Withdraw</button>
                    <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'history' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><History size={18}/> History</button>
                </div>
            </div>
            
            <div>{renderTabContent()}</div>

        </div>
    );
};

export default DashboardPage;