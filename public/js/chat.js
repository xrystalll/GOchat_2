$(document).ready(() => {
  const socket = io();

  const Username = $('#nameInput');
  const Message = $('#textInput');
  const SendMessage = $('#send_message');
  const Chat = $('#chat');
  const MessageForm = $('.message_form');
  const Status = $('#status');
  const AvatarInput = $('#avatarInput');
  const ImageInput = $('#imageInput');
  const VoiceInput = $('#voiceInput');
  const Attachment = $('.attachment');
  const RecordingBar = $('.recording_bar');
  const RecordingTime = $('.recording_time');
  const CancelRec = $('.cancel_rec');
  const SendRec = $('.send_rec');
  const QuoteForm = $('.quote_form');
  const CancelQuote = $('.cancel_quote');
  const NotifSetting = $('.notif_setting');
  const Online = $('.online');
  const OnlineCount = $('.online_count');
  const limit = 10;
  let offset = 0;
  let end = false;
  let typings = [];
  let USER = localStorage.getItem('username');
  if (USER !== null) {
    USER = USER.replace(/(<([^>]+)>)/ig, '').trim(),
    (USER.length > 24) && (
      USER = USER.substr(0, 24)
    )
  };

  const player = new Audio;
  const voiceList = [];
  let index = 0;

  const warning = (message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 8);
    $('body').append(`<div class="alert ${type}" data-id="${id}">${message}</div>`),
    $(`.alert[data-id="${id}"]`).fadeIn(800).fadeOut(3000),
    setTimeout(() => {
      $(`.alert[data-id="${id}"]`).remove()
    }, 3800)
  };

  const timeFormat = (timestamp) => {
    const d = new Date();
    const t = new Date(timestamp * 1);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const curYear = d.getFullYear();
    const curMonth = months[d.getMonth()];
    const curDate = d.getDate();

    const year = t.getFullYear();
    const month = months[t.getMonth()];
    const date = t.getDate();
    const hour = t.getHours();
    const min = t.getMinutes() < 10 ? `0${t.getMinutes()}` : t.getMinutes();

    let thisYear;
    year !== curYear ? thisYear = ` ${year}` : thisYear = '';

    if (`${date}.${month}.${year}` === `${curDate}.${curMonth}.${curYear}`) {
      return `today at ${hour}:${min}`
    } else if (`${date}.${month}.${year}` === `${curDate - 1}.${curMonth}.${curYear}`) {
      return `yesterday at ${hour}:${min}`
    } else {
      return `${date} ${month}${thisYear} at ${hour}:${min}`
    }
  };

  const checkImg = (url) => url.toLowerCase().match(/\.(jpeg|jpg|png|webp|gif|bmp)$/) != null;

  const checkVideo = (url) => url.toLowerCase().match(/\.(mp4|webm|3gp|avi)$/) != null;

  const checkAudio = (url) => url.toLowerCase().match(/\.(oga)$/) != null;

  const checkUrl = (url) => url.match(/(https?:\/\/[^\s]+)/g) != null;

  const findLink = (text) => text.replace(/(https?:\/\/[^\s]+)/g, '<a class="link" href="$1" target="_blank" title="Open in new tab">$1</a>');

  const checkAnswer = (text, user) => {
    const matches = text.match(/@[a-z0-9а-я-_]+/gi)

    if (matches && matches[0] === '@' + user) return true
    return false
  };

  const findAnswer = (text) => text.replace(/@[a-z0-9а-я-_]+/gi, (a) => `<span class="link atuser">${a}</span>`);

  const extractLink = (text) => {
    const matches = text.match(/(https?:\/\/[^\s]+)/g)

    if (!matches) return text
    return matches[0]
  };

  const toHHMMSS = (sec) => {
    const secNum = parseInt(sec, 10)
    let hours = Math.floor(secNum / 3600)
    let minutes = Math.floor((secNum - (hours * 3600)) / 60)
    let seconds = secNum - (hours * 3600) - (minutes * 60)

    if (hours > 0) { hours = hours + ':' }
    if (seconds < 10) { seconds = '0' + seconds }

    return hours + minutes + ':' + seconds
  };

  const counter = (count) => {
    if (count === 0) return '';
    if (count < 1e3) return count;
    if (count >= 1e3 && count < 1e6) return `${+(count / 1e3).toFixed(1)}K`;
    if (count >= 1e6 && count < 1e9) return `${+(count / 1e6).toFixed(1)}M`;
    if (count >= 1e9 && count < 1e12) return `${+(count / 1e9).toFixed(1)}B`;
  };

  const template = {
    message: (data) => {
      return `
        <div class="message_item${data.my ? ' my' : ''}" data-id="${data.id}" data-user="${data.user}">
          <div class="message_block_left">
            ${data.photo
              ? `<div class="message_avatar${!data.my ? ` answer" data-user="${data.user}` : ''}" ${data.photo ? ` style="background-image: url('./img/users/${data.photo}');"` : ''}></div>`
              : `<div class="message_avatar${!data.my ? ` answer" data-user="${data.user}` : ''}">${data.user ? data.user.slice(0, 1) : ''}</div>`
            }
          </div>

          <div class="message_content">
            <div class="message_block_right ${data.type || ''}">
              ${data.type !== 'media' ? `<div class="message_user">${data.user}</div>` : ''}
              ${data.quote ? `<div class="quote_block"></div>` : ''}
              <div class="message_text">
                ${!checkAudio(data.message) ? !checkVideo(data.message) ? (data.type !== 'media')
                  ? findLink(findAnswer(data.message))
                  : `<a href="${extractLink(data.message)}" data-fancybox="gallery" target="_blank">
                    <img src="${extractLink(data.message)}" class="image deleteble" ${!checkUrl(data.message) ? `data-url="${data.message.substring(data.message.lastIndexOf('/') + 1)}"` : ''} alt="">
                  </a>`
                  : `<video src="${extractLink(data.message)}" class="video" preload="true" loop controls></video>`
                  : template.voice(data.message)
                }
              </div>
              <div class="message_time">${timeFormat(data.time)}</div>
            </div>
          </div>

          ${data.my
            ? '<div class="del" title="Delete this message"><i class="material-icons">delete</i></div>'
            : '<div class="quote_btn" title="Quote message"><i class="material-icons">reply</i></div>'
          }
        </div>
      `;
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
      `;
    },
    quote: (data) => {
      return `
        <div class="quote">
          ${data.username ? `<div class="message_quote_user">${data.username}</div>` : ''}
          ${!checkAudio(data.message) ? !checkVideo(data.message) ? !checkImg(data.message)
            ? `<div class="message_quote_text">${findLink(findAnswer(data.message))}</div>`
            : `<div class="message_quote_text media">
              <a href="${extractLink(data.message)}" data-fancybox target="_blank">
                <img src="${extractLink(data.message)}" class="image" alt="">
              </a>
            </div>`
            : '<div class="message_quote_text">Video</div>'
            : '<div class="message_quote_text">Voice message</div>'
          }
        </div>
      `;
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
      `;
    },
    error: (message) => {
      return `
        <div class="empty-results">
          ${template.icInfo('#8e9399', 112)}
          <div class="empty_words">
            <div class="empty_top">${message}</div>
          </div>
        </div>
      `;
    },
    icInfo: (color = '#fff', size = 24) => {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
          <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="${color}"/>
        </svg>
      `;
    },
    avatar: (user) => {
      return `<label for="avatarInput" class="user" title="Set your photo">${user.slice(0, 1)}</label>`;
    }
  };

  // Handler: Write new message
  const write = (text, quoteId = null) => {
    let user = USER || Username.val().replace(/(<([^>]+)>)/ig, '').trim();
    const photo = localStorage.getItem('userphoto') || null;

    USER ? (
      user = USER
    ) : (
      (user.length > 3) && (
        (user.length > 24) && (
          user = user.substr(0, 24)
        ),
        localStorage.setItem('username', user),
        USER = localStorage.getItem('username'),
        socket.emit('set_username', { username: USER }),
        Username.remove(),
        Attachment.removeClass('none'),
        NotifSetting.removeClass('none'),
        Online.removeClass('none'),
        MessageForm.prepend(
          template.avatar(USER)
        )
      )
    );

    (user.length > 3) ? text ? (
      Message.val(''),
      MessageForm.removeClass('typed'),
      socket.emit('stop_typing', { username: USER }),
      socket.emit('new_message', {
        message: text,
        username: user,
        userphoto: photo,
        time: Date.now(),
        quoteId
      }),
      cancelQuote()
    )
    : warning('Enter message text', 'error')
    : warning('Enter name', 'error')
  };

  // Handler: Clear all messages
  const clear = (password) => {
    Message.val(''),
    MessageForm.removeClass('typed'),
    password ? socket.emit('clear', { password }) : warning('Enter password', 'error')
  };

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
  };

  // Handler: Init quote
  const quoteInit = (props) => {
    fetch(`/message?id=${props.quote}`)
      .then(response => response.json())
      .then(response => {
        const data = response[0];
        $(`.message_item[data-id="${props._id}"] .quote_block`).html(
          data
            ? template.quote(data)
            : template.quote({ username: null, message: 'Deleted message' })
        )
      })
      .catch(err => console.error(err))
  };

  // Handler: Uploading user avatar
  const uploadAvatar = (file) => {
    const formData = new FormData;
    formData.append('avatar', file)
    fetch('/upload/avatar', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      !data.error ? (
        localStorage.setItem('userphoto', data.image),
        $('.user').empty().css('background-image', `url('./img/users/${data.image}')`),
        socket.emit('set_userphoto', {
          username: USER,
          userphoto: data.image
        }),
        warning('Successfully uploaded', 'success')
      ) : warning('Failed to upload', 'error')
    })
    .catch(err => console.error(err))
  };

  // Handler: Uploading attachment
  const uploadAttachment = (file, param) => {
    const formData = new FormData;
    formData.append(param.name, file)
    fetch('/upload/' + param.name, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      let quoteId;
      QuoteForm.hasClass('active') && (
        quoteId = QuoteForm.find('.quoteId').text()
      ),
      write(data.image, quoteId)
    })
    .catch(err => console.error(err))
  };

  // Handler: Close quote form
  const cancelQuote = () => {
    QuoteForm.removeClass('active'),
    $('.quote_form .message_user, .quote_form .message_text, .quote_form .quoteId').empty()
  };

  // Handler: Push browser notification
  const sendNotification = (data, callback) => {
    if (data === undefined || !data.message) return false
    const title = (data.title === null) ? 'Notification' : data.title
    const message = (data.message === null) ? 'Empty message' : data.message
    const icon = (data.icon === null) ? window.location.href + 'images/icon_192.png' : data.icon
    const image = (data.image === null) ? undefined : data.image
    const sendNotification = () => {
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
          if (permission !== 'denied') sendNotification()
        })
      } else sendNotification()
    }
  };

  // Handler: Recording voice message
  const workerOptions = {
    OggOpusEncoderWasmPath: window.location.href + 'js/OpusMediaRecorder/OggOpusEncoder.wasm'
  };

  window.MediaRecorder = OpusMediaRecorder;

  const recordAudio = () => new Promise(async (resolve, reject) => {
    if (navigator.mediaDevices === undefined) return reject('Error get usermedia: undefined')
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
  });

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
  };

  // Handler: Recording timer
  let seconds = 0;
  let recHandler;
  const setRecTime = () => {
    seconds = 0
    RecordingTime.text(toHHMMSS(0))
    recHandler = setInterval(() => {
      seconds += 1
      RecordingTime.text(toHHMMSS(seconds))
    }, 1000)
  };

  // UI: Uploading voice message
  let recorder
  VoiceInput.on('click', async () => {
    RecordingBar.removeClass('none')
    try {
      if (!recorder) recorder = await recordAudio()
      recorder.start(),
      socket.emit('recording', { username: USER }),
      setRecTime()
    } catch (e) {
      console.error(e),
      RecordingBar.addClass('none'),
      socket.emit('stop_typing', { username: USER }),
      warning('Unable to access microphone', 'error')
    }
  }),
  CancelRec.on('click', async () => {
    RecordingBar.addClass('none'),
    socket.emit('stop_typing', { username: USER })
    try {
      if (!recorder) recorder = await recordAudio()
      recorder.cancel(),
      clearInterval(recHandler)
    } catch (e) {
      console.error(e)
    }
  }),
  SendRec.on('click', async () => {
    RecordingBar.addClass('none'),
    socket.emit('stop_typing', { username: USER })
    try {
      if (!recorder) recorder = await recordAudio()
      const blob = await recorder.stop()
      const file = new File([blob.audioBlob], 'record.oga')
      uploadAttachment(file, { name: 'voice' }),
      clearInterval(recHandler)
    } catch (e) {
      console.error(e)
    }
  }),

  // UI: Uploading user avatar
  AvatarInput.on('change', (e) => {
    e.target.files[0].size > 0 ? uploadAvatar(e.target.files[0]) : warning('Empty file', 'error')
  }),

  // UI: Uploading message image
  ImageInput.on('change', (e) => {
    e.target.files[0].size > 0 ? uploadAttachment(e.target.files[0], { name: 'image' }) : warning('Empty file', 'error')
  }),

  // UI: Check username in localstorage
  USER && (
    socket.emit('set_username', { username: USER }),
    Username.remove(),
    Attachment.removeClass('none'),
    NotifSetting.removeClass('none'),
    Online.removeClass('none'),
    MessageForm.prepend(
      template.avatar(USER)
    )
  ),

  // UI: Check photo in localstorage
  localStorage.getItem('userphoto') && (
    socket.emit('set_userphoto', {
      image: localStorage.getItem('userphoto')
    }),
    $('.user').empty().css('background-image', `url('./img/users/${localStorage.getItem('userphoto')}')`)
  ),

  // UI: Send message via button
  SendMessage.on('click', () => {
    let text = Message.val().replace(/(<([^>]+)>)/ig, '').trim();
    if (text.length > 1) {
      (text.length > 1500) && (
        text = text.substr(0, 1500)
      );
      const value = text.split(' ');
      const quoteActive = QuoteForm.hasClass('active');
      let quoteId;
      quoteActive && (
        quoteId = QuoteForm.find('.quoteId').text()
      ),
      (value[0] === '/clear') ? clear(value[1]) : write(text, quoteId)
    } else warning('Enter message text', 'error')
  }),

  // UI: Send message via ENTER key
  $(document).on('keyup', '#nameInput, #textInput', (e) => {
    let text = Message.val().replace(/(<([^>]+)>)/ig, '').trim();
    if (text.length > 1 && e.which === 13) {
      (text.length > 1500) && (
        text = text.substr(0, 1500)
      );
      const value = text.split(' ');
      const quoteActive = QuoteForm.hasClass('active');
      let quoteId;
      quoteActive && (
        quoteId = QuoteForm.find('.quoteId').text()
      ),
      (value[0] === '/clear') ? clear(value[1]) : write(text, quoteId)
    }
  }),

  // UI: Check notification settings in localstorage
  (localStorage.getItem('notifications') === 'disable') && (
    NotifSetting.removeClass('on').addClass('off')
  ),

  // UI: Toggle notification icon and setting in localstorage
  NotifSetting.on('click', () => {
    warning('Successfully saved', 'success')
    if (localStorage.getItem('notifications') !== 'disable') {
      localStorage.setItem('notifications', 'disable'),
      NotifSetting.removeClass('on').addClass('off')
    } else {
      localStorage.setItem('notifications', 'enable'),
      NotifSetting.removeClass('off').addClass('on')
    }
  }),

  // UI: Toggle visible sending button
  Message.on('keyup', () => {
    (Message.val().trim().length > 1) && (
      MessageForm.addClass('typed'),
      Attachment.addClass('none')
    ),
    (Message.val().trim().length < 2) && (
      MessageForm.removeClass('typed'),
      Attachment.removeClass('none')
    )
  }),

  // UI: Itit quote form
  $(document).on('click', '.quote_btn', function() {
    const media = $(this).parent().find('.message_block_right').hasClass('media');
    const video = $(this).parent().find('.video').attr('src');
    const audio = $(this).parent().find('.control').data('src');
    QuoteForm.addClass('active'),
    media ? (
      $('.quote_form .message_user').addClass('none'),
      $('.quote_form .message_text').addClass('media')
    ) : (
      $('.quote_form .message_user').removeClass('none'),
      $('.quote_form .message_text').removeClass('media')
    ),
    $('.quote_form .message_user').text($(this).parent().data('user')),
    $('.quote_form .quoteId').text($(this).parent().data('id')),
    (video && checkVideo(video)) ? (
      $('.quote_form .message_user').removeClass('none'),
      $('.quote_form .message_text').removeClass('media').empty().text('Video')
    ) : (audio && checkAudio(audio)) ? (
      $('.quote_form .message_user').removeClass('none'),
      $('.quote_form .message_text').removeClass('media').empty().text('Voice message')
    ) : $('.quote_form .message_text').html($(this).parent().find('.message_text').html().trim()),
    Message.focus()
  }),

  // UI: Close quote form
  CancelQuote.on('click', cancelQuote),

  // UI: Paste username to input
  $(document).on('click', '.answer', function() {
    Message.val('@' + $(this).data('user') + ' ').focus()
  }),

  // UI: Output old messages from DB
  socket.on('output', (data) => {
    (data.length > 0) ? (
      (data.length < limit) && socket.emit('get_more', { offset: offset += limit }),
      $('.empty-results').remove(),
      (document.querySelector('#chat').children.length === 0) && (
        $.each(data, (i) => {
          const type = checkImg(data[i].message) || checkVideo(data[i].message) ? 'media' : null;
          const my = data[i].username === USER;
          Chat.prepend(
            template.message({
              id: data[i]._id,
              user: data[i].username,
              photo: data[i].userphoto,
              message: data[i].message,
              time: data[i].time,
              quote: data[i].quote,
              type,
              my
            })
          ),
          checkUrl(data[i].message) && (type !== 'media') && linkPreview({
            url: data[i].message.match(/(https?:\/\/[^\s]+)/g)[0],
            id: data[i]._id
          }),
          data[i].quote && quoteInit(data[i]),
          checkAudio(data[i].message) && (
            voiceList.push(data[i].message),
            initWave(data[i].message)
          )
        }),
        voiceList.sort()
      ),
      $('html, body').animate({ scrollTop: $(document).height() }, 0)
    ) : Chat.html(template.error('No messages yet'))
  }),

  // UI: Adding new message
  socket.on('new_message', (data) => {
    const type = checkImg(data.message) || checkVideo(data.message) ? 'media' : null;
    const my = data.username === USER;
    const sound = new Audio('./sounds/new_in.wav');
    const icon = data.userphoto ? window.location.href + 'img/users/' + data.userphoto : null;
    const message = checkImg(data.message) ? 'Image' : checkVideo(data.message) ? 'Video' : data.message;
    const image = checkImg(data.message) ? data.message : null;
    (document.body.scrollHeight - (window.scrollY + window.innerHeight) < 150) && (
      $('html, body').animate({ scrollTop: $(document).height() }, 100)
    ),
    my ? $('html, body').animate({ scrollTop: $(document).height() }, 100) : (
      sound.play(),
      (checkAnswer(data.message, USER) && localStorage.getItem('notifications') !== 'disable' && document.visibilityState !== 'visible') && (
        sendNotification({
          title: data.username,
          message,
          icon,
          image
        }, () => {
          $(`.message_item[data-id="${data._id}"]`).addClass('choosenhover'),
          setTimeout(() => {
            $(`.message_item[data-id="${data._id}"]`).removeClass('choosenhover')
          }, 5000)
        })
      )
    ),
    $('.empty-results').remove(),
    Chat.append(
      template.message({
        id: data._id,
        user: data.username,
        photo: data.userphoto,
        message: data.message,
        time: data.time,
        quote: data.quote,
        type,
        my
      })
    ),
    checkUrl(data.message) && (type !== 'media') && linkPreview({
      url: data.message.match(/(https?:\/\/[^\s]+)/g)[0],
      id: data._id
    }),
    data.quote && quoteInit(data),
    checkAudio(data.message) && (
      voiceList.push(data.message),
      voiceList.sort(),
      initWave(data.message)
    )
  }),

  // UI: Load more old messages from DB
  socket.on('more', (data) => {
    let position = 0;
    let initH = 0;
    (data.length > 0) ? (
      $('.empty-results').remove(),
      (document.querySelector('#chat').children.length !== 0) && (
        $.each(data, (i) => {
          const type = checkImg(data[i].message) || checkVideo(data[i].message) ? 'media' : null;
          const my = data[i].username === USER;
          initH = $('.message_item').outerHeight(true),
          position += initH,
          Chat.prepend(
            template.message({
              id: data[i]._id,
              user: data[i].username,
              photo: data[i].userphoto,
              message: data[i].message,
              time: data[i].time,
              quote: data[i].quote,
              type,
              my
            })
          ),
          checkUrl(data[i].message) && (type !== 'media') && linkPreview({
            url: data[i].message.match(/(https?:\/\/[^\s]+)/g)[0],
            id: data[i]._id
          }),
          data[i].quote && quoteInit(data[i]),
          checkAudio(data[i].message) && (
            voiceList.push(data[i].message),
            initWave(data[i].message)
          )
        }),
        window.scrollTo(0, position),
        voiceList.sort()
      )
    ) : end = true
  }),

  $(window).scroll(() => {
    !end && (
      ($(window).scrollTop() === 0) && (
        socket.emit('get_more', { offset: offset += limit })
      )
    )
  }),


  Message.on('keyup', () => {
    if (Message.val().length === 0) return

    (Message.val().length > 1)
      ? socket.emit('typing', { username: USER })
      : socket.emit('stop_typing', { username: USER })
  }),


  socket.on('typing', (data) => {
    typings = data.typings
    if (typings.length < 1) return

    const items = typings.filter(item => item !== USER);
    let typers;
    (typings.length < 3)
      ? typers = items.join(', ') + ' typing a message...'
      : typers = 'Several people are typing...',
    Status.addClass('typing').text(typers)
  }),

  socket.on('recording', (data) => {
    Status.addClass('typing').text(`${data.username} recording a audio message...`)
  }),

  Message.focusout(() => {
    if (Message.val().length < 2) return

    socket.emit('stop_typing', { username: USER })
  }),


  socket.on('stop_typing', (data) => {
    typings = data.typings
    Status.removeClass('typing').empty()
  }),


  socket.on('online', (data) => {
    OnlineCount.text(counter(data.online.length) || 0)
  }),


  $(document).on('click', '.del', function() {
    socket.emit('delete', {
      username: $(this).parent().data('user'),
      id: $(this).parent().data('id'),
      file: $(this).parent().find('.message_text .deleteble').data('url')
    })
  }),
  socket.on('delete', (data) => $(`.message_item[data-id="${data.id}"]`).remove()),


  socket.on('cleared', () => {
    Status.removeClass('typing').empty(),
    Chat.empty().html(template.error('No messages yet'))
  }),


  socket.on('alert', (data) => warning(data.message, data.type));


  const playPause = (index, initial = index) => {
    const curSrc = player.currentSrc.replace(/.+[\\\/]/, '');
    const dataSrc = encodeURI($('.audio').eq(index).find('.control').data('src').replace(/.+[\\\/]/, ''));

    initial === index ? (
      player.paused ? (
        curSrc === dataSrc ? (
          player.play()
        ) : (
          player.src = voiceList[index],
          player.play()
            .then(() => meta(
              $('.audio').eq(index).parents('.message_block_right').find('.message_user').text()
            ))
        )
      ) : player.pause()
    ) : (
      player.src = voiceList[index],
      player.play()
        .then(() => meta(
          $('.audio').eq(index).parents('.message_block_right').find('.message_user').text()
        ))
    )
  };

  const next = () => {
    index = (index + 1);
    if (index > voiceList.length - 1) {
      player.pause()
      return
    }
    player.src = voiceList[index];
    player.play()
      .then(() => meta(
        $('.audio').eq(index).parents('.message_block_right').find('.message_user').text()
      )),
    $('.audio').not('playing').removeClass('playing')
  };

  const meta = (title) => {
    let cover;
    cover = $('.audio').eq(index).parents('.message_item').find('.message_avatar')
      .css('background-image').replace(/^url\(['"](.+)['"]\)/, '$1'),
    cover === 'none' && (
      cover = window.location.href + 'images/icon_192.png'
    ),
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'Voice message',
      artwork: [{ src: cover }]
    })
  };

  $(document).on('click', '.audio-btn', function() {
    let initial = index;
    index = $('.audio-btn').index(this),
    playPause(index, initial)
  }),

  player.onended = () => next(),

  player.addEventListener('pause', () => {
    $('.audio').removeClass('playing')
  }),

  player.addEventListener('play', () => {
    $('.audio').removeClass('playing'),
    $('.audio').eq(index).addClass('playing')
  }),

  player.addEventListener('timeupdate', () => {
    const curTime = player.currentTime;
    const duration = player.duration;
    $('.playing .duration').text(toHHMMSS(curTime)),
    $('.playing').find('wave').eq(1).css('width', `${(curTime + .25) / duration * 100}%`)
  }),

  $(document).on('click', '.playing wave', function(e) {
    const offset = e.pageX - $(this).offset().left;
    const duration = player.duration;
    const width = $(this).width();
    duration && (
      player.currentTime = (offset / width) * duration
    )
  })
});
