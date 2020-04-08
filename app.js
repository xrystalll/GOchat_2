const fs = require('fs')
const path = require('path')

const conf = require(path.join(__dirname, 'config.json'))

const express = require('express')
const app = express()

const key = fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem'))
const cert = fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
const server = require('https').createServer({ key, cert }, app)

const hpp = require('hpp')
const helmet = require('helmet')
const xssFilter = require('x-xss-protection')
const xss = require('xss')

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
  else cb('Error: It\'s not image', false)
}
const checkFileExec = (file, cb) => {
  if (
    file.mimetype === 'text/javascript' ||
    file.mimetype === 'text/html' ||
    file.mimetype === 'text/css' ||
    file.mimetype === 'application/json' ||
    file.mimetype === 'application/ld+json' ||
    file.mimetype === 'application/php'
  ) {
    cb('Error: File format is not allowed', false)
  }
  else cb(null, true)
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

const uploadFile = multer({
  storage: storage('attachments', 'file'),
  limits: { fileSize: 1048576 * conf.maxsize * 5 },
  fileFilter: (req, file, cb) => checkFileExec(file, cb)
}).single('file')

const online = []
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
    if (err) return res.status(400).json({ error: err })

    req.file ? (
      sharp(req.file.path)
        .resize(300, 300)
        .toBuffer()
        .then(data => {
          fs.writeFileSync(req.file.path, data)
          res.json({ image: req.file.filename })
        })
        .catch(err => console.error(err))
    ) : res.status(400).json({ error: err })
  })
})

app.post('/upload/image', (req, res) => {
  uploadImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err })

    req.file
      ? res.json({ file: './attachments/images/' + req.file.filename })
      : res.status(400).json({ error: err })
  })
})

app.post('/upload/voice', (req, res) => {
  uploadVoice(req, res, (err) => {
    if (err) return res.status(400).json({ error: err })

    req.file
      ? res.json({ file: './attachments/voice/' + req.file.filename })
      : res.status(400).json({ error: err })
  })
})

app.post('/upload/file', (req, res) => {
  uploadFile(req, res, (err) => {
    if (err) return res.status(400).json({ error: err })

    const stats = fs.statSync(req.file.path)
    const fileSizeInBytes = stats['size']
    req.file
      ? res.json({
        file: './attachments/files/' + req.file.filename,
        size: fileSizeInBytes
      })
      : res.status(400).json({ error: err })
  })
})

app.get('/users/images/:file', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'uploads', 'avatars', req.params.file))
})

app.get('/attachments/images/:file', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'uploads', 'attachments', req.params.file))
})

app.get('/attachments/voice/:file', (req, res) => {
  res.set('Content-Type', 'audio/ogg')
  res.set('Accept-Ranges', 'bytes')
  res.sendFile(path.join(__dirname, 'public', 'uploads', 'attachments', req.params.file))
})

app.get('/attachments/files/:file', (req, res) => {
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
  io.emit('online', { online })

  MessageDB.find().sort({ time: -1 }).skip(0).limit(10)
    .then(data => socket.emit('output', data))
    .catch(err => console.error('Messages not displayed: ', err))

  socket.on('get_more', (data) => {
    MessageDB.find().sort({ time: -1 }).skip(data.offset).limit(10)
      .then(data => socket.emit('more', data))
      .catch(err => console.error('Messages not displayed: ', err))
  })

  socket.on('set_username', (data) => {
    socket.username = xss(data.username)
    if (data.username && online.indexOf(data.username) === -1) online.push(xss(data.username))
    io.emit('online', { online })
  })

  socket.on('set_userphoto', (data) => {
    socket.userphoto = xss(data.userphoto)
    io.emit('change_photo', {
      image: xss(data.userphoto),
      username: xss(data.username)
    })
  })

  socket.on('new_message', (data) => {
    const msg = {
      message: xss(data.message),
      content: xss(data.content),
      username: xss(data.username),
      userphoto: xss(data.userphoto),
      time: data.time,
      quote: data.quoteId,
      fileInfo: data.fileInfo
    }
    MessageDB.create(msg)
      .then(data => io.sockets.emit('new_message', data))
      .catch(err => console.error('Message not added: ', err))
  })

  socket.on('typing', (data) => {
    if (data.username && typings.indexOf(data.username) === -1) typings.push(xss(data.username))
    socket.broadcast.emit('typing', { typings })
  })

  socket.on('recording', (data) => {
    socket.broadcast.emit('recording', data)
  })

  socket.on('stop_typing', (data) => {
    const index = typings.indexOf(data.username)
    index > -1 && typings.splice(index, 1)
    io.emit('stop_typing', { typings, username: xss(data.username) })
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
    const indexTyper = typings.indexOf(socket.username)
    indexTyper > -1 && typings.splice(indexTyper, 1)
    socket.broadcast.emit('stop_typing', { typings, username: xss(socket.username) })

    const indexOnline = online.indexOf(socket.username)
    indexOnline > -1 && online.splice(indexOnline, 1)
    io.emit('online', { online })

    console.log('User disconnected')
  })
})
