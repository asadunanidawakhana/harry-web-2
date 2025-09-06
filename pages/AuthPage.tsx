import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

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
                const { error: signUpError } = await signUp({ email, password, username });
                if (signUpError) {
                    if (signUpError.message.includes('User already registered')) {
                        setError('This email address is already in use. Please try logging in.');
                    } else if (signUpError.message.includes('duplicate key value violates unique constraint "users_username_key"')){
                        setError('This username is already taken. Please choose a different one.');
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
            <div className="max-w-md w-full bg-surface/50 backdrop-blur-lg rounded-2xl shadow-lg p-8 border border-[var(--border)]">
                <div className="relative flex border-b border-[var(--border)] mb-8">
                    <button
                        onClick={() => { setIsLogin(true); setError(null); setMessage(null); }}
                        className={`w-1/2 py-4 font-semibold text-center transition-colors duration-300 ${isLogin ? 'text-white' : 'text-text-secondary'}`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError(null); setMessage(null); }}
                        className={`w-1/2 py-4 font-semibold text-center transition-colors duration-300 ${!isLogin ? 'text-white' : 'text-text-secondary'}`}
                    >
                        Sign Up
                    </button>
                     <div className="absolute bottom-0 w-1/2 h-0.5 bg-[var(--accent-glow)] transition-transform duration-300 ease-out" style={{ transform: isLogin ? 'translateX(0%)' : 'translateX(100%)' }}></div>
                </div>
                <h2 className="text-2xl font-bold text-center text-white mb-6">{isLogin ? 'Welcome Back!' : 'Create an Account'}</h2>
                
                {error && <p className="bg-danger/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
                {message && <p className="bg-success/20 text-green-300 p-3 rounded-md mb-4 text-sm">{message}</p>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <div>
                            <label className="text-sm font-bold text-text-secondary block mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition"
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
                            className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition"
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
                            className="w-full p-3 bg-background rounded-md border border-[var(--border)] focus:border-[var(--accent-glow)] focus:ring-2 focus:ring-[var(--accent-glow)]/50 transition"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthPage;