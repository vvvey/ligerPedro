var express = require('express');
var passport = require('passport');
var router = express.Router();
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');
//PREPARE 
var env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:5000/callback'
};

//Handlebars.registerPartial('myPartial', 'users');

router.get('/', function(request, response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("SELECT * FROM user_history WHERE email = 'visal.s@ligercambodia.org'", function(err, result){
      done();
      if(err)
        {console.error(err); response.send("Error " + err);}
      else
        {
          console.log(request.user);
          response.render('home', {results: result.rows, user: request.user, env: env});}
    });
  });
});

router.get('/transfer', ensureLoggedIn, function(req, res) {
  res.render('transfer', {user: req.user, title: 'Transfer'});
});

router.get('/test', function(req, res) {
  res.render('module', {
    recipient : 'Visal Sao',
    amount : 30
  });
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

router.get('/history', ensureLoggedIn , function (request, response) {
  pg.connect(process.env.PEDRO_db_URL, function(err,client,done) {
    client.query('SELECT * FROM exchange_logs where ', function(err, result) {
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
              { response.render('user_history', {columns: result.fields, results:result.rows, columns2: result2.fields, results2: result2.rows, title: 'History'}); }
          });
        }
    });
  });
});
var lala = []

router.get('/history', ensureLoggedIn,function(request, response){
  lala = [request.user.emails[0].value];
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("PREPARE history_query (text) AS \
      SELECT * FROM user_history WHERE email = $1;\
      EXECUTE history_query ('" + lala + "')", function(err, result) {
      done();
      if(err){
        console.error(err); 
        response.send("Error " + err);
      }else{
        response.render('history', {columns: result.fields, data: result.rows});
      }
    });
  });
});

router.get('/exchanging_system', function(req,res){
  res.render('exchanging_system');
});

router.get('/exchange', function(req,res){
<<<<<<< HEAD
  res.render('exchange', {user: req.user});
});

router.get('/transfer', function(req, res){
  res.render('transfer', {user: req.user});
});

router.get('/setting', ensureLoggedIn, function(req, res){
  res.render('setting', {user: req.user});
});

router.get('/exchange', function(req, res){
  res.render('exchange', {user: req.user});
=======
  res.render('exchange', {user: req.user, title: 'Exchange'});
>>>>>>> f11cdf78cd61afe59fdb6ba5854480ab901676ed
});

router.get('/login',
  function(req, res){
  	if(req.user){
		  res.render('notFound');
  	} else {
  		res.render('login', {env: env, title: 'Login'});
  	}
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
