$(document).ready(() => {
  const socket = io();

  const username = $('#nameInput');
  const message = $('#textInput');
  const send_message = $('#send_message');
  const chat = $('#chat');
  const message_form = $('.message_form');
  const status = $('#status');
  const avatarInput = $('#avatarInput');
  const imageInput = $('#imageInput');
  const attachment = $('.attachment');
  const quote_form = $('.quote_form');
  const cancel_quote = $('.cancel_quote');
  const notif_setting = $('.notif_setting');
  const limit = 10;
  let offset = 0;
  let end = false;

  const warning = (message, type = 'info') => {
    $('body').append(`<div class="alert ${type}">${message}</div>`),
    $('.alert').fadeIn(800).fadeOut(3000),
    setTimeout(() => {
      $('.alert').remove()
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

  const checkUrl = (url) => url.match(/(https?:\/\/[^\s]+)/g) != null;

  const findLink = (text) => text.replace(/(https?:\/\/[^\s]+)/g, '<a class="link" href="$1" target="_blank" title="Open in new tab">$1</a>');

  const template = {
    message: (id, user, photo = '', content, time, type = '', my = false) => {
      return `
        <div class="message_item${my ? ' my' : ''}" data-id="${id}" data-user="${user}">
          <div class="message_block_left">
            ${photo
              ? `<div class="message_avatar"${photo ? ` style="background-image: url('./img/users/${photo}');"` : ''}></div>`
              : `<div class="message_avatar">${user ? user.slice(0, 1) : ''}</div>`
            }
          </div>

          <div class="message_content">
            <div class="message_block_right ${type}">
              ${type !== 'media' ? `<div class="message_user">${user}</div>` : ''}
              <div class="quote_block"></div>
              <div class="message_text">
                ${!checkVideo(content) ? type !== 'media'
                  ? findLink(content)
                  : `<a href="${content}" data-fancybox="gallery" target="_blank">
                    <img src="${content}" class="image" ${!checkUrl(content) ? `data-url="${content.substring(content.lastIndexOf('/') + 1)}"` : ''} alt="">
                  </a>`
                  : `<video src="${content}" class="video" preload="true" loop controls></video>`
                }
              </div>
              <div class="message_time">${timeFormat(time)}</div>
            </div>
          </div>

          ${my
            ? '<div class="del" title="Delete this message"><i class="material-icons">delete</i></div>'
            : '<div class="quote_btn" title="Quote message"><i class="material-icons">reply</i></div>'
          }
        </div>
      `;
    },
    preview: (url, title, text, image) => {
      return `
        <div class="link-preview">
          <a href="${url}" target="_blank">
            <div class="link-title">${title}</div>
            ${text ? `<div class="link-text">${text}</div>` : ''}
            ${image ? `<div class="link-image" style="background-image: url('${image}')"></div>` : ''}
          </a>
        </div>
      `;
    },
    quote: (user, content) => {
      return `
        <div class="quote">
          ${user ? `<div class="message_quote_user">${user}</div>` : ''}
          ${!checkVideo(content) ? !checkImg(content)
            ? `<div class="message_quote_text">${findLink(content)}</div>`
            : `<div class="message_quote_text media">
              <a href="${content}" data-fancybox="gallery" target="_blank">
                <img src="${content}" class="image" alt="">
              </a>
            </div>`
            : '<div class="message_quote_text">Video</div>'
          }
        </div>
      `;
    },
    error: (message) => {
      return `
        <div class="empty-results">
          ${template.ic_info('#8e9399', 112)}
          <div class="empty_words">
            <div class="empty_top">${message}</div>
          </div>
        </div>
      `;
    },
    ic_info: (color = '#fff', size = 24) => {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0V0z" fill="none"/></path>
          <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="${color}"/>
          </path>
        </svg>
      `;
    }
  };

  // Handler: Write new message
  const write = (text, quoteId = null) => {
    let user = localStorage.getItem('username') ? localStorage.getItem('username') : username.val().replace(/(<([^>]+)>)/ig, '').trim();
    const photo = localStorage.getItem('userphoto') ? localStorage.getItem('userphoto') : null;

    localStorage.getItem('username') ? (
      user = localStorage.getItem('username')
    ) : (
      user.length > 3 && (
        user = username.val().replace(/(<([^>]+)>)/ig, '').trim(),
        localStorage.setItem('username', user),
        socket.emit('set_username', {
          username: user
        }),
        username.remove(),
        attachment.removeClass('none'),
        message_form.prepend(`<label for="avatarInput" class="user" title="Set your photo">${localStorage.getItem('username').slice(0, 1)}</label>`)
      )
    );

    user.length > 3 ? text ? (
      message.val(''),
      message_form.removeClass('typed'),
      socket.emit('stop_typing', { username: localStorage.getItem('username') }),
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
    message.val(''),
    message_form.removeClass('typed'),
    password ? socket.emit('clear', { password }) : warning('Enter password', 'error')
  };

  // Handler: Fetch link preview
  const linkPreview = (url, id) => {
    fetch(`/preview?url=${url}`)
      .then(response => response.json())
      .then(response => {
        const data = response.data;
        if (data.title || data.description) {
          $(`.message_item[data-id="${id}"] .message_content`).append(
            template.preview(
              data.link,
              data.title,
              data.description,
              data.image
            )
          )
        } else throw new Error('Failed to get link data')
      })
      .catch(err => console.error(err))
  };

  // Handler: Init quote
  const quoteInit = (id, el) => {
    fetch(`/message?id=${id}`)
      .then(response => response.json())
      .then(response => {
        const data = response[0];
        $(`.message_item[data-id="${el}"] .quote_block`).html(
          data
            ? template.quote(data.username, data.message)
            : template.quote(undefined, 'Deleted message')
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
          username: localStorage.getItem('username'),
          userphoto: data.image
        }),
        warning('Successfully uploaded', 'success')
      ) : warning('Failed to upload', 'error')
    })
    .catch(err => console.error(err))
  };

  // Handler: Uploading message image
  const uploadImage = (file) => {
    const formData = new FormData;
    formData.append('image', file)
    fetch('/upload/image', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => write(data.image))
    .catch(err => console.error(err))
  };

  // Handler: Close quote form
  const cancelQuote = () => {
    quote_form.removeClass('active'),
    $('.quote_form .message_user, .quote_form .message_text, .quote_form .quoteId').empty()
  };

  // Handler: Push browser notification
  const sendNotification = (data) => {
    if (data === undefined || !data) return false
    const title = (data.title === undefined) ? 'Notification' : data.title
    const clickCallback = data.clickCallback
    const message = (data.message === undefined) ? 'Empty message' : data.message
    const icon = (data.icon === undefined) ? 'https://raw.githubusercontent.com/xrystalll/GOchat_2/master/public/images/icon_192.png' : data.icon
    const image = (data.image === undefined) ? undefined : data.image
    const sendNotification = () => {
      const notification = new Notification(title, {
        icon,
        body: message,
        image
      })
      if (clickCallback !== undefined) {
        notification.onclick = () => {
          clickCallback()
          notification.close()
        }
      }
    }

    if (!window.Notification) {
      return false
    } else {
      if (Notification.permission === 'default') {
        Notification.requestPermission(permission => {
          if (permission !== 'denied') sendNotification()
        })
      } else sendNotification()
    }
  };

  // UI: Uploading user avatar
  avatarInput.on('change', (e) => {
    e.target.files[0].size > 0 ? uploadAvatar(e.target.files[0]) : warning('Empty file', 'error')
  }),

  // UI: Uploading message image
  imageInput.on('change', (e) => {
    e.target.files[0].size > 0 ? uploadImage(e.target.files[0]) : warning('Empty file', 'error')
  }),

  // UI: Check username in localstorage
  localStorage.getItem('username') && (
    socket.emit('set_username', {
      username: localStorage.getItem('username')
    }),
    username.remove(),
    attachment.removeClass('none'),
    message_form.prepend(`<label for="avatarInput" class="user" title="Set your photo">${localStorage.getItem('username').slice(0, 1)}</label>`)
  ),

  // UI: Check photo in localstorage
  localStorage.getItem('userphoto') && (
    socket.emit('set_userphoto', {
      image: localStorage.getItem('userphoto')
    }),
    $('.user').empty().css('background-image', `url('./img/users/${localStorage.getItem('userphoto')}')`)
  ),

  // UI: Send message via button
  send_message.on('click', () => {
    let text = message.val().replace(/(<([^>]+)>)/ig, '').trim();
    if (text.length > 1) {
      text.length > 1500 && (
        text = text.substr(0, 1500)
      );
      const value = text.split(/[\s,]+/);
      const quoteActive = quote_form.hasClass('active');
      let quoteId;
      quoteActive && (
        quoteId = quote_form.find('.quoteId').text()
      ),
      value[0] === '/clear' ? clear(value[1]) : write(text, quoteId)
    } else warning('Enter message text', 'error')
  }),

  // UI: Check notification settings in localstorage
  localStorage.getItem('notifications') === 'disable' && (
    notif_setting.removeClass('on').addClass('off')
  ),

  // UI: Toggle notification icon and setting in localstorage
  notif_setting.on('click', () => {
    if (localStorage.getItem('notifications') !== 'disable') {
      warning('Successfully saved', 'success'),
      localStorage.setItem('notifications', 'disable'),
      notif_setting.removeClass('on').addClass('off')
    } else {
      warning('Successfully saved', 'success'),
      localStorage.setItem('notifications', 'enable'),
      notif_setting.removeClass('off').addClass('on')
    }
  }),

  // UI: Send message via ENTER key
  $(document).on('keyup', '#nameInput, #textInput', (e) => {
    let text = message.val().replace(/(<([^>]+)>)/ig, '').trim();
    if (text.length > 1 && e.which === 13) {
      if (text.length >= 1500) {
        text = text.substr(0, 1500)
      }
      const value = text.trim().split(/[\s,]+/);
      const quoteActive = quote_form.hasClass('active');
      let quoteId;
      quoteActive && (
        quoteId = quote_form.find('.quoteId').text()
      ),
      value[0] === '/clear' ? clear(value[1]) : write(text, quoteId)
    }
  }),

  // UI: Toggle visible sending button
  message.on('keyup', () => {
    message.val().trim().length > 1 && message_form.addClass('typed'),
    message.val().trim().length < 2 && message_form.removeClass('typed')
  }),

  // UI: Itit quote form
  $(document).on('click', '.quote_btn', function() {
    const media = $(this).parent().find('.message_block_right').hasClass('media');
    const video = $(this).parent().find('.video').attr('src');
    quote_form.addClass('active'),
    media ? (
      $('.quote_form .message_user').addClass('none'),
      $('.quote_form .message_text').addClass('media')
    ) : (
      $('.quote_form .message_user').removeClass('none'),
      $('.quote_form .message_text').removeClass('media')
    ),
    $('.quote_form .message_user').text($(this).parent().data('user')),
    $('.quote_form .quoteId').text($(this).parent().data('id')),
    video && checkVideo(video) ? (
      $('.quote_form .message_user').removeClass('none'),
      $('.quote_form .message_text').removeClass('media').empty().text('Video')
    ) : $('.quote_form .message_text').html($(this).parent().find('.message_text').html().trim()),
    message.focus()
  }),

  // UI: Close quote form
  cancel_quote.on('click', cancelQuote),

  // UI: Output old messages from DB
  socket.on('output', (data) => {
    data.length > 0 ? (
      data.length < limit && socket.emit('get_more', { offset: offset += limit }),
      $('.empty-results').remove(),
      document.querySelector('#chat').children.length === 0 && (
        $.each(data, (i) => {
          const content = checkImg(data[i].message) || checkVideo(data[i].message) ? 'media' : undefined;
          const my = data[i].username === localStorage.getItem('username');
          chat.prepend(
            template.message(
              data[i]._id,
              data[i].username,
              data[i].userphoto,
              data[i].message,
              data[i].time,
              content,
              my
            )
          ),
          checkUrl(data[i].message) && content !== 'media' && linkPreview(
            data[i].message.match(/(https?:\/\/[^\s]+)/g)[0],
            data[i]._id
          ),
          data[i].quote && quoteInit(
            data[i].quote,
            data[i]._id
          )
        })
      ),
      $('html, body').animate({ scrollTop: $(document).height() }, 0)
    ) : chat.html(template.error('No messages yet'))
  }),

  // UI: Adding new message
  socket.on('new_message', (data) => {
    const content = checkImg(data.message) || checkVideo(data.message) ? 'media' : undefined;
    const my = data.username === localStorage.getItem('username');
    const sound = new Audio('./sounds/new_in.wav');
    const icon = data.userphoto ? window.location.href + 'img/users/' + data.userphoto : undefined;
    const message = checkImg(data.message) ? 'Image' : checkVideo(data.message) ? 'Video' : data.message;
    const image = checkImg(data.message) ? data.message : undefined;
    document.body.scrollHeight - (window.scrollY + window.innerHeight) < 150 && (
      $('html, body').animate({ scrollTop: $(document).height() }, 100)
    ),
    my ? $('html, body').animate({ scrollTop: $(document).height() }, 100) : (
      sound.play(),
      status.removeClass('typing').text(),
      localStorage.getItem('notifications') !== 'disable' && (
        sendNotification({
          title: data.username,
          message,
          icon,
          image,
          clickCallback: () => {
            $(`.message_item[data-id="${data._id}"]`).addClass('choosenhover'),
            setTimeout(() => {
              $(`.message_item[data-id="${data._id}"]`).removeClass('choosenhover')
            }, 5000)
          }
        })
      )
    ),
    $('.empty-results').remove(),
    chat.append(
      template.message(
        data._id,
        data.username,
        data.userphoto,
        data.message,
        data.time,
        content,
        my
      )
    ),
    checkUrl(data.message) && content !== 'media' && linkPreview(
      data.message.match(/(https?:\/\/[^\s]+)/g)[0],
      data._id
    ),
    data.quote && quoteInit(
      data.quote,
      data._id
    )
  }),

  // UI: Load more old messages from DB
  socket.on('more', (data) => {
    let position = 0;
    let one_h = 0;
    data.length > 0 ? (
      $('.empty-results').remove(),
      document.querySelector('#chat').children.length !== 0 && (
        $.each(data, (i) => {
          const content = checkImg(data[i].message) || checkVideo(data[i].message) ? 'media' : undefined;
          const my = data[i].username === localStorage.getItem('username');
          one_h = $('.message_item').outerHeight(true),
          position += one_h,
          chat.prepend(
            template.message(
              data[i]._id,
              data[i].username,
              data[i].userphoto,
              data[i].message,
              data[i].time,
              content,
              my
            )
          ),
          checkUrl(data[i].message) && content !== 'media' && linkPreview(
            data[i].message.match(/(https?:\/\/[^\s]+)/g)[0],
            data[i]._id
          ),
          data[i].quote && quoteInit(
            data[i].quote,
            data[i]._id
          )
        }),
        window.scrollTo(0, position)
      )
    ) : end = true
  }),

  $(window).scroll(() => {
    !end && (
      $(window).scrollTop() === 0 && (
        socket.emit('get_more', { offset: offset += limit })
      )
    )
  });


  if (localStorage.getItem('username')) {
    message.bind('keyup', () => socket.emit('typing', { username: localStorage.getItem('username') }))
  }

  socket.on('typing', (data) => {      
    let items = data.typings.filter(item => item !== localStorage.getItem('username'));
    let typers;
    data.typings.length < 3
      ? typers = items.join(', ') + ' typing a message...'
      : typers = 'Several people are typing...',
    status.addClass('typing').text(typers)
  }),


  message.focusout(() => socket.emit('stop_typing', { username: localStorage.getItem('username') })),
  socket.on('stop_typing', () => status.removeClass('typing').empty()),


  $(document).on('click', '.del', function() {
    socket.emit('delete', {
      username: $(this).parent().data('user'),
      id: $(this).parent().data('id'),
      file: $(this).parent().find('.message_text img').data('url')
    })
  }),
  socket.on('delete', (data) => $(`.message_item[data-id="${data.id}"]`).remove()),


  socket.on('cleared', () => {
    status.removeClass('typing').empty(),
    chat.empty().html(template.error('No messages yet'))
  }),


  socket.on('alert', (data) => warning(data.message, data.type))
});
