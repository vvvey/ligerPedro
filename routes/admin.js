var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');

module.exports.set = function(router, pool) {
	router.get('/admin/transfer_data', ensureLoggedIn, function (req, res) {
		pool.query("SELECT * from transfer_logs ORDER BY date DESC LIMIT 10", function(err, result) { 
			if (err) {
				res.send(err);
			} else {
				res.render('admin_transfer_logs', {transfer_data: result.rows});
			}
		})		
	})
}