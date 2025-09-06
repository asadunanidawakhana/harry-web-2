import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { UserProfile, Transaction, Video, Withdrawal } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, ListTodo, Film, Users, Check, X, Trash2, Edit, PlusCircle, Eye, Ban, UserCog, Banknote } from 'lucide-react';

const AdminError: React.FC<{ message: string; onDismiss: () => void; }> = ({ message, onDismiss }) => (
    <div className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm flex justify-between items-center">
        <span>{message}</span>
        <button onClick={onDismiss} className="text-red-300 hover:text-red-100"><X size={16} /></button>
    </div>
);

// Admin Dashboard Component
const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, coins: 0, earnings: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const { count: userCount, error: userError } = await supabase.from('users').select('*', { count: 'exact', head: true });
                if(userError) throw userError;

                const { data: approvedTransactions, error: txError } = await supabase.from('transactions').select('package').eq('status', 'approved');
                if(txError) throw txError;
                
                const { data: users, error: balanceError } = await supabase.from('users').select('balance');
                if(balanceError) throw balanceError;
            
                const totalCoins = approvedTransactions?.reduce((sum, tx) => sum + tx.package, 0) || 0;
                const totalEarnings = users?.reduce((sum, user) => sum + (user.balance || 0), 0) || 0;

                setStats({ users: userCount || 0, coins: totalCoins, earnings: totalEarnings });
            } catch(error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const StatCard: React.FC<{title: string, value: string | number, loading: boolean}> = ({ title, value, loading }) => (
         <div className="bg-surface p-6 rounded-xl border border-[var(--border)]">
            <h3 className="text-text-secondary text-sm font-medium">{title}</h3>
            {loading ? 
                <div className="h-9 mt-1 w-2/3 bg-background/50 rounded animate-pulse"></div> :
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{value}</p>
            }
        </div>
    );

    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Users" value={stats.users} loading={loading} />
                <StatCard title="Total Coins Sold" value={stats.coins} loading={loading} />
                <StatCard title="Total Earnings Distributed" value={`PKR ${stats.earnings.toFixed(2)}`} loading={loading} />
            </div>
        </div>
    );
};

// Manage Transactions Component
const ManageTransactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase.from('transactions').select('*, users(email, username)').order('created_at', { ascending: true });
        if (fetchError) {
            setError('Failed to load transactions.');
            console.error('Fetch Transactions Error:', fetchError);
        } else if (data) {
            setTransactions(data as Transaction[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const handleUpdate = async (tx: Transaction, newStatus: 'approved' | 'rejected') => {
        if(tx.status !== 'pending') return;
        setError(null);
        try {
            // If approved, add coins to user first to ensure user exists
            if (newStatus === 'approved') {
                const { data: userProfile, error: profileError } = await supabase.from('users').select('coins').eq('id', tx.user_id).single();
                if (profileError || !userProfile) {
                     throw new Error(profileError?.message || `User with ID ${tx.user_id} not found.`);
                }

                const newCoins = (userProfile.coins || 0) + tx.package;
                const { error: userUpdateError } = await supabase.from('users').update({ coins: newCoins }).eq('id', tx.user_id);
                if (userUpdateError) throw userUpdateError;
            }

            // Then, update transaction status
            const { error: updateError } = await supabase.from('transactions').update({ status: newStatus }).eq('id', tx.id);
            if (updateError) throw updateError;
            
            fetchTransactions();
        } catch(e: any) {
            setError(`Operation failed: ${e.message}`);
            console.error('Update Transaction Error:', e);
        }
    };

    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Manage Transactions</h2>
            {error && <AdminError message={error} onDismiss={() => setError(null)} />}
            <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm">
                <thead className="bg-background/50"><tr>
                    <th className="p-4 text-left text-text-secondary font-semibold">User</th><th className="p-4 text-left text-text-secondary font-semibold">Package</th><th className="p-4 text-left text-text-secondary font-semibold">TID</th>
                    <th className="p-4 text-left text-text-secondary font-semibold">Screenshot</th><th className="p-4 text-left text-text-secondary font-semibold">Status</th><th className="p-4 text-left text-text-secondary font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                    {transactions.map(tx => (<tr key={tx.id} className="hover:bg-background/30">
                        <td className="p-4">{tx.users?.username || tx.users?.email || 'Unknown User'}</td><td>{tx.package} Coins</td><td>{tx.tid}</td>
                        <td><a href={tx.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-glow)] hover:underline flex items-center gap-1"><Eye size={14}/> View</a></td>
                        <td className="capitalize">{tx.status}</td><td>
                            {tx.status === 'pending' && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleUpdate(tx, 'approved')} className="p-2 bg-success/20 text-green-300 rounded hover:bg-success/40 transition-colors" title="Approve"><Check size={16} /></button>
                                    <button onClick={() => handleUpdate(tx, 'rejected')} className="p-2 bg-danger/20 text-red-300 rounded hover:bg-danger/40 transition-colors" title="Reject"><X size={16} /></button>
                                </div>
                            )}
                        </td>
                    </tr>))}
                    {!loading && transactions.length === 0 && (
                        <tr><td colSpan={6} className="text-center p-12 text-text-secondary">No transactions found.</td></tr>
                    )}
                </tbody>
            </table></div></div>
        </div>
    );
};

// Manage Withdrawals Component
const ManageWithdrawals = () => {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWithdrawals = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase.from('withdrawals').select('*, users(email, username)').order('created_at', { ascending: true });
        if (fetchError) {
            setError('Failed to load withdrawal requests.');
            console.error('Fetch Withdrawals Error:', fetchError);
        } else if (data) {
            setWithdrawals(data as Withdrawal[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

    const handleApprove = async (wd: Withdrawal) => {
        if (wd.status !== 'pending') return;
        setError(null);
        try {
            const { error: updateError } = await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', wd.id);
            if (updateError) throw updateError;
            fetchWithdrawals();
        } catch(e: any) {
            setError(`Approval failed: ${e.message}`);
        }
    };

    const handleReject = async (wd: Withdrawal) => {
        if (wd.status !== 'pending') return;
        setError(null);
        try {
            // Get user's current balance
            const { data: userProfile, error: profileError } = await supabase.from('users').select('balance').eq('id', wd.user_id).single();
            if (profileError || !userProfile) throw new Error(profileError?.message || `User with ID ${wd.user_id} not found.`);

            // Refund amount
            const newBalance = (userProfile.balance || 0) + wd.amount;
            const { error: refundError } = await supabase.from('users').update({ balance: newBalance }).eq('id', wd.user_id);
            if (refundError) throw new Error(`Refund failed: ${refundError.message}`);

            // Update withdrawal status
            const { error: updateError } = await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', wd.id);
            if (updateError) {
                // Attempt to roll back refund
                await supabase.from('users').update({ balance: userProfile.balance }).eq('id', wd.user_id);
                throw new Error(`Could not update status after refund: ${updateError.message}`);
            }

            fetchWithdrawals();
        } catch(e: any) {
            setError(`Rejection failed: ${e.message}`);
        }
    };

    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Manage Withdrawals</h2>
            {error && <AdminError message={error} onDismiss={() => setError(null)} />}
            <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm">
                <thead className="bg-background/50"><tr>
                    <th className="p-4 text-left text-text-secondary font-semibold">User</th><th className="p-4 text-left text-text-secondary font-semibold">Amount</th><th className="p-4 text-left text-text-secondary font-semibold">Method</th>
                    <th className="p-4 text-left text-text-secondary font-semibold">Account Info</th><th className="p-4 text-left text-text-secondary font-semibold">Status</th><th className="p-4 text-left text-text-secondary font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                    {withdrawals.map(wd => (<tr key={wd.id} className="hover:bg-background/30">
                        <td className="p-4">{wd.users?.username || wd.users?.email || 'N/A'}</td>
                        <td className="p-4">PKR {wd.amount.toFixed(2)}</td>
                        <td className="p-4">{wd.payment_method}</td>
                        <td className="p-4">
                            <div>{wd.account_name}</div>
                            <div className="text-text-secondary">{wd.account_number}</div>
                        </td>
                        <td className="p-4 capitalize">{wd.status}</td>
                        <td>
                            {wd.status === 'pending' && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleApprove(wd)} className="p-2 bg-success/20 text-green-300 rounded hover:bg-success/40 transition-colors" title="Approve"><Check size={16} /></button>
                                    <button onClick={() => handleReject(wd)} className="p-2 bg-danger/20 text-red-300 rounded hover:bg-danger/40 transition-colors" title="Reject"><X size={16} /></button>
                                </div>
                            )}
                        </td>
                    </tr>))}
                     {!loading && withdrawals.length === 0 && (
                        <tr><td colSpan={6} className="text-center p-12 text-text-secondary">No withdrawal requests found.</td></tr>
                    )}
                </tbody>
            </table></div></div>
        </div>
    );
};

// Manage Videos Component
const ManageVideos = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentVideo, setCurrentVideo] = useState<Partial<Video> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const fetchVideos = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
        if(error) {
            setError('Could not fetch videos.');
            console.error("Fetch Videos Error:", error);
        }
        else if(data) setVideos(data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchVideos(); }, [fetchVideos]);

    const validateField = (name: string, value: any): string => {
        switch (name) {
            case 'title':
                return !value ? 'Title is required.' : '';
            case 'video_url':
                if (!value) return 'Video URL is required.';
                try {
                    new URL(value);
                    return '';
                } catch {
                    return 'Please enter a valid URL.';
                }
            case 'required_coins':
                if (value === null || value === undefined) return 'Required coins are required.';
                if (value < 0) return 'Coins cannot be negative.';
                if (value > 1000000) return 'Value seems too high.';
                return '';
            case 'earning_pkr':
                if (value === null || value === undefined) return 'Earning amount is required.';
                if (value < 0) return 'Earnings cannot be negative.';
                if (value >= 100000000) return 'Value must be less than 100,000,000.';
                return '';
            case 'watch_duration_seconds':
                if (value === null || value === undefined) return 'Duration is required.';
                if (value <= 0) return 'Duration must be positive.';
                if (value > 3600) return 'Duration cannot exceed 1 hour (3600s).';
                return '';
            default:
                return '';
        }
    };

    const handleInputChange = (field: keyof Video, value: any) => {
        if (!currentVideo) return;
        
        let parsedValue = value;
        if (field === 'required_coins' || field === 'watch_duration_seconds') {
            parsedValue = value === '' ? undefined : parseInt(value, 10);
            if (isNaN(parsedValue)) parsedValue = undefined;
        }
        if (field === 'earning_pkr') {
            parsedValue = value === '' ? undefined : parseFloat(value);
            if (isNaN(parsedValue)) parsedValue = undefined;
        }

        const newVideo = { ...currentVideo, [field]: parsedValue };
        setCurrentVideo(newVideo);

        const validationError = validateField(field, parsedValue);
        setFormErrors(prev => {
            const newErrors = { ...prev };
            if (validationError) {
                newErrors[field] = validationError;
            } else {
                delete newErrors[field];
            }
            return newErrors;
        });
    };

    const handleSave = async () => {
        if (!currentVideo) return;
        
        const fieldsToValidate: (keyof Video)[] = ['title', 'video_url', 'required_coins', 'earning_pkr', 'watch_duration_seconds'];
        const validationErrors: Record<string, string> = {};
        fieldsToValidate.forEach(field => {
            const error = validateField(field, currentVideo[field]);
            if (error) validationErrors[field] = error;
        });

        setFormErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            setError("Please fix the errors before saving.");
            return;
        }

        setError(null);
        setSaving(true);
        
        try {
            const videoData = {
                title: currentVideo.title || '',
                description: currentVideo.description || '',
                video_url: currentVideo.video_url || '',
                required_coins: currentVideo.required_coins ?? 0,
                earning_pkr: currentVideo.earning_pkr ?? 0,
                watch_duration_seconds: currentVideo.watch_duration_seconds ?? 30,
            };
    
            let response;
            if (currentVideo.id) {
                response = await supabase.from('videos').update(videoData).eq('id', currentVideo.id).select().single();
            } else {
                response = await supabase.from('videos').insert(videoData).select().single();
            }
    
            if (response.error) throw response.error;
    
            setShowModal(false);
            fetchVideos();
        } catch (e: any) {
            let errorMessage = "An unknown error occurred while saving the video.";
            if (e) {
                if (typeof e.message === 'string' && e.message) {
                    errorMessage = e.message;
                    if (typeof e.details === 'string' && e.details) errorMessage += ` Details: ${e.details}.`;
                    if (typeof e.hint === 'string' && e.hint) errorMessage += ` Hint: ${e.hint}.`;
                } else {
                    try {
                        const stringified = JSON.stringify(e);
                        if(stringified !== '{}') errorMessage = stringified;
                    } catch {
                        errorMessage = String(e);
                    }
                }
            }
            setError(`Failed to save video: ${errorMessage}`);
            console.error("Save Video Error Details:", e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if(window.confirm("Are you sure? This will also delete all watch history for this video.")){
            setError(null);
            const { error } = await supabase.from('videos').delete().eq('id', id);
            if(error) {
                 setError(`Failed to delete video: ${error.message}`);
                 console.error("Delete Video Error:", error);
            }
            else fetchVideos();
        }
    };
    
    return (
        <div className="animate-fadeInUp">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Manage Videos</h2>
                <button onClick={() => { setCurrentVideo({}); setShowModal(true); setError(null); setFormErrors({}); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-opacity"><PlusCircle size={16}/> Add Video</button>
            </div>
            {error && <AdminError message={error} onDismiss={() => setError(null)} />}
            <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm">
                <thead className="bg-background/50"><tr>
                    <th className="p-4 text-left text-text-secondary font-semibold">Title</th><th className="p-4 text-left text-text-secondary font-semibold">Cost</th><th className="p-4 text-left text-text-secondary font-semibold">Reward</th><th className="p-4 text-left text-text-secondary font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                    {videos.map(v => (<tr key={v.id} className="hover:bg-background/30">
                        <td className="p-4">{v.title}</td><td>{v.required_coins}</td><td>{v.earning_pkr}</td>
                        <td className="p-4"><div className="flex gap-2">
                            <button onClick={() => { setCurrentVideo(v); setShowModal(true); setError(null); setFormErrors({}); }} className="p-2 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/40 transition-colors" title="Edit"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(v.id)} className="p-2 bg-danger/20 text-red-300 rounded hover:bg-danger/40 transition-colors" title="Delete"><Trash2 size={16}/></button>
                        </div></td>
                    </tr>))}
                    {!loading && videos.length === 0 && (
                        <tr><td colSpan={4} className="text-center p-12 text-text-secondary">No videos have been added yet.</td></tr>
                    )}
                </tbody>
            </table></div></div>
            {showModal && currentVideo && (
                <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeInUp"><div className="bg-surface/90 backdrop-blur-lg rounded-xl shadow-2xl p-8 max-w-lg w-full border border-[var(--border)]">
                    <h3 className="text-2xl font-bold mb-6">{currentVideo.id ? 'Edit' : 'Add'} Video</h3>
                    {error && <AdminError message={error} onDismiss={() => setError(null)} />}
                    <div className="space-y-4">
                        <div>
                            <input type="text" placeholder="Title" value={currentVideo.title || ''} onChange={e => handleInputChange('title', e.target.value)} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition"/>
                            {formErrors.title && <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>}
                        </div>
                        <div>
                            <textarea placeholder="Description" value={currentVideo.description || ''} onChange={e => handleInputChange('description', e.target.value)} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition"/>
                        </div>
                        <div>
                            <input type="text" placeholder="YouTube Video URL" value={currentVideo.video_url || ''} onChange={e => handleInputChange('video_url', e.target.value)} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition"/>
                             {formErrors.video_url && <p className="text-red-400 text-xs mt-1">{formErrors.video_url}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <input type="number" placeholder="Required Coins" value={currentVideo.required_coins ?? ''} onChange={e => handleInputChange('required_coins', e.target.value)} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition"/>
                                {formErrors.required_coins && <p className="text-red-400 text-xs mt-1">{formErrors.required_coins}</p>}
                            </div>
                            <div>
                                <input type="number" step="0.01" placeholder="Earning PKR" value={currentVideo.earning_pkr ?? ''} onChange={e => handleInputChange('earning_pkr', e.target.value)} className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition"/>
                                 {formErrors.earning_pkr && <p className="text-red-400 text-xs mt-1">{formErrors.earning_pkr}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-text-secondary">Watch Duration (seconds)</label>
                            <input type="number" placeholder="e.g., 30" value={currentVideo.watch_duration_seconds ?? ''} onChange={e => handleInputChange('watch_duration_seconds', e.target.value)} className="w-full p-3 mt-1 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition"/>
                            {formErrors.watch_duration_seconds && <p className="text-red-400 text-xs mt-1">{formErrors.watch_duration_seconds}</p>}
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 mt-8">
                        <button onClick={() => setShowModal(false)} className="bg-background/80 hover:bg-background border border-[var(--border)] py-2 px-4 rounded-lg transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={saving || Object.keys(formErrors).length > 0} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                           {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div></div>
            )}
        </div>
    );
};

// Manage Users Component
const ManageUsers = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { profile } = useAuth();
    
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const { data, error: fetchError } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (fetchError) {
            setError('Failed to fetch users: ' + fetchError.message);
            console.error("Fetch Users Error:", fetchError);
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);
    
    const performUserAction = async (action: PromiseLike<any>, successCallback: () => void) => {
        setError(null);
        try {
            const { error } = await action;
            if (error) throw error;
            successCallback();
        } catch (e: any) {
            setError(`Action failed: ${e.message}`);
            console.error("User Action Error:", e);
        }
    };

    const handleToggleBan = (user: UserProfile) => {
        const newBanStatus = !user.is_banned;
        const action = newBanStatus ? 'ban' : 'unban';
        if (window.confirm(`Are you sure you want to ${action} this user?`)) {
            performUserAction(
                supabase.from('users').update({ is_banned: newBanStatus }).eq('id', user.id),
                fetchUsers
            );
        }
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm("Delete this user's profile? This action cannot be undone.")) {
            performUserAction(
                supabase.from('users').delete().eq('id', userId),
                fetchUsers
            );
        }
    };

    const handleRoleChange = (user: UserProfile) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        const action = newRole === 'admin' ? 'promote' : 'demote';
        if (window.confirm(`Are you sure you want to ${action} ${user.username} to ${newRole}?`)) {
            performUserAction(
                supabase.from('users').update({ role: newRole }).eq('id', user.id),
                fetchUsers
            );
        }
    };
    
    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Manage Users</h2>
             {error && <AdminError message={error} onDismiss={() => setError(null)} />}
            <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm">
                <thead className="bg-background/50"><tr>
                    <th className="p-4 text-left text-text-secondary font-semibold">Username</th><th className="p-4 text-left text-text-secondary font-semibold">Email</th>
                    <th className="p-4 text-left text-text-secondary font-semibold">Coins</th><th className="p-4 text-left text-text-secondary font-semibold">Balance</th>
                    <th className="p-4 text-left text-text-secondary font-semibold">Role</th><th className="p-4 text-left text-text-secondary font-semibold">Status</th><th className="p-4 text-left text-text-secondary font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                    {users.filter(u => u.id !== profile?.id).map(user => (
                        <tr key={user.id} className="hover:bg-background/30">
                            <td className="p-4">{user.username || 'N/A'}</td>
                            <td className="p-4">{user.email || 'N/A'}</td>
                            <td className="p-4">{user.coins || 0}</td>
                            <td className="p-4">{(user.balance || 0).toFixed(2)}</td>
                            <td className="p-4 capitalize">{user.role}</td>
                            <td className="p-4">
                                {user.is_banned ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-danger/30 text-red-300">Banned</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-success/30 text-green-300">Active</span>}
                            </td>
                            <td className="p-4">
                                <div className="flex gap-2">
                                     <button onClick={() => handleRoleChange(user)} className={`p-2 rounded transition-colors ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/40' : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/40'}`} title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}>
                                        <UserCog size={16}/>
                                    </button>
                                    <button onClick={() => handleToggleBan(user)} className={`p-2 rounded transition-colors ${user.is_banned ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40' : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/40'}`} title={user.is_banned ? 'Unban User' : 'Ban User'}>
                                        <Ban size={16}/>
                                    </button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="p-2 bg-danger/20 text-red-300 rounded hover:bg-danger/40 transition-colors" title="Delete User Profile">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {!loading && users.filter(u => u.id !== profile?.id).length === 0 && (
                        <tr><td colSpan={7} className="text-center p-12 text-text-secondary">No other users found.</td></tr>
                    )}
                </tbody>
            </table></div></div>
        </div>
    );
};

// Main Admin Page
const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard': return <AdminDashboard />;
            case 'transactions': return <ManageTransactions />;
            case 'withdrawals': return <ManageWithdrawals />;
            case 'videos': return <ManageVideos />;
            case 'users': return <ManageUsers />;
            default: return <AdminDashboard />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
             <header className="mb-10 animate-fadeInUp"><h1 className="text-4xl md:text-5xl font-extrabold text-white">Admin Panel</h1></header>
              <div className="relative border-b border-[var(--border)] mb-8">
                 <div className="flex overflow-x-auto -mb-px">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'dashboard' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><LayoutDashboard size={16}/> Dashboard</button>
                    <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-2 px-4 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'transactions' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><ListTodo size={16}/> Transactions</button>
                    <button onClick={() => setActiveTab('withdrawals')} className={`flex items-center gap-2 px-4 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'withdrawals' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Banknote size={16}/> Withdrawals</button>
                    <button onClick={() => setActiveTab('videos')} className={`flex items-center gap-2 px-4 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'videos' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Film size={16}/> Videos</button>
                    <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-4 py-4 font-semibold transition-colors flex-shrink-0 ${activeTab === 'users' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Users size={16}/> Users</button>
                </div>
             </div>
             <div>{renderTabContent()}</div>
        </div>
    );
};

export default AdminPage;