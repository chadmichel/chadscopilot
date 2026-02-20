import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface NamingSettings {
  contactSingleName: string;
  contactPluralName: string;
  eventSingleName: string;
  eventPluralName: string;
  messageSingleName: string;
  messagePluralName: string;
  subscriptionSingleName: string;
  subscriptionPluralName: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly STORAGE_KEY = 'app_settings';
  private readonly NAMING_KEY = 'naming_settings';

  private namingSettingsSubject = new BehaviorSubject<NamingSettings>(
    this.getDefaultNamingSettings()
  );
  public namingSettings$ = this.namingSettingsSubject.asObservable();

  constructor() {
    this.loadNamingSettings();
  }

  /**
   * Get default naming settings
   */
  private getDefaultNamingSettings(): NamingSettings {
    return {
      contactSingleName: 'Member',
      contactPluralName: 'Members',
      eventSingleName: 'Event',
      eventPluralName: 'Events',
      messageSingleName: 'Message',
      messagePluralName: 'Messages',
      subscriptionSingleName: 'Subscription',
      subscriptionPluralName: 'Subscriptions',
    };
  }

  /**
   * Load naming settings from localStorage
   */
  private loadNamingSettings(): void {
    try {
      const stored = localStorage.getItem(
        `${this.STORAGE_KEY}_${this.NAMING_KEY}`
      );
      if (stored) {
        const settings = JSON.parse(stored);
        this.namingSettingsSubject.next(settings);
      }
    } catch (error) {
      console.warn('Failed to load naming settings from localStorage:', error);
      this.namingSettingsSubject.next(this.getDefaultNamingSettings());
    }
  }

  /**
   * Save naming settings to localStorage
   */
  private saveNamingSettings(settings: NamingSettings): void {
    try {
      localStorage.setItem(
        `${this.STORAGE_KEY}_${this.NAMING_KEY}`,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Failed to save naming settings to localStorage:', error);
    }
  }

  /**
   * Update naming settings
   */
  updateNamingSettings(settings: Partial<NamingSettings>): void {
    const currentSettings = this.namingSettingsSubject.value;
    const updatedSettings = { ...currentSettings, ...settings };

    this.namingSettingsSubject.next(updatedSettings);
    this.saveNamingSettings(updatedSettings);
  }

  /**
   * Get current naming settings
   */
  getNamingSettings(): NamingSettings {
    return this.namingSettingsSubject.value;
  }

  /**
   * Get a specific naming setting
   */
  getNamingSetting(key: keyof NamingSettings): string {
    return this.namingSettingsSubject.value[key];
  }

  /**
   * Reset naming settings to defaults
   */
  resetNamingSettings(): void {
    const defaultSettings = this.getDefaultNamingSettings();
    this.namingSettingsSubject.next(defaultSettings);
    this.saveNamingSettings(defaultSettings);
  }

  /**
   * Clear all settings from localStorage
   */
  clearAllSettings(): void {
    try {
      localStorage.removeItem(`${this.STORAGE_KEY}_${this.NAMING_KEY}`);
      this.namingSettingsSubject.next(this.getDefaultNamingSettings());
    } catch (error) {
      console.error('Failed to clear settings from localStorage:', error);
    }
  }
}
