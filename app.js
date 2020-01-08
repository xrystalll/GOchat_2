const conf = require(__dirname + '/config.json');

const express = require('express');
const app = express();
const server = require('http').createServer(app);

const { MongoClient } = require('mongodb');
const { ObjectID } = require('mongodb');

const io = require('socket.io').listen(server);

const path = require('path');
const fs = require('fs');

const { linkPreview } = require('link-preview-node');

const multer = require('multer');
const sharp = require('sharp');

const storage1 = multer.diskStorage({
    destination: __dirname + '/public/uploads/avatars/',
    filename: (req, file, cb) => {
        cb(null, `avatar_${Date.now() + path.extname(file.originalname)}`);
    }
});
const upload1 = multer({
    storage: storage1,
    limits: { fileSize: 1048576 * conf.maxsize },
    fileFilter: (req, file, cb) => checkFileType(file, cb)
}).single('avatar');

const storage2 = multer.diskStorage({
    destination: __dirname + '/public/uploads/attachments/',
    filename: (req, file, cb) => {
        cb(null, `image_${Date.now() + path.extname(file.originalname)}`);
    }
});
const upload2 = multer({
    storage: storage2,
    limits: { fileSize: 1048576 * conf.maxsize * 2 },
    fileFilter: (req, file, cb) => checkFileType(file, cb)
}).single('image');

const checkFileType = (file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: It\'s not image');
    }
};

const typings = [];

server.listen(process.env.PORT || conf.port),

app.set('view engine', 'ejs'),
app.use(express.static('public')),

app.get('/', (req, res) => {
    res.render('index')
}),

app.post('/upload/avatar', (req, res) => {
    upload1(req, res, (err) => {
        req.file ? (
            sharp(req.file.path)
                .resize(300, 300)
                .toBuffer()
                .then(data => {
                    fs.writeFileSync(req.file.path, data),
                    res.json({ image: req.file.filename })
                })
                .catch(err => console.error(err))
        ) : (
            res.json({ error: err })
        )
    })
}),

app.post('/upload/image', (req, res) => {
    upload2(req, res, (err) => {
        req.file ? (
            res.json({ image: './img/attachments/' + req.file.filename })
        ) : (
            res.json({ error: err })
        )
    })
}),

app.get('/img/users/:file', (req, res) => {
    res.type('image/png'),
    res.sendFile(__dirname + '/public/uploads/avatars/' + req.params.file)
}),

app.get('/img/attachments/:file', (req, res) => {
    res.type('image/png'),
    res.sendFile(__dirname + '/public/uploads/attachments/' + req.params.file)
}),

app.get('/preview', (req, res) => {
    linkPreview(req.query.url)
    .then(data => res.json({ data }))
    .catch(err => res.json({ error: err }))
}),

MongoClient.connect(conf.mongoremote, {useUnifiedTopology: true})
.then(client => {
    const db = client.db(conf.dbname);
    console.log(`MongoDB connected. Database: ${conf.dbname}`),
    db.createCollection('messages').catch(err => console.error('Error to create collection: ', err)),
    io.on('connection', (socket) => {
        console.log('New user connected'),
        socket.username = 'Anonim',

        db.collection('messages').find({}).sort({ time: -1 }).skip(0).limit(10).toArray()
            .then(data => socket.emit('output', data))
            .catch(err => console.error('Messages not displayed: ', err)),

        socket.on('get_more', (data) => {
            db.collection('messages').find({}).sort({ time: -1 }).skip(data.offset).limit(10).toArray()
                .then(data => socket.emit('more', data))
                .catch(err => console.error('Messages not displayed: ', err))
        }),

        socket.on('set_username', (data) => {
            socket.username = data.username
        }),

        socket.on('set_userphoto', (data) => {
            socket.userphoto = data.userphoto,
            io.emit('change_photo', {
                image: data.userphoto,
                username: data.username
            })
        }),

        socket.on('new_message', (data) => {
            const msg = {
                message: data.message.replace(/(<([^>]+)>)/ig, ''),
                username: data.username,
                userphoto: data.userphoto,
                time: data.time
            };
            db.collection('messages').insertOne(msg).catch(err => console.error('Message not added: ', err)),
            io.sockets.emit('new_message', msg)
        }),

        socket.on('typing', (data) => {
            if (typings.indexOf(data.username) === -1) {
                typings.push(data.username)
            };
            socket.broadcast.emit('typing', { typings })
        }),

        socket.on('stop_typing', (data) => {
            const index = typings.indexOf(data.username);
            index > -1 && typings.splice(index, 1),
            io.emit('stop_typing')
        }),

        socket.on('delete', (data) => {
            data.username === socket.username ? (
                data.file && (
                    fs.unlinkSync(__dirname + '/public/uploads/attachments/' + data.file)
                ),
                db.collection('messages').deleteOne({ _id: ObjectID(data.id) }, () => {
                    io.emit('delete', { id: data.id })
                })
            ) : (
                socket.emit('alert', {
                    message: 'It\'s not your message',
                    type: 'error'
                })
            )
        }),

        socket.on('clear', (data) => {
            const dir = __dirname + '/public/uploads/attachments/';
            data.password === conf.password ? (
                db.collection('messages').deleteMany({}, () => {
                    io.emit('cleared'),
                    io.emit('alert', {
                        message: 'All messages deleted',
                        type: 'info'
                    })
                }),
                fs.readdir(dir, (err, files) => {
                    if (err) console.error(err);
                    for (const file of files) {
                        fs.unlink(path.join(dir, file), (err) => {
                            if (err) console.error(err)
                        })
                    }
                })
            ) : (
                socket.emit('alert', {
                    message: 'Wrong password',
                    type: 'error'
                })
            )
        }),

        socket.on('disconnect', () => {
            socket.broadcast.emit('stop_typing'),
            console.log('User disconnected')
        })
    })
})
.catch(err => console.error('MongoDB error: ', err));