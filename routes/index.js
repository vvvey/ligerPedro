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

router.get('/', function(request, response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("SELECT * FROM user_history WHERE email = 'visal.s@ligercambodia.org'", function(err, result){
      done();
      if(err)
        {console.error(err); response.send("Error " + err);}
      else
        {response.render('home', {results: result.rows, user: request.user, env: env});}
    });
  });
});
//need to add the "ensureLoggedIn back"
router.get('/transfer', function(req, res) {
  res.render('transfer');
});

router.get('/transfer_success', ensureLoggedIn, function(req,res){
  res.render('transfer_success');
});


router.get('/transfer_confirmation', ensureLoggedIn, function(req,res){
  res.render('transfer_confirmation');
});

router.get('/exchange_confirmation', ensureLoggedIn, function(req,res){
  res.render('exchange_confirmation');
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

router.get('/user_histories', ensureLoggedIn , function (request, response) {
  pg.connect(process.env.PEDRO_db_URL, function(err,client,done) {
    client.query('SELECT * FROM exchange_logs', function(err, result) {
      done();
      if (err)
        { console.error(err); response.send("Error " + err); }
      else
        { 
          client.query('SELECT * FROM transfer_logs', function(err2, result2) {
            done();
              if (err2)
              { console.error(err2); response.send("Error " + err2); }
              else
              { response.render('user_history', {columns: result.fields, results:result.rows, columns2: result2.fields, results2: result2.rows}); }
          });
        }
    });
  });
});



router.get('/exchanging_system', function(req,res){
  res.render('exchanging_system');
});

router.get('/exchange', function(req,res){
  res.render('exchange', {user: req.user});
});

router.get('/transfer', function(req, res){
  res.render('transfer', {user: req.user});
});

router.get('/exchange', function(req, res){
  res.render('exchange', {user: req.user});
});

router.get('/login',
  function(req, res){
    res.render('login', {env: env});
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

router.post('/transfer_confirmation', function(req, res) {
   
    res.render('transfer_confirmation', {recipient: req.body.recipient, amount: req.body.amount});
});

router.post('/transfer_success', function(req, res) {

  res.render('transfer_success', {recipient: req.body.recipient, amount: req.body.amount});
});


module.exports = router;
