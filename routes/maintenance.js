var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var User = require('../lib/user') 


module.exports.set = function(router, pool)  {
	router.get('/maintenance/transfer_logs', ensureLoggedIn, User.isRole('admin', 'maintenance_manager'), (req, res) => {
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
	    pool.query("SELECT count(id) from transfer_logs WHERE recipient = 'maintenance@ligercambodia.org' AND finished = 'true';", (err, result) => {
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
					WHERE transfer_logs.recipient = 'maintenance@ligercambodia.org' AND finished = 'true' \
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
				res.render('banks_transferLog', {
					transfer_data: result.rows, 
					previousStart: previousStart, 
					nextStart: nextStart, 
					paginations: paginateArray,
					userData: req.user
				});
			}
		});		
	})

	router.get('/maintenance/overview', ensureLoggedIn, User.isRole('admin', 'maintenance_manager'), (req, res) => {
		var selectmaintenance =  {
			text: "SELECT budget FROM account WHERE email = 'maintenance@ligercambodia.org';"
		}
		var bankBudget; 
		pool.query(selectmaintenance, (err, result) => {
			if(err) {return res.send(err)}
			else {
				bankBudget = result.rows[0].budget;
			}
		});

		var recentTransfer  = {
			text: "	SELECT transfer_logs.*, account.username as sender_username FROM transfer_logs \
					JOIN account ON (transfer_logs.sender = account.email) \
					WHERE recipient = 'maintenance@ligercambodia.org' AND finished = 'true' \
					ORDER BY date DESC LIMIT 4;"
		}

		var recentTransferData;
		pool.query(recentTransfer, (err, result) => {
			if (err) {
				return res.send(err)
			} else {
				recentTransferData = result.rows
			}
		})

		var select = {
			text: "	 SELECT account.apartment, SUM(transfer_logs.amount) \
					FROM transfer_logs \
					JOIN (SELECT email, username, CASE WHEN role != 'apartment' THEN null ELSE username END AS apartment FROM account) AS account \
					ON (transfer_logs.sender = account.email) \
					WHERE transfer_logs.recipient = 'maintenance@ligercambodia.org' AND transfer_logs.finished = 'true' \
					GROUP BY account.apartment ORDER BY account.apartment;"
		}

		pool.query(select, (err, result) => {
 			if (err) {res.send(err)}
 			else {
				res.render('overview', {bankName: 'Maintenance', 
										bankBudget: bankBudget, 
										apartmentData: result.rows, 
										recentTransfer: recentTransferData,
										userData: req.user})
			}
		})
	})
		
}	