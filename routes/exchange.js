var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');

module.exports.set = function(router) {

	router.post('/exchange_confirmation', function(req, res) {
	  res.render('exchange_confirmation', {amount: req.body.amount, result: req.body.result, reason: req.body.reason});
	});

	router.get('/exchange_approving', ensureLoggedIn, function(req,res){
	  res.render('exchange');
	});

	router.get('/exchanging_system', function(req,res){
	    res.render('exchanging_system');
	});

	router.get('/exchange', ensureLoggedIn, function(request,response){
	  var user;
	  var current_budget;
	  var pending_budget = 0;
	  var valid_budget;

	  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
	    client.query("PREPARE account_table(TEXT) AS \
	     SELECT * FROM account WHERE email = $1;\
	      EXECUTE account_table('" + request.user.email + "');\
	      DEALLOCATE PREPARE account_table", function(err, result){
	      
	      if(err){
	        console.error(err);
	      }else{
	        user = request.user;
	        current_budget = result.rows[0].budget; 
	        //console.log(current_budget)
	        client.query("PREPARE get_pending_budget(TEXT) AS \
	        SELECT * FROM exchange_list WHERE email = $1 AND pending = true AND type = 'Pedro to Dollar';\
	        EXECUTE get_pending_budget('" + request.user.email + "');\
	        DEALLOCATE PREPARE get_pending_budget", function(err1, result1){
	          if(err1) {
	            console.error(err);
	          } else {

	            for(var i = 0; i < result1.rows.length; i++) {
	              pending_budget += parseFloat(result1.rows[i].amount);
	            }
	            response.render('exchange', {user: user, title: 'Exchange', budget: current_budget, pending_budget: pending_budget, valid_exchange_budget: current_budget  - pending_budget});
	          }
	        });
	      }
	    });   
	  });
	});

	router.post('/exchange_approving', function(req,res){
	  var exchangeLog = {
	    timeCreated: Date.now(),
	    person: req.user._json.name,
	    email: req.user._json.email,
	    type: req.body.exchangeType,
	    amount: req.body.amount ,
	    result: req.body.result,
	    reason: req.body.reason,
	    re: null,
	    approved: null,
	    timeApproved: null,
	    exchanged: null,
	    timeExchanged:null,
	    apptDate: req.body.apptDate,
	    apptTime: req.body.apptTime    
	  }

	  var apptDate = exchangeLog.apptDate;
	  var apptTime = 16;

	    apptDate = new Date(apptDate);
	    apptDate.setHours(apptTime);
	    apptDate = apptDate.getUTCFullYear() + '-' +
	            ('00' + (apptDate.getUTCMonth() + 1)).slice(-2) + '-' +
	            ('00' + apptDate.getUTCDate()).slice(-2) + ' ' +
	            ('00' + apptDate.getUTCHours()).slice(-2) + ':' +
	            ('00' + apptDate.getUTCMinutes()).slice(-2) + ':' +
	            ('00' + apptDate.getUTCSeconds()).slice(-2); 
	  console.log("SQL DAte is: " + apptDate);
	  
	  var query = "PREPARE newExchange (TEXT, numeric, numeric, TEXT, TIMESTAMP) AS \
	  INSERT INTO exchange_list (timeCreated, person, email, type, amount, result, reason, apptdate)\
	  VALUES (CURRENT_TIMESTAMP(2), '" + exchangeLog.person +"', '" + exchangeLog.email +"',\
	  $1, $2::float8::numeric::money, $3::float8::numeric::money, $4, $5);\
	  EXECUTE newExchange('"+ exchangeLog.type+"', '"+ exchangeLog.amount+"', '"+ exchangeLog.result+"', '"+ exchangeLog.reason+"', '" + apptDate+"'); \
	  DEALLOCATE PREPARE newExchange;"

	  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
	    client.query(query, function(err, result) {
	      done();
	      if(err) {
	        console.log(err);
	      } else {
	        client.query("SELECT * FROM account WHERE email = ('" + req.user.email + "')", function(err, result1){
	          done();
	          if(err){
	            console.log('Error: ' + err);
	          }else{
	            res.render('exchange_approving',   {user: req.user, data: result1.rows});
	          }
	        });
	      }
	    })
	  });
	});

	router.post('/exchange_list/approve/:id',function(req, res, next) {
	  var exchangeReq_id = req.params.id;
	  console.log("Exhnage id: " + exchangeReq_id);
	  if(exchangeReq_id === undefined){
	    //console.log(exchangeReq_id)
	    res.redirect('/exchange_list');
	  }
	  var status = req.body.status;
	  var re = req.user._json.given_name;

	  var query = "UPDATE exchange_list SET re = '"+ re +"', approved = '"+ status +"', timeapproved = CURRENT_TIMESTAMP(2) \
	  WHERE id = '"+ exchangeReq_id +"';"

	  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
	    client.query(query, function(err, result){
	      if (err) {
	        console.log(err)
	      } else {
	        res.redirect('/exchange_list')
	      }
	    })
	  })
	});
	  
	router.get('/exchange_list', function(req,res){
	  var email = req.user.email;
	  var userName = req.user._json.name;
	  var exchangeListQuery = "SELECT * FROM exchange_list \
	  ORDER BY timecreated DESC;";
	  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
	    client.query("SELECT * FROM account WHERE email = '"+ email +"'", function(err, result) {
	      if(err){
	        console.error(err); 
	        res.send("Error " + err);
	      }else{
	        if(result.rows[0].role == 're'){
	          client.query(exchangeListQuery, function(err2, result2) {
	            done();
	            if (err2) {
	              console.log(err2)
	            } else {
	              res.render('exchange_list', {requestRow: result2.rows, requestCol: result2.fields, user: req.user, data: result.rows});
	            }
	          })
	        } else {
	          res.render('notFound');
	        }
	      }
	    });
	  })
	});
}

