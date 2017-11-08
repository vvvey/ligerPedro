var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var uuidv4 = require('uuid/v4');
var pg = require('pg');
var _ = require('underscore');
var User = require('../lib/user');


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

  router.get('/keeper/p/d', ensureLoggedIn, User.isRole("keeper", "admin"), async function(request,response) { 
    // Query to SELECT exchange list group by apartment and apptdate if pending is true and approve is true
    // Sample result
    // [{
    //   apptdate: 2017-11-01T02:00:00.000Z,
    //   apartment: 'c5',
    //   count: '1',
    //   total: '15.00',
    //   picker: 'Vuthy Vey',
    //   row_number: 0,
    //   info: [ { id: '365d75d1-d5cb-4614-8c94-d2030d44f97e',
    //              timecreated: '2017-10-28T06:07:01.94',
    //              person: 'Vuthy Vey',
    //              email: 'vuthy.v@ligercambodia.org',
    //              type: 'pedro-dollar',
    //              amount: 15,
    //              result: 15,
    //              reason: 'Cool',
    //              re: 'Theary Ou',
    //              approved: 'true',
    //              timeapproved: '2017-10-28T06:09:04.1',
    //              timeexchanged: null,
    //              apptdate: '2017-11-01T09:00:00',
    //              apartment: 'c5' }, {.......},{.....} ] 
    //  },
    //  {
    //   apptdate: 2017-11-06T02:00:00.000Z,
    //   apartment: 'c5',
    //   count: '1',
    //   total: '5.00',
    //   picker: 'Mengthong Long',
    //   row_number: 1,
    //   info: [ [Object] ]
    //   }]
    var query = "SELECT \
                  apptdate, \
                  apartment, \
                  count(*), \
                  sum(amount) AS total, \
                  first(person) AS picker, \
                  row_number() OVER (ORDER BY apptdate)::int -1 as row_number, \
                  array_agg(json_build_object(\
                    'id', id, \
                    'timecreated', timecreated, \
                    'person', person, \
                    'email', email, \
                    'type', type, \
                    'amount', amount, \
                    'result', result, \
                    'reason', reason, \
                    're', re, \
                    'approved', approved, \
                    'timeapproved', timeapproved, \
                    'timeexchanged', timeexchanged, \
                    'apptdate', apptdate, \
                    'apartment', apartment)) AS info \
                FROM (SELECT * FROM exchange_list WHERE (type = $1) and (pending = $2) and (approved = $3) ORDER BY timecreated ASC) AS x \
                GROUP by apptdate, apartment ORDER BY apptdate;"
    

    pool.query(query, ['pedro-dollar', true, true],(err, data) => {
      if (err) {
        console.log(err)
      } else {
        response.render('keeper/PDKeeper', {data: data.rows, userData: request.user})
      }
    });
  });

  router.post('/keeper/p/d', async function(request, response) {
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
              response.render('keeper/d-pExchange', {approvedDate: exchangeResult.rows, keeper: 'true', userData: request.user});
            }//approved = 'true'
          });
        } else{
          response.redirect('/notFound');
        }
      }
    });
  });
}

