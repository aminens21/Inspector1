import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import moment from 'moment';
import { CalendarEvent } from '../types';

export const isNotificationSupported = () => {
    if (Capacitor.isNativePlatform()) return true;
    return typeof Notification !== 'undefined' && 'requestPermission' in Notification;
};

export const requestNotificationPermissions = async () => {
    try {
        if (Capacitor.isNativePlatform()) {
            const { display } = await LocalNotifications.requestPermissions();
            return display === 'granted';
        }
        
        // Web check: Notification API might not be available or restricted in iframes
        if (typeof Notification !== 'undefined' && 'requestPermission' in Notification) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
    } catch (e) {
        console.warn('Notification permission request failed:', e);
    }
    return false;
};

export interface ReminderSetting {
    value: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks';
}

const getUnitLabel = (unit: string, value: number) => {
    if (unit === 'minutes') return value === 1 ? 'دقيقة' : value === 2 ? 'دقيقتين' : `${value} دقائق`;
    if (unit === 'hours') return value === 1 ? 'ساعة' : value === 2 ? 'ساعتين' : `${value} ساعات`;
    if (unit === 'days') return value === 1 ? 'يوم' : value === 2 ? 'يومين' : `${value} أيام`;
    if (unit === 'weeks') return value === 1 ? 'أسبوع' : value === 2 ? 'أسبوعين' : `${value} أسابيع`;
    return '';
};

export const sendTestNotification = async () => {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            console.warn("Notification permission not granted");
            return false;
        }

        // Web Fallback
        if (!Capacitor.isNativePlatform() && typeof Notification !== 'undefined') {
            setTimeout(() => {
                try {
                    const notification = new Notification('اختبار الإشعارات', {
                        body: 'هذا إشعار تجريبي للتأكد من أن النظام يعمل بشكل صحيح.',
                        icon: '/favicon.ico'
                    });
                    
                    notification.onerror = () => {
                        console.error("Web Notification error event triggered");
                        alert("تم حظر الإشعار من قبل المتصفح. يرجى التأكد من إعدادات الإشعارات للموقع.");
                    };
                } catch (e) {
                    console.error("Web Notification failed:", e);
                    alert("المتصفح يمنع ظهور الإشعارات في هذه البيئة. يرجى تجربة التطبيق على الهاتف.");
                }
            }, 2000);
            return true;
        }

        await LocalNotifications.schedule({
            notifications: [
                {
                    id: 999,
                    title: 'اختبار الإشعارات',
                    body: 'هذا إشعار تجريبي للتأكد من أن النظام يعمل بشكل صحيح.',
                    schedule: { at: new Date(Date.now() + 2000) } // 2 seconds from now
                }
            ]
        });
        return true;
    } catch (error) {
        console.error('Test notification failed:', error);
        return false;
    }
};

export const scheduleEventNotifications = async (
    events: CalendarEvent[],
    reminder1: ReminderSetting = { value: 1, unit: 'weeks' },
    reminder2: ReminderSetting = { value: 1, unit: 'days' }
) => {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            console.error('Notification permission not granted.');
            return false;
        }

        // Clear existing scheduled notifications to avoid duplicates
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications });
        }

        const notificationsToSchedule = [];
        let idCounter = 1;

        for (const event of events) {
            const eventStart = moment(event.start);
            const now = moment();

            // Only schedule if the event is in the future
            if (eventStart.isAfter(now)) {
                // Schedule reminder 1
                const notifyTime1 = eventStart.clone().subtract(reminder1.value, reminder1.unit).toDate();
                
                if (notifyTime1 > now.toDate()) {
                    notificationsToSchedule.push({
                        id: idCounter++,
                        title: 'تذكير بنشاط قادم',
                        body: `النشاط: ${event.title} سيبدأ بعد ${getUnitLabel(reminder1.unit, reminder1.value)}.`,
                        schedule: { at: notifyTime1 }
                    });
                }

                // Schedule reminder 2
                const notifyTime2 = eventStart.clone().subtract(reminder2.value, reminder2.unit).toDate();
                if (notifyTime2 > now.toDate()) {
                    notificationsToSchedule.push({
                        id: idCounter++,
                        title: 'تذكير بنشاط قادم',
                        body: `النشاط: ${event.title} سيبدأ بعد ${getUnitLabel(reminder2.unit, reminder2.value)}.`,
                        schedule: { at: notifyTime2 }
                    });
                }
            }
        }

        if (notificationsToSchedule.length > 0) {
            await LocalNotifications.schedule({
                notifications: notificationsToSchedule
            });
            return true;
        }

        return true;
    } catch (error) {
        console.warn('Notification scheduling not supported or failed:', error);
        // Silently fail on web/iframe environments where notifications are often restricted
        return false;
    }
};
