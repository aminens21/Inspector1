
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useTranslations } from '../hooks/useTranslations';
import { motion, AnimatePresence } from 'motion/react';

export const AdminUsersPage: React.FC = () => {
    const { t, language } = useTranslations();
    const [emails, setEmails] = useState<{ email: string, addedAt: string, role: string }[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const fetchEmails = async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'authorized_users'), orderBy('addedAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const usersList = querySnapshot.docs.map(doc => ({
                email: doc.id,
                ...doc.data()
            } as any));
            setEmails(usersList);
        } catch (err) {
            console.error("Error fetching emails:", err);
            setError('Failed to fetch authorized users.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    const handleAddEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim() || !newEmail.includes('@')) {
            setError(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Veuillez entrer un e-mail valide.');
            return;
        }

        setIsProcessing(true);
        setError('');
        try {
            const emailLower = newEmail.trim().toLowerCase();
            await setDoc(doc(db, 'authorized_users', emailLower), {
                email: emailLower,
                role: 'user',
                addedAt: new Date().toISOString()
            });
            setNewEmail('');
            await fetchEmails();
        } catch (err) {
            console.error("Error adding email:", err);
            setError('Failed to add user.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteEmail = async (email: string) => {
        if (!window.confirm(language === 'ar' ? `هل أنت متأكد من حذف ${email}؟` : `Êtes-vous sûr de vouloir supprimer ${email} ?`)) return;

        setIsProcessing(true);
        try {
            await deleteDoc(doc(db, 'authorized_users', email));
            await fetchEmails();
        } catch (err) {
            console.error("Error deleting email:", err);
            setError('Failed to delete user.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[rgb(var(--color-card))] rounded-2xl shadow-xl p-6 border border-[rgb(var(--color-border))]"
            >
                <div className="flex items-center gap-3 mb-6 border-b border-[rgb(var(--color-border))] pb-4">
                    <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-900/30 text-sky-600">
                        <i className="fas fa-user-shield text-2xl"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[rgb(var(--color-text-base))]">
                            {language === 'ar' ? 'تدبير حسابات الزملاء المفتشين' : 'Gestion des comptes collègues'}
                        </h2>
                        <p className="text-xs text-[rgb(var(--color-text-muted))]">
                            {language === 'ar' ? 'إضافة أو حذف العناوين المسموح لها بالولوج' : 'Ajouter ou supprimer les adresses autorisées'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleAddEmail} className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-[rgb(var(--color-border))]">
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-base))] mb-2">
                        {language === 'ar' ? 'إضافة بريد Gmail جديد:' : 'Ajouter un nouveau Gmail :'}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="example@gmail.com"
                            className="flex-1 p-3 rounded-lg bg-[rgb(var(--color-input-bg))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-base))] focus:ring-2 focus:ring-sky-500 outline-none"
                            disabled={isProcessing}
                        />
                        <button
                            type="submit"
                            disabled={isProcessing || !newEmail}
                            className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>}
                            <span>{language === 'ar' ? 'إضافة' : 'Ajouter'}</span>
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
                </form>

                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[rgb(var(--color-text-base))] mb-2 flex items-center gap-2">
                        <i className="fas fa-list text-sky-500"></i>
                        <span>{language === 'ar' ? 'قائمة المستخدمين المفوضين:' : 'Liste des utilisateurs autorisés :'}</span>
                    </h3>
                    
                    {isLoading ? (
                        <div className="py-10 text-center text-[rgb(var(--color-text-muted))]">
                            <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                            <p>{language === 'ar' ? 'جاري التحميل...' : 'Chargement...'}</p>
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="py-10 text-center text-[rgb(var(--color-text-muted))] bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-[rgb(var(--color-border))]">
                            <p>{language === 'ar' ? 'لا يوجد أي مستخدم مفوض حالياً.' : 'Aucun utilisateur autorisé pour le moment.'}</p>
                        </div>
                    ) : (
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            <AnimatePresence>
                                {emails.map((user) => (
                                    <motion.div
                                        key={user.email}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex items-center justify-between p-3 bg-[rgb(var(--color-card))] border border-[rgb(var(--color-border))] rounded-xl hover:shadow-md transition-shadow group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                <i className="fas fa-envelope text-xs"></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[rgb(var(--color-text-base))]">{user.email}</p>
                                                <p className="text-[10px] text-[rgb(var(--color-text-muted))]">
                                                    {language === 'ar' ? 'أضيف بتاريخ: ' : 'Ajouté le : '}
                                                    {new Date(user.addedAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteEmail(user.email)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title={language === 'ar' ? 'حذف' : 'Supprimer'}
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-900/30">
                    <div className="flex gap-3">
                        <i className="fas fa-info-circle text-amber-500 mt-1"></i>
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            {language === 'ar' 
                                ? 'ملاحظة: الزملاء المضافون سيتمكنون من الولوج وبدء عملهم الخاص. لن يتمكنوا من رؤية تقاريرك الشخصية نهائياً.' 
                                : 'Note : Les collègues ajoutés pourront se connecter et commencer leur propre travail. Ils ne pourront jamais voir vos rapports personnels.'}
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
