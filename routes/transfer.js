var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');

module.exports.set = function(router, pool) {
  router.get('/transfer', ensureLoggedIn, function(request, response) {
    pool.query("SELECT * FROM account WHERE email = $1;", [request.user.email], function(err, result) {
      if (err) {
        console.error(err);
        response.send("Error " + err);
      } else {
        pool.query("SELECT * FROM exchange_list WHERE email = $1 AND pending = true AND type = 'Pedro to Dollar';", [request.user.email], function(err1, result1) {
          if (err1) {
            console.error(err);
          } else {
            var pending_budget = 0;
            for (var i = 0; i < result1.rows.length; i++) {
              pending_budget += parseFloat(result1.rows[i].amount);
            }
            console.log(pending_budget)
            console.log(result.rows[0].budget)
            console.log(result.rows[0].budget - pending_budget)
            response.render('transfer', {
              user: request.user,
              title: 'Transfer',
              budget: result.rows[0].budget,
              data: result.rows,
              pending_budget: pending_budget,
              valid_transfer_budget: result.rows[0].budget - pending_budget
            });
          }
        });
        //console.log(request.user);

      }
    });
  });


  router.get('/transfer_success', function(req, res) {
    res.render('transfer');
  });

  router.post('/transfer_confirmation', function(req, res) {
    pool.query("SELECT budget FROM account where email = $1", [req.user.email], function(err, result) {

      if (err) {
        console.error(err);
        res.send("Error" + err);
      } else {
        res.render('transfer_confirmation', {
          budget: result.rows,
          recipient: req.body.recipient,
          amount: req.body.amount,
          reason: req.body.reason
        });
      }
    })
  })

  router.post('/transfer_success', function(req, res) {
    var senderEmail = req.user.email;
    var recipientEmail = req.body.recipient;
    var reason = req.body.reason;
    console.log("The reason is: " + reason);

    pool.query("SELECT budget FROM account where email = $1", [senderEmail], function(err, sender) {

      if (err) {
        console.error(err);
        res.send("Error" + err);
      } else {
        var senderCurrentBudget = parseFloat(sender.rows[0].budget);
        var transferBudget = parseFloat(req.body.amount);
        var senderNewBudget = senderCurrentBudget - transferBudget;
        console.log("senderNewBudget: " + senderNewBudget)

        pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [senderNewBudget, senderEmail], function(sUpdateErr, sResult) {
          if (sUpdateErr) {
            console.error(sUpdateErr);
            res.send("Error " + sUpdateErr);
          } else {
            pool.query("SELECT * FROM account WHERE email = $1;", [recipientEmail], function(err1, recipient) {
              if (err1) {
                console.error(err1);
                res.send("Error " + err1);
              } else {
                var recipientCurrentBudget = parseFloat(recipient.rows[0].budget);
                var recipientNewBudget = transferBudget + recipientCurrentBudget;
                console.log("recipientNewBudget " + recipientNewBudget);

                pool.query("UPDATE account SET budget = $1 \
                			WHERE email = $2;", [recipientNewBudget, recipientEmail], function(rUpdateErr, rResult) {
                  if (rUpdateErr) {
                    console.error(rUpdateErr);
                    res.send("Error " + rUpdateErr);
                  } else {
                    /*
                    var newTranferLogQuery = "PREPARE newTransfer(TIMESTAMP, TEXT, TEXT, numeric, numeric, numeric, TEXT) AS\
                    INSERT into transfer_logs (date, sender, recipient, amount, sender_resulting_budget, recipient_resulting_budget, reason)\
                    VALUES ($1, $2, $3, $4, $5, $6, $7);\
                    EXECUTE PREPARE newTransfer(CURRENT_TIMESTAMP(0), "+ senderEmail +", "+ recipientEmail+", '"+ transferBudget +"', '"+ senderNewBudget+"', '" + recipientNewBudget+"', '" + reason + "');"*/

                    pool.query("INSERT INTO transfer_logs (amount, sender, recipient, sender_resulting_budget, recipient_resulting_budget, date, reason) \
                    			VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP(2), $6)", [transferBudget, senderEmail, recipientEmail, senderNewBudget, recipientNewBudget, reason], function(transferErr, transferResult) {
                        if (transferErr) {
                          console.error(transferErr);
                          res.send("Error " + transferErr);
                        } else {


                          res.render('transfer_success', {
                            recipient: recipientEmail,
                            amount: transferBudget
                          });
                        }
                      });
                  }
                })
              }
            })
          }
        });
      }
    });
  });

  router.get('/transfer-test', function(request, response) {});
}