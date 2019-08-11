var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var User = require('../lib/user');
var moment = require('moment');
module.exports.set = function(router, pool) {

	router.get('/admin', (req, res) => {
		res.redirect('/admin/user')
	})

	router.get('/admin/transfer_data', ensureLoggedIn, User.isRole('admin'), (req, res) => {
		// req.query.start and req.query.limit is GET request params
		// e.g. /admin/transfer_data?start=10
		// e.g. /admin/transfer_data?start=5&limit=10


		// Check if start parms is valid as a number for OFFSET in database
		// Default: start = 0
		var start;
		if (isNaN(req.query.start) || req.query.start == undefined || req.query.start < 0){
	      start = 0
	    } else {
	      start = parseInt(req.query.start)
	    }

		// Check if limit parms is valid as a number for OFFSET in database
		// Default: limit = 20 meaning that a page would show 20 transfer logs
	    var limit;
	    if (isNaN(req.query.limit) || req.query.limit == undefined || req.query.limit < 0) {
	    	limit = 20;
	    } else {
	    	limit = req.query.limit;
	    }

	    // Query Estimate row number of transfer_logs tableS
	    // For pagnigating purpose
	    // This query should be faster than the next one
	    // After next query is done, code will use row_number to calcuate the pagination system
	    var paginateArray = []
	    pool.query("SELECT count(id) from transfer_logs;", (err, result) => {
	    	var row_number = result.rows[0].count;
	    	console.log("Row number is " + row_number)
	    	// Generate array of object based on number of rows, limit and start
			for (var i = 0; i < Math.ceil(row_number / limit); i++) {
				paginateArray[i] = {
					start: i * limit, // parms of link to start (offset)
					display: i + 1, // number to display
					active: Math.ceil(start/limit) == i ? true : false // active for CSS
				}
			}

			// e.g. paginateArray =
			// [ 	{ start: 0, display: 1, active: false },
			//  	{ start: 20, display: 2, active: true },
			// 		{ start: 40, display: 3, active: false } ]

	    })

		// Query to get transfer logs joining with sender and recipient data (username and img_url)
		// Paginate by OFFSET and LIMIT
		// Additional information needed (username(s) and img_url(s)) and transfer_logs table doesn't have that
		// Using sender and recipient email to join with account table
		// Basic picture: transfer_logs join with sender then join with recipient
		var query = {
			text: "	SELECT \
						transfer_logs.*, \
						sender.username as sender_username, \
						sender.img_url as sender_img_url,\
						recipient.username as recipient_username, \
						recipient.img_url as recipient_img_url \
					FROM transfer_logs \
					JOIN account AS sender on (transfer_logs.sender = sender.email) \
					JOIN account AS recipient on (transfer_logs.recipient = recipient.email) \
					ORDER BY date DESC, recipient_username DESC  OFFSET $1 LIMIT $2;",
			values: [start, limit]
		}

		pool.query(query, (err, result) => {
			if (err) {
				res.send(err);
			} else {
				var previousStart;
				var nextStart;

				// Is there newer transfer log
				if (start  == 0) {
					previousStart = 'none'
				} else {
					previousStart = start - limit;
				}

				// Is there more
				if (result.rows.length < limit) {
					nextStart = 'none';
				} else {
					nextStart = start + limit;
				}

				// Render to client
				res.render('admin/admin_transfer_logs', {
					transfer_data: result.rows,
					previousStart: previousStart,
					nextStart: nextStart,
					paginations: paginateArray,
					userData: req.user
				});
			}
		})
	});

	router.get('/admin/exchange_data', ensureLoggedIn, User.isRole('admin'), (req, res) => {
		// req.query.start and req.query.limit is GET request params
		// e.g. /admin/exchange_data?start=10
		// e.g. /admin/exchange_data?start=5&limit=10


		// Check if start parms is valid as a number for OFFSET in database
		// Default: start = 0
		var start;
		if (isNaN(req.query.start) || req.query.start == undefined || req.query.start < 0){
	      start = 0
	    } else {
	      start = parseInt(req.query.start)
	    }

		// Check if limit parms is valid as a number for OFFSET in database
		// Default: limit = 20 meaning that a page would show 20 transfer logs
	    var limit;
	    if (isNaN(req.query.limit) || req.query.limit == undefined || req.query.limit < 0) {
	    	limit = 20;
	    } else {
	    	limit = req.query.limit;
	    }

		var paginateArray = []
	    pool.query("SELECT count(id) from exchange_list;", (err, result) => {
	    	var row_number = result.rows[0].count;
	    	console.log("Row number is " + row_number)
	    	// Generate array of object based on number of rows, limit and start
			for (var i = 0; i < Math.ceil(row_number / limit); i++) {
				paginateArray[i] = {
					start: i * limit, // parms of link to start (offset)
					display: i + 1, // number to display
					active: Math.ceil(start/limit) == i ? true : false // active for CSS
				}
			}

			// e.g. paginateArray =
			// [ 	{ start: 0, display: 1, active: false },
			//  	{ start: 20, display: 2, active: true },
			// 		{ start: 40, display: 3, active: false } ]

	    })

		var query = {
					text: 	'SELECT exchange_logs.*, exchanger.img_url as exchanger_img_url \
							FROM exchange_list AS exchange_logs \
							JOIN account AS exchanger \
							ON (exchange_logs.email = exchanger.email) ORDER by timecreated DESC \
							OFFSET $1 LIMIT $2;',
					values: [start, limit]
		}

		pool.query(query, (err, result) => {
			if (err) { res.send(err)}

			else {
				console.log(paginateArray)
				var previousStart;
				var nextStart;

				// Is there newer transfer log
				if (start  == 0) {
					previousStart = 'none'
				} else {
					previousStart = start - limit;
				}

				// Is there more
				if (result.rows.length < limit) {
					nextStart = 'none';
				} else {
					nextStart = start + limit;
				}

				res.render("admin/admin_exchange_logs", {
					exchange_data: result.rows,
					previousStart: previousStart,
					nextStart: nextStart,
					paginations: paginateArray,
					userData: req.user
				})
			}
		})
	});

	router.get("/admin/user", ensureLoggedIn, User.isRole('admin'), async(req, res) => {
		// Group account by apartment, sorted by username, all information from user turn into json then array aggreate


		var totalBudget = await pool.query("SELECT sum(budget) as total_system_balance FROM account;");
		totalBudget = totalBudget.rows[0].total_system_balance;

		var query = {
			text: "	SELECT 	apartment, \
											sum(budget) AS apartment_total_budget, \
							array_agg(json_build_object(\
								'username', username, \
								'email', email, \
								'apartment', apartment, \
								'budget', budget, \
								'role', role, \
								'img_url', img_url)) \
							AS apartment_member \
					FROM (SELECT * FROM account ORDER BY username ASC) AS account  \
					GROUP BY apartment ORDER BY apartment;"
		}

		pool.query(query, (err, result) => {
			if (err) {res.send(err)}
			else {
				console.log(req.user)
				console.log(result.rows[0])
				res.render("admin/admin_user_profile", {user_info: result.rows, userData: req.user, totalBudget: totalBudget});

			}
		})
	})


	router.post("/admin/delete/user", ensureLoggedIn, User.isRole('admin'), (req, res) => {
			const deletQuery = {
				text: "DELETE FROM account WHERE email = $1 and username = $2;",
				values: [req.body.user_email, req.body.username]
			}

			pool.query(deletQuery, (err, result) => {
				if (err) {res.send(err)}
				else {
					if (result.rowCount == 0) { //rowCount = 0 means that the query didn't find the account
						res.status(200).send("Account is not exists!")
					} else {
						res.send("Done")
					}
				}

			})
		}
	);

	router.post("/admin/update/user", ensureLoggedIn, User.isRole('admin'), async(req, res) => {
		// req.body valuds pass through depend on client update specific inputs

		var bodyColumnArray = Object.keys(req.body); // Turn key of body object to array e.g. {'email': '...'} --> ['email']
		var userOriginalEmailIndex = bodyColumnArray.indexOf("user_original_email") // find 'user_original_email' from array
		if (userOriginalEmailIndex == -1) {
			return res.status(500).send("user_original_email is need!");
		}

		bodyColumnArray.splice(userOriginalEmailIndex, 1) // delete user_original_email from the array

		// SELECT column name and datatype from account
		const columnQuery = {
			text: "SELECT 	array(SELECT column_name::text FROM information_schema.columns WHERE table_name='account') AS column_names, \
							array(SELECT data_type::text FROM information_schema.columns WHERE table_name='account') as data_type;"
		}

		var columns = await pool.query(columnQuery);

		var databaseColumnArray = columns.rows[0];
		var valueColumnArray = new Array();

		// Find if the key from request body is match with the database
		// if so push to valuesColumnArray
		for (var column of bodyColumnArray) {
			var index = databaseColumnArray.column_names.indexOf(column)
			if (databaseColumnArray.column_names.indexOf(column) == -1) {
				return res.send(column + " column is not found!")
			} else {
				// If datatype if numberic, parseFloat it
				if (databaseColumnArray.data_type[index] == "numeric") {
					valueColumnArray.push(parseFloat(req.body[column]))
				} else {
					valueColumnArray.push(req.body[column])
				}
			}
		}

		var parms = []
		for (var i = 2; i <= valueColumnArray.length + 1; i++) {
			parms.push('$'+i);
		}
		parms = parms.join(',')
		var updateQuery = 'update account set (' + bodyColumnArray.join(',') +') = ('+ parms +') where email = $1;'

		// ... set (budget, img_url, ...) = (12, 'http://', ...) where email = 'someone@ligercambodia.org'
		// ... set (budget, img_url, ...) = ($2, $3, ...) where email = $1
		pool.query(updateQuery, [req.body.user_original_email].concat(valueColumnArray) ,(err, result)=> {
			if (err){
				res.send(err)
			} else {
				res.send("Updated!")
			}
		})
	});

	router.post("/admin/new/user", ensureLoggedIn, User.isRole('admin'), async(req, res) => {
		// VALIDATION is still needed

		var bodyRequest = req.body;

		const existsQuery = {
			text: "	SELECT exists \
					(SELECT * FROM account WHERE email = $1 or username = $2);",
			values: [req.body.email, req.body.username]
		}

		const isAccountExist = await pool.query(existsQuery);

		if(isAccountExist.rows[0].exists) {
			return res.status(200).send("Username or email is already exists!")
		}

		if(bodyRequest.apartment == '') {
			bodyRequest.apartment = null
		}

		if(bodyRequest.img_url == '') {
			bodyRequest.img_url = null
		}

		const insertQuery = {
			text: "INSERT INTO account (username, email, budget, role, apartment, img_url) \
					VALUES ($1, $2, $3, $4, $5, $6);",
			values: [bodyRequest.username, bodyRequest.email, parseFloat(bodyRequest.budget), bodyRequest.role, bodyRequest.apartment, bodyRequest.img_url]
		}

		pool.query(insertQuery, (err, result) => {
			if (err) {res.send(err)}
			else {
				res.send("Inserted")
			}
		})
	});

	router.post("/admin/send/apartment", ensureLoggedIn, User.isRole('admin'), async(req, res) => {
		//  VALIDATION need DEVELOPMENT
		var requestBody = req.body;

		const apartment_list = {
			text: "SELECT array(SELECT apartment FROM account GROUP BY apartment HAVING apartment IS NOT NULL) AS apartment_list;",
		}

		var apartment = await pool.query(apartment_list);

		var apartmentFromDatabase = apartment.rows[0].apartment_list; // apartment_list: ['a1', 'a2', 'b3', ...]

		// Check apartment from req.body.apartment_list array if it contains in database
		for (var i = 0; i < requestBody.apartment_list.length; i++) {
			if (apartmentFromDatabase.indexOf(requestBody.apartment_list[i]) == -1 ) {
				return res.send(requestBody.apartment_list[i] + " apartment is not exists")
			}
		}
		// If n
		if (isNaN(req.body.amount)) {
			return res.status(500).send("Amount is in valid number;")
		}

		// inserting and also update admin's budget for every insert by TRIGGER but not update to recipients
		// date is the same so we sorted the username and inserted by order A-Z
		var transferLogsInsertingQuery = {
			text: "	INSERT INTO transfer_logs (date, sender, recipient, amount, reason, recipient_resulting_budget, timestamp) \
					SELECT ((CURRENT_TIMESTAMP(2))), $1, email, $2, $3, (budget + $2::numeric),$5 FROM account \
					WHERE apartment = ANY($4::text[]) ORDER BY username ASC;",
			values: [req.user.email, parseFloat(req.body.amount), req.body.reason, req.body.apartment_list, moment().unix()	]
		}

		// Trigger exists in database
 		//
		// 	CREATE TRIGGER admin_resulting_budget_update AFTER INSERT ON transfer_logs
		// 		FOR EACH ROW EXECUTE PROCEDURE update_admin();

		/// -------------------------------------------------------------------------


		// CREATE or REPlACE FUNCTION update_admin() RETURNS trigger AS $BODY$
		// 		DECLARE sender_budget int := (SELECT budget FROM account WHERE email = NEW.sender);
		// 	  DECLARE sender_role text := (SELECT role FROM account WHERE email = NEW.sender);
		// 		BEGIN
		// 			IF NEW.sender_resulting_budget IS NULL AND sender_role = 'admin' THEN
		// 				UPDATE account SET budget = budget - NEW.amount WHERE email = NEW.sender;
		// 				UPDATE transfer_logs SET sender_resulting_budget = sender_budget - NEW.amount WHERE id = NEW.id;
		// 			END IF;
		// 			RETURN NEW;
		// 		END;
		// 	$BODY$
		// 	language plpgsql

		pool.query(transferLogsInsertingQuery, (err, result) => {
			if (err) {
				console.log(err)
				res.send(err);
			} else {
				res.send("Sent")
			}
		})

		//  Update to recipient budget
		var updateRecipientBudget = {
			text: "	UPDATE account SET budget = budget + $1::numeric WHERE apartment = ANY($2::text[]);",
			values: [req.body.amount, req.body.apartment_list]
		}

		pool.query(updateRecipientBudget, (err, result) => {
			if (err) {
				console.log(err)
			}
		})
	})
}
