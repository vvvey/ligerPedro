var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var uuidv4 = require('uuid/v4');
var pg = require('pg');

module.exports.set = function(router, pool) {

  router.get('/keeper_list', function(req,res){
    var email = req.user.email;

    pool.query("SELECT * FROM account WHERE email = $1;",  [email], function(err, result) {
      if(err){
        console.error(err); 
        res.send("Error " + err);
      }else {
        if(result.rows[0].role == 'keeper'){
          pool.query("SELECT * FROM exchange_list WHERE (approved = 'true' AND type = 'Pedro to Dollar') OR type = 'Dollar to Pedro'  \
                    ORDER BY apptdate DESC;", function(err2, result2) {
            if (err2) {
              console.log(err2)
            } else {
              var fug = 'SELECT SUM(budget) FROM account;';
              pool.query(fug, function(err3, result3){
                if(err3){
                  console.log(err3);
                }else{
                  console.log("this is my result: " + Object.keys(result3.rows[0]));
                  console.log("rows: " + result3.rows[0].sum)
                  res.render('keeper_list', {totalBudget: result3.rows[0].sum,requestRow: result2.rows, requestCol: result2.fields, user: req.user, data: result.rows});

                }
              });
            }
          })
        } else {//heroku addons:open adminium
          res.render('notFound');
        }
      }
    });
  });

  router.post('/keeper_list/approve/:id', function(request, response, next){
    var id = request.params.id;
    if(id === undefined){
      response.redirect('/keeper_list');
    }
    var status = request.body.status;
    var upadte_keeper = 
      pool.query("UPDATE exchange_list SET exchanged = $1, timeexchanged = CURRENT_TIMESTAMP(2)\
     WHERE id = $2", [status, id], function (err) {
        if (err) {
          console.log(err);
        }else{
          pool.query("SELECT * FROM exchange_list WHERE id =  $1;", [id] , function(err2, result2){
            if(err2){
              console.log(err2);
            }else {
              if (result2.rows[0].exchanged === 'false') {
                response.redirect('/keeper_list');
                console.log("false");
              } else{
                pool.query("SELECT budget FROM account WHERE email = $1;", [result2.rows[0].email], function(err3, result3){
                  if(err3){
                    console.log(err3);
                  }else{              

                    if(result2.rows[0].type == 'Dollar to Pedro'){
                      //Exchange in
                      var after_change_in = parseInt(result3.rows[0].budget) + parseInt(result2.rows[0].result);
                      console.log('Exhcange in email: ' + result2.rows[0].email);
                      console.log('Exhcange in account budget: ' + result3.rows[0].budget); 
                      console.log('Exhcange in value: ' + result2.rows[0].result);
                      console.log('Exhcange in calculated: ' + after_change_in);

                
                      pool.query("UPDATE account SET budget = $1 WHERE email=$2;", [after_change_in, result2.rows[0].email], function(err4){
                        console.log("Success! (IN)");
                        if(err4){
                          console.log(err4);
                        }else{
                          response.redirect('/keeper_list');
                        }
                      });
                    }else {
                      //Exchagne out
                      var after_change_out = parseInt(result3.rows[0].budget) - parseInt(result2.rows[0].result);
                      console.log('Exhcange out email: ' + result2.rows[0].email);
                      console.log('Exhcange out account budget: ' + result3.rows[0].budget); 
                      console.log('Exhcange out value: ' + result2.rows[0].result);
                      console.log('Exhcange out calculated: ' + after_change_out);

                      pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [after_change_out, result2.rows[0].email], function(err5){
                        console.log("Success! (OUT)");
                        if(err5){
                          console.log(err5);
                        }else{
                          response.redirect('/keeper_list');
                        }
                      });
                    }
                  }
                });
              }
            }
          });
        }
      });
    });

  router.get('/keeper', function(request,response){
    pool.query("SELECT * FROM exchange_list WHERE approved = 'true' AND pending = 'true';", function(exchangeErr, exchangeResult){
      if (exchangeErr) {
        console.log(exchangeErr);
      } else{
        console.log("Random: " + uuidv4());
        var totalExchange = 0;
        var totalExchA1 = 0;
        var totalExchA2 = 0;
        var totalExchB3 = 0;
        var totalExchB4 = 0;
        var totalExchC5 = 0;
        var totalExchC6 = 0;
        var totalExchD7 = 0;
        var totalExchD8 = 0;

        if(exchangeResult.rows){
          //total money for
          for(var i = 0; i < exchangeResult.rows.length; i++) {
            totalExchange += parseFloat(exchangeResult.rows[i].amount);

            //total money and people for apartment A1
            if(exchangeResult.rows[i].apartment == 'a1'){
              totalExchA1 += parseFloat(exchangeResult.rows[i].amount);
            }
            //total money and people for apartment A2
            if(exchangeResult.rows[i].apartment == 'a2'){
              totalExchA2 += parseFloat(exchangeResult.rows[i].amount);
            }
            //total money and people for apartment B3
            if(exchangeResult.rows[i].apartment == 'b3'){
              totalExchB3 += parseFloat(exchangeResult.rows[i].amount);
            }
            //total money and people for apartment B4
            if(exchangeResult.rows[i].apartment == 'b4'){
              totalExchB4 += parseFloat(exchangeResult.rows[i].amount);
            }
            //total money and people for apartment C5
             if(exchangeResult.rows[i].apartment == 'c5'){
              totalExchC5 += parseFloat(exchangeResult.rows[i].amount);
            }
            //total money and people for apartment C6
             if(exchangeResult.rows[i].apartment == 'c6'){
              totalExchC6 += parseFloat(exchangeResult.rows[i].amount);
            }
            //total money and people for apartment D7
             if(exchangeResult.rows[i].apartment == 'd7'){
              totalExchD7 += parseFloat(exchangeResult.rows[i].amount);
            }
            //total money and people for apartment D8
             if(exchangeResult.rows[i].apartment == 'd8'){
              totalExchD8 += parseFloat(exchangeResult.rows[i].amount);
            }
          }
        }else{
          totalExchange = 0;
        }
        response.render('keeper', {BudA1: totalExchA1, BudA2: totalExchA2, BudB3: totalExchB3, BudB4: totalExchB4, BudC5: totalExchC5, BudC6: totalExchC6, BudD7: totalExchD7, BudD8: totalExchD8, BudTotal: totalExchange, approvedDate:exchangeResult.rows, ranVal: uuidv4()});
      }
    });
  });

  router.post('/keeper/:id', ensureLoggedIn,function(request, response) {
    var email = request.user.email;
    pool.query("SELECT * FROM account WHERE email = $1;", [email], function(accountErr, accountResult){
      if(accountErr){
        console.log(accountErr);
      } else {
        if(accountResult.rows[0].role == 'keeper') {
          var status = request.body.status;
          var apartmentDone = ['doneA1', 'doneA2', 'doneB3', 'doneB4', 'doneC5', 'doneC6', 'doneD7', 'doneD8'];
          var apartmentCancel = ['cancelA1', 'cancelA2', 'cancelB3', 'cancelB4', 'cancelC5', 'cancelC6', 'cancelD7', 'cancelD8'];
          var apartment = ['a1', 'a2', 'b3', 'b4', 'c5', 'c6', 'd7', 'd8'];
          
          for(var i = 0; i < apartmentDone.length; i++){
            if(status == apartmentDone[i]){
          
              pool.query("SELECT * FROM exchange_list WHERE approved = 'true'\
               AND pending = 'true' AND apartment = $1;", [apartment[i]], function (i, firSelectErr, firSelectResult) {
                if(firSelectErr){
                    console.log(firSelectErr);
                } else {

                  for(var y = 0; y < firSelectResult.rows.length; y++){
                    console.log("Y: " + y);
                    pool.query("SELECT * FROM account WHERE email = $1", [firSelectResult.rows[y].email], function (y, accountErr, accountResult) {
                      if(accountErr){
                        console.log(accountErr);
                      } else {

                        var totalBudget = parseInt(accountResult.rows[0].budget);
                        console.log("total budget: " + accountResult.rows[0].budget);
                        var exchangeAmount = parseInt(firSelectResult.rows[y].result);
                        console.log("exchanged amount: " + firSelectResult.rows[y].result);
                        var resultingBudget = totalBudget - exchangeAmount;

                        console.log("Resulting budget: " + resultingBudget);

                        pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [resultingBudget, firSelectResult.rows[y].email], function(upAccountErr, upAccountResult) {
                          if(upAccountErr){
                            console.log(upAccountErr);
                          } //else {

                            /*pool.query("UPDATE exchange_list SET pending = 'false' WHERE id = $1", [firSelectResult.rows[y].id], function(y, exchangeUpErr, exchangeUpResult){
                              if(exchangeUpErr){
                                console.log(exchangeUpErr);
                              }
                            }.bind(pool, y));*/

                          //}
                          console.log("Updated");
                        });
                        console.log("Fy: " + y);
                      }
                    }.bind(pool, y));
                    console.log("Sy: " + y);
                  }
                }
              }.bind(pool, i));
            }
          }
          
          console.log("Status: " + status);
          response.redirect('/keeper');
        } else {
          response.redirect('/notFound');
        }
      }
    });
  });

}

