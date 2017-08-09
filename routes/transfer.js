var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');

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
        text: "SELECT * FROM account;"
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
  	const senderQuery = await pool.query("SELECT email, budget FROM account WHERE email = $1", [senderEmail]);
  	const recipientQuery = await pool.query("SELECT email, budget FROM account WHERE email = $1;", [recipientEmail]);

    if (senderQuery.rows.length == 0) {
      return res.status(400).send("Bad Request! No such sender email found: " +  senderEmail)
    } else if (senderQuery.rows.length > 1) {
      return res.status(400).send("Something is wrong with our server!");
    }

    if (recipientQuery.rows.length == 0) {
      return res.status(400).send("Bad Request! No such recipient email found: " +  recipientEmail)
    } else if (recipientQuery.rows.length > 1) {
      return res.status(400).send("Something is wrong with our server!");
    }
	
		senderBudget = parseFloat(senderQuery.rows[0].budget);
		recipientBudget = parseFloat(recipientQuery.rows[0].budget);
    

    const selectPendingBudget  = {
      text: "SELECT COALESCE(SUM(amount), 0) AS sum FROM exchange_list WHERE pending = true AND type = 'pedro-dollar' AND email = $1;",
      values: [senderEmail]
    }

    const senderPendingBudget = await pool.query(selectPendingBudget);
    var pendingBudget = parseFloat(senderPendingBudget.rows[0].sum)

    console.log("senderBudget", senderBudget);
    console.log("recipientBudget", recipientBudget);
    console.log("pendingBudget", senderPendingBudget.rows[0].sum);

  	//*important checking 
  	if (senderBudget - pendingBudget < transferBudget) {
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
    console.log("senderCurrentBudget: " + senderCurrentBudget);
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
        res.send('Sent')
    	}
    });
  });
}