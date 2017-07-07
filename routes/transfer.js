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
      pool.query(getAccount, function(accErr, accresult) {
        if(accErr){console.log(accErr);}
        else{
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
              response.render('transfer_personal', {budget: accresult.rows[0].budget - moneyExchange, user: request.user, data: accresult.rows[0].role});
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
  
  //Validate over transfer data function and also set session for recipientBudget and senderBudget
  //for other uses in next middleware
  async function validateTransfer(req, res, next){
  	//intialize data 
  	const transferBudget = req.body.amount;
  	const recipientEmail = req.body.recipient;
  	const senderEmail = req.user.email;
  	const transferReason = req.body.reason;

  	//transfer budget have to valid as a number
  	//transfer budget, reason, recipent email, sender email is not zero length
  	//checking this before query to minimize request time if it invalid input
  	if(isNaN(transferBudget) || transferBudget.length == 0 || transferReason.length == 0 || recipientEmail == 0 ) {
  		return res.status(400).send("Bad Request!")
  	}

  	if (transferBudget <= 0) {
  		return res.status(400).send("Invalid amount!! " + transferBudget)
  	}

  	var senderBudget;
  	var recipientBudget;

  	//query to find both sender and recipent budget and await (until the query is done the next code will execute)
  	const senderQuery = await pool.query("SELECT email, budget FROM account WHERE email = $1 or email = $2;", [senderEmail, recipientEmail]);
  	
  	//If it work correctly, it would return back with two elements in rows array
  	if (senderQuery.rows.length == 2) {
  		//the first element[0] should be for sender
  		//the second element[1] should be for recipient
  		senderBudget = parseFloat(senderQuery.rows[0].budget);
  		recipientBudget = parseFloat(senderQuery.rows[1].budget);
  	} else if (senderQuery.rows.length == 1) {
  		// check which email is not found
  		if(senderQuery.rows[0].email == recipientEmail) {
  			return res.status(400).send("Bad Request! No such sender email found: " +  senderEmail)
  		} else if(senderQuery.rows[0].email == senderEmail) {
  			return res.status(400).send("Bad Request! No such recipient email found: " +  recipientEmail)
  		}
  		return res.status(400).send("Bad Request!")
  	} else if (senderQuery.rows.length > 2) {
  		return res.status(400).send("Something is wrong with our server!");
  	} 

  	//*important checking 
  	if (senderBudget < transferBudget) {
  		return res.status(400).send("You don't have enough money")
  	} 

  	//Set the sessions for save time use for next middleware
  	//Next middleware don't need to query for sender or recipent budget
	req.session.senderBudget = parseFloat(senderBudget)
	req.session.recipientBudget = parseFloat(recipientBudget)
	next() 	
  }
  
  //if the validateTransfer success, the middleware just call queries to database
  router.post('/transfer_success', validateTransfer, function (req, res) {
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
    
    console.log("transferBudget: " + transferBudget)
    console.log("Sender New Budget: " + senderNewBudget)
    console.log("Recipient New Budget: " + recipientNewBudget)

    //Update new budget to the sender and recipient
    pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [senderNewBudget, senderEmail]);
    pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [recipientNewBudget, recipientEmail])

    pool.query("INSERT INTO transfer_logs (amount, sender, recipient, sender_resulting_budget, recipient_resulting_budget, date, reason) \
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP(2), $6)", [transferBudget, senderEmail, recipientEmail, senderNewBudget, recipientNewBudget, reason], function (err, result) {
                	if (err) {
                		res.send(err)
                	} else {
                		res.redirect('/transfer_personal');
                	}
                });
    });
}