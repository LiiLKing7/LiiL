/**
 * LiiL - Telegram Bir martalik Avtorizatsiya Skripti
 * 
 * Ushbu skript orqali telefon raqamingiz va Telegram yuborgan kodni kiritasiz.
 * Sessiya 'telegram.session' fayliga saqlanadi va LiiL dasturi avtomatik ulanadi.
 */

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const API_ID = 34861281;
const API_HASH = '1612b9567f3a83beeaf98c0475f33b60';
const SESSION_FILE = path.join(__dirname, 'telegram.session');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

async function login() {
  console.log('====================================================');
  console.log('     LiiL Desktop - Telegram Ulanish Tizimi         ');
  console.log('====================================================');
  console.log(`API_ID: ${API_ID}`);
  console.log(`API_HASH: ${API_HASH.substring(0, 6)}...`);
  console.log('----------------------------------------------------');

  let sessionString = '';
  if (fs.existsSync(SESSION_FILE)) {
    try {
      sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
    } catch (e) {}
  }

  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: true,
  });

  await client.start({
    phoneNumber: async () => await ask('Telefon raqamingizni kiriting (+998XXXXXXXXX): '),
    password: async () => await ask('2FA Parolingiz (agar oʻrnatilgan boʻlsa, aks holda Enter): '),
    phoneCode: async () => await ask('Telegramdan kelgan tasdiqlash kodini kiriting: '),
    onError: (err) => console.error('[Xatolik]:', err.message || err),
  });

  const savedSession = client.session.save();
  fs.writeFileSync(SESSION_FILE, savedSession, 'utf8');

  console.log('----------------------------------------------------');
  console.log('✅ Tabriklaymiz! Telegram hisobingiz LiiL ga muvaffaqiyatli ulandi.');
  console.log(`📁 Sessiya saqlandi: ${SESSION_FILE}`);
  console.log('Endi LiiL ni ishga tushirsangiz, barcha xabarlar oʻng pastdagi Focus UI da koʻrinadi!');
  console.log('====================================================');

  rl.close();
  await client.disconnect();
  process.exit(0);
}

login().catch((err) => {
  console.error('❌ Ulanishda xatolik yuz berdi:', err);
  rl.close();
  process.exit(1);
});
