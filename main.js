require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const COOKIE = process.env.COOKIE;
const INTERVAL_MIN = Number(process.env.INTERVAL_MIN || 10);
const INTERVAL_MAX = Number(process.env.INTERVAL_MAX || 20);

if (!TELEGRAM_TOKEN || !CHAT_ID || !COOKIE) {
    console.error('Thiếu TELEGRAM_TOKEN / CHAT_ID / COOKIE trong .env');
    process.exit(1);
}

const TG_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

async function sendTelegram(text) {
    try {
        await axios.post(TG_URL, { chat_id: CHAT_ID, text });
        console.log(`Sent state to telegram`)
    } catch (e) {
        console.error('Telegram error:', e.response?.data || e.message);
    }
}

async function getMysteryBoxState() {
    const res = await axios.get('https://etherscan.io/points', {
        headers: {
            'Cookie': COOKIE,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
        },
    });

    const $ = cheerio.load(res.data);
    const btn = $('#mystery-box-btn');

    if (btn.length === 0) {
        return { found: false, disabled: true };
    }

    const cls = (btn.attr('class') || '').toLowerCase();
    const disabled =
        btn.is('[disabled]') ||
        (btn.attr('aria-disabled') || '').toLowerCase() === 'true' ||
        (btn.attr('data-disabled') || '').toLowerCase() === 'true' ||
        /(^|\s)(disabled|btn-disabled|is-disabled|pointer-events-none|opacity-50)(\s|$)/.test(cls);

    return { found: true, disabled };
}

function random(min, max){
     return Math.random() * (max - min) + min;
}

async function loop() {
    await sendTelegram(`Start listening...`);
    
    while (true) {
        try {
            const { found, disabled } = await getMysteryBoxState();

            if (!found) {
                console.log('⚠️  Không thấy #mystery-box-btn (cookie hết hạn? hoặc DOM thay đổi).');
            } else {
                console.log(`[${new Date().toLocaleString()}] Mystery Box: ${disabled ? 'DISABLED' : 'ACTIVE'}`);

                if (!disabled) {
                    await sendTelegram('🚀 Mystery Box đang ACTIVE — vào claim ngay!');
                }
            }
        } catch (e) {
            await sendTelegram(`Check error: ${e.message}`);
        }

        let nextInterval = random(INTERVAL_MIN, INTERVAL_MAX) * 60 * 1000
        console.log(`Sleeping ${nextInterval}s`)
        
        await new Promise(r => setTimeout(r, nextInterval));
    }
}

loop(); 