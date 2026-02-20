import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Client-side encryption service using Web Crypto API.
 * Uses AES-GCM with a key derived from the user's ID via PBKDF2.
 *
 * Note: This provides defense-in-depth (obfuscation) rather than true security,
 * since the key derivation material is also client-side. It prevents:
 * - Casual inspection of localStorage showing plain tokens
 * - Simple localStorage dumps grabbing plain secrets
 * - Different users on same browser accessing each other's encrypted data
 */
@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  // App-specific salt (not secret, just needs to be consistent)
  private readonly APP_SALT = 'WhenIsDone-v1-salt';

  constructor(private authService: AuthService) {}

  /**
   * Encrypt a string value. Returns base64-encoded ciphertext with IV prepended.
   */
  async encrypt(plaintext: string): Promise<string> {
    const key = await this.deriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const encodedPlaintext = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedPlaintext
    );

    // Prepend IV to ciphertext and encode as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return this.arrayBufferToBase64(combined);
  }

  /**
   * Decrypt a base64-encoded ciphertext (with IV prepended).
   * Returns null if decryption fails (wrong key, corrupted data, etc.)
   */
  async decrypt(encryptedBase64: string): Promise<string | null> {
    try {
      const key = await this.deriveKey();
      const combined = this.base64ToArrayBuffer(encryptedBase64);

      // Extract IV (first 12 bytes) and ciphertext (rest)
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch {
      // Decryption failed - wrong key, corrupted data, or not encrypted
      return null;
    }
  }

  /**
   * Check if a value appears to be encrypted (base64 with sufficient length for IV + data)
   */
  isEncrypted(value: string): boolean {
    // Encrypted values are base64 and at least 12 bytes IV + some ciphertext
    // A GitHub PAT is ~40 chars, encrypted would be longer
    if (!value || value.length < 24) return false;

    // Check if it looks like base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(value)) return false;

    // GitHub PATs start with 'ghp_' or 'github_pat_' - if we see that, it's not encrypted
    if (value.startsWith('ghp_') || value.startsWith('github_pat_')) return false;

    return true;
  }

  /**
   * Derive an AES-256 key from the user's ID using PBKDF2
   */
  private async deriveKey(): Promise<CryptoKey> {
    const userId = this.authService.getUserId();
    const keyMaterial = await this.getKeyMaterial(userId);

    const salt = new TextEncoder().encode(this.APP_SALT);

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, // not extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Import user ID as key material for PBKDF2
   */
  private async getKeyMaterial(userId: string): Promise<CryptoKey> {
    const encoded = new TextEncoder().encode(userId || 'anonymous');
    return crypto.subtle.importKey('raw', encoded, 'PBKDF2', false, [
      'deriveKey',
    ]);
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
