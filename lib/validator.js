var pool = require('./pool-config');
var moment = require('moment-timezone');

//Validate over transfer data function and also set session for recipientBudget and senderBudget
  //for other uses in next middleware
  async function validateTransferIndividual(req, res, next){
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

  async function validateTransferApartment(req, res, next){
    //intialize data 
    const transferBudget = req.body.amount;
    const recipientEmail = req.body.recipient;
    const requestEmail = req.user.email;
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

    const senderApartment = await pool.query("SELECT apartment FROM account WHERE email = $1", [requestEmail]);
    const apartmentEmail = (senderApartment.rows[0].apartment).toLowerCase() + '@ligercambodia.org'

    var senderBudget;
    var recipientBudget;

    //query to find both sender and recipent budget and await (until the query is done the next code will execute)
    const senderQuery = await pool.query("SELECT email, budget FROM account WHERE email = $1", [apartmentEmail]);
    const recipientQuery = await pool.query("SELECT email, budget FROM account WHERE email = $1;", [recipientEmail]);

    if (senderQuery.rows.length == 0) {
      return res.status(400).send("Bad Request! No such apartment email found: " +  apartmentEmail)
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
  

    console.log("senderBudget", senderBudget);
    console.log("recipientBudget", recipientBudget);

    //*important checking 
    if (senderBudget  < transferBudget) {
      return res.status(400).send("You don't have enough money")
    } 

    //Set the sessions for save time use for next middleware
    //Next middleware don't need to query for sender or recipent budget
    req.session.senderBudget = parseFloat(senderBudget)
    req.session.recipientBudget = parseFloat(recipientBudget)
    next()  
  }

  async function validateExchange(req, res, next) {
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
module.exports = {
  individualTransfer: validateTransferIndividual,
  apartmentTransfer: validateTransferApartment,
  exchange: validateExchange
}