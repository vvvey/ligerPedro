//var email = 'meas.v@ligercambodia.org';
var email = 'dalin.l@ligercambodia.org';
//var email = 'visal.s@ligercambodia.org';
//var email = 'somphors.y@ligercambodia.org';
//var email = 'vuthy.v@ligercambodia.org';
//var email = 'sovannou.p@ligercambodia.org';
//var email = 'hongly.p@ligercambodia.org';

var fake_account = function(req, res, next) {
  req.user = { id: '103126281815949004359',
displayName: 'Vuthy Vey',
image: 'https://lh3.googleusercontent.com/-_K5tTEkSx7A/AAAAAAAAAAI/AAAAAAAABOs/RwqSzZzapGY/photo.jpg?sz=50',
email: email,
fullName: 'Vuthy Vey' }

next();
}



module.exports = fake_account;
