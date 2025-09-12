
import React from 'react';
// Fix: Replaced single quotes with double quotes in the import statement to potentially resolve a module resolution issue.
import { Link } from "react-router-dom";
import { PlayCircle, DollarSign, LogIn, HelpCircle, ShieldCheck } from 'lucide-react';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string, delay: string }> = ({ icon, title, description, delay }) => (
    <div className="bg-surface/50 backdrop-blur-sm p-8 rounded-xl border border-[var(--border)] text-center transform hover:-translate-y-2 transition-all duration-300 animate-fadeInUp" style={{animationDelay: delay}}>
        <div className="flex justify-center mb-5 text-[var(--accent-glow)]">{icon}</div>
        <h3 className="text-xl font-bold mb-3 text-text-primary">{title}</h3>
        <p className="text-text-secondary">{description}</p>
    </div>
);

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
    <div className="bg-surface p-6 rounded-lg border border-[var(--border)]">
        <h4 className="font-semibold text-lg text-[var(--accent-glow)]">{question}</h4>
        <p className="text-text-secondary mt-2">{answer}</p>
    </div>
);

const HomePage: React.FC = () => {
    return (
        <div className="bg-background text-white overflow-hidden">
            {/* Hero Section */}
            <section className="relative text-center py-24 sm:py-40 px-4">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="absolute top-1/2 left-1/2 w-[50rem] h-[50rem] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-tr from-blue-900/50 via-purple-900/50 to-transparent rounded-full blur-3xl animate-pulse"></div>
                <div className="relative z-10 animate-fadeInUp">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-400">
                        Watch Videos, Earn Daily
                    </h1>
                    <p className="max-w-3xl mx-auto text-lg text-text-secondary mb-10">
                        Join VidEarn, pick a plan, and turn your spare time into daily earnings. Watch videos to claim your reward and withdraw once a week.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link to="/auth" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold py-4 px-8 rounded-lg transition duration-300 text-lg shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                            <LogIn size={22} /> Get Started Now
                        </Link>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-24 px-4">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-16 animate-fadeInUp">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon={<ShieldCheck size={48} />}
                            title="1. Choose a Plan" 
                            description="Select a subscription plan that fits your goals. Make a payment and submit the transaction details for activation." 
                            delay="0s"
                        />
                        <FeatureCard 
                            icon={<PlayCircle size={48} />}
                            title="2. Watch Videos Daily" 
                            description="Watch the required number of videos each day to become eligible for your daily earnings. " 
                            delay="0.2s"
                        />
                        <FeatureCard 
                            icon={<DollarSign size={48} />}
                            title="3. Claim & Withdraw" 
                            description="Claim your daily reward after watching videos. You can request a withdrawal of your earnings once every week." 
                            delay="0.4s"
                        />
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 px-4 bg-surface/50">
                <div className="max-w-4xl mx-auto">
                     <div className="text-center animate-fadeInUp">
                        <h2 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
                            <HelpCircle size={36} /> Frequently Asked Questions
                        </h2>
                        <p className="text-text-secondary mb-12">Have questions? We've got answers.</p>
                    </div>
                    <div className="space-y-6 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
                        <FAQItem 
                            question="How do I buy a plan?" 
                            answer="Go to the 'Plans' section in your dashboard, select a plan, and follow the payment instructions. Upload your transaction ID and a screenshot for verification."
                        />
                         <FAQItem 
                            question="How are earnings calculated?" 
                            answer="Your earnings are determined by your active plan. Each plan has a fixed daily earning amount that you can claim after watching a specific number of videos for that day."
                        />
                         <FAQItem 
                            question="How often can I withdraw?" 
                            answer="To ensure smooth processing for all users, withdrawals are limited to once per week."
                        />
                         <FAQItem 
                            question="Is my investment safe?" 
                            answer="As stated in our initial warning, all deposits are made at your own risk. We strive to maintain a secure platform, but we are not liable for any financial losses."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;