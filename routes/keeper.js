var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var uuidv4 = require('uuid/v4');
var pg = require('pg');
var _ = require('underscore');

module.exports.set = function(router, pool) {

  router.post('/keeper_list/approve/:id', function(request, response, next){
    var id = request.params.id;
    if(id === undefined){
      response.redirect('/keeper_list');
    }
    var status = request.body.status;
    if(status == 'true'){
      const idData = {
        text: "SELECT * FROM exchange_list WHERE id = $1",
        values: [id]
      }
      pool.query(idData, function(selectExErr, selectExResult){
        if(selectExErr){console.log(selectExErr);}
        else{
          const upAcc = {
            text: "UPDATE account SET budget = budget + $1 WHERE email = $2",
            values: [parseFloat(selectExResult.rows[0].result), selectExResult.rows[0].email]
          };
          pool.query(upAcc, function(accUpErr, accUpResult){
            if(accUpErr){console.log(accUpErr);}
            else{
              const changeExhcange = {
                text: "UPDATE exchange_list SET pending = 'false', timeexchanged = CURRENT_TIMESTAMP(2), exchanged = $1 WHERE id = $2;",
                values: ['true', id] 
              };
              pool.query(changeExhcange, function(exchangeUpErr){
                if(exchangeUpErr){console.log(exchangeUpErr);} 
                else{response.redirect('/keeper');}
              });
            }
          });
        }
      });
    } else {
      const idDataF = {
        text: "SELECT * FROM exchange_list WHERE id = $1",
        values: [id]
      }
      pool.query(idDataF, function(FselectExErr, KselectExResult){
        if(FselectExErr){console.log(FselectExErr);}
        else{
          const changeFExhcange = {
            text: "UPDATE exchange_list SET pending = 'false', timeexchanged = CURRENT_TIMESTAMP(2), exchanged = $1 WHERE id = $2;",
            values: ['false', id] 
          };
          pool.query(changeFExhcange, function(exchangeUpErr){
            if(exchangeUpErr){console.log(exchangeUpErr);} 
            else{response.redirect('/keeper');}
          });
        }
      });
    } 
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
            totalExchange += parseFloat(exchangeResult.rows[i].result);

            //total money and people for apartment A1
            if(exchangeResult.rows[i].apartment == 'a1'){
              totalExchA1 += parseFloat(exchangeResult.rows[i].result);
            }
            //total money and people for apartment A2
            if(exchangeResult.rows[i].apartment == 'a2'){
              totalExchA2 += parseFloat(exchangeResult.rows[i].result);
            }
            //total money and people for apartment B3
            if(exchangeResult.rows[i].apartment == 'b3'){
              totalExchB3 += parseFloat(exchangeResult.rows[i].result);
            }
            //total money and people for apartment B4
            if(exchangeResult.rows[i].apartment == 'b4'){
              totalExchB4 += parseFloat(exchangeResult.rows[i].result);
            }
            //total money and people for apartment C5
             if(exchangeResult.rows[i].apartment == 'c5'){
              totalExchC5 += parseFloat(exchangeResult.rows[i].result);
            }
            //total money and people for apartment C6
             if(exchangeResult.rows[i].apartment == 'c6'){
              totalExchC6 += parseFloat(exchangeResult.rows[i].result);
            }
            //total money and people for apartment D7
             if(exchangeResult.rows[i].apartment == 'd7'){
              totalExchD7 += parseFloat(exchangeResult.rows[i].result);
            }
            //total money and people for apartment D8
             if(exchangeResult.rows[i].apartment == 'd8'){
              totalExchD8 += parseFloat(exchangeResult.rows[i].result);
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
    if(id === undefined){
      response.redirect('/keeper_list');
    }

    var email = request.user.email;
    
    const checkingAcc = {
      text: "SELECT * FROM account WHERE email = $1;",
      values: [email] 
    };
    pool.query(checkingAcc, function(accountErr, accountResult){
      if(accountErr){
        console.log(accountErr);
      } else {
        if(accountResult.rows[0].role == 'keeper') {
          var status = request.body.status;
          var apartmentDone = ['doneA1', 'doneA2', 'doneB3', 'doneB4', 'doneC5', 'doneC6', 'doneD7', 'doneD8'];
          var apartmentCancel = ['cancelA1', 'cancelA2', 'cancelB3', 'cancelB4', 'cancelC5', 'cancelC6', 'cancelD7', 'cancelD8'];
          var apartment = ['a1', 'a2', 'b3', 'b4', 'c5', 'c6', 'd7', 'd8'];

          _.each(apartmentDone, function (thatAparmtent) {
            var i = _.indexOf(apartmentDone, thatAparmtent);

            if(status == thatAparmtent){

              const selectExchange = {
                text: 'SELECT * FROM exchange_list WHERE approved = $1 AND pending = $2 AND apartment = $3;',
                values: ["true", "true", apartment[i]]
              }

              pool.query(selectExchange, function (firSelectErr, firSelectResult) {
                if(firSelectErr) {console.log(firSelectErr)} 
                else {

                  _.each(firSelectResult.rows, function(exchanger) {
                    const updatingAccount = {
                      text: "UPDATE account SET budget = budget - $1 WHERE email = $2;",
                      values: [parseInt(exchanger.result), exchanger.email]
                    }
                    pool.query(updatingAccount, function(updateAccErr, updateAccResult){
                      if(updateAccErr){console.log(updateAccErr);}
                      else{
                        console.log("++++++++++: Updated to the account BUDGET!");
                        const updateExhcange = {
                          text: "UPDATE exchange_list SET pending = 'false', timeexchanged = CURRENT_TIMESTAMP(2), exchanged = $1 WHERE id = $2;",
                          values: ['true', exchanger.id] 
                        };
                        pool.query(updateExhcange, function(exchangeUpErr){
                          if(exchangeUpErr){console.log(exchangeUpErr);}
                        });
                      }
                    });          
                  });
                }
              });
            } else if(status == apartmentCancel[i]) {
              const getExchange = {
                text: "SELECT * FROM exchange_list WHERE approved = $1 AND pending = $2 AND apartment = $3;",
                values: ["true", "true", apartment[i]]
              };
              pool.query(getExchange, function (selectErr, selectResult) {
                if(selectErr) {console.log(selectErr)} 
                else {
                  _.each(selectResult.rows, function(exCancel){
                    const updateExhcange = {
                      text: "UPDATE exchange_list SET pending = 'false', timeexchanged = CURRENT_TIMESTAMP(2), exchanged = $1 WHERE id = $2;",
                      values: ['false', exCancel.id] 
                    };
                    pool.query(updateExhcange, function(updateExErr) {
                      if(updateExErr){console.log(updateExErr);}
                    });
                  });
                }
              });
            }
          });
          response.redirect('/keeper');
        } else {response.redirect('/notFound')}
      }
    });
  });

}

