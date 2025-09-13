import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
// Fix: Replaced single quotes with double quotes in the import statement to potentially resolve a module resolution issue.
import { useNavigate } from "react-router-dom";

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [isReferralError, setIsReferralError] = useState(false);
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => {
                setCooldown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        setIsReferralError(false);

        try {
            if (isLogin) {
                const { error: signInError } = await signIn({ email, password });
                if (signInError) {
                    if (signInError.message.includes('Invalid login credentials')) {
                        setError('Invalid email or password. If you just signed up, please make sure you have verified your email address.');
                    } else if (signInError.message.includes('Email not confirmed')) {
                        setError('Your email is not verified. Please check your inbox for a confirmation link.');
                    } else {
                        setError('An unexpected error occurred during login. Please try again.');
                    }
                    console.error("Login Error:", signInError);
                } else {
                    navigate('/dashboard');
                }
            } else {
                const { error: signUpError } = await signUp({ email, password, username, referralCode });
                if (signUpError) {
                    if (signUpError.message.includes('User already registered')) {
                        setError('This email address is already in use. Please try logging in.');
                    } else if (signUpError.message.includes('duplicate key value violates unique constraint "users_username_key"')){
                        setError('This username is already taken. Please choose a different one.');
                    } else if (signUpError.message.includes('Database error saving new user')) {
                        setError('A database error occurred while creating your profile. This is a server configuration issue (likely a missing database column) and cannot be fixed by changing the referral code. Please contact support.');
                        setIsReferralError(true);
                    } else if (signUpError.message.includes('For security purposes, you can only request this after')) {
                        const secondsMatch = signUpError.message.match(/(\d+)\s*seconds/);
                        if (secondsMatch && secondsMatch[1]) {
                            const seconds = parseInt(secondsMatch[1], 10);
                            setCooldown(seconds);
                        } else {
                            setError(signUpError.message); // Fallback to original message
                        }
                    } else {
                        setError('An unexpected error occurred during sign-up. Please try again.');
                    }
                    console.error("Sign Up Error:", signUpError);
                } else {
                    setMessage('Signup successful! Please check your email to verify your account before logging in.');
                    setIsLogin(true);
                }
            }
        } catch (e) {
            setError('A critical error occurred. Please refresh the page and try again.');
            console.error("Critical Auth Error:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fadeInUp">
            <div className="max-w-md w-full bg-surface/50 backdrop-blur-lg rounded-2xl shadow-2xl shadow-sky-900/10 p-8 border border-border">
                <div className="relative flex border-b border-border mb-8">
                    <button
                        onClick={() => { setIsLogin(true); setError(null); setMessage(null); setIsReferralError(false); setCooldown(0); }}
                        className={`w-1/2 py-4 font-semibold text-center transition-colors duration-300 ${isLogin ? 'text-text-primary' : 'text-text-secondary'}`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError(null); setMessage(null); setIsReferralError(false); setCooldown(0); }}
                        className={`w-1/2 py-4 font-semibold text-center transition-colors duration-300 ${!isLogin ? 'text-text-primary' : 'text-text-secondary'}`}
                    >
                        Sign Up
                    </button>
                     <div className="absolute bottom-0 w-1/2 h-0.5 bg-accent-glow transition-transform duration-300 ease-out" style={{ transform: isLogin ? 'translateX(0%)' : 'translateX(100%)' }}></div>
                </div>
                <h2 className="text-2xl font-bold text-center text-white mb-6">{isLogin ? 'Welcome Back!' : 'Create an Account'}</h2>
                
                {error && <p className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm animate-slideInUp">{error}</p>}
                {message && <p className="bg-success/20 text-green-300 p-3 rounded-md mb-4 text-sm animate-slideInUp">{message}</p>}
                {cooldown > 0 && !isLogin && (
                     <p className="bg-warning/20 text-yellow-300 p-3 rounded-md mb-4 text-sm text-center animate-slideInUp">
                        Too many attempts. Please wait {cooldown} second{cooldown !== 1 ? 's' : ''}.
                    </p>
                )}


                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <div>
                            <label className="text-sm font-bold text-text-secondary block mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full p-3 bg-background rounded-md border border-border focus:border-accent-glow focus:ring-2 focus:ring-accent-glow/50"
                                placeholder="Choose a username"
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-3 bg-background rounded-md border border-border focus:border-accent-glow focus:ring-2 focus:ring-accent-glow/50"
                            placeholder="you@example.com"
                        />
                    </div>
                     <div>
                        <label className="text-sm font-bold text-text-secondary block mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 bg-background rounded-md border border-border focus:border-accent-glow focus:ring-2 focus:ring-accent-glow/50"
                            placeholder="••••••••"
                        />
                    </div>
                    {!isLogin && (
                        <div>
                            <label className="text-sm font-bold text-text-secondary block mb-2">Referral Code (Optional)</label>
                            <input
                                type="text"
                                value={referralCode}
                                onChange={(e) => setReferralCode(e.target.value)}
                                className={`w-full p-3 bg-background rounded-md border border-border focus:border-accent-glow focus:ring-2 focus:ring-accent-glow/50 ${isReferralError ? 'border-danger ring-2 ring-danger/50' : ''}`}
                                placeholder="Enter referral code"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || cooldown > 0}
                        className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        ) : (
                            isLogin ? 'Login' : 'Sign Up'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthPage;