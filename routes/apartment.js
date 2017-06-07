var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');

module.exports.set = function(router, pool) {
	// Example of pool
	router.get('/testme', function(request, response){
		pool.query('SELECT * from account where email = $1', ['visal.s@ligercambodia.org'], function (err, res) {
  			console.log(res.rows[0])
		});
		response.end();
	});

   router.get('/apartment_transfer', ensureLoggedIn, function(request, response){
  
    pool.query("SELECT * FROM account WHERE \
      email = '"+ request.user.emails[0].value +"';", function(accountErr, accountResult){
      if(accountErr) {
        console.error(accountErr); 
        response.send("Error " + accountErr);
      }else{
        if(accountResult.rows[0].role == 'senior_student'){
          var apartment = accountResult.rows[0].apartment;

          var apart_quer = "SELECT * FROM account WHERE email = '"+ apartment +".ligercambodia.org'";
          pool.query(apart_quer, function(apartmentErr, apartmentResult){
            if(apartmentErr){
              console.log(apartmentErr);
            }else{
              response.render('apartment', {user: request.user, accountData: accountResult.rows, apartmentData: apartmentResult.rows});
            }
          });
        }else{
          response.redirect('notFound');
        }
      }
    });
  });

router.get('/apartment_list', ensureLoggedIn, function(request, response){
  var email = request.user.emails[0].value;
  pool.query("SELECT * FROM account WHERE email = '"+ email +"';", function(accountErr, accountResult){ 
      if (accountErr) {
        console.log(accountErr);
      }else{
        if(accountResult.rows[0].role == 'senior_student'){
          var apartment = accountResult.rows[0].apartment;

          var tranferListQuery = "SELECT * FROM transfer_logs WHERE apartment = '"+ apartment +"'\
          ORDER BY date DESC;"; //Taking all the data that, that person's apartment did 

          var apart_quer = "SELECT * FROM account WHERE email = '"+ apartment +".ligercambodia.org'"; //Taking the info form some apartment 
          pool.query(tranferListQuery, function(tranApartmentErr, tranApartmentResult){
            if(tranApartmentErr){
              console.log(tranApartmentErr);
            }else{
              pool.query(apart_quer, function(apartmentErr, apartmentResult){
                if(apartmentErr){
                  console.log(apartmentErr);
                }else{
                  console.log("Appartment: " + apartment + ".ligercambodia||");
                  
                  console.log(request.user.emails[0].value);
                  response.render('apartment_approve', {user: request.user, user_email: request.user.emails[0].value, accountData: accountResult.rows, trans_apart: tranApartmentResult.rows, apartment: apartmentResult.rows});
                }
              });
            }
          });
        }else{
          response.redirect('notFound');
        }     
      }
    });
});
                
router.post('/apartment_list/approve/:id',function(request, response) {
  var id = request.params.id; 
  
  console.log(id);
  if(id === undefined){
    response.redirect('/apartment_list');
  }
  var fromUser = {
    status: request.body.status,
    userName: request.user._json.given_name,
    userEmail: request.user.emails[0].value
  }
  //id = '"+ id +"';
  console.log(fromUser.userEmail);
  pool.query("SELECT * FROM account WHERE email = '"+ fromUser.userEmail +"';", function(UserErr, result){
      if(UserErr){
        console.log(UserErr);
      }else{
        var apartment = result.rows[0].apartment;
        console.log("Your apartment name: " + apartment);
        pool.query("SELECT * FROM transfer_logs WHERE id = '"+ id +"';", function(transferErr, result2){
          if (transferErr) {
            console.log(transferErr);
          } else {
            var requestInfo = {
              name: result2.rows[0].person,
              email: result2.rows[0].email, //sender email
              amount: result2.rows[0].amount,
              resulting_budget: result2.rows[0].resulting_budget,
              recipient: result2.rows[0].recipient, // reciver email
              num_approve: result2.rows[0].num_approve,
              num_disapprove: result2.rows[0].num_disapprove,
              apartment: result2.rows[0].apartment,
              email_logs: result2.rows[0].email_logs
            }
            pool.query("SELECT * FROM account WHERE email = '"+ apartment +".ligercambodia.org';", function(apartmentErr, result3){
              if(apartmentErr){
                console.log(apartmentErr);
              }else{
                pool.query("SELECT * FROM account WHERE email = '"+ requestInfo.recipient +"';", function(RecipientErr, result4){
                  if(RecipientErr){
                    console.log(RecipientErr);
                  }else{
                    if(fromUser.status == 'accept'){
                      requestInfo.num_approve = parseInt(requestInfo.num_approve) + 1;
                    }else{
                      requestInfo.num_disapprove = parseInt(requestInfo.num_disapprove) + 1; 
                    }
                    var monSender = 0;
                    var monRecipient = 0;

                    if(parseInt(requestInfo.num_approve) >= 3) {
                      //The sender apartment - their money
                      monSender = parseInt(result3.rows[0].budget) - parseInt(requestInfo.amount); 
                      console.log("Sender: " + result3.rows[0].budget);
                      console.log("amuntSend: " + requestInfo.amount);
                      console.log(monSender);
                      //The reciver + their money
                      monRecipient = parseInt(result4.rows[0].budget) + parseInt(requestInfo.amount);
                      console.log("Reciver: " + result4.rows[0].budget);
                      console.log("amuntGet: " + requestInfo.amount);
                      console.log(monRecipient);

                      pool.query("UPDATE transfer_logs SET \
                        num_approve = $1, num_disapprove = $2, \
                        sender_resulting_budget = $3, email_logs = \
                        email_logs || '{ "+ fromUser.userEmail +" }' \
                        WHERE id = '"+ id +"';",[requestInfo.num_approve, requestInfo.num_disapprove, monSender], function(tranUpdateErr, result3) {
                        if(tranUpdateErr){
                          console.log(tranUpdateErr);
                        }else{
                          pool.query("UPDATE account SET budget = $1 WHERE email = '"+ apartment +".ligercambodia.org';", [monSender], function(mistakeSend, outcomeSend) {
                            if(mistakeSend){
                              console.log(mistakeSend);
                            }else{
                              pool.query("UPDATE account SET budget = $1 WHERE email = '"+ requestInfo.recipient +"';", [monRecipient], function(mistakeRev, outcomeRev){
                                if(mistakeRev){
                                  console.log(mistakeRev);
                                }else{
                                  response.redirect('/apartment_list');
                                }
                              });
                            }
                          });
                        }
                      });
                      //Show approve in the handlebars
                    }else{
                      pool.query("UPDATE transfer_logs SET \
                        num_approve = $1, num_disapprove = $2, email_logs = email_logs || '{ "+ fromUser.userEmail +" }' WHERE id = '"+ id +"';",[requestInfo.num_approve, requestInfo.num_disapprove], function(eventErr, result3) {
                        if(eventErr){
                          console.log(eventErr);
                        }else{
                          response.redirect('/apartment_list');
                        }
                      });
                    }        
                  }
                });
              }
            });
          }
        });
      }
  });
});

router.post('/trans_success_apartment', ensureLoggedIn, function(request, response){

  var fromUser = {
    amountSend: request.body.amountTrans,
    emailSend: request.body.recipientTrans,
    reasonSend: request.body.reasonTrans,
    userName: request.user._json.name,
    email: request.user.emails[0].value
  };


  pool.query("SELECT * FROM account WHERE email = '" + request.user.emails[0].value + "'", function (accountErr, accountResult) {
    if(accountErr){
      console.log(accountErr);
    } else {
      var apartment = accountResult.rows[0].apartment;

      var apart_quer = "SELECT * FROM account WHERE email = '"+ apartment +".ligercambodia.org'";

      pool.query(apart_quer, function(apartmentErr, apartmentResult) {
        if(apartmentErr){
          console.log(apartmentErr);
        } else {

          /*var insert = "INSERT INTO transfer_apartment(person, email, amount, resulting_budget, recipient, reason, apartment, num_approve, num_disapprove, email_logs, time)\
          VALUES('" + fromUser.userName +"', '"+ fromUser.email +"', \
          '"+ fromUser.amountSend +"', '"+ apartmentResult.rows[0].budget +"', '"+ fromUser.emailSend +"', '"+ fromUser.reasonSend +"', '"+ apartment +"', 0, 0, '{Submited}', CURRENT_TIMESTAMP(2));"; */

          var insert = "INSERT INTO transfer_logs(sender, recipient, amount, sender_resulting_budget, reason, apartment, num_approve, num_disapprove, email_logs, date)\
          VALUES('" + fromUser.email +"', '"+ fromUser.emailSend +"', \
          '"+ fromUser.amountSend +"', '"+ apartmentResult.rows[0].budget +"', '"+ fromUser.reasonSend +"', '"+ apartment +"', 0, 0, '{Submited}', CURRENT_TIMESTAMP(2));"; 
          
          pool.query(insert, function(inApartmentErr, inApartmentResult){
            if(inApartmentErr){
              console.log(inApartmentErr);
            }else{
              console.log("Success!");
              response.redirect('/apartment_transfer');              
            }
          });
        }
      });
    }
  });
});
}