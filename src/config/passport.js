const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const getExtraGoogleData = require('./GetExtraGoogleData');


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { birthday, gender } = await getExtraGoogleData(accessToken);
        // 1. Проверяем по Google ID
        let user = await User.findByGoogleId(profile.id);
        if (user) {
          return done(null, user);
        }

        // 2. Проверяем по email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findByEmail(email);
          if (user) {
            await User.updateById(user.id, {
              google_id: profile.id,
              is_verified: true,
            });
            user = await User.findById(user.id);
            return done(null, user);
          }
        }

        // 3. Создаём нового пользователя
        const newUser = await User.create({
          name: profile.displayName,
          email,
          googleId: profile.id,
          role: 'client',
          gender: gender,
          dateOfBirth: birthday,
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
