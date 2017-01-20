var express = require('express');
var passport = require('passport');
var router = express.Router();
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');

var alert_message;

//PREPARE 
var lala = [];
var env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:5000/callback'
};

router.get('/login',
  function(req, res){
    if(req.user){
    res.render('notFound', {user:req.user});
    } else {
      if(req.session.returnTo) {
        alert_message = 'You need to login before you can access!'
      }
      res.render('login', {env: env, title: 'Login', message: alert_message});
    }
 });
router.get('/callback',
  passport.authenticate('auth0', {
    failureRedirect: '/logout'
  }),
  function(req, res) {
    res.redirect(req.session.returnTo || '/');
  });

router.get('*', function (req, res, next) {
  alert_message = null;
  req.session.returnTo = null;
  next();
})

router.get('/', function(request, response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("SELECT * FROM user_history WHERE email = 'visal.s@ligercambodia.org'", function(err, result){
      done();
      if(err)
        {console.error(err); response.send("Error " + err);}
      else
        {
          //console.log(request.user);
          response.render('home', {results: result.rows, user: request.user, env: env});}
    });
  });
});

router.get('/transfer', ensureLoggedIn, function(request, response) {
  pg.connect(process.env.PEDRO_db_URL, function (err, client, done) {
    client.query("PREPARE account_table(TEXT) AS \
     SELECT * FROM account WHERE email = $1;\
      EXECUTE account_table('" + request.user.emails[0].value + "');\
      DEALLOCATE PREPARE account_table", function(err, result){
      done();
      if(err) {
        console.error(err); response.send("Error " + err);
      }else{
        console.log(request.user);
        response.render('transfer', {user: request.user, title: 'Transfer', data: result.rows});
      }
    });
  });
});

router.get('/test', function(req, res) {
  res.render('module', {
    recipient : 'Visal Sao',
    amount : 30
  });
});

router.get('/transfer_success', ensureLoggedIn, function(req,res){
  res.render('transfer');
}); 

router.get('/transfer_confirmation', ensureLoggedIn, function(req,res){
  res.render('transfer');
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


router.get('/user_history', ensureLoggedIn , function (request, response) {
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
              { response.render('user_history', {columns: result.fields, results:result.rows, columns2: result2.fields, results2: result2.rows, title: 'History'}); }
          });
        }
    });
  });
});

/*
router.get('/history', ensureLoggedIn,function(request, response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("PREPARE history_query1 (TEXT) AS\
      SELECT * FROM transfer_logs WHERE sender = $1;\
      EXECUTE history_query1 ('" + request.user.emails[0].value + "');\
      DEALLOCATE PREPARE history_query1", function(err1, result1) {
        done();
        if(err1){
          console.error(err1); 
          response.send("Error " + err1);
        }else{
          client.query("SELECT * FROM exchange_logs WHERE exchanging_types = 'Pedro'", function(err2, result2) {
              done();
                if(err2){
                  console.error(err2);
                  response.send("Error " + err2);
                } else{
                  console.log(request.user);
                  response.render('history', {columns1: result1.fields, data1: result1.rows, columns2: result2.fields, data2: result2.rows});
                }
          });
        }
    });
  });
});*/

router.get('/history', ensureLoggedIn,function(request, response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("PREPARE history_query1 (TEXT) AS\
      SELECT * FROM transfer_logs WHERE sender = $1;\
      EXECUTE history_query1 ('"+ request.user.emails[0].value +"');\
      DEALLOCATE PREPARE history_query1", function(err1, result1) {
        done();
        if(err1){
          console.error(err1); 
          response.send("Error " + err1);
        }else{
          client.query("PREPARE history_query2 (TEXT) AS\
      SELECT * FROM exchange_list WHERE email = $1;\
      EXECUTE history_query2 ('"+ request.user.emails[0].value +"');\
      DEALLOCATE PREPARE history_query2", function(err2, result2) {
        done();
        if(err2){
          console.error(err2);
          response.send("Error " + err2);
        }else{
          console.log(result1);
          response.render('history', {columns1: result1.fields, data1: result1.rows, columns2: result2.fields, data2: result2.rows, user:request.user});
        }
      });
      }
    });
  });
});

router.get('/exchanging_system', function(req,res){
  res.render('exchanging_system');
});

router.get('/about_us', function(req,res){
  res.render('about_us');
});

router.get('/exchange', function(req,res){
  res.render('exchange', {user: req.user});
});

router.post('/exchange_confirmation', function(req,res){
  res.render('exchange', {amount: req.body.amount,
                          result: req.body.result,
                          reason: req.body.reason,
                          exchange_type: req.body.exchange_type,
                          user: req.user});
});

router.get('/exchange_list', function(req,res){
  var email = req.user.emails[0].value
  var userName = req.user._json.name;

  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("SELECT * FROM account \
                  WHERE email='"+ email +"'", function(err, result) {
      done();
      if(err){
        console.error(err); 
        res.send("Error " + err);
      }else{
        if(result.rows[0].role == 'RE'){
          res.render('exchange_list', {user: req.user});
        } else {
          res.render('notFound');
        }
      }
    });
  })
});

router.get('/setting', ensureLoggedIn, function(req, res){
  res.render('setting', {user: req.user});
});

router.get('/exchange', function(req, res){
  res.render('exchange', {user: req.user, title: 'Exchange'});
});

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

router.post('/transfer_confirmation', function(req, res) {
    pg.connect(process.env.PEDRO_db_URL, function (err,client,done) {
    client.query("SELECT budget FROM account where email = '" + req.user.emails[0].value + "'", function(err,result) { 
      done();
      if (err)
        { 
          console.error(err); res.send("Error" + err); 
        }
      else 
      { 
        res.render('transfer_confirmation', {budget: result.rows, recipient: req.body.recipient, amount: req.body.amount}); 
      }
    })
  }) 
});

router.post('/transfer_success', function(req, res) {
  res.render('transfer_success', {recipient: req.body.recipient, amount: req.body.amount});
});

router.post('/exchange_confirmation', function(req, res) {
  res.render('exchange_confirmation', {amount: req.body.amount, result: req.body.result, reason: req.body.reason});
});


module.exports = router;
