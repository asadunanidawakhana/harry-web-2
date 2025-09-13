
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { UserProfile, Transaction, Video, Withdrawal, Plan } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, ListTodo, Film, Users, Check, X, Trash2, Edit, PlusCircle, Eye, Ban, UserCog, Banknote, Shield } from 'lucide-react';

const AdminError: React.FC<{ message: string; onDismiss: () => void; }> = ({ message, onDismiss }) => (
    <div className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm flex justify-between items-center">
        <span>{message}</span>
        <button onClick={onDismiss} className="text-red-300 hover:text-red-100"><X size={16} /></button>
    </div>
);

// Admin Dashboard Component
const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, revenue: 0, pendingWithdrawals: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
                const { data: approvedTransactions } = await supabase.from('transactions').select('amount').eq('status', 'approved');
                const { count: pendingWithdrawalCount } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            
                const totalRevenue = approvedTransactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

                setStats({ users: userCount || 0, revenue: totalRevenue, pendingWithdrawals: pendingWithdrawalCount || 0 });
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
                <StatCard title="Total Revenue" value={`PKR ${stats.revenue.toFixed(2)}`} loading={loading} />
                <StatCard title="Pending Withdrawals" value={stats.pendingWithdrawals} loading={loading} />
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
        try {
            const { data, error: fetchError } = await supabase.from('transactions').select('*, users(email, username), plans(name)').order('created_at', { ascending: true });
            if (fetchError) throw fetchError;
            setTransactions((data as Transaction[]) || []);
        } catch (e: any) {
            console.error("Failed to load transactions:", e);
            setError('Failed to load transactions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const handleUpdate = async (tx: Transaction, newStatus: 'approved' | 'rejected') => {
        if(tx.status !== 'pending') return;
        setError(null);
        try {
            if (newStatus === 'approved') {
                // Fetch the user who made the transaction to check their referral status.
                const { data: purchasingUser, error: fetchUserError } = await supabase
                    .from('users')
                    .select('id, referred_by, plan_id')
                    .eq('id', tx.user_id)
                    .single();

                if (fetchUserError || !purchasingUser) throw new Error('Could not find the user for this transaction.');
                
                const isFirstPlan = !purchasingUser.plan_id;
                const referrerId = purchasingUser.referred_by;

                // If it's their first plan purchase and they have a referrer, award the bonus.
                if (isFirstPlan && referrerId) {
                    const { error: rpcError } = await supabase.rpc('award_referral_bonus', {
                        p_referrer_id: referrerId,
                        bonus_amount: 100
                    });

                    if (rpcError) {
                        // Log the error but don't block the main transaction approval
                        console.error("Failed to award referral bonus:", rpcError);
                        setError(`User plan approved, but failed to award referral bonus: ${rpcError.message}`);
                    }
                }

                // Activate the user's new plan
                const { error: userUpdateError } = await supabase.from('users').update({ 
                    plan_id: tx.plan_id,
                    plan_activated_at: new Date().toISOString()
                }).eq('id', tx.user_id);

                if (userUpdateError) throw new Error(userUpdateError.message);
            }

            const { error: updateError } = await supabase.from('transactions').update({ status: newStatus }).eq('id', tx.id);
            if (updateError) throw new Error(updateError.message);
            
            fetchTransactions();
        } catch(e: any) {
            console.error("Transaction update failed:", e);
            let userMessage = e.message || "An unexpected error occurred.";
            if (e.message.includes("violates row-level security policy")) {
                userMessage = "You do not have permission to perform this action.";
            }
            setError(`Operation failed: ${userMessage}`);
        }
    };


    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Manage Plan Purchases</h2>
            {error && <AdminError message={error} onDismiss={() => setError(null)} />}
            <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm">
                <thead className="bg-background/50"><tr>
                    <th className="p-4 text-left text-text-secondary font-semibold">User</th><th className="p-4 text-left text-text-secondary font-semibold">Plan</th><th className="p-4 text-left text-text-secondary font-semibold">Amount</th>
                    <th className="p-4 text-left text-text-secondary font-semibold">Screenshot</th><th className="p-4 text-left text-text-secondary font-semibold">Status</th><th className="p-4 text-left text-text-secondary font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                    {transactions.map(tx => (<tr key={tx.id} className="hover:bg-background/30">
                        <td className="p-4">{tx.users?.username || tx.users?.email || 'N/A'}</td><td>{tx.plans?.name || 'N/A'}</td><td>PKR {tx.amount}</td>
                        <td><a href={tx.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-glow)] hover:underline flex items-center gap-1"><Eye size={14}/> View</a></td>
                        <td className="capitalize">{tx.status}</td><td>
                            {tx.status === 'pending' && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleUpdate(tx, 'approved')} className="p-2 bg-success/20 text-green-300 rounded hover:bg-success/40" title="Approve"><Check size={16} /></button>
                                    <button onClick={() => handleUpdate(tx, 'rejected')} className="p-2 bg-danger/20 text-red-300 rounded hover:bg-danger/40" title="Reject"><X size={16} /></button>
                                </div>
                            )}
                        </td>
                    </tr>))}
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
        try {
            const { data, error: fetchError } = await supabase.from('withdrawals').select('*, users(email, username, balance)').order('created_at', { ascending: true });
            if (fetchError) throw fetchError;
            setWithdrawals((data as Withdrawal[]) || []);
        } catch (e: any) {
            console.error("Failed to load withdrawals:", e);
            setError('Failed to load withdrawal requests.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

    const handleApprove = async (wd: Withdrawal) => {
        if (wd.status !== 'pending') return;
        setError(null);
        try {
            // Check if user has enough balance
            const userBalance = wd.users?.balance;
            if (userBalance === undefined || userBalance === null) throw new Error("Could not verify user balance.");
            if (userBalance < wd.amount) throw new Error("User has insufficient balance.");

            // Deduct balance and set last withdrawal date
            const newBalance = userBalance - wd.amount;
            const { error: userUpdateError } = await supabase.from('users')
                .update({ balance: newBalance, last_withdraw: new Date().toISOString() })
                .eq('id', wd.user_id);
            if (userUpdateError) throw new Error(userUpdateError.message);

            // Then, update withdrawal status
            const { error: updateError } = await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', wd.id);
            if (updateError) {
                // Attempt to roll back balance change if status update fails
                 await supabase.from('users').update({ balance: userBalance }).eq('id', wd.user_id);
                 throw new Error(`Status update failed after deducting balance: ${updateError.message}`);
            }
            
            fetchWithdrawals();
        } catch(e: any) {
            console.error("Withdrawal approval failed:", e);
            const errorMessage = e?.message || 'An unexpected error occurred. Please check console for details.';
            setError(`Approval failed: ${errorMessage}`);
        }
    };

    const handleReject = async (wd: Withdrawal) => {
        if (wd.status !== 'pending') return;
        setError(null);
        try {
            // Just update the status to rejected. No refund needed as balance is not deducted on request.
            const { error: updateError } = await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', wd.id);
            if (updateError) throw new Error(`Could not update status: ${updateError.message}`);

            fetchWithdrawals();
        } catch(e: any) {
            console.error("Withdrawal rejection failed:", e);
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
                        <td className="p-4"><div>{wd.account_name}</div><div className="text-text-secondary">{wd.account_number}</div></td>
                        <td className="p-4 capitalize">{wd.status}</td>
                        <td>{wd.status === 'pending' && (
                            <div className="flex gap-2">
                                <button onClick={() => handleApprove(wd)} className="p-2 bg-success/20 text-green-300 rounded hover:bg-success/40" title="Approve"><Check size={16} /></button>
                                <button onClick={() => handleReject(wd)} className="p-2 bg-danger/20 text-red-300 rounded hover:bg-danger/40" title="Reject"><X size={16} /></button>
                            </div>
                        )}</td>
                    </tr>))}
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
    const [currentVideo, setCurrentVideo] = useState<Partial<Video> & { watch_duration_seconds?: number | undefined } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchVideos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setVideos(data || []);
        } catch (e: any) {
            console.error("Could not fetch videos:", e);
            setError('Could not fetch videos.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchVideos(); }, [fetchVideos]);

    const handleSave = async () => {
        if (!currentVideo || isSaving) return;
        setError(null);
        setIsSaving(true);
        try {
            const videoData = {
                title: (currentVideo.title || '').trim(),
                description: (currentVideo.description || '').trim(),
                video_url: (currentVideo.video_url || '').trim(),
                watch_duration_seconds: typeof currentVideo.watch_duration_seconds === 'number' && !isNaN(currentVideo.watch_duration_seconds) ? currentVideo.watch_duration_seconds : 30,
            };

            if (!videoData.title || !videoData.video_url) {
                throw new Error("Title and Video URL are required fields.");
            }

            const { error: queryError } = currentVideo.id
                ? await supabase.from('videos').update(videoData).eq('id', currentVideo.id)
                : await supabase.from('videos').insert([videoData]);

            if (queryError) throw new Error(queryError.message);
            
            setShowModal(false);
            setCurrentVideo(null);
            await fetchVideos();

        } catch(e: any) {
            console.error("Failed to save video:", e);
            let userMessage = e.message || "An unexpected error occurred.";
            if (e.code === '23505') { // unique constraint
                userMessage = "A video with this URL or title might already exist.";
            } else if (e.code === '23502') { // not-null violation
                userMessage = "Could not save. A required field might be missing.";
            } else if (e.message.includes("violates row-level security policy")) {
                userMessage = "You do not have permission to perform this action.";
            }
            setError(`Failed to save video: ${userMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if(window.confirm("Are you sure? This will also delete all watch history for this video.")){
            const { error } = await supabase.from('videos').delete().eq('id', id);
            if(error) setError(`Failed to delete video: ${error.message}`);
            else fetchVideos();
        }
    };
    
    return (
        <div className="animate-fadeInUp">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Manage Videos</h2>
                <button onClick={() => { setCurrentVideo({}); setShowModal(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2"><PlusCircle size={16}/> Add Video</button>
            </div>
            {error && <AdminError message={error} onDismiss={() => setError(null)} />}
            <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm">
                <thead className="bg-background/50"><tr>
                    <th className="p-4 text-left text-text-secondary font-semibold">Title</th><th className="p-4 text-left text-text-secondary font-semibold">URL</th><th className="p-4 text-left text-text-secondary font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                    {videos.map(v => (<tr key={v.id} className="hover:bg-background/30">
                        <td className="p-4">{v.title}</td><td>{v.video_url}</td>
                        <td className="p-4"><div className="flex gap-2">
                            <button onClick={() => { setCurrentVideo(v); setShowModal(true); }} className="p-2 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/40" title="Edit"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(v.id)} className="p-2 bg-danger/20 text-red-300 rounded hover:bg-danger/40" title="Delete"><Trash2 size={16}/></button>
                        </div></td>
                    </tr>))}
                </tbody>
            </table></div></div>
            {showModal && (<div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4"><div className="bg-surface/90 rounded-xl p-8 max-w-lg w-full border border-[var(--border)]">
                <h3 className="text-2xl font-bold mb-6">{currentVideo?.id ? 'Edit' : 'Add'} Video</h3>
                {error && <AdminError message={error} onDismiss={() => setError(null)} />}
                <div className="space-y-4">
                    <input type="text" placeholder="Title" value={currentVideo?.title || ''} onChange={e => setCurrentVideo({...currentVideo, title: e.target.value})} className="w-full p-3 bg-background rounded-md border border-[var(--border)]"/>
                    <textarea placeholder="Description" value={currentVideo?.description || ''} onChange={e => setCurrentVideo({...currentVideo, description: e.target.value})} className="w-full p-3 bg-background rounded-md border border-[var(--border)]"/>
                    <input type="text" placeholder="YouTube Video URL" value={currentVideo?.video_url || ''} onChange={e => setCurrentVideo({...currentVideo, video_url: e.target.value})} className="w-full p-3 bg-background rounded-md border border-[var(--border)]"/>
                    <div>
                        <label className="text-sm text-text-secondary">Watch Duration (seconds)</label>
                        <input 
                            type="number" 
                            placeholder="e.g., 30 (defaults to 30 if empty)" 
                            value={currentVideo?.watch_duration_seconds ?? ''} 
                            onChange={e => {
                                const val = e.target.value;
                                if (val === '') {
                                    setCurrentVideo({...currentVideo, watch_duration_seconds: undefined});
                                } else {
                                    const num = parseInt(val, 10);
                                    if (!isNaN(num)) {
                                        setCurrentVideo({...currentVideo, watch_duration_seconds: num});
                                    }
                                }
                            }} 
                            className="w-full p-3 mt-1 bg-background rounded-md border border-[var(--border)]"/>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={() => { setShowModal(false); setCurrentVideo(null); setError(null); }} className="bg-background/80 hover:bg-background border border-[var(--border)] py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg min-w-[80px] flex justify-center disabled:opacity-50 disabled:cursor-wait">
                         {isSaving ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div> : 'Save'}
                    </button>
                </div>
            </div></div>)}
        </div>
    );
};

// Manage Users Component
const ManageUsers = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.from('users').select('*, plans(name)').order('created_at', { ascending: false });
            if (error) throw error;
            setUsers(data || []);
        } catch (e: any) {
            console.error("Failed to fetch users:", e);
            setError('Failed to fetch users: ' + e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);
    
    const handleToggleBan = async (user: UserProfile) => {
        const { error } = await supabase.from('users').update({ is_banned: !user.is_banned }).eq('id', user.id);
        if (error) setError(error.message); else fetchUsers();
    };
    
    return (
        <div className="animate-fadeInUp">
            <h2 className="text-3xl font-bold mb-6">Manage Users</h2>
             {error && <AdminError message={error} onDismiss={() => setError(null)} />}
            <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm">
                <thead className="bg-background/50"><tr>
                    <th className="p-4 text-left text-text-secondary font-semibold">Username</th><th className="p-4 text-left text-text-secondary font-semibold">Balance</th>
                    <th className="p-4 text-left text-text-secondary font-semibold">Plan</th><th className="p-4 text-left text-text-secondary font-semibold">Status</th><th className="p-4 text-left text-text-secondary font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-background/30">
                            <td className="p-4">{user.username || 'N/A'}</td><td className="p-4">{(user.balance || 0).toFixed(2)}</td>
                            <td className="p-4">{user.plans?.name || 'None'}</td>
                            <td className="p-4">{user.is_banned ? 'Banned' : 'Active'}</td>
                            <td className="p-4">
                               <button onClick={() => handleToggleBan(user)} className={`p-2 rounded ${user.is_banned ? 'bg-yellow-500/20 text-yellow-300' : 'bg-orange-500/20 text-orange-300'}`} title={user.is_banned ? 'Unban' : 'Ban'}>
                                    <Ban size={16}/>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table></div></div>
        </div>
    );
};

// Manage Plans Component
const ManagePlans = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<Partial<Plan> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.from('plans').select('*').order('price', { ascending: true });
            if (error) throw error;
            setPlans(data || []);
        } catch (e: any) {
            console.error("Could not fetch plans:", e);
            setError('Could not fetch plans.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);

    const handleSave = async () => {
        if (!currentPlan) return;
        const { error } = currentPlan.id
            ? await supabase.from('plans').update({ ...currentPlan }).eq('id', currentPlan.id)
            : await supabase.from('plans').insert({ ...currentPlan });
        if (error) setError(`Failed to save plan: ${error.message}`);
        else {
            setShowModal(false);
            setCurrentPlan(null);
            fetchPlans();
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure? Deleting a plan may affect users who have it.")) {
            const { error } = await supabase.from('plans').delete().eq('id', id);
            if (error) setError(`Failed to delete plan: ${error.message}`);
            else fetchPlans();
        }
    };

    return (
        <div className="animate-fadeInUp">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Manage Plans</h2>
                <button onClick={() => { setCurrentPlan({}); setShowModal(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2"><PlusCircle size={16}/> Add Plan</button>
            </div>
            {error && <AdminError message={error} onDismiss={() => setError(null)} />}
            <div className="bg-surface rounded-xl border border-[var(--border)] overflow-hidden"><div className="overflow-x-auto"><table className="min-w-full text-sm">
                <thead className="bg-background/50"><tr>
                    <th className="p-4 text-left text-text-secondary font-semibold">Name</th><th className="p-4 text-left text-text-secondary font-semibold">Price</th><th className="p-4 text-left text-text-secondary font-semibold">Daily Earning</th>
                    <th className="p-4 text-left text-text-secondary font-semibold">Videos/Day</th><th className="p-4 text-left text-text-secondary font-semibold">Validity</th><th className="p-4 text-left text-text-secondary font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                    {plans.map(p => (<tr key={p.id} className="hover:bg-background/30">
                        <td className="p-4">{p.name}</td><td>{p.price}</td><td>{p.daily_earning}</td><td>{p.videos_per_day}</td><td>{p.validity_days} days</td>
                        <td className="p-4"><div className="flex gap-2">
                            <button onClick={() => { setCurrentPlan(p); setShowModal(true); }} className="p-2 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/40" title="Edit"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 bg-danger/20 text-red-300 rounded hover:bg-danger/40" title="Delete"><Trash2 size={16}/></button>
                        </div></td>
                    </tr>))}
                </tbody>
            </table></div></div>
            {showModal && (<div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4"><div className="bg-surface/90 rounded-xl p-8 max-w-lg w-full border border-[var(--border)]">
                <h3 className="text-2xl font-bold mb-6">{currentPlan?.id ? 'Edit' : 'Add'} Plan</h3>
                <div className="space-y-4">
                    <input type="text" placeholder="Plan Name" value={currentPlan?.name || ''} onChange={e => setCurrentPlan({...currentPlan, name: e.target.value})} className="w-full p-3 bg-background rounded-md border border-[var(--border)]"/>
                    <input type="number" placeholder="Price (PKR)" value={currentPlan?.price ?? ''} onChange={e => setCurrentPlan({...currentPlan, price: parseFloat(e.target.value)})} className="w-full p-3 bg-background rounded-md border border-[var(--border)]"/>
                    <input type="number" placeholder="Daily Earning (PKR)" value={currentPlan?.daily_earning ?? ''} onChange={e => setCurrentPlan({...currentPlan, daily_earning: parseFloat(e.target.value)})} className="w-full p-3 bg-background rounded-md border border-[var(--border)]"/>
                    <input type="number" placeholder="Videos Per Day" value={currentPlan?.videos_per_day ?? ''} onChange={e => setCurrentPlan({...currentPlan, videos_per_day: parseInt(e.target.value)})} className="w-full p-3 bg-background rounded-md border border-[var(--border)]"/>
                    <input type="number" placeholder="Validity (Days)" value={currentPlan?.validity_days ?? ''} onChange={e => setCurrentPlan({...currentPlan, validity_days: parseInt(e.target.value)})} className="w-full p-3 bg-background rounded-md border border-[var(--border)]"/>
                </div>
                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={() => { setShowModal(false); setCurrentPlan(null); }} className="bg-background/80 hover:bg-background border border-[var(--border)] py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg">Save</button>
                </div>
            </div></div>)}
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
            case 'plans': return <ManagePlans />;
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
                    <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-4 font-semibold ${activeTab === 'dashboard' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><LayoutDashboard size={16}/> Dashboard</button>
                    <button onClick={() => setActiveTab('transactions')} className={`flex items-center gap-2 px-4 py-4 font-semibold ${activeTab === 'transactions' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><ListTodo size={16}/> Purchases</button>
                    <button onClick={() => setActiveTab('withdrawals')} className={`flex items-center gap-2 px-4 py-4 font-semibold ${activeTab === 'withdrawals' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Banknote size={16}/> Withdrawals</button>
                    <button onClick={() => setActiveTab('plans')} className={`flex items-center gap-2 px-4 py-4 font-semibold ${activeTab === 'plans' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Shield size={16}/> Plans</button>
                    <button onClick={() => setActiveTab('videos')} className={`flex items-center gap-2 px-4 py-4 font-semibold ${activeTab === 'videos' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Film size={16}/> Videos</button>
                    <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-4 py-4 font-semibold ${activeTab === 'users' ? 'text-white border-b-2 border-[var(--accent-glow)]' : 'text-text-secondary hover:text-white'}`}><Users size={16}/> Users</button>
                </div>
             </div>
             <div>{renderTabContent()}</div>
        </div>
    );
};

export default AdminPage;