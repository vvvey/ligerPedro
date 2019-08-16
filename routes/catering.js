var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var User = require('../lib/user')
var Section = require('../lib/section')
var Validator = require('../lib/validator')
var fix = require('../lib/fixROE');
var moment = require('moment');

module.exports.set = function(router, pool)  {
	router.get('/section/:section', Section.isSection(['catering', 'maintenance', 'utilities', 'residence']), (req, res) => {
		res.redirect('/section/'+ req.params.section + '/overview');
	});

	router.get('/section/:section/transfer_logs', Section.isSection(['catering', 'maintenance', 'utilities', 'residence']), ensureLoggedIn, User.isRole('admin', 'maintenance_manager', 'catering_manager','re'), (req, res) => {

		var section = req.params.section;
		var sectionEmail = req.params.section + "@ligercambodia.org";
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
	    pool.query("SELECT count(id) from transfer_logs WHERE recipient = $1 ;", [sectionEmail], (err, result) => {
	    	var row_number = result.rows[0].count;
	    	console.log("Row number is " + row_number)
	    	// Generate array of object based on number of rows, limit and start
			for (var i = 0; i < Math.ceil(row_number / limit); i++) {
				paginateArray[i] = {
					start: i * limit, // parms of link to start (offset)
					display: i + 1, // number to display
					active: Math.ceil(start/limit) == i ? true : false, // active for CSS
					section: section
				}
			}

			// e.g. paginateArray =
			// [ 	{ start: 0, display: 1, active: false, section: catering },
			//  	{ start: 20, display: 2, active: true, section: catering },
			// 		{ start: 40, display: 3, active: false, section: catering } ]

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
					WHERE transfer_logs.recipient = $3 OR transfer_logs.sender = $3 \
					ORDER BY date DESC, recipient_username DESC  OFFSET $1 LIMIT $2;",
			values: [start, limit, sectionEmail]
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

				console.log("Sectio is really " + section);
				// Render to client
				res.render('banks_transferLog', {
					transfer_data: result.rows,
					previousStart: previousStart,
					nextStart: nextStart,
					paginations: paginateArray,
					userData: req.user,
					section: section
				});
			}
		});
	})

	router.get('/section/:section/overview', Section.isSection(['catering', 'maintenance', 'utilities', 'residence']), ensureLoggedIn, User.isRole('admin', 'maintenance_manager', 'catering_manager','re'), (req, res) => {
		var section = req.params.section;
		var sectionEmail = req.params.section + "@ligercambodia.org";

		var selectCatering =  {
			text: "SELECT budget FROM account WHERE email = $1;",
			values: [sectionEmail]
		}
		var bankBudget;
		pool.query(selectCatering, (err, result) => {
			if(err) {return res.send(err)}
			else {
				bankBudget = result.rows[0].budget;
			}
		});

		var recentTransfer  = {
			text: "	SELECT transfer_logs.*, account.username as sender_username FROM transfer_logs \
					JOIN account ON (transfer_logs.sender = account.email) \
					WHERE recipient = $1 \
					ORDER BY date DESC LIMIT 4;",
					values: [sectionEmail]
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
					WHERE transfer_logs.recipient = $1  \
					GROUP BY account.apartment ORDER BY account.apartment;",
					values: [sectionEmail]
		}

		pool.query(select, (err, result) => {
 			if (err) {res.send(err)}
 			else {
				res.render('overview', {bankName: section.toUpperCase(),
										bankBudget: bankBudget,
										apartmentData: result.rows,
										recentTransfer: recentTransferData,
										userData: req.user})
			}
		})

	});

	router.get('/section/:section/refund', Section.isSection(['catering', 'maintenance', 'utilities', 'residence']), ensureLoggedIn, User.isRole('admin', 'maintenance_manager', 'catering_manager','re'), async (req, res) => {
		var section = req.params.section;
		var sectionEmail = req.params.section + "@ligercambodia.org";

		var emailFromDatabase = await pool.query("SELECT email FROM account WHERE role = 'senior_student' or role = 'apartment' ORDER BY role, username");
		var emailList = [];
		for(var i = 0; i < emailFromDatabase.rows.length; i++){
			emailList.push(emailFromDatabase.rows[i].email);
		}

		var resultingBudget = await pool.query("SELECT *  FROM account WHERE email = $1;", [sectionEmail]);
		resultingBudget = resultingBudget.rows[0].budget;


		res.render('refund', {
								sectionEmail: sectionEmail,
								emailList: emailList,
								resultingBudget: resultingBudget,
								userData: req.user})
	});

	router.post('/transfer_confirmation', function(req, res) {
		pool.quersy("SELECT budget FROM account where email = $1", [req.user.email], function(err, result) {

			if (err) {
				console.error(err);
				res.send("Error" + err);
			} else {
				res.render('transfer_confirmation', {
					budget: result.rows,
					recipient: req.body.recipient,
					amount: req.body.amount,
					reason: req.body.reason
				});
			}
		})
	});

	//if the validateTransfer success, the middleware just call queries to database
	router.post('/section-refund', Validator.sectionRefund , async function (req, res) {
		const senderEmail = req.body.sender;
		const recipientEmail = req.body.recipient;
		const reason = req.body.reason;

		const senderCurrentBudget = req.session.senderBudget;
		const recipientCurrentBudget = req.session.recipientBudget;
		delete req.session.senderBudget;
		delete req.session.recipientBudget;

		const transferBudget = parseFloat(req.body.amount);
		const senderNewBudget = fix.fixROE(senderCurrentBudget - transferBudget);
		const recipientNewBudget = transferBudget + recipientCurrentBudget;
		console.log("senderCurrentBudget: " + senderCurrentBudget);
		console.log("transferBudget: " + transferBudget)
		console.log("Sender New Budget: " + senderNewBudget)
		console.log("Recipient New Budget: " + recipientNewBudget)

	/*
			send email
	*/

		//get sender email
		//senderEmail

		//get amount
		var amount = req.body.amount;

		//get recipient
		//recipientEmail

		//get recipient data
		var recipientData = await pool.query("SELECT * FROM account WHERE email = $1",[recipientEmail]);

		//get recipient name
		var recipientName = recipientData.rows[0].username;

		//get reason
		//reason

		//get sender data
		var senderData = await pool.query("SELECT * FROM account WHERE email = $1",[senderEmail]);

		//get sender name
		var senderName = senderData.rows[0].username;

		//get apartment emails array
		var apartmentEmail = ["a1@ligercambodia.org", "a2@ligercambodia.org", "b3@ligercambodia.org", "b4@ligercambodia.org", "c5@ligercambodia.org", "c6@ligercambodia.org", "d7@ligercambodia.org", "d8@ligercambodia.org"];
		//var apartmentEmail = await pool.query("SELECT * FROM account WHERE role = $1", ["apartment"]);

		//get content
		var contentToTransferer = "Hello, "+senderName+"<br><br>You have succesfully transffered "+amount+" P to "+recipientName+".<br><br>Reason: "+reason;
		var contentToRecipient = "Hello, "+recipientName+"<br><br>You have recieved "+amount+" P from "+senderName+"<br><br>Reason: "+reason+"<br><br><form method=\"get\" action=\"http://ligerpedro.herokuapp.com\"><button class=\"button button1\" style=\"\
		background-color: #4CAF50;\
		/* Green */\
		border: none;\
		color: white;\
		padding: 2% 2%;\
		text-align: center;\
		text-decoration: none;\
		display: inline-block;\
		font-size: 100%;\
		cursor: pointer;\">Check it out</button>";
		var contentToPersonalRecipient = "Hello, "+recipientName+"<br><br>You have recieved "+amount+" P from "+senderName+"<br><br>Reason: "+reason;

		var email = require('../lib/email.js');

		//send email to trasferer #shudsdf
		email.sendEmail(senderEmail,"Transfer Succesful",contentToTransferer);
		// email.sendEmail("ketya.n@ligercambodia.org","Transfer Succesful",contentToTransferer+"<br>Target: "+senderEmail);

		//send email to transfer recipient

		//check if recipient is apartment account
		if (apartmentEmail.includes(recipientEmail))
		{
			//get apartment data
			var apartmentData = await pool.query("SELECT * FROM account WHERE email = $1",[recipientEmail]);
			//get apartment name
			var apartmentName = apartmentData.rows[0].username;
			//get apartment members' data
			var apartmentMembersData = await pool.query("SELECT * FROM account WHERE apartment = $1",[apartmentName.toLowerCase()]);
			//save all apartment members' emails / recipients' emails
			console.log("Apartment Members data : "+apartmentMembersData.rows[0]);
			var apartmentEmailList = [];

			//get all apartment members email
			for (var i = 0; i < apartmentMembersData.rows.length; i++){
				apartmentEmailList.push(apartmentMembersData.rows[i].email);
				console.log("i = " +apartmentMembersData.rows[i].email);
			}
			//send email to apartment members #slfjjsl
			email.sendEmail(apartmentEmailList,"Apartment Transfer Received",contentToRecipient);
			// email.sendEmail("ketya.n@ligercambodia.org","Apartment Transfer Received",contentToRecipient+"<br>Target: "+apartmentEmailList);
		}else //if recipient is not apartment send email to personal account #lsdhf
		{
			email.sendEmail(recipientEmail,"Personal Transfer Received",contentToPersonalRecipient);
			// email.sendEmail("ketya.n@ligercambodia.org","Personal Transfer Received",contentToPersonalRecipient+"<br>Target: "+recipientEmail);
		}

		//Update new budget to the sender and recipient
		pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [senderNewBudget, senderEmail]);
		pool.query("UPDATE account SET budget = $1 WHERE email = $2;", [recipientNewBudget, recipientEmail])

		pool.query("INSERT INTO transfer_logs (amount, sender, recipient, sender_resulting_budget, recipient_resulting_budget, date, reason, timestamp) \
			VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP(2), $6, $7)", [transferBudget, senderEmail, recipientEmail, senderNewBudget, recipientNewBudget, reason, moment().unix()], function (err, result) {
			if (err) {
				res.send(err)
				console.log(err)
			} else {
				res.send('Sent')
			}
		});
	});

	}
