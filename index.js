var useFake      = false;
var express      = require('express');
var app          = express();
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var passport     = require('passport');
//var fn = require('fn');

var hbs = require('./lib/handlebar-helpers')

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('port', (process.env.PORT || 5000));


var fake_account = require('./fake')
var routes       = require('./routes/index');

if(useFake){
  app.use(fake_account);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
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
app.use(require('./lib/oauth2'));


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