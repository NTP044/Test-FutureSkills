import QRCode from 'qrcode';

/**
 * Generates an EMVCo-compliant Thai PromptPay QR payload string
 * Supports mobile numbers (10 digits starting with 0) and Thai National IDs (13 digits)
 *
 * @param {string} target PromptPay Target (Phone number e.g. 0812345678 or 13-digit ID)
 * @param {number|string} [amount] Payment amount in THB (optional)
 * @returns {string} PromptPay EMVCo Payload
 */
export function generatePromptPayPayload(target, amount) {
  const cleanTarget = String(target || '').replace(/[^0-9]/g, '');
  let formattedTarget = '';

  if (cleanTarget.length === 10 && cleanTarget.startsWith('0')) {
    // Mobile number: prefix with 0066 and strip leading 0 -> e.g. 0066812345678
    formattedTarget = '0066' + cleanTarget.substring(1);
  } else if (cleanTarget.length === 13) {
    // Citizen ID or Tax ID
    formattedTarget = cleanTarget;
  } else {
    // Default fallback format
    formattedTarget = cleanTarget;
  }

  // Tag 00: Format Indicator
  const f00 = '000201';
  // Tag 01: Initiation Point (11 = Static, 12 = Dynamic with amount)
  const f01 = amount ? '010212' : '010211';

  // Tag 29: PromptPay Merchant Info
  // Sub-tag 00: AID
  const aid = '0016A000000677010111';
  // Sub-tag 01 (Phone) or 02 (National ID)
  const subTag = cleanTarget.length === 13 ? '02' : '01';
  const subTagLen = String(formattedTarget.length).padStart(2, '0');
  const tag29Value = `${aid}${subTag}${subTagLen}${formattedTarget}`;
  const tag29Len = String(tag29Value.length).padStart(2, '0');
  const f29 = `29${tag29Len}${tag29Value}`;

  // Tag 53: Transaction Currency (764 = THB)
  const f53 = '5303764';

  // Tag 54: Transaction Amount (optional)
  let f54 = '';
  if (amount && Number(amount) > 0) {
    const amtStr = Number(amount).toFixed(2);
    const amtLen = String(amtStr.length).padStart(2, '0');
    f54 = `54${amtLen}${amtStr}`;
  }

  // Tag 58: Country Code (TH)
  const f58 = '5802TH';

  // Tag 63: CRC-16 Checksum Placeholder
  const raw = `${f00}${f01}${f29}${f53}${f54}${f58}6304`;
  const crc = crc16(raw);

  return `${raw}${crc}`;
}

/**
 * CRC-16/CCITT-FALSE Calculation
 * @param {string} data
 * @returns {string} 4-char hex string uppercase
 */
function crc16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);
    crc ^= c << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates a QR Code Data URL from PromptPay target and amount
 * @param {string} target
 * @param {number|string} amount
 * @returns {Promise<string>} Data URL (base64 image)
 */
export async function generatePromptPayQRDataUrl(target, amount) {
  const payload = generatePromptPayPayload(target, amount);
  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#1e3a8a', // Deep elegant navy/PromptPay blue
      light: '#ffffff',
    },
  });
}
