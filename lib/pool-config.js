var pg = require('pg');
const Pool = require('pg-pool');
const url = require('url')

const params = url.parse(process.env.PEDRO_db_URL);
const auth = params.auth.split(':');

const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  ssl: true
};


const pool = new Pool(config)

module.exports = {
  query: (text, params, callback) => {
  	console.log("Query: " + text)
    return pool.query(text, params, callback)
  }
}