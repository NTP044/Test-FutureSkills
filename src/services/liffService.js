import liff from '@line/liff';

// LIFF ID from environment variable or provided fallback
export const LIFF_ID =
  import.meta.env.VITE_LIFF_ID ||
  import.meta.env.LIFF_ID ||
  '2010691658-aaTEbpoN';

// Registered LINE LIFF and Endpoint URLs from LINE Developers Console
export const LIFF_URL = 'https://miniapp.line.me/2010691658-aaTEbpoN';
export const REGISTERED_ENDPOINT_URL =
  'https://ais-pre-6xz4ebeb36aauxyoowfpwj-157778757157.asia-southeast1.run.app';

let isInitialized = false;
let initPromise = null;

/**
 * Initialize LIFF with configured liffId and withLoginOnExternalBrowser: true
 * Never auto-triggers liff.login()
 */
export async function initializeLiff() {
  if (isInitialized) {
    return {
      success: true,
      liff,
      isLoggedIn: liff.isLoggedIn(),
      isInClient: liff.isInClient(),
    };
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Initialize LIFF with liff.init({ liffId })
      // Notice: Do NOT pass withLoginOnExternalBrowser: true because it immediately auto-redirects
      // external browsers (and iframes) to access.line.me, causing 'refused to connect' inside iframes.
      await liff.init({
        liffId: LIFF_ID,
      });

      isInitialized = true;
      const loggedIn = liff.isLoggedIn();
      const inClient = liff.isInClient();
      const context = liff.getContext();

      return {
        success: true,
        liff,
        isLoggedIn: loggedIn,
        isInClient: inClient,
        context,
      };
    } catch (err) {
      console.warn('LIFF initialization error or preview environment fallback:', err);
      return {
        success: false,
        error: err,
        isLoggedIn: false,
        isInClient: false,
        context: null,
      };
    }
  })();

  return initPromise;
}

/**
 * Check if user is logged into LINE
 */
export function isUserLoggedIn() {
  try {
    return isInitialized && liff.isLoggedIn();
  } catch {
    return false;
  }
}

/**
 * Check if app is running inside LINE app
 */
export function checkIsInClient() {
  try {
    return isInitialized ? liff.isInClient() : false;
  } catch {
    return false;
  }
}

/**
 * Get LIFF context information
 */
export function getLiffContext() {
  try {
    return isInitialized ? liff.getContext() : null;
  } catch {
    return null;
  }
}

/**
 * Trigger LINE Login explicitly (called only when user clicks Login)
 */
export function loginWithLine(redirectUri) {
  try {
    if (!liff.isLoggedIn()) {
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (isIframe) {
        // access.line.me blocks iframe embedding via X-Frame-Options: DENY.
        // Open the app in a new tab so login completes without iframe refusal.
        window.open(LIFF_URL, '_blank');
        return;
      }

      let targetRedirect = redirectUri;

      if (!targetRedirect && typeof window !== 'undefined') {
        const currentUrl = window.location.href;
        // If current origin matches registered endpoint URL, redirect back to current URL
        if (currentUrl.startsWith(REGISTERED_ENDPOINT_URL)) {
          targetRedirect = currentUrl;
        } else if (REGISTERED_ENDPOINT_URL) {
          // If in dev preview or different domain, redirect to registered endpoint to satisfy LINE OAuth requirement
          targetRedirect = REGISTERED_ENDPOINT_URL;
        }
      }

      if (targetRedirect) {
        liff.login({ redirectUri: targetRedirect });
      } else {
        liff.login();
      }
    }
  } catch (err) {
    console.error('Error during liff.login():', err);
    throw err;
  }
}

/**
 * Trigger LINE Logout (called only when user clicks Logout)
 */
export function logoutFromLine() {
  try {
    if (liff.isLoggedIn()) {
      liff.logout();
    }
  } catch (err) {
    console.error('Error during liff.logout():', err);
    throw err;
  }
}

/**
 * Fetch LINE user profile
 */
export async function getLineProfile() {
  try {
    if (!liff.isLoggedIn()) {
      return null;
    }
    const profile = await liff.getProfile();
    return profile;
  } catch (err) {
    console.error('Error fetching LINE profile:', err);
    return null;
  }
}

export default liff;
