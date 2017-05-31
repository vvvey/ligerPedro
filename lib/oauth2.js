const express = require('express');

// [START setup]
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
var pool = require('./pool-config');

function userRole(email) {
  pool.query("SELECT * from account WHERE email = $1", [email], function(error, result){
    return result.rows[0].role;
  })
}

function extractProfile (profile) {
  var imageUrl = '';
  if (profile.photos && profile.photos.length) {
    imageUrl = profile.photos[0].value;
  }
  return {
    id: profile.id,
    displayName: profile.displayName,
    image: imageUrl,
    email: profile.emails[0].value,
    fullName: profile._json.name.givenName + " " + profile._json.name.familyName
  };
}

// Configure the Google strategy for use by Passport.js.
//
// OAuth 2-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Google API on the user's behalf,
// along with the user's profile. The function must invoke `cb` with a user
// object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new GoogleStrategy({
  clientID: process.env.OAUTH2_CLIENT_ID,
  clientSecret: process.env.OAUTH2_CLIENT_SECRET,
  callbackURL: process.env.OAUTH2_CALLBACK || 'http://localhost:5000/auth/google/callback'
}, (accessToken, refreshToken, profile, cb) => {
  // Extract the minimal profile information we need from the profile object
  // provided by Google
  if (profile.emails[0].value.split('@')[1] == 'ligercambodia.org') {
    cb(null, extractProfile(profile));
  } else {
    cb(new Error('Invalid domain'))
  }
}));

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((obj, cb) => {
  cb(null, obj);
});
// [END setup]

const router = express.Router();

var vuthy = function (req, res, next) {
    var temp = req.session.passport; // {user: 1}
    req.session.role = "senior_student";
    next();
};

// Begins the authorization flow. The user will be redirected to Google where
// they can authorize the application to have access to their basic profile
// information. Upon approval the user is redirected to `/auth/google/callback`.
// If the `return` query parameter is specified when sending a user to this URL
// then they will be redirected to that URL when the flow is finished.
// [START authorize]
router.get(
  // Login url
  '/auth/google/login',

  // Save the url of the user's current page so the app can redirect back to
  // it after authorization
  (req, res, next) => {
    if (req.query.return) {
      req.session.returnTo = req.query.return;
    }
    next();
  },

  // Start OAuth 2 flow using Passport.js

  (req, res, next) => {
    console.log(req.session)
    next();
  } ,
  passport.authenticate('google', {
    //hd: 'ligercambodia.org', //hd = host domain 
    scope: ['email', 'profile']
  })   
);
// [END authorize]

// [START callback]
router.get(
  // OAuth 2 callback url. Use this url to configure your OAuth client in the
  // Google Developers console
  '/auth/google/callback',

  // Finish OAuth 2 flow using Passport.js
  passport.authenticate('google'),

  // Redirect back to the original page, if any
  (req, res, next) => {
    pool.query("SELECT * from account WHERE email = $1", [req.user.email], function(error, result){
      var userRole = result.rows[0].role;
      req.session.passport.user.role = userRole
      next()
    })
  },

  (req, res) => {
    const redirect = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirect);
  }
);
// [END callback]

// Deletes the user's credentials and profile from the session.
// This does not revoke any active tokens.
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;