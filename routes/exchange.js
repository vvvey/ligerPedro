var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var moment = require('moment-timezone');
var Validator = require('../lib/validator')

module.exports.set = function(router, pool) {

  router.post('/exchange_confirmation', function(req, res) {
    res.render('exchange_confirmation', {
      amount: req.body.amount,
      result: req.body.result,
      reason: req.body.reason
    });
  });

  router.get('/exchange_approving', ensureLoggedIn, function(req, res) {
    res.render('exchange');
  });

  router.get('/exchanging_system', function(req, res) {
    res.render('exchanging_system');
  });

 
  router.get('/exchange', ensureLoggedIn, (req, res) => {
    var selectUserInfo = {
      text: 'SELECT * FROM account WHERE email = $1;',
      values: [req.user.email]
    }
    var selectPendingBudget = {
      text: "SELECT COALESCE(SUM(amount), 0) AS sum FROM exchange_list WHERE pending = true AND type = 'pedro-dollar' AND email = $1;",
      values: [req.user.email]
    }

    pool.query(selectUserInfo, (userErr, userResult) => {
      if (userErr) {console.log("Here"); res.send(userErr)}
      else {
        pool.query(selectPendingBudget, (pendingErr, pendingResult) => {
          if (pendingErr) {
            console.log("This");
            res.send(pendingErr)
          } else {
            var budget = userResult.rows[0].budget;
            var pendingBudget = pendingResult.rows[0].sum;
            var validBudget = parseFloat(budget) - parseFloat(pendingBudget)
            res.render('exchanging', {user: req.user, data: userResult.rows[0].role ,budget: budget, pendingBudget: pendingBudget, validBudget: validBudget})
          }
        })
      }
    })
    
  })

  

  router.post('/exchange_approving', Validator.exchange, function(req, res) {
    var exchangeLog = { 
      timeCreated: Date.now(),
      person: req.user.fullName,
      email: req.user.email,
      type: req.body.exchangeType,
      amount: req.body.amount,
      result: req.body.result,
      reason: req.body.reason,
      re: null,
      approved: null,
      timeApproved: null,
      exchanged: null,
      timeExchanged: null,
      apptDate: req.body.apptDate,
      apptTime: req.body.apptTime
    }

    var apptDate = exchangeLog.apptDate;
    var apptTime = 16;

    var apptDate = moment(apptDate, 'DD MMMM, YYYY').tz("Asia/Bangkok");
    apptDate.hour(apptTime)
    apptDate = moment.utc(apptDate);
    apptDate = apptDate.format("YYYY-MM-DD HH:mm:ss");

    console.log("SQL DAte is: " + apptDate);

    const getApartment = {
      text: "SELECT * FROM account WHERE email = $1;",
      values: [exchangeLog.email]
    }
    pool.query(getApartment, function(apartmentErr, apartmentResult){
      if(apartmentErr){console.log(apartmentErr);}
      else{
        var apartment = apartmentResult.rows[0].apartment;
        const insertData = {
          text: "INSERT INTO exchange_list (timeCreated, person, email, type, amount, result, reason, apptdate, apartment)\
          VALUES (CURRENT_TIMESTAMP(2), $1, $2, $3, $4::float8::numeric::money, $5::float8::numeric::money, $6, $7, $8);",
          values: [exchangeLog.person, exchangeLog.email, exchangeLog.type, exchangeLog.amount, exchangeLog.result, exchangeLog.reason, apptDate, apartment]
        };
        pool.query(insertData, function(insertErr, insertResult) {
          if (insertErr) {
            console.log(insertErr);
          } else {
            pool.query("SELECT role FROM account WHERE email = $1;", [req.user.email], function(err, result1) {
              if (err) {
                console.log('Error: ' + err);
              } else {
                res.send("Success!")
              }
            });
          }
        });
      }
    });
  });

  router.post('/exchange_list/approve/:id', ensureLoggedIn, function(req, res, next) {
    if (req.user.role != 're') {
      return res.status(500).send("Sorry you must be a RE!")
    }
    var exchangeReq_id = req.params.id;
    console.log("Exhnage id: " + exchangeReq_id);
    if (exchangeReq_id === undefined) {
      //console.log(exchangeReq_id)
      res.redirect('/exchange_list');
    }
    var status = req.body.status;
    var re = req.user.displayName;

    pool.query("UPDATE exchange_list SET re = $1, approved = $2, timeapproved = CURRENT_TIMESTAMP(2) WHERE id = $3;", [re, status, exchangeReq_id], function(err, result) {
      if (err) {
        console.log(err)
      } else {
        res.redirect('/exchange_list')
      }
    })
  })

  router.get('/exchange_list', ensureLoggedIn,function(req, res) {
    var email = req.user.email;
    var userName = req.user.fullName;

    pool.query("SELECT * FROM account WHERE email = $1;", [email], function(err, result) {
      if (err) {
        console.error(err);
        res.send("Error " + err);
      } else {
        if (result.rows[0].role == 're' || result.rows[0].role == 'admin') {
          pool.query("SELECT * FROM exchange_list WHERE type = 'pedro-dollar'\
	  					ORDER BY timecreated DESC;", function(err2, result2) {
            if (err2) {
              console.log(err2)
            } else {
              res.render('exchange_list', {
                exchangeData: result2.rows,
              });
            }
          })
        } else {
          res.render('notFound');
        }
      }
    });
  })
}
