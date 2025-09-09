
import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Video, User, LogOut, Shield, Home, Crown } from 'lucide-react';

const Navbar: React.FC = () => {
    const { user, profile, isAdmin, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <nav className="bg-surface/70 backdrop-blur-lg border-b border-[var(--border)] sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2 text-white font-bold text-2xl">
                            <Video className="h-8 w-8 text-[var(--accent-glow)]" />
                            <span className="bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">VidEarn</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        {user && profile ? (
                            <>
                                <div className="hidden sm:flex items-center gap-4 text-sm text-text-secondary border border-[var(--border)] bg-background/50 rounded-full px-4 py-2">
                                    {profile.plans ? (
                                        <span className="flex items-center gap-2">
                                            <Crown size={16} className="text-yellow-400" />
                                            <span className="font-bold text-yellow-400">{profile.plans.name}</span>
                                        </span>
                                    ) : (
                                        <span>No Active Plan</span>
                                    )}
                                    <span className="text-[var(--border)]">|</span>
                                    <span>Balance: <span className="font-bold text-green-400">PKR {profile.balance.toFixed(2)}</span></span>
                                </div>
                                <Link to="/dashboard" className="text-text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Dashboard</Link>
                                {isAdmin && (
                                    <Link to="/admin" className="flex items-center gap-2 text-yellow-400 hover:bg-yellow-400/10 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                        <Shield size={16} /> Admin Panel
                                    </Link>
                                )}
                                <button onClick={handleSignOut} className="flex items-center gap-2 bg-danger/80 hover:bg-danger text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    <LogOut size={16} /> Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/auth" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity shadow-[0_0_10px_rgba(59,130,246,0.4)]">
                                    Login / Signup
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

const Footer: React.FC = () => (
    <footer className="bg-surface/50 border-t border-[var(--border)] mt-16">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-text-secondary text-sm">
            <p>&copy; {new Date().getFullYear()} VidEarn. All Rights Reserved.</p>
            <div className="mt-2">
                <Link to="/changelog" className="hover:text-[var(--accent-glow)] transition-colors">
                    Changelog
                </Link>
            </div>
        </div>
    </footer>
);

const Layout: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-background text-text-primary flex flex-col">
            <Navbar />
            <main className="flex-grow">
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
