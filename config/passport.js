const GoogleStrategy = require('passport-google-oauth20').Strategy;

module.exports = function configurePassport(passport, pool) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    if (!pool) return done(new Error('Database not configured'));
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email returned from Google'));

      const googleId = profile.id;
      const name = profile.displayName || email.split('@')[0];
      const photo = profile.photos?.[0]?.value || null;

      // Look up by google_id first, then fall back to email
      let result = await pool.query(
        'SELECT * FROM providers WHERE google_id = $1', [googleId]
      );
      if (result.rows.length === 0) {
        result = await pool.query(
          'SELECT * FROM providers WHERE email = $1', [email.toLowerCase()]
        );
      }

      if (result.rows.length > 0) {
        const provider = result.rows[0];
        // Link google_id to an existing email-based account on first Google login
        if (!provider.google_id) {
          await pool.query(
            'UPDATE providers SET google_id = $1 WHERE id = $2',
            [googleId, provider.id]
          );
        }
        return done(null, provider);
      }

      // No existing account — create one
      const newResult = await pool.query(
        `INSERT INTO providers (name, email, photo, google_id, plan, subscription_expiry, is_active)
         VALUES ($1, $2, $3, $4, 'free', NOW() + INTERVAL '7 days', true)
         RETURNING *`,
        [name, email.toLowerCase(), photo, googleId]
      );
      return done(null, newResult.rows[0]);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    if (!pool) return done(null, null);
    try {
      const result = await pool.query('SELECT * FROM providers WHERE id = $1', [id]);
      done(null, result.rows[0] || null);
    } catch (err) {
      done(err);
    }
  });
};
