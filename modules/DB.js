const path = require('path')
const Mongoose = require('mongoose')
const conf = require(path.join(__dirname, '..', 'config.json'))

Mongoose.connect(conf.mongoremote, { useUnifiedTopology: true, useNewUrlParser: true })
  .then(() => console.log('MongoDB connected.'))
  .catch(err => console.error('MongoDB error: ', err))
