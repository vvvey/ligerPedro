var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');

module.exports.set = function(router) {

  router.get('/keeper_list', function(req,res){
  var email = req.user.emails[0].value;
  var exchangeListQuery = "SELECT * FROM exchange_list WHERE approved = 'true'\
  ORDER BY apptdate DESC;";

  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("SELECT * FROM account WHERE email = '"+ email +"'", function(err, result) {
      if(err){
        console.error(err); 
        res.send("Error " + err);
      }else {
        if(result.rows[0].role == 'keeper'){
          client.query(exchangeListQuery, function(err2, result2) {
            done();
            if (err2) {
              console.log(err2)
            } else {
              var fug = 'SELECT SUM(budget) FROM account;';
              client.query(fug, function(err3, result3){
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
        } else {
          res.render('notFound');
        }
      }
    });
  })
});

router.post('/keeper_list/approve/:id', function(request, response, next){
  var id = request.params.id;
  if(id === undefined){
    response.redirect('/keeper_list');
  }
  var status = request.body.status;
  var upadte_keeper = "UPDATE exchange_list SET exchanged = '"+ status +"', timeexchanged = CURRENT_TIMESTAMP(2)\
   WHERE id = '"+ id +"';"
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query(upadte_keeper, function (err) {
      if (err) {
        console.log(err);
      }else{
        client.query("SELECT * FROM exchange_list WHERE id = '"+ id +"';", function(err2, result2){
          if(err2){
            console.log(err2);
          }else {
            if (result2.rows[0].exchanged === 'false') {
              response.redirect('/keeper_list');
              console.log("false");
            } else{
              client.query("SELECT budget FROM account WHERE email = '" + result2.rows[0].email + "';", function(err3, result3){
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

                    var update_budget_exchange_in = "UPDATE account SET budget = '" + after_change_in + "' WHERE \
                    email = '" + result2.rows[0].email + "';";
                    client.query(update_budget_exchange_in, function(err4){
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

                    var update_budget_exchange_out = "UPDATE account SET budget = '" + after_change_out + "' WHERE \
                    email = '" + result2.rows[0].email + "';"
                    client.query(update_budget_exchange_out, function(err5){
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
});

}