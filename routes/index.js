var express        = require('express');
var passport       = require('passport');
const Router = require('express-promise-router')
const router = new Router()
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pool           = require('../lib/pool-config');
var apartments     = require('./apartment');
var exchange       = require('./exchange');
var transfer       = require('./transfer');
var keeper         = require('./keeper');
var admin          = require('./admin');
var catering       = require('./catering')
var residence      = require('./residence')
var maintenance    = require('./maintenance')

apartments.set(router, pool);
exchange.set(router, pool);
transfer.set(router, pool);
keeper.set(router, pool);
admin.set(router, pool);
catering.set(router, pool);
residence.set(router, pool);
maintenance.set(router, pool);
/*router.get('/', function(req, res) {
  // necessary to get the role of the user to find out what the menu should disp
  // if we store the user's role in cookies, no longer necessary to query the database
  console.log(req.session)
  if (req.user) {
    pool.query("SELECT * FROM account WHERE email = $1;", [req.user.email], function(err, result) {
      if (err) {
        console.error(err);
      } else {
        res.render('home', {
          user: req.user,
          data: result.rows
        });
      }
    });
  } else {
    res.render('home', {
      user: req.user
    });
  }
});*/

router.get("/", function(request, response){
    if(request.user){
      var email = request.user.email;
      const getAccount = {
        text: "SELECT * FROM account WHERE email = $1;",
        values: [email]
      };
      
      pool.query(getAccount, function(accErr, accresult) {
        if(accErr){console.log(accErr);}
        else{
          response.render('mainPage', {user: request.user, data: accresult.rows[0].role});
        }
      });
    }else{
      response.render('mainPage');
    }
});

router.get('/login',
  function(req, res) {
    if (req.user) {
      res.render('notFound', {
        user: req.user
      });
    } else {
      if (req.session.returnTo) {
        var alert_message = 'You need to login before you can access!'
      }
      res.render('login', {
        title: 'Login',
        message: alert_message
      });
    }
  });


router.get('/tutorials', ensureLoggedIn, function(req, res) {
  res.render('tutorials');
});


router.get('/contact_us', function(req, res) {
  res.render('contact_us', {
    user: req.user,
    env: env
  });
});

router.get('/history', ensureLoggedIn, function(request, response) {
  var userEmail = request.user.email;

  pool.query("SELECT * FROM transfer_logs WHERE sender = $1 OR recipient = $1 ORDER BY date DESC;", [userEmail], function(transferErr, transferHis) {
    if (transferErr) {
      console.error(transferErr);
      response.send("Error " + transferErr);
    } else {
      pool.query("SELECT * FROM exchange_list WHERE email = $1 ORDER BY timecreated DESC;", [userEmail], function(exchangeErr, exchangeHis) {
        if (exchangeErr) {
          console.error(exchangeErr);
          response.send("Error " + exchangeErr);
        } else {
          pool.query("SELECT * FROM account WHERE email = $1;", [userEmail], function(accountErr, accountResult) {
            if (accountErr) {
              response.send("Error " + accountErr);
            } else {
              for (var count = 0; count < transferHis.rows.length; count++) {
                transferHis.rows[count].userEmail = userEmail;
                transferHis.rows[count]
              }
              response.render('history', {
                data: accountResult.rows,
                transferHis: transferHis.rows,
                exchangeHis: exchangeHis.rows,
                accountInfo: accountResult.rows,
                user: request.user,
                userEmail: request.user.email
              });
            }
          });
        }
      });
    }
  });
});

router.get('/history_personal', async function(request, response){
  if(request.user){
    var email = request.user.email;
    
    var getTransfer = await pool.query("SELECT * FROM transfer_logs WHERE apartment IS NULL AND (sender = $1 OR recipient = $1) ORDER BY date DESC;", [email]);
    
    var getExchange = await pool.query("SELECT * FROM exchange_list WHERE email = $1 ORDER BY timecreated DESC;", [email]);

    response.render('history_personal', {transferData: getTransfer.rows, exchangeData: getExchange.rows, email: email});
  } else {
    response.redirect('/login');
  }
});


router.get('/about_us', function(req, res) {
  // necessary to get the role of the user to find out what the menu should disp
  // if we store the user's role in cookies, no longer necessary to query the database
  if (req.user) {
    pool.query("SELECT * FROM account WHERE email = $1;",[req.user.email], function(err, result) {
      if (err) {
        console.error(err);
      } else {
        res.render('about_us', {
          user: req.user,
          data: result.rows
        });
      }
    });
  } else {
    res.render('about_us', {
      user: req.user
    });
  }
});

router.get('/tutorial', function(req, res) {
  // necessary to get the role of the user to find out what the menu should disp
  // if we store the user's role in cookies, no longer necessary to query the database
  if (req.user) {
    pool.query("SELECT * FROM account WHERE email = $1;", [req.user.email], function(err, result) {
      if (err) {
        console.error(err);
      } else {
        res.render('tutorial', {
          user: req.user,
          data: result.rows
        });
      }
    });
  } else {
    res.render('tutorial', {
      user: req.user
    });
  }
});

router.get('/settings', ensureLoggedIn, function(req, res) {
  pool.query("SELECT * FROM account WHERE email = $1;", [req.user.email], function(err, result) {
    if (err) {
      console.error(err);
    } else {
      res.render('settings', {
        user: req.user,
        data: result.rows
      });
    }
  });
});

router.post('/db', function(request, response) {
  var text = request.body.transfer;
  response.render('db', {
    transfer: text
  });
});

function sqlEscape(text) {
  return text.replace(/'/g, "''");
}


module.exports = router;