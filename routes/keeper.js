var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
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
        } else {
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
}