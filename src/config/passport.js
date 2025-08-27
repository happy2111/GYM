const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findByGoogleId(profile.id);

    if (user) {
      return done(null, user);
    }

    // Check if user exists with the same email
    user = await User.findByEmail(profile.emails[0].value);

    if (user) {
      // Link Google account to existing user
      await User.updateById(user.id, {
        google_id: profile.id,
        is_verified: true
      });

      user = await User.findById(user.id);
      return done(null, user);
    }

    // Create new user
    const newUser = await User.create({
      name: profile.displayName,
      email: profile.emails[0].value,
      googleId: profile.id,
      role: 'client'
    });

    return done(null, newUser);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;