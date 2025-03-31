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
    // Safer check with detailed logging
    const hasTelegramObject = typeof window !== 'undefined' && !!window.Telegram;
    const hasWebAppObject = hasTelegramObject && !!window.Telegram.WebApp;
    
    console.log('isTelegramWebApp check - window.Telegram exists:', hasTelegramObject);
    console.log('isTelegramWebApp check - window.Telegram.WebApp exists:', hasWebAppObject);
    
    // Development mode - always return true for testing
    return true;
    
    // For production environment (uncomment for production):
    // return hasWebAppObject;
  } catch (error) {
    console.warn('Error checking Telegram WebApp:', error);
    // Return true for development
    return true;
  }
}

// Initialize and setup the Telegram Mini App
export function initializeTelegramApp(): void {
  console.log('Initializing Telegram WebApp');
  try {
    if (isTelegramWebApp()) {
      console.log('Running in Telegram WebApp environment');
      
      // Check if we're actually in Telegram environment
      if (window.Telegram?.WebApp) {
        // Inform Telegram that our app is ready
        try {
          window.Telegram.WebApp.ready();
          console.log('WebApp.ready() called');
        } catch (readyError) {
          console.warn('Error calling WebApp.ready():', readyError);
        }
        
        // Set dark theme colors for app
        try {
          window.Telegram.WebApp.setHeaderColor('#121212');
          window.Telegram.WebApp.setBackgroundColor('#121212');
          console.log('Theme colors set');
        } catch (colorError) {
          console.warn('Error setting theme colors:', colorError);
        }
        
        // Expand to take full screen if needed
        try {
          window.Telegram.WebApp.expand();
          console.log('WebApp.expand() called');
        } catch (expandError) {
          console.warn('Error calling WebApp.expand():', expandError);
        }
      } else {
        console.log('Development mode: Skipping actual Telegram API calls');
      }
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
    
    // For development/testing:
    // Create mock user data when running outside Telegram
    const testUser = {
      telegramId: "123456789",
      firstName: "Test",
      lastName: "User",
      username: "testuser",
      photoUrl: "https://via.placeholder.com/100"
    };
    console.log('Using test user data for development');
    return testUser;
    
    // For production: uncomment below and remove testUser code above
    /*
    if (!isTelegramWebApp() || !window.Telegram?.WebApp?.initDataUnsafe?.user) {
      console.log('Not in Telegram WebApp or user data unavailable');
      return null;
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
    */
  } catch (error) {
    console.error('Error getting Telegram user:', error);
    return null;
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
    // Try to fetch user with API first (much more reliable than Firebase)
    try {
      console.log('Trying to fetch user via API endpoint');
      const response = await fetch(`/api/users/${telegramUser.telegramId}`);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User found via API:', userData);
        return userData;
      } else {
        console.log('User not found via API, will try creating');
        
        // Generate a unique referral code
        const newReferralCode = nanoid(8);
        
        // Try to create user via API
        const userData = {
          telegramId: telegramUser.telegramId,
          firstName: telegramUser.firstName,
          lastName: telegramUser.lastName,
          username: telegramUser.username,
          photoUrl: telegramUser.photoUrl,
          referralCode: newReferralCode,
          referredBy: referralCode
        };
        
        console.log('Creating user with data via API:', userData);
        
        const createResponse = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });
        
        if (createResponse.ok) {
          const createdUser = await createResponse.json();
          console.log('User created via API:', createdUser);
          return createdUser;
        } else {
          console.warn('Failed to create user via API, will fall back to Firebase');
        }
      }
    } catch (apiError) {
      console.warn('API error, falling back to Firebase:', apiError);
    }
    
    // Fallback to Firebase if API fails
    console.log('Looking up user in Firebase by Telegram ID:', telegramUser.telegramId);
    let user = await getUserByTelegramId(telegramUser.telegramId);
    
    console.log('getUserByTelegramId returned:', user);
    
    // If user doesn't exist, create a new one
    if (!user) {
      console.log('User not found in Firebase, creating new user');
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
