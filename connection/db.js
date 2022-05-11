// import pg package
const {Pool} = require('pg')
 const dbPool = new Pool({
     database:'web_database',
     port:5432,
     user:'postgres',
     password: 'PsD34-21_el'
 })

 module.exports = dbPool