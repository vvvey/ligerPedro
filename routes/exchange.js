var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');
var moment = require('moment-timezone');
var Async = require('async-next'); 
var async = new Async(); 

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

  // router.get('/exchange', ensureLoggedIn, function(request, response) {
  //   var user;
  //   var current_budget;
  //   var pending_budget = 0;
  //   var valid_budget;
   
  //   pool.query("SELECT * FROM account WHERE email = $1;", [request.user.email], function(err, result) {
  //     if (err) {
  //       console.error(err);
  //     } else {
  //       user = request.user;
  //       current_budget = result.rows[0].budget;
  //       //console.log(current_budget)
  //       pool.query("SELECT sum(amount) FROM exchange_list WHERE email = $1 AND pending = true AND type = 'Pedro to Dollar';", [request.user.email], function(err1, result1) {
  //         if (err1) {
  //           console.error(err);
  //         } else {
  //         	console.log(result1)
  //         	if(result1.rows.sum == null) {
  //         		pending_budget = 0;
  //         	} else {
  //         		pending_budget = parseFloat(result1.rows[0].sum);
  //         	}

  //           response.render('exchange', {
  //             user: user,
  //             title: 'Exchange',
  //             budget: current_budget,
  //             pending_budget: pending_budget,
  //             valid_exchange_budget: current_budget - pending_budget
  //           });
  //         }
  //       });
  //     }
  //   });
  // });

  router.get('/exchange', (req, res) => {
    var selectUserInfo = {
      text: 'SELECT * FROM account WHERE email = $1;',
      values: [req.user.email]
    }
    var selectPendingBudget = {
      text: "SELECT sum(amount) FROM exchange_list WHERE pending = true AND type = 'pedro-dollar';"
    }

    pool.query(selectUserInfo, (userErr, userResult) => {
      if (userErr) {res.send(userErr)}
      else {
        pool.query(selectPendingBudget, (pendingErr, pendingResult) => {
          if (pendingErr) {
            res.send(pendingErr)
          } else {
            var budget = userResult.rows[0].budget;
            var pendingBudget = pendingResult.rows[0].sum;
            var validBudget = parseFloat(budget) - parseFloat(pendingBudget)
            res.render('exchanging', {budget: budget, pendingBudget: pendingBudget, validBudget: validBudget})
          }
        })
      }
    })
    
  })

  async function exchangeValidation(req, res, next) {
    const exchangeType = req.body.exchangeType;
    const exchangeEmail = req.user.email;
    const exchangeAmount = req.body.amount;
    const exchangeResult = req.body.result;
    const exchangeApptDate = req.body.apptDate;
    const exchangeApptTime = req.body.apptTime;

    if (exchangeEmail.length == 0 ||
      exchangeAmount.length == 0 ||
      exchangeResult.length == 0 ||
      exchangeApptDate.length == 0 ||
      exchangeApptTime.length == 0) {
      return res.status(400).send("Bad request!");
    }
    console.log(exchangeType);
    if (exchangeType !== "pedro-dollar" && exchangeType !== "dollar-pedro") {
      return res.status(400).send("Unsure what the exchange type is!");
    }
    if (exchangeAmount < 5) {
      return res.status(400).send("Amount have to be greater or equal to 5");
    }
    if (exchangeAmount % 5 != 0) {
      return res.status(400).send("Amount have to be mulitiple of 5");
    }
    if (exchangeAmount != exchangeResult) {
      return res.status(400).send("Result and amount aren't the same");
    }
    console.log(exchangeApptDate)
    // return res.send("Hello!")

    const apptDate = moment(exchangeApptDate, 'DD MMMM, YYYY').tz("Asia/Bangkok");
    console.log(apptDate)
    const now = moment().tz("Asia/Bangkok")
    const bankCloseTime = moment().tz("Asia/Bangkok").hours(15).minute(30)
    const nowDate = moment().tz("Asia/Bangkok").startOf("day")

    if (apptDate.day() == 0 || apptDate.day() > 4) {
      return res.status(400).send("The appointment day is not valid on that day!");
    } else if (apptDate.isBefore(nowDate)) {
      return res.status(400).send("Sorry! You can't exchange from the past");
    } else if (now.isSame(apptDate, 'd')) {
      if (now.isAfter(bankCloseTime)) {
        return res.status(400).send("Bank Closed! Exchange next open day!");
      }
    }

    var userBudget = await pool.query("SELECT budget FROM account WHERE email = $1;", [req.user.email])
    var pending_budget = await pool.query("SELECT sum(amount) FROM exchange_list WHERE email = $1 AND pending = true AND type = 'pedro-dollar';", [req.user.email])

    const userCurrentBudget = parseFloat(userBudget.rows[0].budget);
    const pendingBudget = parseFloat(pending_budget.rows[0].sum)
    console.log(userCurrentBudget - pendingBudget < exchangeAmount)
    if (userCurrentBudget - pendingBudget < exchangeAmount) {
      return res.status(403).send("You don't have enough money to exchange! Check your pending budget!");
    }
    next();
  }

  router.post('/exchange_approving', exchangeValidation, function(req, res) {
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

  router.post('/exchange_list/approve/:id', function(req, res, next) {
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

  router.get('/exchange_list', function(req, res) {
    var email = req.user.email;
    var userName = req.user.fullName;

    pool.query("SELECT * FROM account WHERE email = $1;", [email], function(err, result) {
      if (err) {
        console.error(err);
        res.send("Error " + err);
      } else {
        if (result.rows[0].role == 're') {
          pool.query("SELECT * FROM exchange_list WHERE type = 'pedro-dollar'\
	  					ORDER BY timecreated DESC;", function(err2, result2) {
            if (err2) {
              console.log(err2)
            } else {
              res.render('exchange_list', {
                requestRow: result2.rows,
                requestCol: result2.fields,
                user: req.user,
                data: result.rows
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