var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var moment = require('moment-timezone');
var Validator = require('../lib/validator')

module.exports.set = function(router, pool) {

  router.post('/exchange_confirmation', function(req, res) {
    res.render('personal/exchange_confirmation', {
      amount: req.body.amount,
      result: req.body.result,
      reason: req.body.reason
    });
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
            res.render('personal/exchanging', {user: req.user, data: userResult.rows[0].role ,budget: budget, pendingBudget: pendingBudget, validBudget: validBudget})
          }
        })
      }
    })
  })

  router.post('/exchange_approving', Validator.exchange, async function(req, res) {
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
          VALUES (CURRENT_TIMESTAMP(2), $1, $2, $3, $4::float8::numeric::money, $5::float8::numeric::money, $6, $7, $8) returning id as id;",
          values: [exchangeLog.person, exchangeLog.email, exchangeLog.type, exchangeLog.amount, exchangeLog.result, exchangeLog.reason, apptDate, apartment]
        };
        pool.query(insertData, async function(insertErr, insertResult) {
          if (insertErr) {
            console.log(insertErr);
          } else {

            if (exchangeLog.type == "pedro-dollar"){


            /*
            send email to all re
            "Subject: Exchange Request
             Requester: ketya.n@ligercambodia.org
             Type: Pedro-Dollar
             Amount: 5Pedro
             Reason: "For water festival"
             Appointment Date:5th August 2017
             ----------  --------
             | Accept |  | Deny |
             ----------  --------
            */

            //get email recipient / all re emails
            var emailRecipientData = await pool.query("SELECT email FROM account WHERE role = $1",["re"]);

            //get requester's email
            //exchangeLog.email;

            //get type
            //exchangeLog.type;

            //get amount
            //exchangeLog.amount;

            //get reason
            //exchangeLog.reason;

            //get appointment date
            //exchangeLog.apptDate

            //host
            var host = "http://localhost:5000";
            // var host = "https://ligerpedro.herokuapp.com";

            //get id
            var id = insertResult.rows[0].id;
            console.log(insertResult.rows[0].id);

            //get accept link
            var acceptDeny = "<form action = \""+host+"/exchange_list/approve/"+id+"\" method = \"post\">"+"<button type=\"submit\" name=\"status\" value=\"true\" class=\"btn\">Accept</button>"+"<button type=\"submit\" name=\"status\" value=\"false\" class=\"btn\">Deny</button>"+"</form>";

            //get email recipient array
            var emailRecipient = [];
            for(i in emailRecipientData.rows){
              emailRecipient.push(emailRecipientData.rows[i].email);
            }

            //get content
            // var contentToRe = "Requester: "+exchangeLog.email+"<br>Type: "+exchangeLog.type+"<br>Amount: "+exchangeLog.amount+"Pedro<br>Reason: \""+exchangeLog.reason+"\"<br>Appointment Date: "+exchangeLog.apptDate+"<br>"+"<a href=\""+acceptLink+"\">Accept</a>"+"  <a href=\""+denyLink+"\">Deny</a>";
            var contentToRe = "Requester: "+exchangeLog.email+"<br>Type: "+exchangeLog.type+"<br>Amount: "+exchangeLog.amount+"Pedro<br>Reason: \""+exchangeLog.reason+"\"<br>Appointment Date: "+exchangeLog.apptDate+"<br>"+acceptDeny;

            // var contentToRequester = "Requester: "+exchangeLog.email+"<br>Type: "+exchangeLog.type+"<br><a href=\"http://ligerpedro.herokuapp.com/history_personal\">Amount:</a> "+exchangeLog.amount+" Pedro<br>Reason: \""+exchangeLog.reason+"\"<br>Appointment Date: "+exchangeLog.apptDate;
            var contentToRequester = "Requester: "+exchangeLog.email+"<br>Type: "+exchangeLog.type+"<br><a href=\"http://ligerpedro.herokuapp.com/history_personal\">Amount:</a> "+exchangeLog.amount+" Pedro<br>Reason: \""+exchangeLog.reason+"\"<br>Appointment Date: "+exchangeLog.apptDate;

            var email = require('../lib/email.js');
            
            //send email to re
            // email.sendEmail(emailRecipient,"Exchange Request",contentToRe);
            email.sendEmail("ketya.n@ligercambodia.org","Exchange Request",contentToRe+"<br>Target: "+emailRecipient);

            //send to requester
            //email.sendEmail(exchangeLog.email, "Exchange Request Sent", contentToRequester);
            email.sendEmail("ketya.n@ligercambodia.org", "Exchange Request Sent", contentToRequester+"<br>Target: "+exchangeLog.email);
          }else{
            //get requester's email
            //exchangeLog.email;

            //get requester data
            var requesterData = await pool.query("SELECT * FROM account WHERE email = $1",[exchangeLog.email]);

            //get requester name
            var requesterName = requesterData.rows[0].username;

            //get type
            //exchangeLog.type;

            //get amount
            //exchangeLog.amount;

            //get reason
            //exchangeLog.reason;

            //get appointment date
            //exchangeLog.apptDate

    // var s2 = moment(database,"YYYY-MM-DD HH:mm:ss").format(YYYY-MM-DD);
            
            //get email recipient data
            var emailRecipientData = await pool.query("SELECT * FROM account WHERE role = $1",["keeper"]); 

            //get email recipient
            var emailRecipient = emailRecipientData.rows[0].email;

            //get content to send to Book Keeper
            var contentToBookKeeper = "Hello, "+emailRecipientData.rows[0].username+"<br><br>"+requesterName+" wants to deposit "+exchangeLog.amount+"$ into the bank on "+exchangeLog.apptDate+"<br><br>\
            <form method=\"get\" action=\"http://ligerpedro.herokuapp.com/keeper/d/p\"><button class=\"button button1\" style=\"\
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
            //get content to requester
            var contentToRequesterc = "Hello, "+requesterName+"<br><br>You are planning to deposit "+exchangeLog.amount+"$ into the bank on "+exchangeLog.apptDate+".<br><br><form method=\"get\" action=\"http://ligerpedro.herokuapp.com/history_personal\"><button class=\"button button1\" style=\"\
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

            //get title
            var title = requesterName+" Deposit Appointment";
            
            //get email library 
            var email = require('../lib/email.js');
            
            //send email to bookkeeper #lskdjfskj
            email.sendEmail(emailRecipient,title,contentToBookKeeper);
            // email.sendEmail("ketya.n@ligercambodia.org",title,contentToBookKeeper+"<br>Target: "+emailRecipient);

            var title2 = "Individual Exchange Confirmation";
            //send email to requester #;laoqie
            email.sendEmail(exchangeLog.email,title2,contentToRequesterc);
            // email.sendEmail("ketya.n@ligercambodia.org",title2,contentToRequesterc+"<br>Target: "+exchangeLog.email);

          }



            pool.query("SELECT role FROM account WHERE email = $1;", [req.user.email], function(err, result1) {
              if (err) {
                console.log('Error: ' + err);
                res.send(err)
              } else {
                res.send("Success!")
              }
            });
          }
        });
      }
    });
  });

  router.post('/exchange_list/approve/:id', ensureLoggedIn, async function(req, res, next) {
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
    var pending = status; //(status == true) ? true : false

    

    pool.query("UPDATE exchange_list SET re = $1, approved = $2, timeapproved = CURRENT_TIMESTAMP(2), pending = $3 WHERE id = $4;", [re, status, pending, exchangeReq_id], async function(err, result) {
      if (err) {
        console.log(err)
      } else {

        //send email to tell user if their exchange has been accepted
        /*
          Subject:Exchange Request Accepted
          Accepted by: Theary Ou
          Type: Pedro-Dollar
          Amount: 5 Pedro
          Reason: "For water festival"
          Appointment Date:5th August 2017
        */
        /*
          Subject:Exchange Request Denied
          Denied by: Theary Ou
          Type: Pedro-Dollar
          Amount: 5 Pedro
          Reason: "For water festival"
        */

        //get exchange data
        var exchangeData = await pool.query("SELECT * FROM exchange_list WHERE id = $1",[req.params.id]);

        //get responder
        var responder = exchangeData.rows[0].re;

        //get type
        var type = exchangeData.rows[0].type;

        //get amount
        var amount = exchangeData.rows[0].amount;

        //get appointment date
        var apptDate = exchangeData.rows[0].apptdate; 

        //get reason
        var reason = exchangeData.rows[0].reason;

        //get status
        //status

        //get email recipient
        var emailRecipient = exchangeData.rows[0].email;

        //get content
        var contentToDenied = "Denied by: "+responder+"<br>Type: "+type+"<br>Amount: "+amount+"<br>Reason: "+reason;
        var contentToAccepted = "Accepted by: "+responder+"<br>Type: "+type+"<br>Amount: "+amount+"<br>Reason: "+reason+"<br>Appointment Date: "+apptDate;

        var email = require('../lib/email.js');

        //if re denied
        if (!status){
          //send email to user
          // email.sendEmail(emailRecipient,"Exchange Request Denied" ,contentToDenied);
          email.sendEmail("ketya.n@ligercambodia.org","Exchange Request Denied",contentToDenied+"<br>Target: "+emailRecipient);
        }else{//if re accepted

          //send email to user

          // email.sendEmail(emailRecipient,"Exchange Request Accepted",contentToAccepted);
          email.sendEmail("ketya.n@ligercambodia.org","Exchange Request Accepted",contentToAccepted+"<br>Target: "+emailRecipient);
        }

        res.redirect('/exchange_list')
      }
    })
  })

  //RE's page
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
              res.render('re/exchange_list', {
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
