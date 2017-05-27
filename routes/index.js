var express = require('express');
var passport = require('passport');
var router = express.Router();
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');
const Pool = require('pg-pool');
const url = require('url')

var alert_message;

var env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:5000/callback'
};

const params = url.parse(process.env.PEDRO_db_URL);
const auth = params.auth.split(':');

const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  ssl: true
};

const pool = new Pool(config)

var apartments = require('./apartment');
var exchange = require('./exchange');
var transfer = require('./transfer');
var keeper = require('./keeper');
apartments.set(router, pool);
exchange.set(router, pool);
transfer.set(router, pool);
keeper.set(router, pool);

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
});

router.get('/', function(req, res){
  // necessary to get the role of the user to find out what the menu should disp
  // if we store the user's role in cookies, no longer necessary to query the database
  if(req.user){
    pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
      client.query("PREPARE account_table(TEXT) AS \
       SELECT * FROM account WHERE email = $1;\
        EXECUTE account_table('" + req.user.emails[0].value + "');\
        DEALLOCATE PREPARE account_table", function(err, result){
        done();
        if(err){
          console.error(err);
        }else{
          res.render('home', {user: req.user, data: result.rows, env:env});
        }
      });
    });
  }
  else{
    res.render('home', {user: req.user, env: env});
  }
});





router.get('/test', function(req, res) {
  res.render('module', {
    recipient : 'Visal Sao',
    amount : 30
  });
});

router.get('/tutorials', ensureLoggedIn, function(req,res) {
  res.render('tutorials');
});


router.get('/contact_us', function(req,res){
  res.render('contact_us', {user:req.user, env: env});
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

router.get('/history', ensureLoggedIn,function(request, response){
  var userEmail = request.user._json.email;
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("PREPARE history_query1 (TEXT) AS\
    SELECT * FROM transfer_logs WHERE sender = $1 OR recipient = $1 ORDER BY date DESC;\
    EXECUTE history_query1 ('"+ userEmail +"');\
    DEALLOCATE PREPARE history_query1", function(transferErr, transferHis) {
      done();
      if(transferErr){
        console.error(transferErr); 
        response.send("Error " + transferErr);
      } else {
        client.query("PREPARE history_query2 (TEXT) AS\
        SELECT * FROM exchange_list WHERE email = $1 ORDER BY timecreated DESC;\
        EXECUTE history_query2 ('"+ userEmail +"');\
        DEALLOCATE PREPARE history_query2", function(exchangeErr, exchangeHis) {
          done();
          if(exchangeErr) {
            console.error(exchangeErr);
            response.send("Error " + exchangeErr);
          } else {
            client.query("SELECT * FROM account WHERE email = ('" + userEmail + "')", function(accountErr, accountResult){
              done();
              if(accountErr){
                console.error(accountErr); 
                response.send("Error " + accountErr);
              }else{
                for(var count = 0; count < transferHis.rows.length; count++){
                  transferHis.rows[count].userEmail = userEmail;
                  transferHis.rows[count]
                }
                //console.log(transferHis);
                response.render('history', {data: accountResult.rows, transferHis: transferHis.rows, exchangeHis: exchangeHis.rows, accountInfo: accountResult.rows, user:request.user, userEmail:request.user.emails[0].value});
              }
            });
          }
        });
      }
    });
  });
});

router.get('/about_us', function(req,res){
  // necessary to get the role of the user to find out what the menu should disp
  // if we store the user's role in cookies, no longer necessary to query the database
  if(req.user){
    pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
      client.query("PREPARE account_table(TEXT) AS \
       SELECT * FROM account WHERE email = $1;\
        EXECUTE account_table('" + req.user.emails[0].value + "');\
        DEALLOCATE PREPARE account_table", function(err, result){
        done();
        if(err){
          console.error(err);
        }else{
          res.render('about_us', {user: req.user, data: result.rows, env:env});
        }
      });
    });
  }
  else{
    res.render('about_us', {user: req.user, env: env});
  }
});

router.get('/tutorial', function(req,res){
  // necessary to get the role of the user to find out what the menu should disp
  // if we store the user's role in cookies, no longer necessary to query the database
  if(req.user){
    pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
      client.query("PREPARE account_table(TEXT) AS \
       SELECT * FROM account WHERE email = $1;\
        EXECUTE account_table('" + req.user.emails[0].value + "');\
        DEALLOCATE PREPARE account_table", function(err, result){
        done();
        if(err){
          console.error(err);
        }else{
          res.render('tutorial', {user: req.user, data: result.rows, env:env});
        }
      });
    });
  }
  else{
    res.render('tutorial', {user: req.user, env: env});
  }
});

router.get('/settings', ensureLoggedIn, function(req, res){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
    client.query("PREPARE account_table(TEXT) AS \
     SELECT * FROM account WHERE email = $1;\
      EXECUTE account_table('" + req.user.emails[0].value + "');\
      DEALLOCATE PREPARE account_table", function(err, result){
      done();
      if(err){
        console.error(err);
      }else{
        res.render('settings', {user: req.user, data: result.rows});
      }
    });
  });
});

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

router.post('/db', function(request, response){
  var text = request.body.transfer;
  response.render('db', {transfer:text});
});

function sqlEscape(text){
  return text.replace(/'/g , "''");
}


module.exports = router;