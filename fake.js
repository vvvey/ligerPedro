var fake_account = function(req, res, next) {
  req.user = { provider: 'google-oauth2',
 displayName: 'chanmalika',
 id: 'google-oauth2|103126281815949004359',
<<<<<<< HEAD
 name: { familyName: 'Rith', givenName: 'chanmalika' },
 emails: [ { value: 'chanmalika.r@ligercambodia.org' } ],
=======
 name: { familyName: 'Vey', givenName: 'Vuthy' },
 emails: [ { value: 'meas.v@ligercambodia.org' } ],
>>>>>>> 187bacce2ffcf4aab7e9f7b44661300005ccefde
 picture: 'https://lh3.googleusercontent.com/-_K5tTEkSx7A/AAAAAAAAAAI/AAAAAAAABOs/RwqSzZzapGY/photo.jpg',
 locale: 'en',
 nickname: 'chanmalika',
 identities: 
  [ { provider: 'google-oauth2',
      user_id: '103126281815949004359',
      connection: 'google-oauth2',
      isSocial: true } ],
 _json: 
  { email: 'chanmalika.r@ligercambodia.org',
    name: 'chanmalika Rith',
    given_name: 'chanmalika',
    family_name: 'Rith',
    picture: 'https://lh3.googleusercontent.com/-_K5tTEkSx7A/AAAAAAAAAAI/AAAAAAAABOs/RwqSzZzapGY/photo.jpg',
    locale: 'en',
    nickname: 'chanmalika',
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