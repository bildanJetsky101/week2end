// memanggil package express
const express = require('express')

const month = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

const allProjects = []


// import db connection
const db = require('./connection/db')

const flash = require('express-flash')
const session = require('express-session')
const { render } = require('express/lib/response')

// menggunakan package express
const app = express()

// menggunakan static folder
app.set('view engine', 'hbs')

app.use('/asset/css', express.static(__dirname + '/asset/css'))

app.use('/asset/img', express.static(__dirname + '/asset/img'))

app.use('/asset/webfonts', express.static(__dirname + '/asset/webfonts'))

app.use('/public', express.static(__dirname + '/public'))

app.use('/uploads', express.static(__dirname + '/uploads'))

// use express
app.use(flash())

// setup session middleware 
app.use(
    session({
        cookie: {
              httpOnly: true,
              secure: false,
              maxAge: null
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave:false,
        secret:'secretValue'
    })
)

// jembatan untuk mengirim data dari frontend ke backend
app.use(express.urlencoded({extended: false}))

// const isLogin = true

// import middleware upload
const upload = require('./middleware/uploadFile')

// endpoint
app.get('/', function(req, res) {
    res.render('index-home', {isLogin:req.session.isLogin, user:req.session.user })
})

// req = client menuju server
// res = dari server menuju client

app.get('/index-home', function (req, res) {
    let query = ''
    if(req.session.isLogin){
    let query = `SELECT name, image, name AS author_id, web.id, title, "desc", duration, posted
                 FROM web
                 LEFT JOIN user_tb
                 ON user_tb.id = web.author_id
                 WHERE author_id=${req.session.user.id}
                 ORDER BY id DESC ;`
    } else {
      query = `SELECT name, image, name AS author_id, web.id, title, "desc", duration, posted
                FROM web
                LEFT JOIN user_tb
                ON user_tb.id = web.author_id
                ORDER BY id DESC ;`
    }             
    db.connect((err, client, done)=> {
        if(err) throw err

        client.query(query, (err, result) =>{
            done()
            if(err) throw err
            let data = result.rows
            data = data.map((project)=>{
                return {
                  ...project,
                  //posted : getFullTime(project.posted),
                  isLogin : req.session.isLogin
                }
            })

            console.log(data)
            console.log('dari req '+ req.session.isLogin)
            res.render('index-home', {
              isLogin : req.session.isLogin, 
              user : req.session.user,
              project : data})
        })
    })
})


app.post('/edit/:id', function(req, res) {
    let id = req.params.id

    const title = req.body.name
    const startDate = req.body.startDate
    const endDate = req.body.endDate
    const tech = req.body.checkbox
    const description = req.body.description
    const image = req.body.upload

    db.connect((err, client, done) =>{
      if (err) throw err
      let query = `UPDATE web SET title='${title}', "desc"='${description}, image='${image}' 
      WHERE id=${id}`

      client.query(query, (err, result) =>{
        done()
        if(err) throw err

        res.redirect('/index-home')
      })
    })
})

app.get('/delete-project/:id', function(req, res){
    const id = req.params.id

    // if(!isLogin){return res.redirect('/index-home')}

    db.connect((err, client, done)=>{
        if(err) throw err

        let query = `DELETE FROM web WHERE id=${id}`

        client.query(query, (err, result)=>{
            done()
            if(err) throw err

            res.redirect('/index-home')
        })
    })
})


app.get('/register', function(req, res){
  res.render('register')
})

app.post('/register', function(req, res){
  const {name, email, password} = req.body
  const bcrypt = require('bcrypt');
  // const hash = bcrypt.hashSync(password, 10);
  const hash2 = bcrypt.hashSync(password, 10);

  db.connect((err, client, done)=>{
      if(err) throw err

      let query = `INSERT INTO "user_tb"(name, email, password) VALUES('${name}','${email}','${hash2}')`
        console.log('It is normal if you can see this')
        console.log(name + email + password)
       client.query(query,(err, result) =>{
            done()
            if(err) throw err
            console.log('hello')
            req.flash('success', 'Account success')
            res.redirect('/login')
            console.log('you supposed to able to see this')
       })
  })


  // db.connect((err, client, done)=>{
  //   if (err) throw err

  //   let query = `INSERT INTO web(title, duration, "desc", author, image) VALUES 
  //   ('${project.title}','${project.duration}','${project.description}','${project.image}','${project.author}')`
  //   client.query(query, (err, result) =>{
  //       done()
  //       if (err) throw err

  //       res.redirect('/index-home')

  //   })
  // })


})

app.get('/login', function(req, res){
    res.render('login')
   
})

app.post('/login', function(req, res){
    const {email, password} = req.body

    db.connect((err, client, done) =>{
        if(err) throw err

        let query = `SELECT * FROM user_tb WHERE email='${email}'`

        client.query(query, (err, result)=>{
            done()
            if (err) throw err

            if(result.rowCount == 0){
                req.flash('danger','account not found')
                return res.redirect('/login')
            }

            const bcrypt = require('bcrypt');
            const tbPass = result.rows[0].password
            let isMatch = bcrypt.compareSync(password, result.rows[0].password)
            console.log(isMatch)
            console.log(password)
            console.log(result.rows[0].password)

            if(isMatch){
              req.session.isLogin = true
              req.session.user = {
                  id : result.rows[0].id,
                  name : result.rows[0].name,
                  email : result.rows[0].email
                }
                console.log(result.rows[0].name)
                console.log(req.session.user)

              req.flash('success','Login success')
              res.redirect('/index-home')
            } else {
              res.redirect('/login')
              req.flash('danger','Wrong Password')
              console.log('doesnt match')
            }
        })
      })
})

app.get('/form-project', function(req, res) {
  res.render('form-project', {isLogin:req.session.isLogin, user:req.session.user})
}) 

const takeTechVal = []

app.post('/form-project', upload.single('image'), function (req, res) {
  const title = req.body.name
  const startDate = req.body.startDate
  const endDate = req.body.endDate
  const tech = req.body.checkbox
  const description = req.body.description
  const image = req.body.upload
  const date = new Date()

  for(let i = 0; i < tech.length; i++) {
    takeTechVal.push(tech[i])
  }

  const val = []
  for(let i = 0 ; i < tech.length; i++){
        if(tech[i] == '0') {
          val.push(`fa-node-js`)
        } else if (tech[i] == '1') {
          val.push(`fa-vuejs`)
        } else if (tech[i] == '2') {
          val.push(`fa-react`)
        } else {
          val.push(`fa-python`)
        }
  }

  let project = {
    title : title,
    description : description,
    startDate: startDate,
    endDate: endDate,
    author : req.session.user.id,
    //tech : val.join(),
    duration : duration(startDate, endDate),
    image : req.file.filename,
    //posted : getFullTime(date)
   
  }
  //console.log('ini adalah project '+project.tech)
  // allProjects.push(project)
  console.log(project.image)

  db.connect((err, client, done)=>{
    if (err) throw err

    let query = `INSERT INTO web(title, duration, "desc", author_id, image) VALUES 
('${project.title}','${project.duration}','${project.description}',${project.author},'${project.image}')`
    client.query(query, (err, result) =>{
        done()
        if (err) throw err

        res.redirect('/index-home')

    })
  })
})


app.get('/form-contact', function (req, res) {
  res.render('form-contact',{isLogin:req.session.isLogin, user:req.session.user})
})


app.get('/edit/:id', function (req, res) {
  let id = req.params.id
  // console.log('id params' + id)
  db.connect((err, client, done) =>{
      if(err) throw err

      let query = `SELECT * FROM web WHERE id=${id}`
      client.query(query, (err, result) =>{
          done()
          if(err) throw err

          result = result.rows[0]
          console.log(result)

          res.render('edit', {project : result} )
      })

  // const editProject = allProjects[id]
  // console.log(editProject)
  // console.log(takeTechVal)
  })
})

app.get('/project-detail/:id', function (req, res) {
  let id = req.params.id
  console.log('id params' + id)
  db.connect((err, client, done)=>{
      if(err) throw err

      let query = `SELECT * FROM web WHERE id=${id}`
      // let query2 = `SELECT name, image, name AS author_id, web.id, title, "desc", duration, posted
      //               FROM web
      //               LEFT JOIN user_tb
      //               ON user_tb.id = web.author_id
      //               WHERE id=${id}
      //               ORDER BY id DESC ;`

      client.query(query, (err, result)=>{
          done()
          if(err) throw err

          result = result.rows[0]
          console.log(result)
          res.render('project-detail', {project : result})
      })
  })
})

app.get('/logout', function(req, res){
    req.session.destroy()
    res.redirect('index-home')
})

// endpoint
const port = 3000
app.listen(port, function(){
  console.log('server running on port ' + port)
})

function getFullTime(time) {
  // merubah format waktu -> butuh waktu yang akan diubah
  const date = time.getDate()
  const monthIndex = time.getMonth()
  const year = time.getFullYear()
  const hour = time.getHours()
  let minute = time.getMinutes()
  if (minute < 10) {
    minute = '0' + minute
  }

  return `${date} ${month[monthIndex]} ${year} ${hour}:${minute} WIB `
}

function duration(start, end){
  const dateStart = new Date(start)
  const dateEnd = new Date(end)
  const durationTime = Math.abs(dateEnd - dateStart)
  let days = Math.ceil(durationTime/(1000 * 60 * 60 * 24))

    if(days === 7){
      days = '1 Minggu'
  } else if (days === 14) {
      days = '2 Minggu'
  } else if (days === 21) {
      days = '3 Minggu' 
  } else if (days >= 29 && days <= 31){
      days = '1 Bulan'
  } else if (days >= 58 && days <= 61){
      days = '2 Bulan'
  } else if (days >= 87 && days <= 93){
      days = '3 Bulan'
  } else {days += ' Hari'}

  console.log(days)

  return days
}