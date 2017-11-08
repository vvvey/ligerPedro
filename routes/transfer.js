var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');
var Validator = require('../lib/validator')

module.exports.set = function(router, pool) {
  router.get('/transfer', ensureLoggedIn, function(request, response) {
    response.redirect('/transfer_personal')
  });

  router.get('/transfer_personal', ensureLoggedIn, function(request, response){
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

                  response.render('personal/transfer_personal', {budget: accresult.rows[0].budget - moneyExchange, user: request.user, data: accresult.rows[0].role, emails: emailsList});
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
  router.post('/transfer_success', Validator.individualTransfer , async function (req, res) {
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

	/*
    	send email
	*/

    //get sender email
    //senderEmail

    //get amount
    var amount = req.body.amount;

    //get recipient
    //recipientEmail

    //get recipient data
    var recipientData = await pool.query("SELECT * FROM account WHERE email = $1",[recipientEmail]);

    //get recipient name
    var recipientName = recipientData.rows[0].username;

    //get reason
    //reason

    //get sender data
    var senderData = await pool.query("SELECT * FROM account WHERE email = $1",[senderEmail]);

    //get sender name 
    var senderName = senderData.rows[0].username;

    //get apartment emails array
    var apartmentEmail = ["a1@ligercambodia.org", "a2@ligercambodia.org", "b3@ligercambodia.org", "b4@ligercambodia.org", "c5@ligercambodia.org", "c6@ligercambodia.org", "d7@ligercambodia.org", "d8@ligercambodia.org"];
    //var apartmentEmail = await pool.query("SELECT * FROM account WHERE role = $1", ["apartment"]);

    //get content 
    var contentToTransferer = "Hello, "+senderName+"<br><br>You have succesfully transffered "+amount+" P to "+recipientName+".<br><br>Reason: "+reason;
    var contentToRecipient = "Hello, "+recipientName+"<br><br>You have recieved "+amount+" P from "+senderName+"<br><br>Reason: "+reason+"<br><br><form method=\"get\" action=\"http://ligerpedro.herokuapp.com/apartment_personal\"><button class=\"button button1\" style=\"\
    background-color: #4CAF50;\
    /* Green */\
    border: none;\
    color: white;\
    padding: 2% 2%;\
    text-align: center;\
    text-decoration: none;\
    display: inline-block;\
    font-size: 100%;\
    cursor: pointer;\">Check it out</button>";
    var contentToPersonalRecipient = "Hello, "+recipientName+"<br><br>You have recieved "+amount+" P from "+senderName+"<br><br>Reason: "+reason;

    var email = require('../lib/email.js');

    //send email to trasferer #shudsdf
    email.sendEmail(senderEmail,"Transfer Succesful",contentToTransferer);
    // email.sendEmail("ketya.n@ligercambodia.org","Transfer Succesful",contentToTransferer+"<br>Target: "+senderEmail);

    //send email to transfer recipient

    //check if recipient is apartment account
    if (apartmentEmail.includes(recipientEmail))
    {
    	//get apartment data
    	var apartmentData = await pool.query("SELECT * FROM account WHERE email = $1",[recipientEmail]);
    	//get apartment name
    	var apartmentName = apartmentData.rows[0].username;
    	//get apartment members' data
	    var apartmentMembersData = await pool.query("SELECT * FROM account WHERE apartment = $1",[apartmentName.toLowerCase()]);
	    //save all apartment members' emails / recipients' emails
	    console.log("Apartment Members data : "+apartmentMembersData.rows[0]);
	    var apartmentEmailList = [];

	    //get all apartment members email
	    for (var i = 0; i < apartmentMembersData.rows.length; i++){
	      apartmentEmailList.push(apartmentMembersData.rows[i].email);
	      console.log("i = " +apartmentMembersData.rows[i].email);
	    }
      //send email to apartment members #slfjjsl
	    email.sendEmail(apartmentEmailList,"Apartment Transfer Received",contentToRecipient);
	    // email.sendEmail("ketya.n@ligercambodia.org","Apartment Transfer Received",contentToRecipient+"<br>Target: "+apartmentEmailList);
    }else //if recipient is not apartment send email to personal account #lsdhf
    {
    	email.sendEmail(recipientEmail,"Personal Transfer Received",contentToPersonalRecipient);
    	// email.sendEmail("ketya.n@ligercambodia.org","Personal Transfer Received",contentToPersonalRecipient+"<br>Target: "+recipientEmail);
    }

    //Update new budget to the sender and recipient
    pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [senderNewBudget, senderEmail]);
    pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [recipientNewBudget, recipientEmail])

    pool.query("INSERT INTO transfer_logs (amount, sender, recipient, sender_resulting_budget, recipient_resulting_budget, date, reason, finished) \
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP(2), $6, 'true')", [transferBudget, senderEmail, recipientEmail, senderNewBudget, recipientNewBudget, reason], function (err, result) {
    	if (err) {
    		res.send(err)
    	} else {
	      res.send('Sent')
    	}
    });
  });
}
