
import { Teacher, ScheduleItem } from '../types';

export type AlertStatus = 'red' | 'green' | 'blue';

export const analyzeTeacherAlerts = (teacher: Teacher): { status: AlertStatus, title: string } => {
    const schedule = teacher.schedule || [];
    if (!schedule || schedule.length === 0) return { status: 'blue', title: 'بيانات ناقصة: الجدول غير مدخل' };

    let hasMissingClasses = false;
    let hasViolations = false;
    const itemsByClass: Record<string, ScheduleItem[]> = {};

    const dayIndexMap: Record<string, number> = {
        'الإثنين': 0, 'الثلاثاء': 1, 'الأربعاء': 2, 'الخميس': 3, 'الجمعة': 4, 'السبت': 5, 'الأحد': 6
    };

    for (const item of schedule) {
        if (!item.className || item.className.trim() === '') hasMissingClasses = true;
        else {
            if (!itemsByClass[item.className]) itemsByClass[item.className] = [];
            itemsByClass[item.className].push(item);
        }
    }

    Object.keys(itemsByClass).forEach(className => {
        const upperClass = className.toUpperCase();
        if (upperClass.includes('ASS') || className.includes('تنسيق') || upperClass.includes('COORD')) return;
        
        const items = itemsByClass[className];
        let classWeeklyDuration = 0;
        const sortedItems = [...items].sort((a, b) => {
            const dayA = dayIndexMap[a.day] ?? -1;
            const dayB = dayIndexMap[b.day] ?? -1;
            const hourA = parseInt(a.startTime.split(':')[0]);
            const hourB = parseInt(b.startTime.split(':')[0]);
            return (dayA * 24 + hourA) - (dayB * 24 + hourB);
        });

        for (const item of sortedItems) {
            const duration = parseInt(item.endTime.split(':')[0]) - parseInt(item.startTime.split(':')[0]);
            classWeeklyDuration += duration;
            if (duration > 2) hasViolations = true;
        }

        if (classWeeklyDuration < 2) hasViolations = true;

        for (let i = 0; i < sortedItems.length - 1; i++) {
            const current = sortedItems[i];
            const next = sortedItems[i+1];
            const currentEndAbs = (dayIndexMap[current.day] ?? -1) * 24 + parseInt(current.endTime.split(':')[0]);
            const nextStartAbs = (dayIndexMap[next.day] ?? -1) * 24 + parseInt(next.startTime.split(':')[0]);
            if (nextStartAbs - currentEndAbs > 0 && nextStartAbs - currentEndAbs < 44) hasViolations = true;
        }
    });

    if (hasViolations) return { status: 'red', title: 'مخالفة الضوابط: التوقيت أو الراحة' };
    if (hasMissingClasses) return { status: 'blue', title: 'بيانات ناقصة: أسماء الأقسام غير مدخلة' };
    return { status: 'green', title: 'الوضع سليم' };
};
