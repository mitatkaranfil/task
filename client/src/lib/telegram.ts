// Telegram Mini App SDK wrapper
import { getUserByTelegramId, createUser } from './firebase';
import { nanoid } from 'nanoid';
import { User } from '@/types';

// Define WebApp interface based on Telegram documentation
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready(): void;
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          auth_date: number;
          hash: string;
        };
        sendData(data: string): void;
        expand(): void;
        close(): void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          show(): void;
          hide(): void;
          enable(): void;
          disable(): void;
          showProgress(leaveActive: boolean): void;
          hideProgress(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
          setText(text: string): void;
          setParams(params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_active?: boolean;
            is_visible?: boolean;
          }): void;
        };
        BackButton: {
          isVisible: boolean;
          show(): void;
          hide(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
        };
        openLink(url: string): void;
        openTelegramLink(url: string): void;
        openInvoice(url: string, callback?: (status: string) => void): void;
        showPopup(params: {
          title?: string;
          message: string;
          buttons?: Array<{
            id: string;
            type?: "default" | "ok" | "close" | "cancel" | "destructive";
            text: string;
          }>;
        }, callback?: (buttonId: string) => void): void;
        showAlert(message: string, callback?: () => void): void;
        showConfirm(message: string, callback?: (isConfirmed: boolean) => void): void;
        HapticFeedback: {
          impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
          notificationOccurred(type: "error" | "success" | "warning"): void;
          selectionChanged(): void;
        };
        isVersionAtLeast(version: string): boolean;
        setHeaderColor(color: string): void;
        setBackgroundColor(color: string): void;
        enableClosingConfirmation(): void;
        disableClosingConfirmation(): void;
        onEvent(eventType: string, eventHandler: Function): void;
        offEvent(eventType: string, eventHandler: Function): void;
        setViewportHeight(height: number): void;
        requestViewport(): void;
        requestWriteAccess(callback?: (access_granted: boolean) => void): void;
        requestContact(callback?: (shared_contact: boolean) => void): void;
        CloudStorage: {
          getItem(key: string, callback?: (error: Error | null, value: string | null) => void): Promise<string | null>;
          setItem(key: string, value: string, callback?: (error: Error | null, success: boolean) => void): Promise<boolean>;
          removeItem(key: string, callback?: (error: Error | null, success: boolean) => void): Promise<boolean>;
          getItems(keys: string[], callback?: (error: Error | null, values: { [key: string]: string | null }) => void): Promise<{ [key: string]: string | null }>;
          removeItems(keys: string[], callback?: (error: Error | null, success: boolean) => void): Promise<boolean>;
          getKeys(callback?: (error: Error | null, keys: string[]) => void): Promise<string[]>;
        };
      };
    };
  }
}

// Check if we are in a Telegram WebApp environment
export function isTelegramWebApp(): boolean {
  try {
    return window.Telegram && window.Telegram.WebApp ? true : false;
  } catch (error) {
    console.warn('Error checking Telegram WebApp:', error);
    return false;
  }
}

// Initialize and setup the Telegram Mini App
export function initializeTelegramApp(): void {
  console.log('Initializing Telegram WebApp');
  try {
    if (isTelegramWebApp()) {
      console.log('Running in Telegram WebApp environment');
      
      // Inform Telegram that our app is ready
      window.Telegram.WebApp.ready();
      console.log('WebApp.ready() called');
      
      // Set dark theme colors for app
      try {
        window.Telegram.WebApp.setHeaderColor('#121212');
        window.Telegram.WebApp.setBackgroundColor('#121212');
        console.log('Theme colors set');
      } catch (colorError) {
        console.warn('Error setting theme colors:', colorError);
      }
      
      // Expand to take full screen if needed
      window.Telegram.WebApp.expand();
      console.log('WebApp.expand() called');
    } else {
      console.warn('Not running inside Telegram WebApp');
    }
  } catch (error) {
    console.error('Error initializing Telegram WebApp:', error);
  }
}

// Get current Telegram user
export function getTelegramUser(): {
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
} | null {
  try {
    console.log('Checking Telegram environment...');
    console.log('isTelegramWebApp():', isTelegramWebApp());
    console.log('window.Telegram exists:', !!window.Telegram);
    console.log('window.Telegram?.WebApp exists:', !!window.Telegram?.WebApp);
    console.log('initDataUnsafe exists:', !!window.Telegram?.WebApp?.initDataUnsafe);
    console.log('user exists:', !!window.Telegram?.WebApp?.initDataUnsafe?.user);
    
    if (!isTelegramWebApp() || !window.Telegram?.WebApp?.initDataUnsafe?.user) {
      // For development/testing when not in Telegram, return mock user
      console.log('Using development test user - No Telegram WebApp or user data available');
      return {
        telegramId: '123456789',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        photoUrl: 'https://via.placeholder.com/100'
      };
    }

    const user = window.Telegram.WebApp.initDataUnsafe.user;
    console.log('Telegram user data found:', user);

    return {
      telegramId: user.id.toString(),
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      photoUrl: user.photo_url
    };
  } catch (error) {
    console.error('Error getting Telegram user, using development user:', error);
    // Return development user on error
    return {
      telegramId: '123456789',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      photoUrl: 'https://via.placeholder.com/100'
    };
  }
}

// Get or create a user in Firebase based on Telegram data
export async function authenticateTelegramUser(referralCode?: string): Promise<User | null> {
  console.log('Starting authenticateTelegramUser function');
  const telegramUser = getTelegramUser();
  
  console.log('getTelegramUser returned:', telegramUser);
  
  if (!telegramUser) {
    console.error('No Telegram user found');
    return null;
  }
  
  try {
    console.log('Looking up user in Firebase by Telegram ID:', telegramUser.telegramId);
    // Check if user exists in Firebase
    let user = await getUserByTelegramId(telegramUser.telegramId);
    
    console.log('getUserByTelegramId returned:', user);
    
    // If user doesn't exist, create a new one
    if (!user) {
      console.log('User not found in Firebase, creating new user');
      // Generate a unique referral code
      const newReferralCode = nanoid(8);
      
      const userData = {
        telegramId: telegramUser.telegramId,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName,
        username: telegramUser.username,
        photoUrl: telegramUser.photoUrl,
        referralCode: newReferralCode,
        referredBy: referralCode
      };
      
      console.log('Creating user with data:', userData);
      user = await createUser(userData);
      console.log('User created:', user);
    } else {
      console.log('Existing user found in Firebase');
    }
    
    return user;
  } catch (error) {
    console.error('Error authenticating Telegram user:', error);
    return null;
  }
}

// Show an alert using Telegram's native UI
export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.showAlert(message, () => {
        resolve();
      });
    } else {
      alert(message);
      resolve();
    }
  });
}

// Show a confirmation dialog using Telegram's native UI
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.showConfirm(message, (isConfirmed) => {
        resolve(isConfirmed);
      });
    } else {
      const result = confirm(message);
      resolve(result);
    }
  });
}

// Open a Telegram channel or group
export function openTelegramLink(link: string): void {
  if (isTelegramWebApp()) {
    window.Telegram.WebApp.openTelegramLink(link);
  } else {
    window.open(link, '_blank');
  }
}

// Handle payment using Telegram's payment API
export function openInvoice(url: string): Promise<string> {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.openInvoice(url, (status) => {
        resolve(status);
      });
    } else {
      console.warn('Telegram payment not available outside WebApp');
      resolve('failed');
    }
  });
}

// Share data with Telegram (like referral code)
export function shareWithTelegram(data: string): void {
  if (isTelegramWebApp()) {
    window.Telegram.WebApp.sendData(data);
  } else {
    console.warn('Sharing not available outside WebApp');
  }
}

// Request a contact from user
export function requestContact(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.requestContact((shared) => {
        resolve(shared);
      });
    } else {
      console.warn('Contact request not available outside WebApp');
      resolve(false);
    }
  });
}

// Provide haptic feedback
export function hapticFeedback(type: 'success' | 'error' | 'warning'): void {
  if (isTelegramWebApp()) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
  }
}

// Close the WebApp
export function closeWebApp(): void {
  if (isTelegramWebApp()) {
    window.Telegram.WebApp.close();
  }
}
