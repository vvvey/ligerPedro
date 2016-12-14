var express = require('express');
var exphbs  = require('express-handlebars');
var app = express();
var pg = require('pg');

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.set('port', (process.env.PORT || 5000));

app.get('/', function (req, res) {
    res.render('home');
});


app.get('/about_us', function(req,res){
	res.render('about_us');
});

app.get('/login', function(req,res){
  res.render('login');
});

app.get('/exchanging_system', function(req,res){
  res.render('exchanging_system');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.use(express.static('public/'));
