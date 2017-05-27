var useFake = false;
var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var Auth0Strategy = require('passport-auth0');
//var fn = require('fn');

var hbs = require('./lib/handlebar-helpers')

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('port', (process.env.PORT || 5000));

// Configure Passport to use Auth0
var strategy = new Auth0Strategy({
  domain: process.env.AUTH0_DOMAIN,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  callbackURL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:5000/callback'
}, function(accessToken, refreshToken, extraParams, profile, done) {
  // accessToken is the token to call Auth0 API (not needed in the most cases)
  // extraParams.id_token has the JSON Web Token
  // profile has all the information from the user
  return done(null, profile);
});


passport.use(strategy);
var fake_account = require('./fake')
var routes = require('./routes/index');
var user = require('./routes/user');

if(useFake){
  app.use(fake_account);
}
// This can be used to keep a smaller payload
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(session({
  secret: 'shhhhhhhhh',
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7
  }

}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/', routes);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.use(express.static('public/'));

app.use(function(req, res) {
  res.status(400);
  res.render('notFound', {
    user: req.user
  })
})
