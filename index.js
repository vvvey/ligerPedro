var express = require('express');
var exphbs  = require('express-handlebars');
var app = express();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var Auth0Strategy = require('passport-auth0');



var hbs = exphbs.create({
  defaultLayout: 'main',
  // Specify helpers which are only registered on this instance.
  helpers: {
    ifCond: function(v1, v2, options) {
      if (v1 == v2) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
    dateFormat: function(date) {
      if(date == null) {
        return;
      }
      var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
      var offset = date.getTimezoneOffset() / 60;
      var hours = date.getHours();
      newDate.setHours(hours - offset);

      var seconds = Math.floor((new Date() - newDate) / 1000);
      
      var interval = Math.floor(seconds / 86400); //1 day equal 86400
      if (interval >= 2) { //more than two days
        function pad(s) { return (s < 10) ? '0' + s : s; }//change the 1 digit number to 2 digit numbers like 1 --> 01
        return [pad(newDate.getDate()), pad(newDate.getMonth()+1), newDate.getFullYear()].join('.');//date format seperated by .
      }
      
      function plural(number, text){
        if(number == 1){
          return number + ' ' + text + ' ago';
        } else {
          return number + ' ' + text + 's ago';
        }
      }
      
      if (interval >= 1) {
        return plural(interval,'day')
      }
      interval = Math.floor(seconds / 3600); //1 hour equal 3600
      if (interval >= 1) {
        return plural(interval, 'hour')
      }
      interval = Math.floor(seconds / 60); //1 minutes equal 60
      if (interval >= 1) {
        return plural(interval, 'minute')
      }
      return plural(Math.floor(seconds), "second");
    }
  }
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('port', (process.env.PORT || 5000));

// Configure Passport to use Auth0
var strategy = new Auth0Strategy({
    domain:       process.env.AUTH0_DOMAIN,
    clientID:     process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL:  process.env.AUTH0_CALLBACK_URL || 'http://localhost:5000/callback'
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


app.use(fake_account);
// This can be used to keep a smaller payload
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'shhhhhhhhh',
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 }
  
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/', routes);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.use(express.static('public/'));

app.use(function (req, res) {
  res.status(400);
  res.render('notFound', {user: req.user})
})
