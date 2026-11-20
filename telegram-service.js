/**
 * LiiL - Telegram Jonli Bildirishnomalar Xizmati (GramJS)
 */

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const fs = require('fs');
const path = require('path');

const API_ID = 34861281;
const API_HASH = '1612b9567f3a83beeaf98c0475f33b60';
const SESSION_FILE = path.join(__dirname, 'telegram.session');

let clientInstance = null;

function hasSession() {
  return fs.existsSync(SESSION_FILE) && fs.readFileSync(SESSION_FILE, 'utf8').trim().length > 10;
}

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

async function startTelegramService(onNewNotification) {
  if (!hasSession()) {
    console.log('[Telegram Service] telegram.session topilmadi.');
    return null;
  }

  const sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
  const stringSession = new StringSession(sessionString);

  try {
    const client = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 10,
      useWSS: true,
    });

    console.log('[Telegram Service] Telegram serverlariga ulanmoqda...');
    await client.connect();

    const isAuth = await client.isUserAuthorized();
    if (!isAuth) {
      console.warn('[Telegram Service] Sessiya muddati tugagan yoki notoʻgʻri. Iltimos "npm run tg-login" orqali qayta kiring.');
      return null;
    }

    const me = await client.getMe();
    console.log(`[Telegram Service] ✅ Muvaffaqiyatli ulandi! Profil: ${me.firstName || ''} (@${me.username || me.phone || me.id})`);
    clientInstance = client;

    // Yangi kelgan xabarlarni ushlab olish (faqat Direct / Personal)
    client.addEventHandler(async (event) => {
      try {
        const message = event.message;
        if (!message || message.out) return; // Oʻzingiz yozgan xabarlarni chiqarmaymiz

        // 1. FAQAT DIRECT (PERSONAL / SHAXSIY) CHATLAR:
        // Guruhlar (PeerChat, PeerChannel), Kanallar (PeerChannel) va boshqalarni to'liq bloklaymiz
        const isPeerUser = message.peerId && message.peerId.className === 'PeerUser';
        if (!isPeerUser || message.isGroup || message.isChannel) {
          return;
        }

        // 2. Jo'natuvchini aniqlash
        let sender = message.sender || null;
        if (!sender && typeof message.getSender === 'function') {
          try {
            sender = await withTimeout(message.getSender(), 1200, null);
          } catch (e) {}
        }
        if (!sender && message.peerId && clientInstance) {
          try {
            sender = await withTimeout(clientInstance.getEntity(message.peerId), 1200, null);
          } catch (e) {}
        }

        // 3. Botlarni to'liq bloklash (faqat haqiqiy insonlar yozgan xabarlar)
        if (sender && sender.bot) {
          return;
        }

        // 4. Telegram rasmiy servis akkauntlari (777000) ni ham chetlab o'tish
        if (message.senderId && (String(message.senderId) === '777000' || String(message.senderId) === '42777')) {
          return;
        }

        let senderName = 'Foydalanuvchi';
        let senderId = 1;

        if (sender) {
          senderId = sender.id || 1;
          senderName = sender.firstName || sender.username || 'Foydalanuvchi';
          if (sender.lastName) senderName += ` ${sender.lastName}`;
        }

        // Xabar matni yoki media turini aniqlash
        let text = message.text ? message.text.trim() : '';
        if (!text) {
          if (message.media) {
            const className = message.media.className || '';
            if (className.includes('Photo')) text = '📷 Rasm';
            else if (className.includes('Document')) {
              if (message.media.document && message.media.document.mimeType && message.media.document.mimeType.includes('audio')) {
                text = '🎵 Audio / Musiqa';
              } else if (message.media.document && message.media.document.mimeType && message.media.document.mimeType.includes('video')) {
                text = '🎬 Video';
              } else {
                text = '📎 Hujjat';
              }
            } else if (className.includes('Sticker')) text = '✨ Stiker';
            else if (className.includes('Contact')) text = '👤 Kontakt';
            else if (className.includes('Geo')) text = '📍 Geolokatsiya';
            else text = '📎 Media xabar';
          } else {
            text = 'Yangi xabar';
          }
        }

        if (text.length > 80) {
          text = text.substring(0, 77) + '...';
        }

        const av = (Math.abs(Number(senderId) || 1) % 12) + 1;
        const payload = {
          name: senderName,
          text: text,
          time: 'hozir',
          av
        };

        console.log(`[Telegram Service] 📩 Yangi xabar: [${senderName}] -> "${text}"`);

        if (typeof onNewNotification === 'function') {
          onNewNotification(payload);
        }
      } catch (err) {
        console.error('[Telegram Handler Xatosi]:', err);
      }
    }, new NewMessage({}));

    return client;
  } catch (err) {
    console.error('[Telegram Service Xatosi]:', err);
    return null;
  }
}

function getClient() {
  return clientInstance;
}

module.exports = {
  hasSession,
  startTelegramService,
  getClient
};
