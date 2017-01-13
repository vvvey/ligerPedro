var express = require('express');
var passport = require('passport');
var router = express.Router();
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');

var env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:5000/callback'
};

router.get('/', ensureLoggedIn, function(request, response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    //client.query("SELECT * FROM user_history WHERE email = 'visal.s@ligercambodia.org'", function(err, result){
    client.query("SELECT * FROM user_history WHERE email = 'visal.s@ligercambodia.org'", function(err, result){
      done();
      if(err)
        {console.error(err); response.send("Error " + err);}
      else
      	console.log(request.user)
        {response.render('nav', {results: result.rows, user: request.user});}
    });
  });
});

router.get('/home', function (req, res) {
    res.render('home');
});


router.get('/about_us', function(req,res){
	res.render('about_us');
});

router.get('/login',
  function(req, res){
    res.render('login', {env: env});
  });

router.get('/db', ensureLoggedIn, function (request, response) {
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
    client.query('SELECT * FROM account', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.render('db', {columns: result.fields, results: result.rows}); }
    });
  });
});

router.get('/exchanging_system', function(req,res){
  res.render('exchanging_system');
});

router.get('/profile', function(request, response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    //client.query("SELECT * FROM user_history WHERE email = 'visal.s@ligercambodia.org'", function(err, result){
    client.query("SELECT * FROM user_history WHERE email = 'visal.s@ligercambodia.org'", function(err, result){
      done();
      if(err)
        {console.error(err); response.send("Error " + err);}
      else
        {response.render('nav', {results: result.rows});}
    });
  });
});

router.get('/exchange', function(req,res){
  res.render('exchange');

});

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

router.get('/callback',
  passport.authenticate('auth0', {
    failureRedirect: '/logout'
  }),
  function(req, res) {
    res.redirect('/');
  });

module.exports = router;
