var express = require('express');
var exphbs  = require('express-handlebars');
var app = express();
var pg = require('pg');

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("SELECT * FROM user_history WHERE email = 'visal.s@ligercambodia.org'", function(err, result){
      done();
      if(err)
        {console.error(err); response.send("Error " + err);}
      else
        {response.render('home', {results: result.rows});}
    });
  });
});

app.get('/home', function (req, res) {
    res.render('home');
});


app.get('/about_us', function(req,res){
	res.render('about_us');
});

app.get('/login', function(req,res){
  res.render('login');
});

app.get('/db', function (request, response) {
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
    client.query('SELECT * FROM account', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.render('db', {columns: result.fields, results: result.rows}); }
    });
  });
});

app.get('/exchanging_system', function(req,res){
  res.render('exchanging_system');
});



app.get('/history', function(request, response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("SELECT * FROM user_history WHERE email = 'visal.s@ligercambodia.org'", function(err, result){
      done();
      if(err)
        {console.error(err); response.send("Error " + err);}
      else
        {response.render('history', {results: result.rows});}
    });
  });
});

app.get('/transfer', function(req, res){
  res.render('transfer');
});

app.get('/exchange', function(req, res){
  res.render('exchange');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.use(express.static('public/'));
