var credentials = {
  user:'chanketyan@gmail.com',
  pass:'zxivzkliyluhagcq'
};

var sEmail = false;

function sendEmail(recipient, subject, text){
	var send = require('gmail-send')({
  	user: credentials.user,           // Your GMail account used to send emails 
  	pass: credentials.pass,           // Application-specific password 
 	to:   recipient,           // Send to yourself 
  	subject: subject,
  	html:    text,  // Plain text 
	})({});                             // Send email without any check 
}

function notSendEmail(recipient, subject, text){

}

if(sEmail){
	module.exports = { 
	  sendEmail: sendEmail 
	} 
}else{
	module.exports = {
		sendEmail: notSendEmail
	}
}
