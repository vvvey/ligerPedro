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
  pg.connect(process.env.PEDRO_db_URL, function (err, client, done) {
    client.query("SELECT * FROM account WHERE \
      email = '"+ request.user.email +"';", function(err, result){
      done();
      if(err) {
        console.error(err); response.send("Error " + err);
      }else{
        if(result.rows[0].role == 'senior_student'){
          var apartment = result.rows[0].apartment;

          var apart_quer = "SELECT * FROM account WHERE email = '"+ apartment +".ligercambodia.org'";
          client.query(apart_quer, function(err2, result2){
            if(err2){
              console.log(err2);
            }else{
              response.render('apartment', {user: request.user, data1: result.rows, apartment: result2.rows});
            }
          });
        }else{
          response.redirect('notFound');
        }
      }
    });
  });
});

/*router.get('/trans_comfirmation_apartment', ensureLoggedIn, function(request, response){
  response.render('trans_apart_comfirm', {user: request.user});
});

router.post('/trans_comfirmation_apartment', function(request, response){
  var amount = request.body.amountTrans;
  var email = request.body.recipientTrans;
  var reason = request.body.reasonTrans;
  response.render('trans_apart_comfirm', {amount: amount, email: email, reason: reason});
});*/

router.get('/trans_success_apartment', ensureLoggedIn, function(request, response){
  response.render('trans_apart_success');
});
//////////////////////////////////////////////////////////////////
router.get('/apartment_list', ensureLoggedIn, function(request, response){
  var email = request.user.email;
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("SELECT * FROM account WHERE email = '"+ email +"';", function(err, result){
      done();
      if (err) {
        console.log(err);
      }else{
        if(result.rows[0].role == 'senior_student'){
          var apartment = result.rows[0].apartment;

          var tranferListQuery = "SELECT * FROM transfer_apartment WHERE apartment = '"+ apartment +"'\
          ORDER BY time DESC;"; //Taking all the data that, that person's apartment did 

          var apart_quer = "SELECT * FROM account WHERE email = '"+ apartment +".ligercambodia.org'"; //Taking the info form some apartment 
          client.query(tranferListQuery, function(err2, result2){
            if(err2){
              console.log(err2);
            }else{
              client.query(apart_quer, function(err3, result3){
                if(err3){
                  console.log(err3);
                }else{
                  console.log("Appartment: " + apartment + ".ligercambodia||");
                  
                  console.log(request.user.email);
                  response.render('apartment_approve', {user: request.user, user_email: request.user.email, data1: result.rows, trans_apart: result2.rows, apartment: result3.rows});
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
    userEmail: request.user.email
  }
  //id = '"+ id +"';
  console.log(fromUser.userEmail);
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
    client.query("SELECT * FROM account WHERE email = '"+ fromUser.userEmail +"';", function(err, result){
      if(err){
        console.log(err);
      }else{
        var apartment = result.rows[0].apartment;
        console.log("Your apartment name: " + apartment);
        client.query("SELECT * FROM transfer_apartment WHERE id = '"+ id +"';", function(err2, result2){
          if (err2) {
            console.log(err2);
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
            client.query("SELECT * FROM account WHERE email = '"+ apartment +".ligercambodia.org';", function(err3, result3){
              if(err3){
                console.log(err3);
              }else{
                client.query("SELECT * FROM account WHERE email = '"+ requestInfo.recipient +"';", function(err4, result4){
                  if(err4){
                    console.log(err4);
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

                      client.query("UPDATE transfer_apartment SET \
                        num_approve = $1, num_disapprove = $2, resulting_budget = $3, email_logs = email_logs || '{ "+ fromUser.userEmail +" }' WHERE id = '"+ id +"';",[requestInfo.num_approve, requestInfo.num_disapprove, monSender], function(err3, result3) {
                        if(err3){
                          console.log(err3);
                        }else{
                          client.query("UPDATE account SET budget = $1 WHERE email = '"+ apartment +".ligercambodia.org';", [monSender], function(mistakeSend, outcomeSend) {
                            if(mistakeSend){
                              console.log(mistakeSend);
                            }else{
                              client.query("UPDATE account SET budget = $1 WHERE email = '"+ requestInfo.recipient +"';", [monRecipient], function(mistakeRev, outcomeRev){
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
                      client.query("UPDATE transfer_apartment SET \
                        num_approve = $1, num_disapprove = $2, email_logs = email_logs || '{ "+ fromUser.userEmail +" }' WHERE id = '"+ id +"';",[requestInfo.num_approve, requestInfo.num_disapprove], function(err3, result3) {
                        if(err3){
                          console.log(err3);
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
});
//////////////////////////////////////////////////////////////////

router.post('/trans_success_apartment', function(request, response){
  var amount = request.body.amountTrans;
  var email = request.body.recipientTrans;
  var reason = request.body.reasonTrans;
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("SELECT * FROM account WHERE email = '" + request.user.email + "'", function (err1, result1) {
      done();
      if(err1){
        console.log(err1);
      }else{
        var apartment = result1.rows[0].apartment;

        var apart_quer = "SELECT * FROM account WHERE email = '"+ apartment +".ligercambodia.org'";
        client.query(apart_quer, function(err2, result2){
          if(err2){
            console.log(err2);
          }else{
            var insert = "INSERT INTO transfer_apartment(person, email, amount, resulting_budget, recipient, reason, apartment, num_approve, num_disapprove, email_logs, time)\
            VALUES('" + request.user._json.name +"', '"+ request.user.email +"', \
            '"+ amount +"', '"+ result2.rows[0].budget +"', '"+ email +"', '"+ reason +"', '"+ apartment +"', 0, 0, '{Submited}', CURRENT_TIMESTAMP(2));"; 
            client.query(insert, function(err3, result3){
              if(err3){
                console.log(err3);
              }else{
                console.log("Success!");
                response.render('trans_apart_success', {user: request.user, data1: result1.rows, apartment: result2.rows});
              }
            });
          }
        });
      }
    });
  });
});
}