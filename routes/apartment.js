var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');
var Validator = require('../lib/validator')

module.exports.set = function(router, pool) {

  router.get('/apartment_transfer', ensureLoggedIn, async function(request, response){
    var email = request.user.email;
    var accountData = await pool.query("SELECT * FROM account WHERE email = $1;", [email]); 
    var accCollection = {
      role: accountData.rows[0].role, 
      ident: accountData.rows[0].apartment
    };
    if(accCollection.role == 'senior_student'){
      var apartmentData = await pool.query("SELECT * FROM account WHERE username = $1", [accCollection.ident.toUpperCase()]);
      var apartmentEmail = apartmentData.rows[0].email;

      var apartmentTransfer = await pool.query("SELECT * FROM transfer_logs \
       WHERE sender = $1 AND finished = 'f';", [apartmentEmail]);
      var emails = await pool.query("SELECT email FROM account WHERE email != $1;", [apartmentEmail]);
      var apartmentTransferBudget = 0;
      var emailsList = [];

      for(var i = 0; i < emails.rows.length; i++){
        emailsList.push(emails.rows[i].email);
      } 
      if(apartmentTransfer.rows){        
        for(var i = 0; i < apartmentTransfer.rows.length; i++){
          apartmentTransferBudget += parseFloat(apartmentTransfer.rows[i].amount);
        }
      }
      var budgetRemain =  parseFloat(apartmentData.rows[0].budget) - apartmentTransferBudget;
      response.render('apartment/apartment_transfer', {
        emails: emailsList, 
        user: request.user, 
        data: accCollection.role,

        totalBudget: apartmentData.rows[0].budget,
        pendingBudget: apartmentTransferBudget,
        resultingBudget: budgetRemain});
    }else{
      response.redirect('notFound');
    }
  });

  router.get('/apartment_approve', ensureLoggedIn, async function(request, response){

    var email = request.user.email;
    var accountData = await pool.query("SELECT * FROM account WHERE email = $1;", [email]); 
    var accCollection = {
      role: accountData.rows[0].role, 
      ident: accountData.rows[0].apartment
    };
    if(accCollection.role == 'senior_student'){
      var apartmentData = await pool.query("SELECT * FROM account WHERE username = $1", [accCollection.ident.toUpperCase()]);
      var apartmentEmail = apartmentData.rows[0].email;

      var apartmentTransfer = await pool.query("SELECT * FROM transfer_logs \
        WHERE sender = $1 AND finished = 'f' ORDER BY date DESC;", [apartmentEmail]); 
      var apartmentTransferBudget = 0;
      if(apartmentTransfer.rows){        
        for(var i = 0; i < apartmentTransfer.rows.length; i++){
          apartmentTransferBudget += parseFloat(apartmentTransfer.rows[i].amount);
        }
      }
      var budgetRemain =  parseFloat(apartmentData.rows[0].budget) - apartmentTransferBudget;
      response.render('apartment/apartment_approve', {
        email: email, 
        user: request.user, 
        data: accCollection.role,

        accountData: accountData.rows,
        transferData: apartmentTransfer.rows,

        totalBudget: apartmentData.rows[0].budget,
        pendingBudget: apartmentTransferBudget,
        resultingBudget: budgetRemain
      });
    }else{
      response.redirect('notFound');
    }
  });
        
  router.get('/apartment_history', ensureLoggedIn, async function(request, response){

    var email = request.user.email;
    var personality = await pool.query("SELECT * FROM account WHERE email = $1;", [email]);
    var apartment = {
      role: personality.rows[0].role, 
      ident: personality.rows[0].apartment
    };

    if(apartment.role == 'senior_student'){
      var apartmentData = await pool.query("SELECT * FROM account WHERE username = $1;", [apartment.ident.toUpperCase()]);
      var apartmentEmail = apartmentData.rows[0].email;

      var dataTransferFinish = await pool.query("SELECT * FROM transfer_logs WHERE (sender = $1 OR recipient = $1) AND finished = 't' ORDER BY date DESC;", [apartmentEmail]);
      var dataTransferNot = await pool.query("SELECT * FROM transfer_logs WHERE sender = $1 AND finished = 'f' ORDER BY date DESC;", [apartmentEmail]);
     
      var apartmentTransferBudget = 0;
      if(dataTransferNot.rows){        
        for(var i = 0; i < dataTransferNot.rows.length; i++){
          apartmentTransferBudget += parseFloat(dataTransferNot.rows[i].amount);
        }
      }
      var budgetRemain =  parseFloat(apartmentData.rows[0].budget) - apartmentTransferBudget;
      response.render('apartment/apartment_history', {
        user: request.user, 
        data: personality.rows[0].role, 
        transferData: dataTransferFinish.rows,

        totalBudget: apartmentData.rows[0].budget,
        pendingBudget: apartmentTransferBudget,
        resultingBudget: budgetRemain
      });
    } else{
      response.redirect('/notFound');
    }
  });

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

  router.post('/apartment_list/approve/:id',async function(request, response) {
    var fromUser = {
      status: request.body.status,
      userName: request.user.displayName,
      userEmail: request.user.email,
      id: request.params.id
    }
    console.log(fromUser.userEmail);
    
    if(fromUser.id === undefined){
      response.redirect('/apartment_list');
    }

    var accountData = await pool.query("SELECT * FROM account WHERE email = $1;", [fromUser.userEmail]);
    var apartment = accountData.rows[0].apartment;
    var apartmentData = await pool.query("SELECT * FROM account WHERE username = $1", [apartment.toUpperCase()]);
    var apartmentEmail = apartmentData.rows[0].email;
    var apartmentTransfer = await pool.query("SELECT * FROM transfer_logs WHERE id = $1;", [fromUser.id]); //create another row that calculate is the request finish or not yet
    var recipientData = await pool.query("SELECT * FROM account WHERE email = $1", [apartmentTransfer.rows[0].recipient]);
 
    var approveSystem = {
      monApartment: parseFloat(apartmentData.rows[0].budget),
      monTransfer: parseFloat(apartmentTransfer.rows[0].amount),
      monRecipient: parseFloat(recipientData.rows[0].budget),
      recipient: apartmentTransfer.rows[0].recipient,
      approve: parseFloat(apartmentTransfer.rows[0].num_approve),
      disapprove: parseFloat(apartmentTransfer.rows[0].num_disapprove),
      
    }

    var approved = approveSystem.approve; 
    var denied = approveSystem.disapprove;
    
    console.log(fromUser.status);
    if(fromUser.status == 'accept'){
      approved += 1;
      //approved >= 3 and that transfer has only one
      
      // and if there no my name in the email
      if(approved >= 3) {
        //sustract from apartment
        var resultingApartment = approveSystem.monApartment - approveSystem.monTransfer;
        //add to recipient
        var resultingRecipient = approveSystem.monRecipient + approveSystem.monTransfer;

        pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [resultingApartment, apartmentEmail]);
        pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [resultingRecipient, approveSystem.recipient]);
        
        await pool.query("UPDATE transfer_logs SET num_approve = $1, finished = 't',\
        email_logs = email_logs || '{ "+ fromUser.userEmail +" }' WHERE id = $3;", [approved, fromUser.id]);
        
        response.redirect('/apartment_approve');
      } 
    } else if (fromUser.status == 'deny'){
      denied += 1;
      if(denied >= 2) {
        console.log("denied");
        await pool.query("UPDATE transfer_logs SET num_disapprove = $1, finished = 't',\
        email_logs = email_logs || '{ "+ fromUser.userEmail +" }' WHERE id = $2;", [denied, fromUser.id]);
        response.redirect('/apartment_approve');
      } 
    }

    if(approved < 3 && denied < 2){
      console.log("Adding everyhing");
      await pool.query("UPDATE transfer_logs SET num_disapprove = $1, num_approve = $2,\
      email_logs = email_logs || '{ "+ fromUser.userEmail +" }' WHERE id = $3;", [denied, approved, fromUser.id]);
      response.redirect('/apartment_approve');
    }
  });

  router.post('/transferApartmentSucc', ensureLoggedIn, Validator.apartmentTransfer, async function(request, response){
    console.log("You calling me?");
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
    var objFormate = JSON.stringify( [ {email: fromUser.email,
                    status: 'approve', time: Date.now()} ] );

    console.log("recipientCurrentBudget", recipientCurrentBudget)
    console.log("apartmentDataEmail", apartmentData.rows[0].email)
    var apartmentEmail = apartmentData.rows[0].email;

    //PROBLEM
    const insertQuery = {//email_logs || '{ "+ fromUser.userEmail +" }'
    /*INSERT INTO transfer_logs (sender, recipient, amount, reason, date, approvedata, approve_info, apartment)\
            VALUES($1::text, $2, $3::float, $4, CURRENT_TIMESTAMP(2), JSON.stringify({{'email': 'visal.s@ligercambodia.org', \
                    'status': 'approve', 'time': CURRENT_TIMESTAMP(2)}}), 1::int, $7);*/
      text: "INSERT INTO transfer_logs(sender, recipient, amount, reason, date, approve_info, num_approve, apartment)\
              VALUES($1::text, $2, $3::float, $4, CURRENT_TIMESTAMP(2), $5, 1::int, $6);",
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

  //SELECT x.approve_info as pro, y.amount FROM transfer_logs as x join in exchange_list as y where x.sender == y.email;

  /*router.get('/name', async function(request, response){
    var arrayList = await pool.query("SELECT approve_info as pro FROM transfer_logs");
    console.log(arrayList.rows[0].pro[1].name);
    response.render('testing_file/table');
  });*/
}