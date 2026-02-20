import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'light' | 'midnight' | 'arcade80s' | 'grunge90s';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private readonly STORAGE_KEY = 'chadscopilot_theme';
    private themeSubject = new BehaviorSubject<AppTheme>('midnight');
    theme$ = this.themeSubject.asObservable();

    init(): void {
        const saved = this.safeGetStoredTheme();
        this.setTheme(saved || 'midnight');
    }

    getTheme(): AppTheme {
        return this.themeSubject.value;
    }

    setTheme(theme: AppTheme): void {
        this.themeSubject.next(theme);
        this.applyToDom(theme);
        this.safeStoreTheme(theme);
    }

    private applyToDom(theme: AppTheme): void {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);

        // Keep compatibility with any existing "dark" styling hooks
        const isDark = theme === 'midnight' || theme === 'grunge90s' || theme === 'arcade80s';
        root.classList.toggle('dark', isDark);
        document.body.classList.toggle('dark', isDark);
    }

    private safeGetStoredTheme(): AppTheme | null {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (
                raw === 'light' ||
                raw === 'midnight' ||
                raw === 'arcade80s' ||
                raw === 'grunge90s'
            ) {
                return raw;
            }
            return null;
        } catch {
            return null;
        }
    }

    private safeStoreTheme(theme: AppTheme): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, theme);
        } catch {
            // ignore
        }
    }
}
