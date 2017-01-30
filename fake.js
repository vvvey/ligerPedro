var fake_account = function(req, res, next) {
  req.user = { provider: 'google-oauth2',
 displayName: 'Keeper',
 id: 'google-oauth2|103126281815949004359',
 name: { familyName: 'Rith', givenName: 'chanmalika' },
 emails: [ { value: 'dalin.l@ligercambodia.org' } ], //meas.v@ligercambodia.org dalin.l@ligercambodia.org
 picture: 'https://lh3.googleusercontent.com/-_K5tTEkSx7A/AAAAAAAAAAI/AAAAAAAABOs/RwqSzZzapGY/photo.jpg',
 locale: 'en',
 nickname: 'meas',
 identities: 
  [ { provider: 'google-oauth2',
      user_id: '103126281815949004359',
      connection: 'google-oauth2',
      isSocial: true } ],
 _json: 
  { email: 'dalin.l@ligercambodia.org',
    name: 'Sreymeas Veng',
    given_name: 'Keeper',
    family_name: 'Rith',
    picture: 'https://lh3.googleusercontent.com/-_K5tTEkSx7A/AAAAAAAAAAI/AAAAAAAABOs/RwqSzZzapGY/photo.jpg',
    locale: 'en',
    nickname: 'meas',
    email_verified: true,
    clientID: 'Ja0xp4izkbEkCK8nX15wqHezCc6hsirE',
    updated_at: '2017-01-17T15:09:43.561Z',
    user_id: 'google-oauth2|103126281815949004359',
    identities: [ [Object] ],
    created_at: '2017-01-14T01:58:37.669Z',
    sub: 'google-oauth2|103126281815949004359' },
 _raw: '{"email":"chanmalika.r@ligercambodia.org","name":"chanmalika Rith","given_name":"chanmalika","family_name":"Rith","picture":"https://lh3.googleusercontent.com/-_K5tTEkSx7A/AAAAAAAAAAI/AAAAAAAABOs/RwqSzZzapGY/photo.jpg","locale":"en","nickname":"vuthy.v","email_verified":true,"clientID":"Ja0xp4izkbEkCK8nX15wqHezCc6hsirE","updated_at":"2017-01-17T15:09:43.561Z","user_id":"google-oauth2|103126281815949004359","identities":[{"provider":"google-oauth2","user_id":"103126281815949004359","connection":"google-oauth2","isSocial":true}],"created_at":"2017-01-14T01:58:37.669Z","sub":"google-oauth2|103126281815949004359"}' }
next();
}



module.exports = fake_account;