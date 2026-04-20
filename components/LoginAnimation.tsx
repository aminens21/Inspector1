
import React from 'react';
import { motion } from 'motion/react';
import { UserSearch, Briefcase } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';

interface LoginAnimationProps {
    onComplete: () => void;
}

export const LoginAnimation: React.FC<LoginAnimationProps> = ({ onComplete }) => {
    const { t } = useTranslations();

    React.useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 3500); // Slightly more than 3s to allow for fade out
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-white dark:bg-slate-900 flex flex-col items-center justify-center overflow-hidden"
        >
            <div className="relative w-full max-w-md h-64 flex items-center justify-center">
                {/* Road/Floor */}
                <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5 }}
                    className="absolute bottom-10 left-10 right-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"
                />

                {/* Inspector Character */}
                <motion.div
                    initial={{ x: -200, opacity: 0 }}
                    animate={{ 
                        x: [ -200, 0, 200 ],
                        opacity: [ 0, 1, 1, 0 ]
                    }}
                    transition={{ 
                        duration: 3,
                        times: [0, 0.2, 0.8, 1],
                        ease: "easeInOut"
                    }}
                    className="relative flex flex-col items-center"
                >
                    {/* Walking Animation (Bouncing) */}
                    <motion.div
                        animate={{ 
                            y: [0, -10, 0],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                            duration: 0.5, 
                            repeat: 6,
                            ease: "easeInOut"
                        }}
                        className="relative"
                    >
                        <UserSearch size={80} className="text-sky-600 dark:text-sky-400" />
                        
                        {/* Briefcase */}
                        <motion.div
                            animate={{ 
                                rotate: [-10, 10, -10],
                                x: [2, -2, 2]
                            }}
                            transition={{ 
                                duration: 0.5, 
                                repeat: 6,
                                ease: "easeInOut"
                            }}
                            className="absolute -right-4 bottom-2"
                        >
                            <Briefcase size={32} className="text-slate-700 dark:text-slate-300 fill-current" />
                        </motion.div>
                    </motion.div>

                    {/* Dust/Steps effect */}
                    <motion.div 
                        animate={{ 
                            opacity: [0, 1, 0],
                            scale: [0.5, 1.2, 0.5],
                            x: [-20, -40]
                        }}
                        transition={{ 
                            duration: 0.5, 
                            repeat: 6,
                            ease: "easeOut"
                        }}
                        className="absolute bottom-0 left-0 w-4 h-1 bg-slate-300 dark:bg-slate-600 rounded-full blur-sm"
                    />
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center mt-8"
            >
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                    {t('welcome')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 animate-pulse">
                    جاري تحضير فضاء التفتيش...
                </p>
            </motion.div>

            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
                <motion.div 
                    animate={{ 
                        x: [0, 100, 0],
                        y: [0, 50, 0]
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute top-20 left-20 w-32 h-32 bg-sky-400 rounded-full blur-3xl"
                />
                <motion.div 
                    animate={{ 
                        x: [0, -100, 0],
                        y: [0, -50, 0]
                    }}
                    transition={{ duration: 12, repeat: Infinity }}
                    className="absolute bottom-20 right-20 w-48 h-48 bg-indigo-400 rounded-full blur-3xl"
                />
            </div>
        </motion.div>
    );
};
