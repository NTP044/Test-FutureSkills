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

/**
 * Send Booking Confirmation Flex Message to LINE Chat if inside LINE app
 */
export async function sendBookingConfirmationFlex(booking) {
  if (!booking) return false;
  try {
    if (liff.isLoggedIn() && liff.isInClient()) {
      const flexMessage = {
        type: 'flex',
        altText: `🌸 ยืนยันการจองคิวสำเร็จ (${booking.id}) - The Bloom Studio`,
        contents: {
          type: 'bubble',
          size: 'mega',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#443026',
            paddingAll: '18px',
            contents: [
              {
                type: 'text',
                text: '🌸 THE BLOOM STUDIO',
                color: '#D4A373',
                size: 'xs',
                weight: 'bold',
                letterSpacing: '2px',
              },
              {
                type: 'text',
                text: 'ใบยืนยันการจองคิวสำเร็จ',
                color: '#FFFFFF',
                size: 'lg',
                weight: 'bold',
                margin: 'xs',
              },
              {
                type: 'text',
                text: `รหัสการจอง: ${booking.id}`,
                color: '#D4A373',
                size: 'xs',
                margin: 'xs',
                weight: 'bold',
              },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: '18px',
            backgroundColor: '#FAF9F6',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#FFFFFF',
                cornerRadius: '12px',
                paddingAll: '14px',
                contents: [
                  {
                    type: 'text',
                    text: booking.serviceName || 'บริการความงามและสปา',
                    weight: 'bold',
                    size: 'md',
                    color: '#2D2D2D',
                    wrap: true,
                  },
                  {
                    type: 'text',
                    text: `ผู้ดูแล: ${booking.staffName || 'ช่างมืออาชีพ'}`,
                    size: 'xs',
                    color: '#71717A',
                    margin: 'sm',
                  },
                  {
                    type: 'separator',
                    margin: 'md',
                    color: '#F4EAE0',
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'md',
                    contents: [
                      {
                        type: 'text',
                        text: '🗓️ วันที่นัดหมาย',
                        size: 'xs',
                        color: '#71717A',
                        flex: 1,
                      },
                      {
                        type: 'text',
                        text: `${booking.date} เวลา ${booking.time} น.`,
                        size: 'xs',
                        color: '#B5824B',
                        weight: 'bold',
                        align: 'end',
                        flex: 2,
                      },
                    ],
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: '👤 ผู้จอง',
                        size: 'xs',
                        color: '#71717A',
                        flex: 1,
                      },
                      {
                        type: 'text',
                        text: `${booking.customerName} (${booking.customerPhone})`,
                        size: 'xs',
                        color: '#2D2D2D',
                        weight: 'bold',
                        align: 'end',
                        flex: 2,
                      },
                    ],
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: '💳 ยอดชำระ',
                        size: 'xs',
                        color: '#71717A',
                        flex: 1,
                      },
                      {
                        type: 'text',
                        text: `฿${Number(booking.servicePrice || 0).toLocaleString()} (${booking.paymentStatus === 'paid_slip' ? 'แนบสลิปแล้ว' : 'ชำระหน้าร้าน'})`,
                        size: 'xs',
                        color: '#10B981',
                        weight: 'bold',
                        align: 'end',
                        flex: 2,
                      },
                    ],
                  },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '📍 สุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ',
                    size: 'xxs',
                    color: '#A1A1AA',
                    align: 'center',
                    wrap: true,
                  },
                  {
                    type: 'text',
                    text: '📞 โทร 02-123-4567 • เปิดบริการทุกวัน 10:00 - 20:30 น.',
                    size: 'xxs',
                    color: '#A1A1AA',
                    align: 'center',
                    margin: 'xs',
                  },
                ],
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            paddingAll: '12px',
            backgroundColor: '#FAF9F6',
            contents: [
              {
                type: 'text',
                text: 'ขอบพระคุณที่ไว้วางใจให้ The Bloom Studio ดูแลคุณค่ะ 🌿',
                size: 'xxs',
                color: '#8C684B',
                align: 'center',
              },
            ],
          },
        },
      };

      await liff.sendMessages([flexMessage]);
      console.log('✅ LINE Booking Confirmation Flex Message sent to chat successfully!');
      return true;
    }
  } catch (err) {
    console.warn('Could not send LINE in-chat message (user might not be in 1-on-1 chat):', err);
  }
  return false;
}

export default liff;
