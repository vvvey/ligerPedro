var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();

module.exports.set = function(router, pool) {

	router.get('/admin/transfer_data', ensureLoggedIn, function (req, res) {
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
					ORDER BY date DESC OFFSET $1 LIMIT $2;",
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
				res.render('admin_transfer_logs', {
					transfer_data: result.rows, 
					previousStart: previousStart, 
					nextStart: nextStart, 
					paginations: paginateArray
				});
			}
		})		
	});

	router.get('/admin/exchange_data', ensureLoggedIn, (req, res) => {
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
			if (err) {
				res.send(err)
			} else {
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

				res.render("admin_exchange_logs", {
					exchange_data: result.rows,
					previousStart: previousStart, 
					nextStart: nextStart, 
					paginations: paginateArray})
			}
		}) 

		
	});

}	
