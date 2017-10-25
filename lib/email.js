var credentials = {
  user:'chanketyan@gmail.com',
  pass:'zxivzkliyluhagcq'
};

function sendEmail(recipient, subject, text){
	var send = require('gmail-send')({
  	user: credentials.user,           // Your GMail account used to send emails 
  	pass: credentials.pass,           // Application-specific password 
 	to:   recipient,           // Send to yourself 
  	subject: subject,
  	text:    text,  // Plain text 
	})({});                             // Send email without any check 
}
module.exports = { 
  sendEmail: sendEmail 
} 