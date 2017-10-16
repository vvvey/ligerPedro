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
var utilities       = require('./utilities')

apartments.set(router, pool);
exchange.set(router, pool);
transfer.set(router, pool);
keeper.set(router, pool);
admin.set(router, pool);
catering.set(router, pool);
residence.set(router, pool);
maintenance.set(router, pool);
utilities.set(router, pool);
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


router.get('/history_personal', async function(request, response){
  if(request.user){
    var email = request.user.email;
    
    var getTransfer = await pool.query("SELECT * FROM transfer_logs WHERE apartment IS NULL AND (sender = $1 OR recipient = $1) ORDER BY date DESC;", [email]);
    
    var getExchange = await pool.query("SELECT * FROM exchange_list WHERE email = $1 ORDER BY timecreated DESC;", [email]);

    response.render('personal/history_personal', {transferData: getTransfer.rows, exchangeData: getExchange.rows, email: email});
  } else {
    response.redirect('/login');
  }
});

function sqlEscape(text) {
  return text.replace(/'/g, "''");
}


module.exports = router;