var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var uuidv4 = require('uuid/v4');
var pg = require('pg');
var _ = require('underscore');

module.exports.set = function(router, pool) {

  router.post('/keeper/d/p/:id', function(request, response, next){
    var id = request.params.id;
    if(id === undefined){
      response.redirect('/keeper_list');
    }
    var status = request.body.status;
    if(status == 'true'){
      const idData = {
        text: "SELECT * FROM exchange_list WHERE id = $1",
        values: [id]
      };
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
                else{response.redirect('/keeper/d/p');}
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
            else{response.redirect('/keeper/d/p');}
          });
        }
      });
    } 
  });

  router.get('/keeper/p/d', ensureLoggedIn, function(request,response) {
    
    var email = request.user.email;
    
    var toDateMonth = function(dateZone){
      var today = new Date(dateZone);
      var date = today.getDate();
      var mon = today.getMonth() + 1; 
      var year = today.getFullYear();
      
      if(mon < 10){
        mon = "0" + String(mon); 
      }

      var wholeDate = String(year + "-" + mon  + "-" + date + " 9:00:00");
      
      return wholeDate;
    }

    const dataAcc = {
      text: "SELECT * FROM account WHERE email = $1;",
      values: [email]
    };

    pool.query(dataAcc, function (accDataErr, accDataResult) {
      if(accDataErr){console.log(accDataErr);}
      else{
        if(accDataResult.rows[0].role == 'keeper' || accDataResult.rows[0].role == 'admin'){

          var appoint = toDateMonth(Date.now());
          console.log(appoint);
          const exchangeSelect = {
            text: "SELECT * FROM exchange_list WHERE approved = 'true' AND pending = 'true' AND type = 'pedro-dollar' AND apptdate = $1;",
            values: [appoint]
          };
          pool.query(exchangeSelect, function(exchangeErr, exchangeResult){
            if (exchangeErr) {console.log(exchangeErr);} 
            else{
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
              } else {
                totalExchange = 0;
              }
              response.render('p-dExchange', {keeper: 'true', BudA1: totalExchA1, BudA2: totalExchA2, BudB3: totalExchB3, BudB4: totalExchB4, BudC5: totalExchC5, BudC6: totalExchC6, BudD7: totalExchD7, BudD8: totalExchD8, BudTotal: totalExchange, approvedDate:exchangeResult.rows, ranVal: uuidv4()});
            }
          });
        } else{
          response.redirect('/notFound');
        }
      }
    });
  });

  router.post('/keeper/p/d/:id', async function(request, response) {
    var status = request.body.status;
    var selection = request.body.selection;
    var email = request.user.email;
    if(!selection){
      return response.status(400).send("Something wrong, maybe you not check any text box!");
    }
    const checkingAcc = {
      text: "SELECT * FROM account WHERE email = $1;",
      values: [email] 
    };

    pool.query(checkingAcc, async (accountErr, accountResult) => {
      if(accountErr){
        console.log(accountErr);
      } else {
        if(accountResult.rows[0].role == 'keeper') {
            if(status == 'done'){
              for(var i = 0; i < selection.length; i++){
                var id = selection[i];
                console.log(id);
                var emailExc = await pool.query("SELECT * FROM exchange_list WHERE id = $1", [id]);
                await pool.query("UPDATE account SET budget = budget - $1 WHERE email = $2;", [parseInt(emailExc.rows[0].result), emailExc.rows[0].email]);
                await pool.query("UPDATE exchange_list SET pending = 'false', timeexchanged = CURRENT_TIMESTAMP(2), \
                  exchanged = 'true' WHERE id = $1;", [id]);
              }

            } else if(status == 'cancel') {
              for(var i = 0; i < selection.length; i++){
                var id = selection[i];
                await pool.query("UPDATE exchange_list SET pending = 'false', timeexchanged = CURRENT_TIMESTAMP(2), \
                exchanged = 'false' WHERE id = $1;", [id]);
              }
            } 
          response.redirect('/keeper/p/d');
        } else {response.redirect('/notFound')}
      }
    });
  });

  router.get('/keeper/d/p', ensureLoggedIn, function(request, response){
    var email = request.user.email;
    var toDateMonth = function(dateZone){
      var today = new Date(dateZone);
      var date = today.getDate();
      var mon = today.getMonth() + 1; 
      var year = today.getFullYear();
      
      if(mon < 10){
        mon = "0" + String(mon); 
      }

      var wholeDate = String(year + "-" + mon  + "-" + date + " 9:00:00");
      
      return wholeDate;
    }

    const dataAcc = {
      text: "SELECT * FROM account WHERE email = $1;",
      values: [email]
    };

    pool.query(dataAcc, function (accDataErr, accDataResult) {
      if(accDataErr){console.log(accDataErr);}
      else{

        if(accDataResult.rows[0].role == 'keeper' || accDataResult.rows[0].role == 'admin'){
          var appoint = toDateMonth(Date.now());
          console.log(appoint);
          const exchangeSelect = {
            text: "SELECT * FROM exchange_list WHERE pending = 'true' AND type = 'dollar-pedro' AND apptdate = $1 ORDER BY timecreated DESC;",
            values: [appoint]
          };
          pool.query(exchangeSelect, function(exchangeErr, exchangeResult){
            if (exchangeErr) {console.log(exchangeErr);} 
            else{
              response.render('d-pExchange', {approvedDate: exchangeResult.rows, keeper: 'true'});
            }//approved = 'true'
          });
        } else{
          response.redirect('/notFound');
        }
      }
    });
  });
}

