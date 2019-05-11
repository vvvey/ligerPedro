var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');
var createdFun = require('../lib/objFuns');
var Validator = require('../lib/validator');
var createdFun = require('../lib/objFuns');
var moment = require('moment');
var momentTZ = require('moment-timezone');
var fix = require('../lib/fixROE');
var User = require('../lib/user')


module.exports.set = function(router, pool) {

  router.get('/apartment_transfer', ensureLoggedIn, User.isRole('senior_student'), async function(request, response){
    var email = request.user.email;
    var accountData = await pool.query("SELECT * FROM account WHERE email = $1;", [email]);

    var accCollection = {
      role: accountData.rows[0].role,
      ident: accountData.rows[0].apartment
    };

      var apartmentData = await pool.query("SELECT * FROM account WHERE username = $1", [accCollection.ident.toUpperCase()]);
      var apartmentEmail = apartmentData.rows[0].email;

      var apartmentTransfer = await pool.query("SELECT * FROM transfer_logs \
       WHERE sender = $1;", [apartmentEmail]);

      var emails = await pool.query("SELECT email FROM account WHERE email != $1;", [apartmentEmail]);
      var apartmentTransferBudget = 0;
      var emailsList = [];

      var emailToRemove = await pool.query("SELECT email FROM account WHERE role = 'senior_student' or role = 'apartment' or role = 'central_bank' ORDER BY role, username");

      for(var i = 0; i < emailToRemove.rows.length; i++){
        emailsList.push(emailToRemove.rows[i].email);
      }


      response.render('apartment/apartment_transfer', {
        emails: emailsList,
        user: request.user,
        data: accCollection.role,
        totalBudget: apartmentData.rows[0].budget
      });

  });

  // router.get('/apartment_approve', ensureLoggedIn, async function(request, response){
  //
  //   var email = request.user.email;
  //   var accountData = await pool.query("SELECT * FROM account WHERE email = $1;", [email]);
  //
  //   var accCollection = {
  //     role: accountData.rows[0].role,
  //     ident: accountData.rows[0].apartment
  //   };
  //
  //   //If they are senior
  //   if(accCollection.role == 'senior_student'){
  //
  //     var apartmentData = await pool.query("SELECT * FROM account WHERE username = $1", [accCollection.ident.toUpperCase()]);
  //     var apartmentEmail = apartmentData.rows[0].email; //selecting the email
  //
  //     //getting an array of result from trasfer_logs where that it fit to the account
  //     var apartmentTransfer = await pool.query("SELECT * FROM transfer_logs \
  //       WHERE sender = $1 AND finished = 'f' AND apartment = $2 ORDER BY date DESC;", [apartmentEmail, accCollection.ident]);
  //
  //
  //     var apartmentTransferBudget = 0; //the total amount of transfer in that apartment
  //     if(apartmentTransfer.rows){
  //       for(var i = 0; i < apartmentTransfer.rows.length; i++){
  //         apartmentTransferBudget += parseFloat(apartmentTransfer.rows[i].amount);
  //       }
  //     }
  //
  //     var budgetRemain =  parseFloat(apartmentData.rows[0].budget) - apartmentTransferBudget;
  //
  //     budgetRemain = fix.fixROE(budgetRemain);
  //
  //     apartmentTransferBudget = fix.fixROE(apartmentTransferBudget);
  //
  //     response.render('apartment/apartment_approve', {
  //       email: email,
  //       user: request.user,
  //       data: accCollection.role,
  //
  //       accountData: accountData.rows,
  //       transferData: apartmentTransfer.rows,
  //
  //       totalBudget: apartmentData.rows[0].budget,
  //       pendingBudget: apartmentTransferBudget,
  //       resultingBudget: budgetRemain
  //     });
  //   }else{
  //     response.redirect('notFound');
  //   }
  // });

  router.get('/apartment_history', ensureLoggedIn, User.isRole('senior_student'), async function(request, response){
    var email = request.user.email;
    var personality = await pool.query("SELECT * FROM account WHERE email = $1;", [email]);
    var apartment = {
      role: personality.rows[0].role,
      ident: personality.rows[0].apartment
    };

      var apartmentData = await pool.query("SELECT * FROM account WHERE username = $1;", [apartment.ident.toUpperCase()]);
      var apartmentEmail = apartmentData.rows[0].email;

      var dataTransferFinish = await pool.query("SELECT * FROM transfer_logs WHERE recipient= $1 OR sender = $1  ORDER BY timestamp DESC;", [apartmentEmail]);


      for(var i = 0; i < dataTransferFinish.rows.length; i++){
        if(dataTransferFinish.rows[i].recipient == apartmentEmail){

          dataTransferFinish.rows[i].receive = true;
          console.log("for recipient: "+dataTransferFinish.rows[i].recipient+" receive: "+dataTransferFinish.rows[i].receive);
        }else{
          dataTransferFinish.rows[i].receive = false;
          console.log("for recipient: "+dataTransferFinish.rows[i].recipient+" receive: "+dataTransferFinish.rows[i].receive)
        }
      }

      console.log("moment: " + moment.unix(1553928707).format())
      response.render('apartment/apartment_history', {
        user: request.user,
        data: personality.rows[0].role,
        transferData: dataTransferFinish.rows,
        totalBudget: apartmentData.rows[0].budget,
        apartmentEmail: apartmentEmail

      });

  });
/*
  router.get('/apartment_members', ensureLoggedIn, async function(request, response){
    var exportDate = function(date){
      var today = new Date(date);
      return today.toDateString();
    }
    var email = request.user.email;
    var accountData = await pool.query("SELECT * FROM account WHERE email = $1;", [email]);
    var accCollection = {
      role: accountData.rows[0].role,
      ident: accountData.rows[0].apartment
    };
    if(accCollection.role == 'senior_student'){

      var apartmentData = await pool.query("SELECT * FROM account WHERE username = $1;", [accCollection.ident.toUpperCase()]);
      var apartmentEmail = apartmentData.rows[0].email;

      var apartmentTransfer = await pool.query("SELECT * FROM transfer_logs \
        WHERE sender = $1 AND finished = 'f';", [apartmentEmail]);
      var apartmentTransferBudget = 0;

      if(apartmentTransfer.rows){
        for(var i = 0; i < apartmentTransfer.rows.length; i++){
          apartmentTransferBudget += parseFloat(apartmentTransfer.rows[i].amount);
        }
      }
      var budgetRemain =  parseFloat(apartmentData.rows[0].budget) - apartmentTransferBudget;

      var exchangeInfro = await pool.query("SELECT * FROM exchange_list WHERE approved = 'true' \
        AND pending = 'true' AND apartment = $1 AND type = 'pedro-dollar';", [accCollection.ident]);
      var shr = exchangeInfro;
      var dataCollection = [];

      for(var i = 0; i < exchangeInfro.rows.length; i++){
        dataCollection.push([]);
        dataCollection[i].push(shr.rows[i].person, parseFloat(shr.rows[i].result), shr.rows[i].id, exportDate(shr.rows[i].apptdate));
      }

      budgetRemain = fix.fixROE(budgetRemain);

      apartmentTransferBudget = fix.fixROE(apartmentTransferBudget);

      response.render('apartment/apartment_memberExchange', {
        exData: dataCollection,
        user: request.user,
        data: accountData.rows[0].role,

        totalBudget: apartmentData.rows[0].budget,
        pendingBudget: apartmentTransferBudget,
        resultingBudget: budgetRemain
      });
    } else{
      response.redirect('/notFound');
    }
  });

  router.post('/apartment_list/approve/:id', ensureLoggedIn, async function(request, response) {
    var fromUser = {
      status: request.body.status,
      userName: request.user.displayName,
      userEmail: request.user.email,
      id: request.params.id
    }

    if(fromUser.id === undefined){
      response.redirect('/apartment_list');
    }

    var accountData = await pool.query("SELECT * FROM account WHERE email = $1;", [fromUser.userEmail]);
    var apartment = accountData.rows[0].apartment;
    var apartmentData = await pool.query("SELECT * FROM account WHERE username = $1", [apartment.toUpperCase()]);
    var apartmentEmail = apartmentData.rows[0].email;
    //create another row that calculate is the request finish or not yet
    var apartmentTransfer = await pool.query("SELECT * FROM transfer_logs WHERE id = $1;", [fromUser.id]);
    var recipientData = await pool.query("SELECT * FROM account WHERE email = $1", [apartmentTransfer.rows[0].recipient]);

    var approved = 0;
    var disapproved = 0;

    var approveSystem = {
      monApartment: parseFloat(apartmentData.rows[0].budget),
      monTransfer: parseFloat(apartmentTransfer.rows[0].amount),
      monRecipient: parseFloat(recipientData.rows[0].budget),
      recipient: apartmentTransfer.rows[0].recipient,
      approve_info : apartmentTransfer.rows[0].approve_info,
      finished : apartmentTransfer.rows[0].finished
    }
    console.log("approveSystem.finished: " + approveSystem.finished);

    var childObj = {
      "email":fromUser.userEmail,
      "status":fromUser.status,
      "time": moment.utc().format()
    };


    var encout = 0;
    var keysVal = Object.keys(approveSystem.approve_info.body); //Array for the KEYS in the "masterObj"

    for(var i = 0; i < keysVal.length; i++){
      console.log("Key value: " + keysVal[i]);
      if(fromUser.userEmail == `${approveSystem.approve_info.body[keysVal[i]].email}`){
        //`${approveSystem.approve_info.body[keysVal[i]].email}` == convert to OBJECT
        encout += 1;
      }
      console.log(encout)

      if(`${approveSystem.approve_info.body[keysVal[i]].status}` == 'approve'){
        approved++;
      }
      if(`${approveSystem.approve_info.body[keysVal[i]].status}` == 'disapprove'){
        disapproved++;
      }
    }

    console.log("approved  " + approved);
    console.log("disapproved " + disapproved);

    //getting the master object with the new things
    var masterObj = await createdFun.toObj(approveSystem.approve_info, childObj, fromUser.id); //return the objects

    if(fromUser.status == 'approve'){

      approved += 1;
      //approved == 3 and that transfer has only one

      // and if there no my name in the email list
      //TRANSFER Success!
      console.log("approved2  " + approved);

      if(approved == 3 && encout == 0 && approveSystem.finished == false) {
        //sustract from apartment
        var resultingApartment = approveSystem.monApartment - approveSystem.monTransfer;
        //add to recipient
        var resultingRecipient = approveSystem.monRecipient + approveSystem.monTransfer;
        //set up an array

        await pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [resultingApartment, apartmentEmail]);
        await pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [resultingRecipient, approveSystem.recipient]);

        await pool.query("UPDATE transfer_logs SET finished = 't',\
        approve_info = $1, sender_resulting_budget = $2, recipient_resulting_budget = $3 WHERE id = $4;", [masterObj, resultingApartment, resultingRecipient, fromUser.id]);

        console.log("Transfered 3 responses!");
      }
    }

    if (fromUser.status == 'disapprove'){

      disapproved += 1;


        var resultingApartment = approveSystem.monApartment;

        var resultingRecipient = approveSystem.monRecipient;


      if(disapproved == 2 && encout == 0 && approveSystem.finished == false) {

        await pool.query("UPDATE transfer_logs SET finished = 't', canceled = 't',\
        approve_info = $1, sender_resulting_budget = $2, recipient_resulting_budget = $3 WHERE id = $4;", [masterObj, resultingApartment, resultingRecipient, fromUser.id]);

        console.log("Transfered fail, after 2 responses!");
      }
    }

    //Check if there is the email already there
    if((approved < 3 && disapproved < 2) && encout == 0 && approveSystem.finished == false) {

      pool.query("UPDATE transfer_logs SET\
      approve_info = $1 WHERE id = $2;", [masterObj, fromUser.id], (err, data) => {
        if (err) {
          console.log(err)
        }
      });

      console.log("Added a responset to the table!");
    }

    response.redirect('/apartment_approve'); //this happens when there is the same people submites
  });
*/
  router.post('/transferApartmentSucc', ensureLoggedIn, Validator.apartmentTransfer, async function(request, response){
    var fromUser = {
      amountSend: request.body.amount,
      emailSend: request.body.recipient,
      reasonSend: request.body.reason,
      userName: request.user.displayName,
      email: request.user.email
    };

    /*INSERT INTO transfer_logs VALUES('10-18-2017', 'c6@ligercambodia.org', 'catering@ligercambodia.org', 50, 150, 90, 'order food for friday', 'c2cefe04-911c-44ea-8a28-79c4f0a0f6a9', 2, 0,'c5', 'false', '{{"hongly.p@ligercambodia.org", "10-19-2017", "approve"},{"somphors.y@ligercambodia.org", "10-20-2017", "approve"}}');*/
    var recipientCurrentBudget;

    // Get apartment from user info
    var userApartment = await pool.query("SELECT apartment FROM account WHERE email = $1;", [fromUser.email]);
    var ident = userApartment.rows[0].apartment;
    // e.g. ident = c6

    console.log("Email: " + fromUser.email);

    // Get apartment info
    var apartmentData = await pool.query("SELECT * FROM account WHERE username = $1;", [ident.toUpperCase()]);
    var objFormate = JSON.stringify({body:{person1: {email: fromUser.email, status: 'approve', time: moment.utc()}}});

    console.log("recipientCurrentBudget", recipientCurrentBudget)
    console.log("apartmentDataEmail", apartmentData.rows[0].email)
    var apartmentEmail = apartmentData.rows[0].email;

    //Send email to apartment members
    //get user's email
    var userEmail = request.user.email;

    //get amount requesting to send
    var amountRequest = request.body.amount;

    //get intended recipient
    var transferRecipient = request.body.recipient;

    //get reason
    var reason = request.body.reason;

    //get user's data
    var userData = await pool.query("SELECT * FROM account WHERE email = $1",[userEmail]);

    var apartmentName = userData.rows[0].apartment;
    //get user's apartment
    console.log("Apartment name:"+apartmentName.toUpperCase());

    //get apartment members' data
    var apartmentMembersData = await pool.query("SELECT * FROM account WHERE apartment = $1",[apartmentName.toLowerCase()]);

    //save all apartment members' emails / recipients' emails
    console.log("Aparmtent Members data : "+apartmentMembersData.rows[0]);
    var apartmentEmailList = [];

    //get recipient data
    var recipientData = await pool.query("SELECT * FROM account WHERE email = $1",[transferRecipient]);

    //get recipientNametr
    var recipientName = recipientData.rows[0].username;

    //get all apartment members email
    for (var i = 0; i < apartmentMembersData.rows.length; i++){
      apartmentEmailList.push(apartmentMembersData.rows[i].email);
      console.log("i = " +apartmentMembersData.rows[i].email);
    }

    //get content
    //var contentToTransferer = "";
    var contentToApartmentMembers = "Hello, "+apartmentName.toUpperCase()+"<br><br>"+userData.rows[0].username+" requests to send "+amountRequest+" P to "+recipientName+".<br><br>Reason: "+reason+"<br><br><form method=\"get\" action=\"http://ligerpedro.herokuapp.com/apartment_approve\"><button class=\"button button1\" style=\"\
    background-color: #4CAF50;\
    /* Green */\
    border: none;\
    color: white;\
    padding: 2% 2%;\
    text-align: center;\
    text-decoration: none;\
    display: inline-block;\
    font-size: 100%;\
    cursor: pointer;\">Check it out</button>"; //#sjkfksa

    var email = require('../lib/email.js');
    email.sendEmail(apartmentEmailList,"Apartment Transfer Request",contentToApartmentMembers);
    // email.sendEmail("ketya.n@ligercambodia.org","Apartment Transfer Request",contentToApartmentMembers+"<br>target: "+apartmentEmailList);

    //PROBLEM
    const insertQuery = {//email_logs || '{ "+ fromUser.userEmail +" }'
    /*INSERT INTO transfer_logs (sender, recipient, amount, reason, date, approvedata, approve_info, apartment)\
            VALUES($1::text, $2, $3::float, $4, CURRENT_TIMESTAMP(2), JSON.stringify({{'email': 'visal.s@ligercambodia.org', \
                    'status': 'approve', 'time': CURRENT_TIMESTAMP(2)}}), 1::int, $7);*/
      text: "INSERT INTO transfer_logs(sender, recipient, amount, reason, date, approve_info, apartment)\
              VALUES($1::text, $2, $3::float, $4, CURRENT_TIMESTAMP(2), $5, $6);",
      values: [apartmentEmail, fromUser.emailSend, fromUser.amountSend, fromUser.reasonSend, objFormate, ident]
      //[apartmentEmail, fromUser.emailSend, fromUser.amountSend,
                  //fromUser.reasonSend, ident], //[[$5::text, CURRENT_TIMESTAMP(2), $6::text]]
    }

    pool.query(insertQuery, (err, result) => {
      if(err){
        console.log(err);
      }
      response.send('Success');
    });
  });

  router.post('/transferApartmentSuccess', ensureLoggedIn,  User.isRole('senior_student'), Validator.apartmentTransfer, async function(request, response){
    var UserData = {
      amountSend: request.body.amount,
      emailSend: request.body.recipient,
      reasonSend: request.body.reason,
      userName: request.user.displayName,
      email: request.user.email,
      apartment: request.user.apartment,
      apartmentEmail :request.user.apartment + "@ligercambodia.org"
    };

    console.log("recipient: " + UserData.emailSend)
    apartmentData = await pool.query("SELECT * FROM account WHERE email = $1;",[UserData.apartmentEmail]);
    recipientData = await pool.query("SELECT * FROM account WHERE email = $1;",[UserData.emailSend]);

    //update two accounts
    await pool.query("UPDATE account SET budget = budget - $1 WHERE email = $2;", [UserData.amountSend, UserData.apartmentEmail]);
    await pool.query("UPDATE account SET budget = budget + $1 WHERE email = $2;", [UserData.amountSend, UserData.emailSend]);


    const insertQuery = {//email_logs || '{ "+ fromUser.userEmail +" }'
    /*INSERT INTO transfer_logs (sender, recipient, amount, reason, date, approvedata, approve_info, apartment)\
            VALUES($1::text, $2, $3::float, $4, CURRENT_TIMESTAMP(2), JSON.stringify({{'email': 'visal.s@ligercambodia.org', \
                    'status': 'approve', 'time': CURRENT_TIMESTAMP(2)}}), 1::int, $7);*/
      text: "INSERT INTO transfer_logs(sender, recipient, amount, reason, submitter, apartment, timestamp, date, sender_resulting_budget, recipient_resulting_budget)\
              VALUES($1::text, $2, $3::float, $4, $5, $6, $7, CURRENT_TIMESTAMP(2), (SELECT budget FROM account WHERE email = $1::text), ((SELECT budget FROM account WHERE email = $2::text)));",
      values: [UserData.apartmentEmail, UserData.emailSend, UserData.amountSend, UserData.reasonSend, UserData.email , UserData.apartment, moment().unix()]
      //[apartmentEmail, fromUser.emailSend, fromUser.amountSend,
                  //fromUser.reasonSend, ident], //[[$5::text, CURRENT_TIMESTAMP(2), $6::text]]
    }

    pool.query(insertQuery, (err, result) => {
      if(err){
        console.log(err);
      }
      response.send('Success');
    });


  });

  // router.get('/name', async function(request, response){
  //   var apartmentTransfer = await pool.query("SELECT * FROM transfer_logs \
  //       WHERE sender = 'c6@ligercambodia.org' AND finished = 't' ORDER BY date DESC;");
  //   /*
  //   var subObj = {
  //     "approve" : 0,
  //     "disapprove" : 0
  //   };
  //
  //   var globalObj = {};
  //
  //   //loop for each row
  //   for(var i = 0; i < apartmentTransfer.rows.length; i++) {
  //     //create an object name "rowInfo"
  //     //in that object add the amount of approve and the amount of disapprove
  //
  //     //Array for the KEYS in the "masterObj"
  //     var masterObj = apartmentTransfer.rows[i]; //create master variable
  //     var keysVal = Object.keys(masterObj.approve_info.body); //original keys array
  //
  //       //return the number that it found "rowInfo"
  //       var findOut = await createdFun.ifThere(keysVal, "rowInfo");
  //       console.log("findOut " + findOut);
  //
  //       //if it found nothing in that row
  //       if(findOut == 0) {
  //         //create new object
  //         masterObj.approve_info.body["rowInfo"] = subObj;
  //       }
  //
  //     //declear a variables for approve and disapprove counter
  //     var approve = 0;
  //     var disapprove = 0;
  //
  //     console.log("Array of objects: " + keysVal);
  //     //loop through each of the "374" '//original keys array' to get the number of event
  //     for(var z = 0; z < keysVal.length; z++){
  //
  //       console.log("Key value: " + keysVal[z]);
  //       console.log("approve: " + masterObj.approve_info.body.rowInfo.approve);
  //       console.log("disapprove: " + masterObj.approve_info.body.rowInfo.disapprove);
  //
  //       if(`${masterObj.approve_info.body[keysVal[z]].status}` == 'approve'){
  //         approve += 1; //add 1 into number of approve
  //         apartmentTransfer.rows[i].approve_info.body.rowInfo.approve = approve;
  //
  //       }else if(`${masterObj.approve_info.body[keysVal[z]].status}` == 'disapprove'){
  //         disapprove += 1; //add 1 into number of disapprove
  //         apartmentTransfer.rows[i].approve_info.body.rowInfo.disapprove = disapprove;
  //
  //       }
  //     }
  //
  //     //apartmentTransfer.rows[i].approve_info.body.rowInfo.approve = approve;
  //     //apartmentTransfer.rows[i].approve_info.body.rowInfo.disapprove = disapprove;
  //
  //     console.log("--------------------------------MASTER----------------------------------------------");
  //     console.log(apartmentTransfer.rows[i].approve_info.body);
  //
  //     //push to the globalObj JSON.stringify(
  //     globalObj[i] = masterObj;
  //   }
  //
  //   console.log("----------------------Global--------------------------");
  //   console.log(apartmentTransfer.rows[2].approve_info.body);
  //
  //   // for(var i = 0; i < apartmentTransfer.rows.length; i++) {
  //   //   console.log("----------------------Global--------------------------");
  //   //   console.log(globalObj);
  //   // } */
  //   // var now = moment().format("YYYY-MM-DD HH:mm");
  //   // var utc = moment.utc().format("YYYY-MM-DD HH:mm Z");
  //   // var pastTime = moment("2017-11-08T07:47:42Z", "YYYY-MM-DD HH:mm Z");
  //   // var timeZone =  moment.utc().tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm Z");
  //   // a
  //
  //   // console.log("moment: " + now);
  //   // console.log("utc: " + utc);
  //   // console.log("pastTime: " + pastTime);
  //   // console.log("timeZone: " + timeZone);
  //   // console.log("a " +  a.format())
  //
  //   // response.send(pastTime);
  // });
}
