require('dotenv').config();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const isExpoPushToken = (token) => /^Expo(nent)?PushToken\[.+\]$/.test(token);

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

const SUBSCRIPTION_TRIAL_DAYS = 7;
const SUBSCRIPTION_RENEWAL_DAYS = 14;
const SUBSCRIPTION_AMOUNT_NGN = 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const KORAPAY_BASE_URL = 'https://api.korapay.com/merchant/api/v1';
const MIN_WORK_PHOTOS = 3;
const MAX_WORK_PHOTOS = 10;

const rawDatabaseUrl = (process.env.DATABASE_URL || '').trim();
const hasDatabase =
rawDatabaseUrl &&
rawDatabaseUrl !== 'your_database_url_here' &&
rawDatabaseUrl !== 'your_database_url';
const isLocalDatabase =
rawDatabaseUrl.includes('@localhost:') ||
rawDatabaseUrl.includes('@127.0.0.1:');
const useSsl =
process.env.DATABASE_SSL === 'true' ||
(!isLocalDatabase && rawDatabaseUrl.startsWith('postgres'));

const pool = hasDatabase
? new Pool({
connectionString: rawDatabaseUrl,
ssl: useSsl ? { rejectUnauthorized: false } : false
})
: null;

const tokenSecret = process.env.TOKEN_SECRET || 'change-this-token-secret-before-deploying';
const korapaySecretKey = (process.env.KORAPAY_SECRET_KEY || '').trim();
const korapayPublicKey = (process.env.KORAPAY_PUBLIC_KEY || '').trim();

if (!process.env.TOKEN_SECRET) {
console.warn('TOKEN_SECRET is not set. Add it in .env before deployment.');
}

app.disable('x-powered-by');

// ============================================================
// RATE LIMITER (in-memory, no extra packages needed)
// ============================================================
const rateLimitStore = new Map();

const rateLimit = (maxRequests, windowMs, message) => {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    const record = rateLimitStore.get(key);

    if (now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSecs = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSecs);
      return res.status(429).json({
        success: false,
        message: message || `Too many requests. Please wait ${retryAfterSecs} seconds before trying again.`
      });
    }

    record.count++;
    next();
  };
};

// Clean up old rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) rateLimitStore.delete(key);
  }
}, 10 * 60 * 1000);

// ============================================================
// SECURITY HEADERS
// ============================================================
app.use((req, res, next) => {
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

if (isProduction) {
res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

res.setHeader('Content-Security-Policy',
"default-src 'self'; " +
"script-src 'self' 'unsafe-inline' https://js.korapay.com https://korablobstorage.blob.core.windows.net; " +
"style-src 'self' 'unsafe-inline'; " +
"img-src 'self' data: blob: https:; " +
"font-src 'self' https:; " +
"connect-src 'self' https://api.korapay.com; " +
"frame-src https://korapay.com https://checkout.korapay.com; " +
"object-src 'none';"
);

next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
res.json({
success: true,
status: 'ok',
databaseConfigured: Boolean(pool),
korapayConfigured: Boolean(korapaySecretKey && korapayPublicKey)
});
});

const publicProviderColumns = `id, name, email, phone, whatsapp, skill, category, state, lga, city, bio, photo, work_photos, plan, verified, rating, review_count, views, created_at, subscription_expiry, is_active`;

const ownerProviderColumns = `${publicProviderColumns}, id_type, name_changed_at`;

const adminProviderColumns = `${publicProviderColumns}, id_type, id_photo, name_changed_at`;

const sendDatabaseUnavailable = (res) =>
res.status(503).json({
success: false,
message: 'Database is not configured yet. Add a real DATABASE_URL in your .env file.'
});

const sendKorapayUnavailable = (res) =>
res.status(503).json({
success: false,
message: 'Korapay keys are not configured yet. Add KORAPAY_SECRET_KEY and KORAPAY_PUBLIC_KEY to .env.'
});

const sanitizeText = (value) => {
if (typeof value !== 'string') return '';
return value.trim();
};

const sanitizeOptionalText = (value) => {
const trimmed = sanitizeText(value);
return trimmed || null;
};

const parsePhotoArray = (value) => {
if (Array.isArray(value)) {
return value.map((item) => sanitizeText(item)).filter(Boolean);
}
if (typeof value === 'string') {
const trimmed = value.trim();
if (!trimmed) return [];
try {
const parsed = JSON.parse(trimmed);
if (Array.isArray(parsed)) {
return parsed.map((item) => sanitizeText(item)).filter(Boolean);
}
} catch (error) {
return [trimmed];
}
}
return [];
};

const isImageDataUrl = (value) =>
typeof value === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);

const validateWorkPhotos = (photos) => {
if (photos.length < MIN_WORK_PHOTOS || photos.length > MAX_WORK_PHOTOS) {
return `Please upload between ${MIN_WORK_PHOTOS} and ${MAX_WORK_PHOTOS} work photos.`;
}
if (!photos.every(isImageDataUrl)) {
return 'Work photos must be valid images.';
}
return null;
};

const canChangeName = (nameChangedAt) => {
if (!nameChangedAt) return true;
const last = new Date(nameChangedAt);
const now = new Date();
const diffMs = now.getTime() - last.getTime();
const diffDays = diffMs / (1000 * 60 * 60 * 24);
return diffDays >= 30;
};

const daysUntilNameChange = (nameChangedAt) => {
if (!nameChangedAt) return 0;
const last = new Date(nameChangedAt);
const now = new Date();
const diffMs = now.getTime() - last.getTime();
const diffDays = diffMs / (1000 * 60 * 60 * 24);
return Math.ceil(30 - diffDays);
};

const base64UrlEncode = (input) =>
Buffer.from(input)
.toString('base64')
.replace(/\+/g, '-')
.replace(/\//g, '_')
.replace(/=+$/g, '');

const base64UrlDecode = (input) => {
const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
return Buffer.from(normalized + padding, 'base64').toString('utf8');
};

const signToken = (payload, expiresInSeconds = 60 * 60 * 24 * 7) => {
const header = { alg: 'HS256', typ: 'JWT' };
const now = Math.floor(Date.now() / 1000);
const finalPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
const encodedHeader = base64UrlEncode(JSON.stringify(header));
const encodedPayload = base64UrlEncode(JSON.stringify(finalPayload));
const signature = crypto
.createHmac('sha256', tokenSecret)
.update(`${encodedHeader}.${encodedPayload}`)
.digest('base64')
.replace(/\+/g, '-')
.replace(/\//g, '_')
.replace(/=+$/g, '');
return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verifyToken = (token, expectedRole) => {
try {
if (!token) return null;
const parts = token.split('.');
if (parts.length !== 3) return null;
const [encodedHeader, encodedPayload, incomingSignature] = parts;
const expectedSignature = crypto
.createHmac('sha256', tokenSecret)
.update(`${encodedHeader}.${encodedPayload}`)
.digest('base64')
.replace(/\+/g, '-')
.replace(/\//g, '_')
.replace(/=+$/g, '');
const expectedBuffer = Buffer.from(expectedSignature);
const incomingBuffer = Buffer.from(incomingSignature);
if (expectedBuffer.length !== incomingBuffer.length) return null;
if (!crypto.timingSafeEqual(expectedBuffer, incomingBuffer)) {
return null;
}
const payload = JSON.parse(base64UrlDecode(encodedPayload));
const now = Math.floor(Date.now() / 1000);
if (!payload.exp || payload.exp < now) return null;
if (expectedRole && payload.role !== expectedRole) return null;
return payload;
} catch (error) {
return null;
}
};

const hashPassword = (password) =>
new Promise((resolve, reject) => {
const salt = crypto.randomBytes(16).toString('hex');
crypto.scrypt(password, salt, 64, (err, derivedKey) => {
if (err) return reject(err);
resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
});
});

const verifyPassword = (password, storedPassword) =>
new Promise((resolve, reject) => {
if (!storedPassword) { resolve(false); return; }
if (!storedPassword.startsWith('scrypt:')) { resolve(password === storedPassword); return; }
const [, salt, key] = storedPassword.split(':');
if (!salt || !key) { resolve(false); return; }
crypto.scrypt(password, salt, 64, (err, derivedKey) => {
if (err) return reject(err);
const storedKeyBuffer = Buffer.from(key, 'hex');
if (storedKeyBuffer.length !== derivedKey.length) { resolve(false); return; }
resolve(crypto.timingSafeEqual(storedKeyBuffer, derivedKey));
});
});

const getBearerToken = (req) => {
const authHeader = req.headers.authorization || '';
if (!authHeader.startsWith('Bearer ')) return null;
return authHeader.slice(7).trim();
};

const getProviderAuth = (req) => verifyToken(getBearerToken(req), 'provider');

const getAdminAuth = (req) => {
const bearerPayload = verifyToken(getBearerToken(req), 'admin');
if (bearerPayload) return bearerPayload;
const fallbackSecret = sanitizeText(req.body?.secret || req.query?.secret);
if (process.env.ADMIN_SECRET && fallbackSecret === process.env.ADMIN_SECRET) {
return { role: 'admin', mode: 'secret-fallback' };
}
return null;
};

const toValidDate = (value) => {
if (!value) return null;
const date = new Date(value);
return Number.isNaN(date.getTime()) ? null : date;
};

const getSubscriptionSnapshot = (provider) => {
const now = new Date();
const expiry = toValidDate(provider.subscription_expiry);
const active = Boolean(provider.is_active) && Boolean(expiry && expiry > now);
const millisecondsRemaining = expiry ? expiry.getTime() - now.getTime() : 0;
const daysRemaining = active
? Math.max(0, Math.ceil(millisecondsRemaining / (24 * 60 * 60 * 1000)))
: 0;
const warning = expiry && (millisecondsRemaining <= 3 * 24 * 60 * 60 * 1000 || millisecondsRemaining <= 0);
return {
status: active ? 'Active' : 'Expired',
isActive: active,
expiryDate: expiry ? expiry.toISOString() : null,
daysRemaining,
warning,
warningMessage: expiry
? `Your profile goes offline on ${expiry.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}`
: 'Your profile is offline until a subscription date is set.'
};
};

const enrichProvider = (provider) => ({
...provider,
subscription: getSubscriptionSnapshot(provider)
});

async function sendEmail(to, subject, html) {
try {
await resend.emails.send({ from: 'HireLocal <hello@hirelocal.ng>', to, subject, html });
} catch (err) {
console.error('Email error:', err.message);
}
}

const buildPaymentReference = (providerId) =>
`HL-SUB-${providerId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

async function callKorapay(pathname, options = {}) {
const response = await fetch(`${KORAPAY_BASE_URL}${pathname}`, {
...options,
headers: {
Authorization: `Bearer ${korapaySecretKey}`,
'Content-Type': 'application/json',
...(options.headers || {})
}
});
let payload = {};
try { payload = await response.json(); }
catch (error) { payload = { status: false, message: 'Unexpected response from Korapay.' }; }
return { response, payload };
}

async function createTables() {
if (!pool) { console.warn('Database is not configured. Skipping table creation.'); return; }
try {
await pool.query(`CREATE TABLE IF NOT EXISTS providers ( id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, phone VARCHAR(20), whatsapp VARCHAR(20), password VARCHAR(255), skill VARCHAR(100), category VARCHAR(100), state VARCHAR(100), lga VARCHAR(100), city VARCHAR(100), bio TEXT, photo TEXT, work_photos JSONB DEFAULT '[]'::jsonb, id_type VARCHAR(100), id_photo TEXT, plan VARCHAR(20) DEFAULT 'free', verified BOOLEAN DEFAULT false, rating DECIMAL(3,2) DEFAULT 0, review_count INTEGER DEFAULT 0, views INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW() )`);
await pool.query(`ALTER TABLE providers ALTER COLUMN password TYPE VARCHAR(255)`);
await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS photo TEXT`);
await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS work_photos JSONB DEFAULT '[]'::jsonb`);
await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS id_type VARCHAR(100)`);
await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS id_photo TEXT`);
await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMP`);
await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS name_changed_at TIMESTAMP`);
await pool.query(`ALTER TABLE providers ALTER COLUMN photo TYPE TEXT`).catch(e => console.log('Photo column already TEXT or error:', e.message));

await pool.query(`UPDATE providers SET subscription_expiry = NOW() + INTERVAL '${SUBSCRIPTION_TRIAL_DAYS} days' WHERE subscription_expiry IS NULL`);
await pool.query(`UPDATE providers SET is_active = CASE WHEN subscription_expiry > NOW() THEN true ELSE false END WHERE subscription_expiry IS NOT NULL`);
await pool.query(`CREATE TABLE IF NOT EXISTS reviews ( id SERIAL PRIMARY KEY, provider_id INTEGER REFERENCES providers(id), reviewer_name VARCHAR(100), rating INTEGER CHECK (rating >= 1 AND rating <= 5), comment TEXT, date TIMESTAMP DEFAULT NOW() )`);
await pool.query(`CREATE TABLE IF NOT EXISTS payments ( id SERIAL PRIMARY KEY, provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE, reference VARCHAR(120) UNIQUE NOT NULL, transaction_reference VARCHAR(120), amount INTEGER NOT NULL, status VARCHAR(30) DEFAULT 'pending', raw_response JSONB, paid_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW() )`);
await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON payments(provider_id)`);
await pool.query(`CREATE TABLE IF NOT EXISTS search_logs ( id SERIAL PRIMARY KEY, category VARCHAR(100), state VARCHAR(100), query VARCHAR(100), results_count INTEGER, searched_at TIMESTAMP DEFAULT NOW() )`);

await pool.query(`CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(email)
)`);

await pool.query(`CREATE TABLE IF NOT EXISTS push_tokens (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider_id)
)`);

console.log('Tables created successfully');
} catch (err) {
console.error('Table creation error:', err.message);
}
}

async function deactivateExpiredProviders() {
if (!pool) return;
try {
const result = await pool.query(`UPDATE providers SET is_active = false WHERE subscription_expiry < NOW() AND is_active = true`);
if (result.rowCount > 0) {
console.log(`Subscription cleanup deactivated ${result.rowCount} provider(s).`);
}
} catch (error) {
console.error('Subscription cleanup error:', error.message);
}
}

createTables().then(() => deactivateExpiredProviders());
setInterval(() => { deactivateExpiredProviders(); }, CLEANUP_INTERVAL_MS);

// ============================================================
// REGISTER ENDPOINT
// ============================================================
app.post('/api/register',
  rateLimit(15, 60 * 60 * 1000, 'Too many registration attempts. Please try again in 1 hour.'),
  async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);

const name = sanitizeText(req.body.name);
const email = sanitizeText(req.body.email).toLowerCase();
const phone = sanitizeOptionalText(req.body.phone);
const whatsapp = sanitizeOptionalText(req.body.whatsapp);
const password = sanitizeText(req.body.password);
const skill = sanitizeText(req.body.skill);
const category = sanitizeOptionalText(req.body.category);
const state = sanitizeText(req.body.state);
const lga = sanitizeOptionalText(req.body.lga);
const city = sanitizeOptionalText(req.body.city);
const bio = sanitizeOptionalText(req.body.bio);
const idType = sanitizeText(req.body.id_type);
const idPhoto = sanitizeText(req.body.id_photo);
const workPhotos = parsePhotoArray(req.body.work_photos);
const photo = req.body.photo && isImageDataUrl(req.body.photo) ? req.body.photo : null;

if (!name || !email || !password || !skill || !state) {
return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
}
if (!email.includes('@')) {
return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
}
if (password.length < 6) {
return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
}
const photoError = validateWorkPhotos(workPhotos);
if (photoError) return res.status(400).json({ success: false, message: photoError });
if (!idType) {
return res.status(400).json({ success: false, message: 'Please select the ID type for verification.' });
}
if (!isImageDataUrl(idPhoto)) {
return res.status(400).json({ success: false, message: 'Please upload a valid ID photo for verification.' });
}

try {
const passwordHash = await hashPassword(password);
const result = await pool.query(
`INSERT INTO providers ( name, email, phone, whatsapp, password, skill, category, state, lga, city, bio, photo, work_photos, id_type, id_photo, subscription_expiry, is_active ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,NOW() + INTERVAL '${SUBSCRIPTION_TRIAL_DAYS} days',true) RETURNING ${publicProviderColumns}`,
[name, email, phone, whatsapp, passwordHash, skill, category, state, lga, city, bio,
photo, JSON.stringify(workPhotos), idType, idPhoto]
);
const provider = enrichProvider(result.rows[0]);
const token = signToken({ role: 'provider', sub: provider.id }, 60 * 60 * 24 * 14);
await sendEmail(email, 'Welcome to HireLocal!', `<h2>Welcome, ${name}!</h2> <p>Your profile is now live on HireLocal for 7 days free.</p> <p>After 7 days, pay ₦1,000 every 14 days to keep your profile visible.</p> <p><a href="https://hirelocal.ng/login.html">Login to your dashboard</a></p>`);
res.json({ success: true, provider, token });
} catch (err) {
console.error('Register error:', err.message);
const message = err.code === '23505' ? 'Email already exists.' : 'Unable to create account right now.';
res.status(400).json({ success: false, message });
}
});

// ============================================================
// LOGIN ENDPOINT
// ============================================================
app.post('/api/login',
  rateLimit(10, 15 * 60 * 1000, 'Too many login attempts. Please wait 15 minutes before trying again.'),
  async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
const email = sanitizeText(req.body.email).toLowerCase();
const password = sanitizeText(req.body.password);
if (!email || !password) {
return res.status(400).json({ success: false, message: 'Email and password are required.' });
}
try {
const result = await pool.query('SELECT * FROM providers WHERE email = $1', [email]);
if (result.rows.length === 0) {
return res.status(401).json({ success: false, message: 'Invalid email or password.' });
}
const provider = result.rows[0];
const matched = await verifyPassword(password, provider.password);
if (!matched) {
return res.status(401).json({ success: false, message: 'Invalid email or password.' });
}
if (!provider.password.startsWith('scrypt:')) {
const upgradedPassword = await hashPassword(password);
await pool.query('UPDATE providers SET password = $1 WHERE id = $2', [upgradedPassword, provider.id]);
}
const safeProviderResult = await pool.query(
`SELECT ${ownerProviderColumns} FROM providers WHERE id = $1`, [provider.id]
);
const safeProvider = enrichProvider(safeProviderResult.rows[0]);
const token = signToken({ role: 'provider', sub: provider.id }, 60 * 60 * 24 * 14);
res.json({ success: true, provider: safeProvider, token });
} catch (err) {
console.error('Login error:', err.message);
res.status(500).json({ success: false, message: 'Unable to login right now. Please try again.' });
}
});

// ============================================================
// FORGOT PASSWORD ENDPOINT
// ============================================================
app.post('/api/forgot-password',
  rateLimit(3, 60 * 60 * 1000, 'Too many password reset requests. Please wait 1 hour before trying again.'),
  async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);

const email = sanitizeText(req.body.email).toLowerCase();

if (!email) {
return res.status(400).json({ success: false, message: 'Email address is required.' });
}

try {
const userResult = await pool.query('SELECT id, name FROM providers WHERE email = $1', [email]);

if (userResult.rows.length === 0) {
return res.json({
success: true,
message: 'If an account exists with that email, you will receive a password reset link.'
});
}

const user = userResult.rows[0];
const resetToken = crypto.randomBytes(32).toString('hex');
const resetLink = `https://hirelocal.ng/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;

await pool.query(
`INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')
ON CONFLICT (email) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL '1 hour'`,
[email, resetToken]
);

const subject = 'Reset Your HireLocal Password';
const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
  .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
  .content { padding: 20px; }
  .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; border-top: 1px solid #ddd; }
  .warning { background: #fff3cd; padding: 10px; border-radius: 5px; font-size: 12px; margin-top: 20px; }
</style>
</head>
<body>
<div class="container">
<div class="header"><h2>Password Reset Request</h2></div>
<div class="content">
<p>Hello ${user.name},</p>
<p>We received a request to reset your HireLocal account password.</p>
<p style="text-align: center;"><a href="${resetLink}" class="button">Reset Password</a></p>
<p>Or copy and paste this link into your browser:</p>
<p style="word-break: break-all; font-size: 12px;">${resetLink}</p>
<div class="warning"><strong>⚠️ This link expires in 1 hour.</strong><br>If you didn't request this, please ignore this email.</div>
</div>
<div class="footer"><p>HireLocal - Connecting customers with local professionals</p><p><a href="https://hirelocal.ng">hirelocal.ng</a></p></div>
</div>
</body>
</html>
`;

await sendEmail(email, subject, html);
console.log(`Password reset email sent to: ${email}`);

res.json({
success: true,
message: 'If an account exists with that email, you will receive a password reset link.'
});

} catch (err) {
console.error('Forgot password error:', err.message);
res.status(500).json({ success: false, message: 'Unable to process request. Please try again.' });
}
});

// ============================================================
// RESET PASSWORD ENDPOINT
// ============================================================
app.post('/api/reset-password',
  rateLimit(5, 60 * 60 * 1000, 'Too many reset attempts. Please wait 1 hour.'),
  async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);

const { email, token, new_password } = req.body;

if (!email || !token || !new_password) {
return res.status(400).json({ success: false, message: 'Missing required fields.' });
}

if (new_password.length < 6) {
return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
}

try {
const resetResult = await pool.query(
'SELECT * FROM password_resets WHERE email = $1 AND token = $2 AND expires_at > NOW()',
[email.toLowerCase(), token]
);

if (resetResult.rows.length === 0) {
return res.status(400).json({ success: false, message: 'Invalid or expired reset link. Please request a new one.' });
}

const hashedPassword = await hashPassword(new_password);
await pool.query('UPDATE providers SET password = $1 WHERE email = $2', [hashedPassword, email.toLowerCase()]);
await pool.query('DELETE FROM password_resets WHERE email = $1', [email.toLowerCase()]);

const subject = 'Your HireLocal Password Has Been Reset';
const html = `
<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
<h2 style="color: #4CAF50;">Password Reset Successful</h2>
<p>Your HireLocal account password has been successfully changed.</p>
<p>If you did not make this change, please contact support immediately.</p>
<p><a href="https://hirelocal.ng/login.html" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a></p>
<hr>
<p style="font-size: 12px; color: #777;">HireLocal Nigeria</p>
</div>
`;

await sendEmail(email, subject, html);

res.json({ success: true, message: 'Password has been reset successfully. You can now login with your new password.' });

} catch (err) {
console.error('Reset password error:', err.message);
res.status(500).json({ success: false, message: 'Unable to reset password. Please try again.' });
}
});

// ============================================================
// ADMIN LOGIN
// ============================================================
app.post('/api/admin/login',
  rateLimit(5, 15 * 60 * 1000, 'Too many admin login attempts. Please wait 15 minutes.'),
  (req, res) => {
const secret = sanitizeText(req.body.secret);
if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
return res.status(401).json({ success: false, message: 'Invalid admin secret.' });
}
const token = signToken({ role: 'admin' }, 60 * 60 * 12);
res.json({ success: true, token });
});

// ============================================================
// GET CURRENT PROVIDER
// ============================================================
app.get('/api/me', async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
const auth = getProviderAuth(req);
if (!auth?.sub) return res.status(401).json({ success: false, message: 'Unauthorized' });
try {
const result = await pool.query(`SELECT ${ownerProviderColumns} FROM providers WHERE id = $1`, [auth.sub]);
if (result.rows.length === 0) {
return res.status(404).json({ success: false, message: 'Provider not found.' });
}
res.json({
success: true,
provider: enrichProvider(result.rows[0]),
payment: {
amount: SUBSCRIPTION_AMOUNT_NGN,
publicKey: korapayPublicKey || null,
enabled: Boolean(korapayPublicKey && korapaySecretKey)
}
});
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

// ============================================================
// UPDATE PROVIDER PROFILE
// ============================================================
app.put('/api/provider/me', async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
const auth = getProviderAuth(req);
if (!auth?.sub) return res.status(401).json({ success: false, message: 'Unauthorized' });

const newName = sanitizeText(req.body.name);
const phone = sanitizeOptionalText(req.body.phone);
const whatsapp = sanitizeOptionalText(req.body.whatsapp);
const skill = sanitizeText(req.body.skill);
const category = sanitizeOptionalText(req.body.category);
const state = sanitizeText(req.body.state);
const lga = sanitizeOptionalText(req.body.lga);
const city = sanitizeOptionalText(req.body.city);
const bio = sanitizeOptionalText(req.body.bio);
const workPhotosProvided = Object.prototype.hasOwnProperty.call(req.body, 'work_photos');
const workPhotos = workPhotosProvided ? parsePhotoArray(req.body.work_photos) : null;
const photo = req.body.photo && isImageDataUrl(req.body.photo) ? req.body.photo : undefined;

if (!skill || !state) {
return res.status(400).json({ success: false, message: 'Skill and state are required.' });
}
const photoError = workPhotosProvided ? validateWorkPhotos(workPhotos) : null;
if (photoError) return res.status(400).json({ success: false, message: photoError });

try {
const current = await pool.query('SELECT name, name_changed_at, work_photos FROM providers WHERE id = $1', [auth.sub]);
if (current.rows.length === 0) {
return res.status(404).json({ success: false, message: 'Provider not found.' });
}

const currentName = current.rows[0].name;
const nameChangedAt = current.rows[0].name_changed_at;
const finalWorkPhotos = workPhotosProvided ? workPhotos : parsePhotoArray(current.rows[0].work_photos);
const nameIsChanging = newName && newName !== currentName;

if (nameIsChanging) {
if (!canChangeName(nameChangedAt)) {
const daysLeft = daysUntilNameChange(nameChangedAt);
return res.status(400).json({
success: false,
message: `You can only change your name once every 30 days. You can change it again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
});
}
}

const finalName = nameIsChanging ? newName : currentName;
let query, params;

if (photo !== undefined && nameIsChanging) {
query = `UPDATE providers SET name=$1, name_changed_at=NOW(), phone=$2, whatsapp=$3, skill=$4, category=$5, state=$6, lga=$7, city=$8, bio=$9, work_photos=$10::jsonb, photo=$11 WHERE id=$12 RETURNING ${ownerProviderColumns}`;
params = [finalName, phone, whatsapp, skill, category, state, lga, city, bio, JSON.stringify(finalWorkPhotos), photo, auth.sub];
} else if (photo !== undefined && !nameIsChanging) {
query = `UPDATE providers SET phone=$1, whatsapp=$2, skill=$3, category=$4, state=$5, lga=$6, city=$7, bio=$8, work_photos=$9::jsonb, photo=$10 WHERE id=$11 RETURNING ${ownerProviderColumns}`;
params = [phone, whatsapp, skill, category, state, lga, city, bio, JSON.stringify(finalWorkPhotos), photo, auth.sub];
} else if (photo === undefined && nameIsChanging) {
query = `UPDATE providers SET name=$1, name_changed_at=NOW(), phone=$2, whatsapp=$3, skill=$4, category=$5, state=$6, lga=$7, city=$8, bio=$9, work_photos=$10::jsonb WHERE id=$11 RETURNING ${ownerProviderColumns}`;
params = [finalName, phone, whatsapp, skill, category, state, lga, city, bio, JSON.stringify(finalWorkPhotos), auth.sub];
} else {
query = `UPDATE providers SET phone=$1, whatsapp=$2, skill=$3, category=$4, state=$5, lga=$6, city=$7, bio=$8, work_photos=$9::jsonb WHERE id=$10 RETURNING ${ownerProviderColumns}`;
params = [phone, whatsapp, skill, category, state, lga, city, bio, JSON.stringify(finalWorkPhotos), auth.sub];
}

const result = await pool.query(query, params);
res.json({
success: true,
provider: enrichProvider(result.rows[0]),
message: nameIsChanging ? 'Profile updated. Your name has been changed - you can change it again in 30 days.' : 'Profile updated successfully.'
});
} catch (err) {
res.status(400).json({ success: false, message: err.message });
}
});

// ============================================================
// SEARCH PROVIDERS
// ============================================================
app.get('/api/search', async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
const category = sanitizeText(req.query.category);
const state = sanitizeText(req.query.state);
const lga = sanitizeText(req.query.lga);
const query = sanitizeText(req.query.query);
let sql = `SELECT ${publicProviderColumns} FROM providers WHERE verified = true AND is_active = true AND subscription_expiry > NOW()`;
const params = [];
let count = 1;
if (category) { sql += ` AND (category ILIKE $${count} OR skill ILIKE $${count})`; params.push(`%${category}%`); count++; }
if (state) { sql += ` AND state ILIKE $${count++}`; params.push(`%${state}%`); }
if (lga) { sql += ` AND lga ILIKE $${count++}`; params.push(`%${lga}%`); }
if (query) { sql += ` AND (name ILIKE $${count} OR skill ILIKE $${count} OR bio ILIKE $${count})`; params.push(`%${query}%`); count++; }
sql += ' ORDER BY verified DESC, plan DESC, rating DESC, created_at DESC';
try {
const result = await pool.query(sql, params);
try {
await pool.query(`INSERT INTO search_logs (category, state, query, results_count) VALUES ($1,$2,$3,$4)`, [category || null, state || null, query || null, result.rows.length]);
} catch (logErr) { console.error('Search log error:', logErr.message); }
res.json({ success: true, providers: result.rows.map(enrichProvider) });
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

// ============================================================
// GET PROVIDER BY ID
// ============================================================
app.get('/api/provider/:id', async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
const providerId = Number(req.params.id);
if (!Number.isInteger(providerId)) {
return res.status(400).json({ success: false, message: 'Invalid provider id.' });
}
try {
const providerResult = await pool.query(`UPDATE providers SET views = views + 1 WHERE id = $1 RETURNING ${publicProviderColumns}`, [providerId]);
if (providerResult.rows.length === 0) {
return res.status(404).json({ success: false, message: 'Provider not found.' });
}
const reviews = await pool.query(`SELECT id, provider_id, reviewer_name, rating, comment, date FROM reviews WHERE provider_id = $1 ORDER BY date DESC`, [providerId]);
res.json({ success: true, provider: enrichProvider(providerResult.rows[0]), reviews: reviews.rows });
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

// ============================================================
// ADD REVIEW
// ============================================================
app.post('/api/review',
  rateLimit(5, 60 * 60 * 1000, 'Too many reviews submitted. Please wait 1 hour before submitting again.'),
  async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
const providerId = Number(req.body.provider_id);
const reviewerName = sanitizeText(req.body.reviewer_name);
const rating = Number(req.body.rating);
const comment = sanitizeOptionalText(req.body.comment);
if (!Number.isInteger(providerId) || !reviewerName || !Number.isInteger(rating) || rating < 1 || rating > 5) {
return res.status(400).json({ success: false, message: 'Please submit a valid review.' });
}
try {
const providerCheck = await pool.query('SELECT id FROM providers WHERE id = $1', [providerId]);
if (providerCheck.rows.length === 0) {
return res.status(404).json({ success: false, message: 'Provider not found.' });
}
await pool.query('INSERT INTO reviews (provider_id, reviewer_name, rating, comment) VALUES ($1,$2,$3,$4)', [providerId, reviewerName, rating, comment]);
const ratingResult = await pool.query('SELECT AVG(rating) AS avg, COUNT(*) AS count FROM reviews WHERE provider_id = $1', [providerId]);
const avg = Number.parseFloat(ratingResult.rows[0].avg || 0).toFixed(2);
const count = Number(ratingResult.rows[0].count || 0);
await pool.query('UPDATE providers SET rating=$1, review_count=$2 WHERE id=$3', [avg, count, providerId]);
res.json({ success: true, message: 'Review added.' });
} catch (err) {
res.status(400).json({ success: false, message: err.message });
}
});

// ============================================================
// PAYMENT INITIALIZE
// ============================================================
app.post('/api/payment/initialize', async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
if (!korapaySecretKey || !korapayPublicKey) return sendKorapayUnavailable(res);
const auth = getProviderAuth(req);
if (!auth?.sub) return res.status(401).json({ success: false, message: 'Unauthorized' });
try {
const providerResult = await pool.query('SELECT id, name, email FROM providers WHERE id = $1', [auth.sub]);
if (!providerResult.rows.length) {
return res.status(404).json({ success: false, message: 'Provider not found.' });
}
const provider = providerResult.rows[0];
const paymentReference = buildPaymentReference(provider.id);
const { response, payload } = await callKorapay('/charges/initialize', {
method: 'POST',
body: JSON.stringify({
reference: paymentReference,
amount: SUBSCRIPTION_AMOUNT_NGN,
currency: 'NGN',
customer: { name: provider.name, email: provider.email },
narration: 'HireLocal subscription renewal',
merchant_bears_cost: true,
redirect_url: req.body.redirect_url || 'https://hirelocal.ng/dashboard.html',
metadata: { providerId: String(provider.id), plan: 'subscription-renewal' }
})
});
if (!response.ok || !payload.status) {
return res.status(400).json({ success: false, message: payload.message || 'Unable to initialize Korapay checkout.' });
}
await pool.query(`INSERT INTO payments (provider_id, reference, amount, status, raw_response) VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT (reference) DO UPDATE SET raw_response = EXCLUDED.raw_response`, [provider.id, paymentReference, SUBSCRIPTION_AMOUNT_NGN, 'initialized', JSON.stringify(payload.data || {})]);
res.json({
success: true,
payment: {
amount: SUBSCRIPTION_AMOUNT_NGN,
publicKey: korapayPublicKey,
merchantReference: paymentReference,
checkoutReference: payload.data?.reference || null,
checkoutUrl: payload.data?.checkout_url || null,
customer: { name: provider.name, email: provider.email }
}
});
} catch (error) {
console.error('Payment initialize error:', error.message);
res.status(500).json({ success: false, message: 'Unable to initialize payment right now.' });
}
});

// ============================================================
// PAYMENT VERIFY
// ============================================================
app.post('/api/payment/verify', async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
if (!korapaySecretKey || !korapayPublicKey) return sendKorapayUnavailable(res);
const auth = getProviderAuth(req);
if (!auth?.sub) return res.status(401).json({ success: false, message: 'Unauthorized' });
const transactionReference = sanitizeText(req.body.reference);
const paymentReference = sanitizeText(req.body.payment_reference);
if (!transactionReference) {
return res.status(400).json({ success: false, message: 'Payment reference is required.' });
}
try {
const paymentLookup = await pool.query(`SELECT * FROM payments WHERE provider_id=$1 AND (reference=$2 OR reference=$3) ORDER BY created_at DESC LIMIT 1`, [auth.sub, paymentReference || transactionReference, transactionReference]);
if (!paymentLookup.rows.length) {
return res.status(404).json({ success: false, message: 'Payment session not found.' });
}
const paymentRecord = paymentLookup.rows[0];
if (paymentRecord.status === 'success') {
const providerResult = await pool.query(`SELECT ${ownerProviderColumns} FROM providers WHERE id=$1`, [auth.sub]);
return res.json({ success: true, message: 'Payment was already verified.', provider: enrichProvider(providerResult.rows[0]) });
}
const { response, payload } = await callKorapay(`/charges/${encodeURIComponent(transactionReference)}`, { method: 'GET' });
if (!response.ok || !payload.status) {
await pool.query(`UPDATE payments SET transaction_reference=$1, status=$2, raw_response=$3::jsonb WHERE id=$4`, [transactionReference, 'failed', JSON.stringify(payload), paymentRecord.id]);
return res.status(400).json({ success: false, message: payload.message || 'Unable to verify payment.' });
}
const korapayData = payload.data || {};
const korapayStatus = String(korapayData.status || korapayData.transaction_status || '').toLowerCase();
const amountPaid = Number(korapayData.amount || 0);
const merchantReference = sanitizeText(korapayData.payment_reference) || paymentRecord.reference;
if (merchantReference !== paymentRecord.reference) {
return res.status(400).json({ success: false, message: 'Payment reference mismatch.' });
}
if (korapayStatus !== 'success' || amountPaid < SUBSCRIPTION_AMOUNT_NGN) {
await pool.query(`UPDATE payments SET transaction_reference=$1, status=$2, raw_response=$3::jsonb WHERE id=$4`, [transactionReference, 'failed', JSON.stringify(payload), paymentRecord.id]);
return res.status(400).json({ success: false, message: 'Payment is not yet successful.' });
}
await pool.query('BEGIN');
await pool.query(`UPDATE payments SET transaction_reference=$1, status='success', raw_response=$2::jsonb, paid_at=NOW() WHERE id=$3`, [transactionReference, JSON.stringify(payload), paymentRecord.id]);
const providerUpdate = await pool.query(`UPDATE providers SET subscription_expiry = GREATEST(COALESCE(subscription_expiry, NOW()), NOW()) + INTERVAL '${SUBSCRIPTION_RENEWAL_DAYS} days', is_active = true WHERE id=$1 RETURNING ${ownerProviderColumns}`, [auth.sub]);
await pool.query('COMMIT');
res.json({ success: true, message: 'Subscription renewed successfully.', provider: enrichProvider(providerUpdate.rows[0]) });
} catch (error) {
try { await pool.query('ROLLBACK'); } catch (e) { console.error('Rollback error:', e.message); }
console.error('Payment verify error:', error.message);
res.status(500).json({ success: false, message: 'Unable to verify payment right now.' });
}
});

// ============================================================
// ADMIN ENDPOINTS
// ============================================================
app.get('/api/admin/providers', async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
const adminAuth = getAdminAuth(req);
if (!adminAuth) return res.status(401).json({ success: false, message: 'Unauthorized' });
try {
const result = await pool.query(`SELECT ${adminProviderColumns} FROM providers ORDER BY created_at DESC`);
res.json({ success: true, providers: result.rows.map(enrichProvider) });
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

app.post('/api/admin/verify/:id', async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
const adminAuth = getAdminAuth(req);
const providerId = Number(req.params.id);
if (!adminAuth) return res.status(401).json({ success: false, message: 'Unauthorized' });
if (!Number.isInteger(providerId)) return res.status(400).json({ success: false, message: 'Invalid provider id.' });
try {
const result = await pool.query(`UPDATE providers SET verified=true WHERE id=$1 RETURNING ${adminProviderColumns}`, [providerId]);
if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Provider not found.' });
res.json({ success: true, message: 'Provider verified.', provider: enrichProvider(result.rows[0]) });
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});
app.post('/api/admin/extend/:id', async (req, res) => {
  if (!pool) return sendDatabaseUnavailable(res);
  const adminAuth = getAdminAuth(req);
  const providerId = Number(req.params.id);
  if (!adminAuth) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!Number.isInteger(providerId)) return res.status(400).json({ success: false, message: 'Invalid provider id.' });
  try {
    const result = await pool.query(
      `UPDATE providers SET 
        subscription_expiry = GREATEST(COALESCE(subscription_expiry, NOW()), NOW()) + INTERVAL '14 days',
        is_active = true
      WHERE id = $1 RETURNING ${adminProviderColumns}`,
      [providerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Provider not found.' });
    res.json({ success: true, message: 'Subscription extended by 14 days.', provider: enrichProvider(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/admin/searches', async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
const adminAuth = getAdminAuth(req);
if (!adminAuth) return res.status(401).json({ success: false, message: 'Unauthorized' });
try {
const result = await pool.query(`SELECT category, state, query, results_count, searched_at FROM search_logs ORDER BY searched_at DESC LIMIT 200`);
res.json({ success: true, searches: result.rows });
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

app.delete('/api/admin/delete/:id', async (req, res) => {
if (!pool) return sendDatabaseUnavailable(res);
const adminAuth = getAdminAuth(req);
if (!adminAuth) return res.status(401).json({ success: false, message: 'Unauthorized' });
const providerId = Number(req.params.id);
if (!Number.isInteger(providerId)) return res.status(400).json({ success: false, message: 'Invalid provider id.' });
try {
await pool.query('DELETE FROM reviews WHERE provider_id=$1', [providerId]);
await pool.query('DELETE FROM payments WHERE provider_id=$1', [providerId]);
const result = await pool.query('DELETE FROM providers WHERE id=$1 RETURNING id', [providerId]);
if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Provider not found.' });
res.json({ success: true, message: 'Provider deleted.' });
} catch (err) {
res.status(500).json({ success: false, message: err.message });
}
});

// ============================================================
// CONTACT FORM ENDPOINT
// ============================================================
app.post('/api/contact',
  rateLimit(5, 60 * 60 * 1000, 'Too many messages sent. Please wait 1 hour before trying again.'),
  async (req, res) => {
  const name = sanitizeText(req.body.name);
  const email = sanitizeText(req.body.email).toLowerCase();
  const message = sanitizeText(req.body.message);

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  if (!email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email.' });
  }
  if (message.length < 10) {
    return res.status(400).json({ success: false, message: 'Message is too short.' });
  }

  try {
    await sendEmail(
      'hirelocal.ng@gmail.com',
      `New Contact Message from ${name}`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0f766e;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 10px;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr>
        <p style="font-size: 12px; color: #777;">Sent from HireLocal contact form</p>
      </div>
      `
    );
    res.json({ success: true, message: 'Message sent successfully. We will get back to you soon.' });
  } catch (err) {
    console.error('Contact form error:', err.message);
    res.status(500).json({ success: false, message: 'Unable to send message. Please try again.' });
  }
});

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================
async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!isExpoPushToken(pushToken)) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: pushToken, sound: 'default', title, body, data }),
    });
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
}

// Store Expo push token for authenticated provider
app.post('/api/push-token', async (req, res) => {
  if (!pool) return sendDatabaseUnavailable(res);
  const auth = getProviderAuth(req);
  if (!auth?.sub) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const token = sanitizeText(req.body.token);
  if (!token) return res.status(400).json({ success: false, message: 'Push token is required.' });
  if (!isExpoPushToken(token)) {
    return res.status(400).json({ success: false, message: 'Invalid Expo push token.' });
  }
  try {
    await pool.query(
      `INSERT INTO push_tokens (provider_id, token) VALUES ($1, $2)
       ON CONFLICT (provider_id) DO UPDATE SET token = $2, created_at = NOW()`,
      [auth.sub, token]
    );
    res.json({ success: true, message: 'Push token registered.' });
  } catch (err) {
    console.error('Push token error:', err.message);
    res.status(500).json({ success: false, message: 'Unable to register push token.' });
  }
});

// Notify provider when their profile is viewed
app.post('/api/profile-view', async (req, res) => {
  if (!pool) return sendDatabaseUnavailable(res);
  const providerId = Number(req.body.provider_id);
  if (!Number.isInteger(providerId) || providerId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid provider_id is required.' });
  }
  try {
    const tokenResult = await pool.query(
      'SELECT token FROM push_tokens WHERE provider_id = $1',
      [providerId]
    );
    if (tokenResult.rows.length > 0) {
      await sendPushNotification(
        tokenResult.rows[0].token,
        'Profile Viewed',
        'Someone just viewed your HireLocal profile!',
        { type: 'profile_view', providerId }
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Profile view notification error:', err.message);
    res.status(500).json({ success: false, message: 'Unable to process profile view.' });
  }
});

// Notify provider when someone contacts them
app.post('/api/contact-event', async (req, res) => {
  if (!pool) return sendDatabaseUnavailable(res);
  const providerId = Number(req.body.provider_id);
  const contactType = sanitizeText(req.body.type);
  if (!Number.isInteger(providerId) || providerId <= 0) {
    return res.status(400).json({ success: false, message: 'Valid provider_id is required.' });
  }
  const allowed = ['call', 'whatsapp', 'email'];
  const type = allowed.includes(contactType) ? contactType : 'contact';
  const labels = { call: 'call', whatsapp: 'WhatsApp message', email: 'email' };
  const label = labels[type] || 'contact';
  try {
    const tokenResult = await pool.query(
      'SELECT token FROM push_tokens WHERE provider_id = $1',
      [providerId]
    );
    if (tokenResult.rows.length > 0) {
      await sendPushNotification(
        tokenResult.rows[0].token,
        'New Contact',
        `Someone wants to reach you via ${label} on HireLocal!`,
        { type: 'contact_event', contactType: type, providerId }
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Contact event notification error:', err.message);
    res.status(500).json({ success: false, message: 'Unable to process contact event.' });
  }
});

app.use('/api', (req, res) => {
res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

app.use((err, req, res, next) => {
console.error('Unhandled request error:', err.message);
if (res.headersSent) return next(err);
const status = err.status || err.statusCode || 500;
let message = 'Unexpected server error. Please try again.';
if (status === 413) {
message = 'The uploaded data is too large. Please reduce image sizes and try again.';
} else if (err.type === 'entity.parse.failed') {
message = 'Invalid request data. Please refresh the page and try again.';
} else if (status >= 400 && status < 500) {
message = err.message || message;
}
res.status(status).json({ success: false, message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
console.log(`HireLocal server running on port ${PORT}`);
if (!hasDatabase) console.log('Set DATABASE_URL in .env to enable all features.');
if (!korapaySecretKey || !korapayPublicKey) console.log('Set KORAPAY keys in .env to enable payments.');
});
