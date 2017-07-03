var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');

module.exports.set = function(router, pool) {
	// router.get('admin/transfer_data', ensureLoggedIn, function (req, res) {
	// 	res.redirect('')
	// });

	router.get('/admin/transfer_data', ensureLoggedIn, function (req, res) {
		console.log(req.query.offset)

		if(isNaN(req.query.offset) || req.query.offset == undefined){
			var offset = 0
		} else {
			var offset = req.query.offset
		}

		offset = parseInt(offset)

		pool.query("select transfer_logs.*, sender.sender_username, sender.sender_img_url, recipient.recipient_username, recipient.recipient_img_url from (select transfer_logs.id, account.username as sender_username, account.img_url as sender_img_url from transfer_logs inner join account on (transfer_logs.sender = account.email)) as sender inner join (select transfer_logs.id, account.username as recipient_username, account.img_url as recipient_img_url from transfer_logs inner join account on (transfer_logs.recipient = account.email)) as recipient on (sender.id = recipient.id) join transfer_logs on (sender.id = transfer_logs.id);", function(err, result) { 
			if (err) {
				res.send(err);
			} else {
				res.render('admin_transfer_logs', {transfer_data: result.rows, nextOffset: offset+30, previousOffset: offset-30});
			}
		})		
	});

}	

// select transfer_logs.id, transfer_logs.amount, vuthy.username 
//from transfer_logs inner join 
//(select id, json_agg(username) as username from 
//(SELECT transfer_logs.id, account.username from transfer_logs join account on 
//(transfer_logs.sender = account.email or transfer_logs.recipient = account.email)) 
//as vuthy group by id) as vuthy on (transfer_logs.id = vuthy.id);

//select transfer_logs.*, user.* from transfer_logs inner join (select sender.id, sender.username as sender_username, recipient.username as recipient username from (select transfer_logs.id, account.username from transfer_logs inner join account on (transfer_logs.sender = account.email)) as sender inner join (select transfer_logs.id, account.username from transfer_logs inner join account on (transfer_logs.recipient = account.email)) as recipient on (sender.id = recipient.id)) as user on (user.id = transfer_logs.id);

//select transfer_logs.*, sender.sender_username, recipient.recipient_username from (select transfer_logs.id, account.username as sender_username from transfer_logs inner join account on (transfer_logs.sender = account.email)) as sender join (select transfer_logs.id, account.username as recipient_username from transfer_logs inner join account on (transfer_logs.recipient = account.email)) as recipient on (sender.id = recipient.id) join transfer_logs on (sender.id = transfer_logs.id);