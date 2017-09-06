var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');
var Validator = require('../lib/validator')

module.exports.set = function(router, pool) {
  router.get('/transfer', ensureLoggedIn, function(request, response) {
    response.redirect('/transfer_personal')
  });

  router.get('/transfer_personal', function(request, response){
    if(request.user){
      var email = request.user.email;
      const getAccount = {
        text: "SELECT * FROM account WHERE email = $1;",
        values: [email]
      };
      const getExchange = {
        text: "SELECT * FROM exchange_list WHERE email = $1 AND pending = 'true' AND type = 'pedro-dollar';",
        values: [email]
      };
      const getAccountAll = {
        text: "SELECT * FROM account WHERE email != $1;",
        values: [email]
      };

      pool.query(getAccount, function(accErr, accresult) {
        if(accErr){console.log(accErr);}
        else{
          pool.query(getAccountAll, function(allAccErr, allAccResult) {
            if(allAccErr){console.log(allAccErr);}
            else{
              var emailsList = [];
              for(var i = 0; i < allAccResult.rows.length; i++){
                emailsList.push(allAccResult.rows[i].email);
              } 
              console.log("About to query!");
              pool.query(getExchange, function(exchangeErr, exchangeResult) {
                if(exchangeErr){console.log(exchangeErr);}
                else{
                  var moneyExchange = 0;
                  if(exchangeResult.rows){
                    console.log("Something in exhcange");
                    for(var i = 0; i < exchangeResult.rows.length; i++){
                      moneyExchange += parseFloat(exchangeResult.rows[i].result);
                    }
                  }
                  console.log("money: " + (accresult.rows[0].budget - moneyExchange));

                  response.render('transfer_personal', {budget: accresult.rows[0].budget - moneyExchange, user: request.user, data: accresult.rows[0].role, emails: emailsList});
                }
              });
            }
          });
        }
      });
    }else{
      response.redirect('/login');
    }
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
  });
  
  
  
  //if the validateTransfer success, the middleware just call queries to database
  router.post('/transfer_success', Validator.individualTransfer , function (req, res) {
    const senderEmail = req.user.email;
    const recipientEmail = req.body.recipient;
    const reason = req.body.reason;

    const senderCurrentBudget = req.session.senderBudget;
    const recipientCurrentBudget = req.session.recipientBudget;
    delete req.session.senderBudget;
    delete req.session.recipientBudget;

    const transferBudget = parseFloat(req.body.amount);
    const senderNewBudget = senderCurrentBudget - transferBudget;
	  const recipientNewBudget = transferBudget + recipientCurrentBudget;
    console.log("senderCurrentBudget: " + senderCurrentBudget);
    console.log("transferBudget: " + transferBudget)
    console.log("Sender New Budget: " + senderNewBudget)
    console.log("Recipient New Budget: " + recipientNewBudget)

    //Update new budget to the sender and recipient
    pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [senderNewBudget, senderEmail]);
    pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [recipientNewBudget, recipientEmail])

    pool.query("INSERT INTO transfer_logs (amount, sender, recipient, sender_resulting_budget, recipient_resulting_budget, date, reason, finished, moment_budget) \
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP(2), $6, 'true', $7)", [transferBudget, senderEmail, recipientEmail, senderNewBudget, recipientNewBudget, reason, senderCurrentBudget], function (err, result) {
    	if (err) {
    		res.send(err)
    	} else {
        res.send('Sent')
    	}
    });
  });
}