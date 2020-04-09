'use strict'
$(document).ready(() => {
  const socket = io()

  const Username = $('#nameInput')
  const Message = $('#textInput')
  const SendMessage = $('#send_message')
  const Chat = $('#chat')
  const MessageForm = $('.message_form')
  const Status = $('#status')
  const AvatarInput = $('#avatarInput')
  const ImageInput = $('#imageInput')
  const FileInput = $('#fileInput')
  const AttachBtn = $('.attach_icon')
  const AttachBar = $('.image_or_file')
  const VoiceInput = $('#voiceInput')
  const Attachment = $('.attachment')
  const RecordingBar = $('.recording_bar')
  const RecordingTime = $('.recording_time')
  const CancelRec = $('.cancel_rec')
  const SendRec = $('.send_rec')
  const QuoteForm = $('.quote_form')
  const CancelQuote = $('.cancel_quote')
  const NotifSetting = $('.notif_setting')
  const Online = $('.online')
  const OnlineCount = $('.online_count')
  const thisLocation = window.location.href
  const limit = 10
  let offset = 0
  let end = false
  let typings = []
  let USER = localStorage.getItem('username')
  if (USER !== null) {
    USER = USER.replace(/(<([^>]+)>)/ig, '').trim()
    if (USER.length > 24) {
      USER = USER.substr(0, 24)
    }
  }

  const sound = new Audio('./sounds/new_in.wav')
  const voicePlayer = new Audio()
  const musicPlayer = new Audio()
  const voiceList = []
  const musicList = []
  let voiceIndex = 0
  let musicIndex = 0

  const warning = (message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 8)
    $('body').append(`<div class="alert ${type}" data-id="${id}">${message}</div>`)
    $(`.alert[data-id="${id}"]`).fadeIn(800).fadeOut(3000)
    setTimeout(() => {
      $(`.alert[data-id="${id}"]`).remove()
    }, 3800)
  }

  const timeFormat = (timestamp, type = 'full') => {
    const d = new Date()
    const t = new Date(timestamp * 1)

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const curYear = d.getFullYear()
    const curMonth = months[d.getMonth()]
    const curDate = d.getDate()

    const year = t.getFullYear()
    const month = months[t.getMonth()]
    const date = t.getDate()
    const hour = t.getHours()
    const min = t.getMinutes() < 10 ? `0${t.getMinutes()}` : t.getMinutes()

    let thisYear
    year !== curYear ? thisYear = ` ${year}` : thisYear = ''

    if (`${date}.${month}.${year}` === `${curDate}.${curMonth}.${curYear}`) {
      if (type === 'full') {
        return `today at ${hour}:${min}`
      } else {
        return 'today'
      }
    } else if (`${date}.${month}.${year}` === `${curDate - 1}.${curMonth}.${curYear}`) {
      if (type === 'full') {
        return `yesterday at ${hour}:${min}`
      } else {
        return 'yesterday'
      }
    } else {
      if (type === 'full') {
        return `${date} ${month}${thisYear} at ${hour}:${min}`
      } else {
        return `${date} ${month}${thisYear}`
      }
    }
  }

  const toHHMMSS = (sec) => {
    const secNum = parseInt(sec, 10)
    let hours = Math.floor(secNum / 3600)
    const minutes = Math.floor((secNum - (hours * 3600)) / 60)
    let seconds = secNum - (hours * 3600) - (minutes * 60)

    if (hours > 0) { hours = hours + ':' }
    if (seconds < 10) { seconds = '0' + seconds }

    return hours + minutes + ':' + seconds
  }

  const counter = (count) => {
    if (count === 0) return 0
    if (count < 1e3) return count
    if (count >= 1e3 && count < 1e6) return `${+(count / 1e3).toFixed(1)}K`
    if (count >= 1e6 && count < 1e9) return `${+(count / 1e6).toFixed(1)}M`
    if (count >= 1e9 && count < 1e12) return `${+(count / 1e9).toFixed(1)}B`
  }

  const formatBytes = (bytes, decimals) => {
    if (bytes === 0) return '0 bytes'

    const k = 1024
    const dm = decimals <= 0 ? 0 : decimals || 2
    const sizes = ['bytes', 'Kb', 'Mb', 'Gb']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  const checkImg = (url) => url.toLowerCase().match(/\.(jpeg|jpg|png|webp|gif|bmp)$/) != null

  const checkGif = (url) => url.toLowerCase().match(/\.(gif)$/) != null

  const checkVideo = (url) => url.toLowerCase().match(/\.(mp4|webm|3gp|avi)$/) != null

  const checkAudio = (url) => url.toLowerCase().match(/\.(mp3|flac|wav)$/) != null

  const checkVoice = (url) => url.toLowerCase().match(/\.(oga)$/) != null

  const checkUrl = (url) => url.toLowerCase().match(/(https?:\/\/[^\s]+)/g) != null

  const checkFile = (url) => url.toLowerCase().match(/files\/[file]+/gi) != null

  const findLink = (text) => text.replace(/(https?:\/\/[^\s]+)/g, '<a class="link" href="$1" target="_blank" title="Open in new tab">$1</a>')

  const extractLink = (text) => {
    const matches = text.match(/(https?:\/\/[^\s]+)/g)

    if (!matches) return text
    return matches[0]
  }

  const cutLink = (text) => text.replace(/(https?:\/\/[^\s]+)/g, '')

  const checkAnswer = (text, user) => {
    const matches = text.match(/@[a-z0-9а-я-_]+/gi)

    if (matches && matches[0] === '@' + user) return true
    return false
  }

  const findAnswer = (text) => text.replace(/@[a-z0-9а-я-_]+/gi, (a) => `<span class="link atuser">${a}</span>`)

  const template = {
    message: (data) => {
      const type = checkVoice(data.message) ? 'voice'
        : checkAudio(data.content) ? 'music'
          : checkVideo(data.content) ? 'video'
            : checkGif(data.content) ? 'image'
              : checkFile(data.content) ? 'file'
                : checkImg(data.content) ? 'image'
                  : 'text'
      if (type === 'file') data.type = null
      return `
        <div class="message_item${data.my ? ' my' : ''}" data-id="${data.id}" data-user="${data.user}">
          <div class="message_block_left">
            ${data.photo
              ? `<div class="message_avatar${!data.my ? ` answer" data-user="${data.user}` : ''}" ${data.photo ? ` style="background-image: url('./users/images/${data.photo}');"` : ''}></div>`
              : `<div class="message_avatar${!data.my ? ` answer" data-user="${data.user}` : ''}">${data.user ? data.user.slice(0, 1) : ''}</div>`
            }
          </div>

          <div class="message_content">
            <div class="message_block_right ${data.type || ''}">
              ${data.type !== 'media' ? `<div class="message_user">${data.user}</div>` : ''}
              ${data.quote ? '<div class="quote_block"></div>' : ''}
              <div class="message_text">
                ${template.messageContent(data, type)}
              </div>
              <div class="message_time">${timeFormat(data.time)}</div>
            </div>
          </div>

          ${data.my
            ? '<div class="del" title="Delete this message"><i class="material-icons">delete</i></div>'
            : '<div class="quote_btn" title="Quote message"><i class="material-icons">reply</i></div>'
          }
        </div>
      `
    },
    messageContent: (data, type) => {
      switch (type) {
        case 'image':
          return `
            <a href="${extractLink(data.content)}" data-fancybox="gallery" target="_blank">
              <img
                src="${extractLink(data.content)}"
                class="image deleteble"
                ${!checkUrl(data.content) ? `data-url="${data.content.substring(data.content.lastIndexOf('/') + 1)}"` : ''}
                alt=""
              >
            </a>`
        case 'video':
          return `<video src="${extractLink(data.content)}" class="video" preload="true" loop controls></video>`
        case 'voice':
          return template.voice(data.message)
        case 'music':
          return template.music(data.content)
        case 'file':
          return template.file(data, 'deleteble')
        default:
          return findLink(findAnswer(data.message))
      }
    },
    quote: (data) => {
      const type = checkVoice(data.message) ? 'voice'
        : checkAudio(data.content) ? 'music'
          : checkVideo(data.content) ? 'video'
            : checkGif(data.content) ? 'image'
              : checkFile(data.content) ? 'file'
                : checkImg(data.content) ? 'image'
                  : 'text'
      return `
        <div class="quote">
          ${data.username ? `<div class="message_quote_user">${data.username}</div>` : ''}
          ${template.quoteContent(data, type)}
        </div>
      `
    },
    quoteContent: (data, type) => {
      switch (type) {
        case 'image':
          return `
            <div class="message_quote_text media">
              <a href="${extractLink(data.content)}" data-fancybox target="_blank">
                <img src="${extractLink(data.content)}" class="image" alt="">
              </a>
            </div>`
        case 'video':
          return '<div class="message_quote_text">Video</div>'
        case 'voice':
          return '<div class="message_quote_text">Voice message</div>'
        case 'music':
          return '<div class="message_quote_text">Music</div>'
        case 'file':
          return template.file(data)
        default:
          return `<div class="message_quote_text">${findLink(findAnswer(data.message))}</div>`
      }
    },
    file: (data, type = null) => {
      return `
        <a class="file" href="${data.content}" download>
          <div class="file-side">
            <div
              class="file-icon ${type || ''}"
              data-src="${extractLink(data.content)}" 
              data-url="${data.content.substring(data.content.lastIndexOf('/') + 1)}"
              ${checkImg(data.content) ? `style="background-image: url('${data.content}');"` : ''}
            >${!checkImg(data.content) ? '<i class="material-icons">insert_drive_file</i>' : ''}</div>
          </div>
          <div class="file-info">
            <span>File</span>
            <span>${data.content.substr(data.content.lastIndexOf('.'))} / ${formatBytes(data.fileInfo)}</span>
          </div>
        </a>
      `
    },
    voice: (url) => {
      return `
        <div class="audio">
          <div class="audio-side">
            <div class="audio-btn">
              <div class="control deleteble" data-src="${extractLink(url)}" data-url="${url.substring(url.lastIndexOf('/') + 1)}"></div>
            </div>
          </div>
          <div class="audio-wave wave_${url.substring(url.lastIndexOf('/') + 1).replace('.oga', '')}"></div>
          <div class="audio-time">
            <span class="duration">0:00</span>
          </div>
        </div>
      `
    },
    music: (url) => {
      return `
        <div class="music">
          <div class="audio-side">
            <div class="music-btn">
              <div class="control deleteble" data-src="${extractLink(url)}" data-url="${url.substring(url.lastIndexOf('/') + 1)}"></div>
            </div>
          </div>
          <div class="audio-wave">
            <div class="bar">
              <div class="progress"></div>
            </div>
          </div>
          <div class="audio-time">
            <span class="duration">0:00</span>
          </div>
        </div>
      `
    },
    preview: (data) => {
      return `
        <div class="link-preview">
          <a href="${data.link}" target="_blank">
            <div class="link-title">${data.title}</div>
            ${data.description ? `<div class="link-text">${data.description}</div>` : ''}
            ${data.image ? `<div class="link-image" style="background-image: url('${data.image}')"></div>` : ''}
          </a>
        </div>
      `
    },
    error: (message) => {
      return `
        <div class="empty-results">
          ${template.icInfo('#8e9399', 112)}
          <div class="empty_words">
            <div class="empty_top">${message}</div>
          </div>
        </div>
      `
    },
    icInfo: (color = '#fff', size = 24) => {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
          <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="${color}"/>
        </svg>
      `
    },
    avatar: (user) => {
      return `<label for="avatarInput" class="user" title="Set your photo">${user.slice(0, 1)}</label>`
    }
  }

  // Handler: Write new message
  const write = (message = null, content = null, quoteId = null, fileInfo = null) => {
    let user = USER || Username.val().replace(/(<([^>]+)>)/ig, '').trim()
    const userphoto = localStorage.getItem('userphoto') || null

    if (USER) {
      user = USER
    } else {
      if (user.length > 3) {
        if (user.length > 24) {
          user = user.substr(0, 24)
        }
        localStorage.setItem('username', user)
        USER = localStorage.getItem('username')
        socket.emit('set_username', { username: USER })
        Username.remove()
        Attachment.removeClass('none')
        NotifSetting.removeClass('none')
        Online.removeClass('none')
        MessageForm.prepend(
          template.avatar(USER)
        )
      }
    }

    if (user.length > 3) {
      if (!content && !message) return warning('Enter message text', 'error')

      Message.val('')
      MessageForm.removeClass('typed')
      Attachment.removeClass('none')
      socket.emit('stop_typing', { username: USER })
      socket.emit('new_message', {
        message,
        content,
        username: user,
        userphoto,
        time: Date.now(),
        quoteId,
        fileInfo
      })
      cancelQuote()
    } else warning('Enter name', 'error')
  }

  // Handler: Clear all messages
  const clear = (password) => {
    Message.val('')
    MessageForm.removeClass('typed')
    password ? socket.emit('clear', { password }) : warning('Enter password', 'error')
  }

  // Handler: Fetch link preview
  const linkPreview = (props) => {
    fetch(`/preview?url=${props.url}`)
      .then(response => response.json())
      .then(data => {
        if (data.title || data.description) {
          $(`.message_item[data-id="${props.id}"] .message_content`).append(
            template.preview(data)
          )
        } else throw new Error('Failed to get link data')
      })
      .catch(err => console.error(err))
  }

  // Handler: Init quote
  const quoteInit = (props) => {
    fetch(`/message?id=${props.quote}`)
      .then(response => response.json())
      .then(response => {
        const data = response[0]
        $(`.message_item[data-id="${props._id}"] .quote_block`).html(
          data
            ? template.quote(data)
            : template.quote({ username: null, message: 'Deleted message', content: '' })
        )
      })
      .catch(err => console.error(err))
  }

  // Handler: Uploading user avatar
  const uploadAvatar = (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    fetch('/upload/avatar', {
      method: 'POST',
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        if (!data.error) {
          localStorage.setItem('userphoto', data.image)
          $('.user').empty().css('background-image', `url('./users/images/${data.image}')`)
          socket.emit('set_userphoto', {
            username: USER,
            userphoto: data.image
          })
          warning('Successfully uploaded', 'success')
        } else warning('Failed to upload', 'error')
      })
      .catch(err => console.error(err))
  }

  // Handler: Uploading attachment
  const uploadAttachment = (file, param) => {
    const formData = new FormData()
    formData.append(param.name, file)
    fetch('/upload/' + param.name, {
      method: 'POST',
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        let quoteId
        let text
        if (!data.error) {
          if (QuoteForm.hasClass('active')) {
            quoteId = QuoteForm.find('.quoteId').text()
          }
          if (param.name === 'voice') {
            write(data.file, undefined, quoteId)
          } else {
            text = Message.val().replace(/(<([^>]+)>)/ig, '').trim()
            text.length > 1500 && (
              text = text.substr(0, 1500)
            )
            write(text, data.file, quoteId, data.size)
          }
        } else warning(data.error, 'error')
      })
      .catch(err => console.error(err))
  }

  // Handler: Close quote form
  const cancelQuote = () => {
    QuoteForm.removeClass('active')
    $('.quote_form .message_user, .quote_form .message_text, .quote_form .quoteId').empty()
  }

  // Handler: Play/Pause voice message
  const voicePlayPause = (index, initial = voiceIndex) => {
    const curSrc = voicePlayer.currentSrc.replace(/.+[\\/]/, '')
    const dataSrc = encodeURI($('.audio').eq(index).find('.control').data('src').replace(/.+[\\/]/, ''))

    if (initial === index) {
      if (voicePlayer.paused) {
        if (curSrc === dataSrc) {
          voicePlayer.play()
        } else {
          voicePlayer.src = voiceList[index]
          voicePlayer.play()
            .then(() => meta(
              $('.audio').eq(index).parents('.message_block_right').find('.message_user').text(),
              'voice'
            ))
        }
      } else voicePlayer.pause()
    } else {
      voicePlayer.src = voiceList[index]
      voicePlayer.play()
        .then(() => meta(
          $('.audio').eq(index).parents('.message_block_right').find('.message_user').text(),
          'voice'
        ))
    }
  }

  // Handler: Play next voice message
  const voiceNext = () => {
    voiceIndex = voiceIndex + 1
    if (voiceIndex > voiceList.length - 1) {
      voicePlayer.pause()
      return
    }
    voicePlayer.src = voiceList[voiceIndex]
    voicePlayer.play()
      .then(() => meta(
        $('.audio').eq(voiceIndex).parents('.message_block_right').find('.message_user').text(),
        'voice'
      ))
    $('.audio').not('playing').removeClass('playing')
  }

  // Handler: Play/Pause music
  const musicPlayPause = (index, initial = musicIndex) => {
    const curSrc = musicPlayer.currentSrc.replace(/.+[\\/]/, '')
    const dataSrc = encodeURI($('.music').eq(index).find('.control').data('src').replace(/.+[\\/]/, ''))

    if (initial === index) {
      if (musicPlayer.paused) {
        if (curSrc === dataSrc) {
          musicPlayer.play()
        } else {
          musicPlayer.src = musicList[index]
          musicPlayer.play()
            .then(() => meta(
              $('.music').eq(index).parents('.message_block_right').find('.message_user').text(),
              'music'
            ))
        }
      } else musicPlayer.pause()
    } else {
      musicPlayer.src = musicList[index]
      musicPlayer.play()
        .then(() => meta(
          $('.music').eq(index).parents('.message_block_right').find('.message_user').text(),
          'music'
        ))
    }
  }

  // Handler: Play next music
  const musicNext = () => {
    musicIndex = musicIndex + 1
    if (musicIndex > musicList.length - 1) {
      musicPlayer.pause()
      return
    }
    musicPlayer.src = musicList[musicIndex]
    musicPlayer.play()
      .then(() => meta(
        $('.music').eq(musicIndex).parents('.message_block_right').find('.message_user').text(),
        'music'
      ))
    $('.music').not('playing').removeClass('playing')
  }

  // Handler: Set browser media metadata
  const meta = (title, type) => {
    let cover
    if (type === 'voice') {
      cover = $('.audio').eq(voiceIndex).parents('.message_item').find('.message_avatar')
        .css('background-image').replace(/^url\(['"](.+)['"]\)/, '$1')
    } else {
      cover = $('.music').eq(musicIndex).parents('.message_item').find('.message_avatar')
        .css('background-image').replace(/^url\(['"](.+)['"]\)/, '$1')
    }
    (cover === 'none') && (
      cover = thisLocation + 'images/icon_192.png'
    )
    const text = type === 'voice' ? 'Voice message' : 'Music'
    if (navigator.mediaSession) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: text,
        artwork: [{ src: cover }]
      })
    }
  }

  // Handler: Init waveform
  const initWave = (url) => {
    WaveSurfer.create({
      container: document.querySelector('.wave_' + url.substring(url.lastIndexOf('/') + 1).replace('.oga', '')),
      waveColor: '#405267',
      progressColor: '#5d80a6',
      barWidth: 3,
      barHeight: 2,
      barRadius: 3,
      cursorWidth: 0,
      height: 32,
      normalize: true,
      pixelRatio: 2
    }).load(url)
  }

  // Handler: Push browser notification
  const sendNotification = (data, callback) => {
    if (data === undefined || !data.message) return false
    const title = (data.title === null) ? 'Notification' : data.title
    const message = (data.message === null) ? 'Empty message' : data.message
    const icon = (data.icon === null) ? thisLocation + 'images/icon_192.png' : data.icon
    const image = (data.image === null) ? undefined : data.image
    const send = () => {
      const notification = new Notification(title, {
        icon,
        body: message,
        image
      })
      if (callback !== undefined) {
        notification.onclick = () => {
          callback()
          notification.close()
        }
      }
    }

    if (!window.Notification) return false
    else {
      if (Notification.permission === 'default') {
        Notification.requestPermission(permission => {
          if (permission !== 'denied') send()
        })
      } else send()
    }
  }

  // Handler: Recording voice message
  const workerOptions = {
    OggOpusEncoderWasmPath: thisLocation + 'js/OpusMediaRecorder/OggOpusEncoder.wasm'
  }

  window.MediaRecorder = OpusMediaRecorder

  const recordAudio = () => new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/ogg' }, workerOptions)
      let audioChunks = []

      mediaRecorder.addEventListener('dataavailable', (e) => {
        audioChunks.push(e.data)
      })

      const start = () => {
        audioChunks = []
        mediaRecorder.start()
      }

      const stop = () => new Promise(resolve => {
        mediaRecorder.addEventListener('stop', () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/ogg' })
          resolve({ audioBlob })
        })
        mediaRecorder.stop()
      })

      const cancel = () => {
        mediaRecorder.stop()
        audioChunks = []
      }

      resolve({ start, stop, cancel })
    } catch (e) {
      reject('Error get usermedia')
    }
  })

  // Handler: Recording timer
  let seconds = 0
  let recHandler
  const setRecTime = () => {
    seconds = 0
    RecordingTime.text(toHHMMSS(0))
    recHandler = setInterval(() => {
      seconds += 1
      RecordingTime.text(toHHMMSS(seconds))
    }, 1000)
  }

  // UI: Uploading voice message
  let recorder
  VoiceInput.on('click', async () => {
    RecordingBar.removeClass('none')
    try {
      if (!recorder) recorder = await recordAudio()
      recorder.start()
      socket.emit('recording', { username: USER })
      setRecTime()
    } catch (e) {
      console.error(e)
      RecordingBar.addClass('none')
      socket.emit('stop_typing', { username: USER })
      warning('Unable to access microphone', 'error')
    }
  })
  CancelRec.on('click', async () => {
    RecordingBar.addClass('none')
    socket.emit('stop_typing', { username: USER })
    clearInterval(recHandler)
    try {
      if (!recorder) recorder = await recordAudio()
      recorder.cancel()
    } catch (e) {
      console.error(e)
    }
  })
  SendRec.on('click', async () => {
    RecordingBar.addClass('none')
    socket.emit('stop_typing', { username: USER })
    clearInterval(recHandler)
    try {
      if (!recorder) recorder = await recordAudio()
      const blob = await recorder.stop()
      const file = new File([blob.audioBlob], 'record.oga')
      uploadAttachment(file, { name: 'voice' })
    } catch (e) {
      console.error(e)
    }
  })

  // UI: Play/Pause voice message
  $(document).on('click', '.audio-btn', function () {
    musicPlayer.pause()
    const initial = voiceIndex
    voiceIndex = $('.audio-btn').index(this)
    voicePlayPause(voiceIndex, initial)
  })

  voicePlayer.onended = () => voiceNext()

  voicePlayer.addEventListener('pause', () => {
    $('.audio').removeClass('playing')
  })

  voicePlayer.addEventListener('play', () => {
    $('.audio').removeClass('playing')
    $('.audio').eq(voiceIndex).addClass('playing')
  })

  voicePlayer.addEventListener('timeupdate', () => {
    const curTime = voicePlayer.currentTime
    const duration = voicePlayer.duration
    $('.playing .duration').text(toHHMMSS(curTime))
    $('.playing').find('wave').eq(1).css('width', `${(curTime + 0.25) / duration * 100}%`)
  })

  // UI: Seeking on voice bar
  $(document).on('click', '.playing wave', function (e) {
    const offset = e.pageX - $(this).offset().left
    const duration = voicePlayer.duration
    const width = $(this).width()
    duration && (
      voicePlayer.currentTime = (offset / width) * duration
    )
  })

  // UI: Play/Pause music
  $(document).on('click', '.music-btn', function () {
    voicePlayer.pause()
    const initial = musicIndex
    musicIndex = $('.music-btn').index(this)
    musicPlayPause(musicIndex, initial)
  })

  musicPlayer.onended = () => musicNext()

  musicPlayer.addEventListener('pause', () => {
    $('.music').removeClass('playing')
  })

  musicPlayer.addEventListener('play', () => {
    $('.music').removeClass('playing')
    $('.music').eq(musicIndex).addClass('playing')
  })

  musicPlayer.addEventListener('timeupdate', () => {
    const curTime = musicPlayer.currentTime
    const duration = musicPlayer.duration
    $('.playing .duration').text(toHHMMSS(curTime))
    $('.playing .progress').stop(true, true).animate({
      width: `${(curTime + 0.25) / duration * 100}%`
    }, 200, 'linear')
  })

  // UI: Seeking on music bar
  $(document).on('click', '.playing .bar', function (e) {
    const offset = e.pageX - $(this).offset().left
    const duration = musicPlayer.duration
    const width = $(this).width()
    duration && (
      musicPlayer.currentTime = (offset / width) * duration
    )
  })

  // UI: Uploading user avatar
  AvatarInput.on('change', (e) => {
    e.target.files[0].size > 0 ? uploadAvatar(e.target.files[0]) : warning('Empty file', 'error')
  })

  // UI: Uploading message image
  ImageInput.on('change', (e) => {
    e.target.files[0].size > 0 ? uploadAttachment(e.target.files[0], { name: 'image' }) : warning('Empty file', 'error')
  })

  // UI: Uploading message file
  FileInput.on('change', (e) => {
    e.target.files[0].size > 0 ? uploadAttachment(e.target.files[0], { name: 'file' }) : warning('Empty file', 'error')
  })

  // UI: Check username in localstorage
  if (USER) {
    socket.emit('set_username', { username: USER })
    Username.remove()
    Attachment.removeClass('none')
    NotifSetting.removeClass('none')
    Online.removeClass('none')
    MessageForm.prepend(
      template.avatar(USER)
    )
  }

  // UI: Check photo in localstorage
  if (localStorage.getItem('userphoto')) {
    socket.emit('set_userphoto', {
      image: localStorage.getItem('userphoto')
    })
    $('.user').empty().css('background-image', `url('./users/images/${localStorage.getItem('userphoto')}')`)
  }

  // UI: Check notification settings in localstorage
  localStorage.getItem('notifications') === 'disable' && (
    NotifSetting.removeClass('on').addClass('off')
  )

  // UI: Toggle notification icon and setting in localstorage
  NotifSetting.on('click', () => {
    warning('Successfully saved', 'success')
    if (localStorage.getItem('notifications') !== 'disable') {
      localStorage.setItem('notifications', 'disable')
      NotifSetting.removeClass('on').addClass('off')
    } else {
      localStorage.setItem('notifications', 'enable')
      NotifSetting.removeClass('off').addClass('on')
    }
  })

  // UI: Send message via button
  SendMessage.on('click', () => {
    let text = Message.val().replace(/(<([^>]+)>)/ig, '').trim()
    if (text.length > 1) {
      if (text.length > 1500) {
        text = text.substr(0, 1500)
      }
      const value = text.split(' ')
      const quoteActive = QuoteForm.hasClass('active')
      let content
      let quoteId
      quoteActive && (
        quoteId = QuoteForm.find('.quoteId').text()
      )
      if (checkImg(text) || checkVideo(text)) {
        content = extractLink(text)
        text = cutLink(text)
      } else {
        content = undefined
      }
      (value[0] === '/clear') ? clear(value[1]) : write(text, content, quoteId)
    } else warning('Enter message text', 'error')
  })

  // UI: Send message via ENTER key
  $(document).on('keyup', '#nameInput, #textInput', (e) => {
    let text = Message.val().replace(/(<([^>]+)>)/ig, '').trim()
    if (text.length > 1 && e.which === 13) {
      if (text.length > 1500) {
        text = text.substr(0, 1500)
      }
      const value = text.split(' ')
      const quoteActive = QuoteForm.hasClass('active')
      let content
      let quoteId
      quoteActive && (
        quoteId = QuoteForm.find('.quoteId').text()
      )
      if (checkImg(text) || checkVideo(text)) {
        content = extractLink(text)
        text = cutLink(text)
      } else {
        content = undefined
      }
      (value[0] === '/clear') ? clear(value[1]) : write(text, content, quoteId)
    }
  })

  // UI: Toggle visible sending button
  Message.on('keyup', () => {
    if (Message.val().trim().length > 1 && !!USER) {
      MessageForm.addClass('typed')
      Attachment.addClass('none')
    }
    if (Message.val().trim().length < 2 && !!USER) {
      MessageForm.removeClass('typed')
      Attachment.removeClass('none')
    }
  })

  // UI: Paste username to input
  $(document).on('click', '.answer', function () {
    Message.val('@' + $(this).data('user') + ' ').focus()
  })

  // UI: Itit quote form
  $(document).on('click', '.quote_btn', function () {
    const media = $(this).parent().find('.message_block_right').hasClass('media')
    const video = $(this).parent().find('.video').prop('src')
    const audio = $(this).parent().find('.control').data('src')
    const file = $(this).parent().find('.file-icon').data('src')
    QuoteForm.addClass('active')
    if (media) {
      $('.quote_form .message_user').addClass('none')
      $('.quote_form .message_text').addClass('media')
    } else {
      $('.quote_form .message_user').removeClass('none')
      $('.quote_form .message_text').removeClass('media')
    }
    $('.quote_form .message_user').text($(this).parent().data('user'))
    $('.quote_form .quoteId').text($(this).parent().data('id'))
    if (video && checkVideo(video)) {
      $('.quote_form .message_user').removeClass('none')
      $('.quote_form .message_text').removeClass('media').empty().text('Video')
    } else if (audio) {
      if (checkVoice(audio) || checkAudio(audio)) {
        $('.quote_form .message_user').removeClass('none')
        $('.quote_form .message_text').removeClass('media').empty().text('Audio')
      }
    } else if (file && checkFile(file)) {
      $('.quote_form .message_user').removeClass('none')
      $('.quote_form .message_text').removeClass('media').empty().text('File')
    } else $('.quote_form .message_text').html($(this).parent().find('.message_text').html().trim())
    Message.focus()
  })

  // UI: Close quote form
  CancelQuote.on('click', cancelQuote)

  // UI: Toggle visible attach chooser
  AttachBtn.on('click', () => {
    AttachBar.toggleClass('none')
    if (QuoteForm.hasClass('active')) {
      AttachBar.toggleClass('hovered')
    }
  })

  $(document).on('click', (e) => {
    if (!AttachBar.hasClass('none') && $(e.target).closest('.attach_icon').length === 0) {
      AttachBar.addClass('none').removeClass('hovered')
    }
  })

  // UI: Output old messages from DB
  socket.on('output', (data) => {
    if (data.length > 0) {
      (data.length < limit) && socket.emit('get_more', { offset: offset += limit })
      $('.empty-results').remove()
      $.each(data, (i) => {
        const type = (checkImg(data[i].content) || checkVideo(data[i].content)) ? 'media' : null
        const my = data[i].username === USER
        Chat.prepend(
          template.message({
            id: data[i]._id,
            user: data[i].username,
            photo: data[i].userphoto,
            message: data[i].message,
            content: data[i].content,
            time: data[i].time,
            quote: data[i].quote,
            fileInfo: data[i].fileInfo,
            type,
            my
          })
        )
        data[i].quote && quoteInit(data[i])
        if (checkUrl(data[i].message) && (type !== 'media')) {
          linkPreview({
            url: data[i].message.match(/(https?:\/\/[^\s]+)/g)[0],
            id: data[i]._id
          })
        }
        if (checkVoice(data[i].message)) {
          voiceList.push(data[i].message)
          initWave(data[i].message)
        }
        if (checkAudio(data[i].content)) {
          musicList.push(data[i].content)
        }
      })
      voiceList.sort()
      musicList.sort()
      $('html, body').animate({ scrollTop: $(document).height() }, 0)
    } else Chat.html(template.error('No messages yet'))
  })

  // UI: Adding new message
  socket.on('new_message', (data) => {
    const type = (checkImg(data.content) || checkVideo(data.content)) ? 'media' : null
    const my = data.username === USER
    const icon = data.userphoto ? thisLocation + 'users/images/' + data.userphoto : null
    const message =
      (checkVoice(data.message) || checkAudio(data.content)) ? 'Audio'
        : checkVideo(data.content) ? 'Video'
          : checkFile(data.content) ? 'File'
            : checkImg(data.content) ? 'Image'
              : data.message
    const image = (checkImg(data.content) || checkImg(data.message)) ? data.content : null
    if (document.body.scrollHeight - (window.scrollY + window.innerHeight) < 150) {
      $('html, body').animate({ scrollTop: $(document).height() }, 100)
    }
    if (my) {
      $('html, body').animate({ scrollTop: $(document).height() }, 100)
    } else {
      sound.play()
      if (checkAnswer(data.message, USER) && localStorage.getItem('notifications') !== 'disable') {
        sendNotification({
          title: data.username,
          message,
          icon,
          image
        }, () => {
          $(`.message_item[data-id="${data._id}"]`).addClass('choosenhover')
          setTimeout(() => {
            $(`.message_item[data-id="${data._id}"]`).removeClass('choosenhover')
          }, 5000)
        })
      }
    }
    $('.empty-results').remove()
    Chat.append(
      template.message({
        id: data._id,
        user: data.username,
        photo: data.userphoto,
        message: data.message,
        content: data.content,
        time: data.time,
        quote: data.quote,
        fileInfo: data.fileInfo,
        type,
        my
      })
    )
    data.quote && quoteInit(data)
    if (checkUrl(data.message) && (type !== 'media')) {
      linkPreview({
        url: data.message.match(/(https?:\/\/[^\s]+)/g)[0],
        id: data._id
      })
    }
    if (checkVoice(data.message)) {
      voiceList.push(data.message)
      voiceList.sort()
      initWave(data.message)
    }
    if (checkAudio(data.content)) {
      musicList.push(data.content)
      musicList.sort()
    }
  })

  // UI: Load more old messages from DB
  socket.on('more', (data) => {
    let position = 0
    let initH = 0
    if (data.length > 0) {
      $('.empty-results').remove()
      if (Chat.children().length !== 0) {
        $.each(data, (i) => {
          const type = (checkImg(data[i].content) || checkVideo(data[i].content)) ? 'media' : null
          const my = data[i].username === USER
          initH = $('.message_item').outerHeight(true)
          position += initH
          Chat.prepend(
            template.message({
              id: data[i]._id,
              user: data[i].username,
              photo: data[i].userphoto,
              message: data[i].message,
              content: data[i].content,
              time: data[i].time,
              quote: data[i].quote,
              fileInfo: data[i].fileInfo,
              type,
              my
            })
          )
          data[i].quote && quoteInit(data[i])
          if (checkUrl(data[i].message) && (type !== 'media')) {
            linkPreview({
              url: data[i].message.match(/(https?:\/\/[^\s]+)/g)[0],
              id: data[i]._id
            })
          }
          if (checkVoice(data[i].message)) {
            voiceList.push(data[i].message)
            initWave(data[i].message)
          }
          if (checkAudio(data[i].content)) {
            musicList.push(data[i].content)
          }
        })
        window.scrollTo(0, position)
        voiceList.sort()
        musicList.sort()
      }
    } else end = true
  })

  $(window).scroll(() => {
    if (!end) {
      ($(window).scrollTop() === 0) && (
        socket.emit('get_more', { offset: offset += limit })
      )
    }
  })

  Message.on('keyup', () => {
    if (Message.val().length === 0 && !USER) return

    (Message.val().length > 1)
      ? socket.emit('typing', { username: USER })
      : socket.emit('stop_typing', { username: USER })
  })

  socket.on('typing', (data) => {
    typings = data.typings
    if (typings.length < 1) return

    const items = typings.filter(item => item !== USER)
    let typers
    if (typings.length < 3) {
      (typings.length > 1)
        ? typers = items.join(', ') + ' are typing...'
        : typers = items.join(', ') + ' is typing...'
    } else typers = 'Several people are typing...'
    Status.addClass('typing').text(typers)
  })

  socket.on('recording', (data) => {
    Status.addClass('typing').text(`${data.username} is recording audio...`)
  })

  Message.focusout(() => {
    if (Message.val().length < 2) return

    socket.emit('stop_typing', { username: USER })
  })

  socket.on('stop_typing', (data) => {
    typings = data.typings
    Status.removeClass('typing').empty()
  })

  socket.on('online', (data) => {
    OnlineCount.text(counter(data.online.length) || 0)
    Online.prop('title', 'Users: ' + data.online.join(', '))
  })

  $(document).on('click', '.del', function () {
    USER && (
      socket.emit('set_username', { username: USER })
    )
    socket.emit('delete', {
      username: $(this).parent().data('user'),
      id: $(this).parent().data('id'),
      file: $(this).parent().find('.message_text .deleteble').data('url')
    })
  })
  socket.on('delete', (data) => {
    const self = $(`.message_item[data-id="${data.id}"]`)
    if (self.find('.audio').length === 1) {
      const i = voiceList.indexOf(self.find('.control').data('src'))
      i > -1 && voiceList.splice(i, 1)
      voicePlayer.currentSrc.substring(voicePlayer.currentSrc.lastIndexOf('/') + 1 === self.find('.control').data('url')) && voiceNext()
    }
    if (self.find('.music').length === 1) {
      const i = musicList.indexOf(self.find('.control').data('src'))
      i > -1 && musicList.splice(i, 1)
      musicPlayer.currentSrc.substring(musicPlayer.currentSrc.lastIndexOf('/') + 1 === self.find('.control').data('url')) && musicNext()
    }

    self.remove()
  })

  socket.on('cleared', () => {
    Status.removeClass('typing').empty()
    Chat.empty().html(template.error('No messages yet'))
  })

  socket.on('alert', (data) => warning(data.message, data.type))
})
