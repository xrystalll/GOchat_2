const fs = require('fs')
const path = require('path')

const conf = require(path.join(__dirname, 'config.json'))

const express = require('express')
const app = express()
const server = require('http').createServer(app)

const hpp = require('hpp')
const helmet = require('helmet')
const xssFilter = require('x-xss-protection')

const Mongoose = require('mongoose')
require(path.join(__dirname, 'modules', 'DB'))
const MessageDB = require(path.join(__dirname, 'modules', 'MessageDB'))

const io = require('socket.io').listen(server)

const { linkPreview } = require('link-preview-node')

const multer = require('multer')
const sharp = require('sharp')

const checkFileType = (file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = filetypes.test(file.mimetype)
  if (mimetype && extname) return cb(null, true)
  else cb('Error: It\'s not image')
}
const storage = (dest, name) => {
  return multer.diskStorage({
    destination: path.join(__dirname, 'public', 'uploads', dest),
    filename: (req, file, cb) => {
      cb(null, name + '_' + Date.now() + path.extname(file.originalname))
    }
  })
}

const uploadAvatar = multer({
  storage: storage('avatars', 'avatar'),
  limits: { fileSize: 1048576 * conf.maxsize },
  fileFilter: (req, file, cb) => checkFileType(file, cb)
}).single('avatar')

const uploadImage = multer({
  storage: storage('attachments', 'image'),
  limits: { fileSize: 1048576 * conf.maxsize * 2 },
  fileFilter: (req, file, cb) => checkFileType(file, cb)
}).single('image')

const uploadVoice = multer({
  storage: storage('attachments', 'voice'),
  limits: { fileSize: 1048576 * conf.maxsize * 4 }
}).single('voice')

const typings = []

server.listen(process.env.PORT || conf.port)

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.use(hpp()),
app.use(helmet.noSniff()),
app.use(xssFilter()),

app.get('/', (req, res) => {
  res.render('index')
})

app.post('/upload/avatar', (req, res) => {
  uploadAvatar(req, res, (err) => {
    req.file ? (
      sharp(req.file.path)
        .resize(300, 300)
        .toBuffer()
        .then(data => {
          fs.writeFileSync(req.file.path, data)
          res.json({ image: req.file.filename })
        })
        .catch(err => console.error(err))
    ) : res.status(500).json({ error: err })
  })
})

app.post('/upload/image', (req, res) => {
  uploadImage(req, res, (err) => {
    req.file
      ? res.json({ image: './img/attachments/' + req.file.filename })
      : res.status(500).json({ error: err })
  })
})

app.post('/upload/voice', (req, res) => {
  uploadVoice(req, res, (err) => {
    req.file
      ? (
        fs.readFile(req.file.path, (err, data) => {
          if (err) return
          fs.writeFileSync(req.file.path, data)
        }),
        res.json({ image: './rec/voice/' + req.file.filename })
      )
      : res.status(500).json({ error: err })
  })
})

app.get('/img/users/:file', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'uploads', 'avatars', req.params.file))
})

app.get('/img/attachments/:file', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'uploads', 'attachments', req.params.file))
})

app.get('/rec/voice/:file', (req, res) => {
  res.set('content-type', 'audio/webm')
  res.set('accept-ranges', 'bytes')
  res.sendFile(path.join(__dirname, 'public', 'uploads', 'attachments', req.params.file))
})

app.get('/preview', (req, res) => {
  linkPreview(req.query.url)
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err }))
})

app.get('/message', (req, res) => {
  MessageDB.find({ _id: Mongoose.Types.ObjectId(req.query.id) })
    .then(data => res.json(data))
    .catch(err => res.status(500).json({ error: err }))
})

io.on('connection', (socket) => {
  console.log('New user connected')
  socket.username = 'Anonim'

  MessageDB.find().sort({ time: -1 }).skip(0).limit(10)
    .then(data => socket.emit('output', data))
    .catch(err => console.error('Messages not displayed: ', err))

  socket.on('get_more', (data) => {
    MessageDB.find().sort({ time: -1 }).skip(data.offset).limit(10)
      .then(data => socket.emit('more', data))
      .catch(err => console.error('Messages not displayed: ', err))
  })

  socket.on('set_username', (data) => socket.username = data.username)

  socket.on('set_userphoto', (data) => {
    socket.userphoto = data.userphoto
    io.emit('change_photo', {
      image: data.userphoto,
      username: data.username
    })
  })

  socket.on('new_message', (data) => {
    const msg = {
      message: data.message.replace(/(<([^>]+)>)/ig, ''),
      username: data.username,
      userphoto: data.userphoto,
      time: data.time,
      quote: data.quoteId
    }
    MessageDB.create(msg)
      .then(data => io.sockets.emit('new_message', data))
      .catch(err => console.error('Message not added: ', err))
  })

  socket.on('typing', (data) => {
    if (data.username && typings.indexOf(data.username) === -1) typings.push(data.username)
    socket.broadcast.emit('typing', { typings })
  })

  socket.on('stop_typing', (data) => {
    const index = typings.indexOf(data.username)
    index > -1 && typings.splice(index, 1)
    io.emit('stop_typing', { typings, username: data.username })
  })

  socket.on('delete', (data) => {
    let file
    data.username === socket.username ? (
      MessageDB.deleteOne({ _id: Mongoose.Types.ObjectId(data.id) }, () => {
        io.emit('delete', { id: data.id })
      }),
      data.file && (
        file = path.join(__dirname, 'public', 'uploads', 'attachments', data.file),
        fs.existsSync(file) && fs.unlinkSync(file)
      )
    ) : (
      socket.emit('alert', {
        message: 'It\'s not your message',
        type: 'error'
      })
    )
  })

  socket.on('clear', (data) => {
    const dir = path.join(__dirname, 'public', 'uploads', 'attachments')
    data.password === conf.password ? (
      MessageDB.deleteMany({}, () => {
        io.emit('cleared')
        io.emit('alert', {
          message: 'All messages deleted',
          type: 'success'
        })
      }),
      fs.readdir(dir, (err, files) => {
        if (err) return console.error(err)
        for (const file of files) {
          fs.unlink(path.join(dir, file), (err) => {
            if (err) return console.error(err)
          })
        }
      })
    ) : (
      socket.emit('alert', {
        message: 'Wrong password',
        type: 'error'
      })
    )
  })

  socket.on('disconnect', () => {
    const index = typings.indexOf(socket.username)
    index > -1 && typings.splice(index, 1)
    socket.broadcast.emit('stop_typing', { typings, username: socket.username })
    console.log('User disconnected')
  })
})
