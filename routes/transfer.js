var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');

module.exports.set = function(router) {
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
        client.query("PREPARE get_pending_budget(TEXT) AS \
        SELECT * FROM exchange_list WHERE email = $1 AND pending = true AND type = 'Pedro to Dollar';\
        EXECUTE get_pending_budget('" + request.user.emails[0].value + "');\
        DEALLOCATE PREPARE get_pending_budget", function(err1, result1){
          if(err1) {
            console.error(err);
          } else {
            var pending_budget = 0;
            for(var i = 0; i < result1.rows.length; i++) {
              pending_budget += parseFloat(result1.rows[i].amount);
            }
            console.log(pending_budget)
            console.log(result.rows[0].budget)
            console.log(result.rows[0].budget - pending_budget)
            response.render('transfer', {user: request.user, title: 'Transfer', budget: result.rows[0].budget, data: result.rows, valid_transfer_budget:  result.rows[0].budget - pending_budget});
          }
        }
        );
        //console.log(request.user);
        
      }
    });
  });
});

router.get('/transfer_success', function(req, res){
  res.render('transfer');
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
          res.render('transfer_confirmation', {budget: result.rows, recipient: req.body.recipient, amount: req.body.amount, reason: req.body.reason}); 
        }
      })
    }) 
});

router.post('/transfer_success', function(req, res) {
  var senderEmail = req.user.emails[0].value;
  var recipientEmail = req.body.recipient;
  var reason = req.body.reason;
  console.log("The reason is: " + reason);

  pg.connect(process.env.PEDRO_db_URL, function (err,client, done) { 
    client.query("SELECT budget FROM account where email = '" + senderEmail + "'", function(err,sender) { 
      done();
      if (err) { 
        console.error(err); res.send("Error" + err); 
      } else {
        var senderCurrentBudget = parseFloat(sender.rows[0].budget);
        var transferBudget = parseFloat(req.body.amount);
        var senderNewBudget = senderCurrentBudget - transferBudget;
        console.log("senderNewBudget: " + senderNewBudget)

        var updateSenderBudgetQuery = "PREPARE update_account_sender(numeric(2)) AS\
        UPDATE account SET budget = $1\
        WHERE email = '" + senderEmail + "';\
        EXECUTE update_account_sender(" + senderNewBudget + ");\
        DEALLOCATE PREPARE update_account_sender";

        client.query(updateSenderBudgetQuery, function(sUpdateErr, sResult) {
          if (sUpdateErr) {
            console.error(sUpdateErr); 
            res.send("Error " + sUpdateErr);
          } else {
            client.query("SELECT * FROM account WHERE email = '" + recipientEmail + "';", function(err1, recipient) {
              if(err1) {
                console.error(err1);
                res.send("Error " + err1);
              } else {
                var recipientCurrentBudget = parseFloat(recipient.rows[0].budget);
                var recipientNewBudget = transferBudget + recipientCurrentBudget;
                console.log("recipientNewBudget " + recipientNewBudget);

                var updateRecipientBudgetQuery = "PREPARE update_account_recipient(numeric(2)) AS\
                UPDATE account SET budget = $1 \
                WHERE email = '" + recipientEmail + "';\
                EXECUTE update_account_recipient('" + recipientNewBudget + "');\
                DEALLOCATE PREPARE update_account_recipient";

                client.query(updateRecipientBudgetQuery, function(rUpdateErr, rResult) {
                  if (rUpdateErr) {
                    console.error(rUpdateErr);
                    res.send("Error " + rUpdateErr);
                  } else {
                    /*
                    var newTranferLogQuery = "PREPARE newTransfer(TIMESTAMP, TEXT, TEXT, numeric, numeric, numeric, TEXT) AS\
                    INSERT into transfer_logs (date, sender, recipient, amount, sender_resulting_budget, recipient_resulting_budget, reason)\
                    VALUES ($1, $2, $3, $4, $5, $6, $7);\
                    EXECUTE PREPARE newTransfer(CURRENT_TIMESTAMP(0), "+ senderEmail +", "+ recipientEmail+", '"+ transferBudget +"', '"+ senderNewBudget+"', '" + recipientNewBudget+"', '" + reason + "');"*/
                    
                    var x = "PREPARE newTransfer(numeric(2), TEXT, TEXT, numeric(2), numeric(2), TIMESTAMP, TEXT) AS\
                    INSERT INTO transfer_logs (amount, sender, recipient, sender_resulting_budget, recipient_resulting_budget, date, reason) \
                    VALUES ($1, $2, $3, $4, $5, $6, $7);\
                    EXECUTE newTransfer(" + transferBudget + ", '" + senderEmail + "', '" + recipientEmail + "', \
                    '" + senderNewBudget + "', '" + recipientNewBudget + "', CURRENT_TIMESTAMP(2), '" + reason + "'); DEALLOCATE PREPARE newTransfer";
                    
                    client.query(x, function (transferErr, transferResult) {
                      if (transferErr) {
                        console.error(transferErr);
                        res.send("Error " + transferErr);
                      } else {


                        res.render('transfer_success', {recipient: recipientEmail, amount: transferBudget});
                      }
                    });
                  }
                })
            }
            })           
          }
        })
      }
    });
  });
});

router.get('/transfer-test', function (request, response) {
  response.render('transfer-test');
});
}