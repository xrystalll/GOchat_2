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
        const t = new Date(timestamp);

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

    const checkUrl = (url) => url.match(/(https?:\/\/[^\s]+)/g) != null;

    const findLink = (text) => text.replace(/(https?:\/\/[^\s]+)/g, '<a class="link" href="$1" target="_blank" title="Open in new tab">$1</a>');

    const template = {
        message: (id, user, photo = '', content, time, type = '', my = false, ...quote) => {
            return `
                <div class="message_item${my ? ' my' : ''}" data-id="${id}" data-user="${user}">
                    <div class="message_block_left">
                        ${photo ? `
                            <div class="message_avatar"${photo ? ` style="background-image: url('./img/users/${photo}');"` : ''}></div>
                        ` : `
                            <div class="message_avatar">${user ? user.slice(0, 1) : ''}</div>
                        `}
                    </div>

                    <div class="message_content">
                        <div class="message_block_right ${type}">
                            ${type !== 'media' ? `<div class="message_user">${user}</div>` : ''}
                            ${quote[1] ? `
                                <div class="quote">
                                    <div class="message_quote_user">${quote[0]}</div>
                                    ${checkImg(quote[1]) ? `
                                        <div class="message_quote_text media">
                                            <img src="${quote[1]}" class="image" alt="">
                                        </div>
                                    ` : `
                                        <div class="message_quote_text">
                                            ${quote[1]}
                                        </div>
                                    `}
                                </div>
                            ` : ''}
                            <div class="message_text">${type === 'media' ? `
                                <img src="${content}" class="image" ${!checkUrl(content) ? `data-url="${content.substring(content.lastIndexOf('/') + 1)}"` : ''} alt="">
                            ` : findLink(content)}</div>
                            <div class="message_time" data-time="${time}">${timeFormat(time)}</div>
                        </div>
                    </div>

                    ${my ? `
                        <div class="del" title="Delete this message"><i class="material-icons">delete</i></div>
                    ` : `
                        <div class="quote_btn" title="Quote message"><i class="material-icons">reply</i></div>
                    `}
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
    const write = (text, ...quote) => {
        let user = localStorage.getItem('username') ? localStorage.getItem('username') : username.val().replace(/(<([^>]+)>)/ig, '').trim();
        let photo = localStorage.getItem('userphoto') ? localStorage.getItem('userphoto') : null;

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
            !quote[0] ? (
                socket.emit('new_message', {
                    message: text,
                    username: user,
                    userphoto: photo,
                    time: Date.now()
                })
            ) : (
                socket.emit('new_message', {
                    message: text,
                    username: user,
                    userphoto: photo,
                    time: Date.now(),
                    quote: {
                        text: quote[2],
                        username: quote[1],
                        time: quote[3],
                    }
                })
            ),
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
                let data = response.data;
                if (data) {
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
                warning('Successfully uploaded')
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
        $('.quote_form .message_user, .quote_form .message_text, .quote_form .content, .quote_form .time').empty()
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
            let quoteActive = quote_form.hasClass('active');
            let quote = false;
            let quoteUser;
            let quoteText;
            let quoteTime;
            quoteActive && (
                quote = true,
                quoteUser = quote_form.find('.message_user').text(),
                quoteText = quote_form.find('.content').text(),
                quoteTime = quote_form.find('.time').text()
            ),
            value[0] === '/clear' ? clear(value[1]) : write(text, quote, quoteUser, quoteText, quoteTime)
        } else warning('Enter message text', 'error')
    }),

    // UI: Send message via ENTER key
    $(document).on('keyup', '#nameInput, #textInput', (e) => {
        let text = message.val().replace(/(<([^>]+)>)/ig, '').trim();
        if (text.length > 1 && e.which === 13) {
            if (text.length >= 1500) {
                text = text.substr(0, 1500)
            };
            const value = text.trim().split(/[\s,]+/);
            let quoteActive = quote_form.hasClass('active');
            let quote = false;
            let quoteUser;
            let quoteText;
            let quoteTime;
            quoteActive && (
                quote = true,
                quoteUser = quote_form.find('.message_user').text(),
                quoteText = quote_form.find('.content').text(),
                quoteTime = quote_form.find('.time').text()
            ),
            value[0] === '/clear' ? clear(value[1]) : write(text, quote, quoteUser, quoteText, quoteTime)
        }
    }),

    // UI: Toggle visible sending button
    message.on('keyup', () => {
        message.val().trim().length > 1 && message_form.addClass('typed'),
        message.val().trim().length < 2 && message_form.removeClass('typed')
    }),

    // UI: Itit quote form
    $(document).on('click', '.quote_btn', function() {
        const srcRegex = /<img.*?src="(.*?)"/;
        let media = $(this).parent().find('.message_block_right').hasClass('media');
        const text = media
            ? srcRegex.exec($(this).parent().find('.message_text').html().trim())[1]
            : $(this).parent().find('.message_text').html().trim()
        quote_form.addClass('active'),
        media ? (
            $('.quote_form .message_user').addClass('none'),
            $('.quote_form .message_text').addClass('media')
        ) : (
            $('.quote_form .message_user').removeClass('none'),
            $('.quote_form .message_text').removeClass('media')
        ),
        $('.quote_form .message_user').text($(this).parent().data('user')),
        $('.quote_form .message_text').html($(this).parent().find('.message_text').html().trim()),
        $('.quote_form .content').text(text),
        $('.quote_form .time').text($(this).parent().find('.message_time').data('time')),
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
                    let my = data[i].username === localStorage.getItem('username') ? true : false;
                    let content = checkImg(data[i].message) ? 'media' : undefined;
                    let quoteUser = data[i].quote.message != null ? data[i].quote.message.username : undefined;
                    let quoteText = data[i].quote.message != null ? data[i].quote.message.text : undefined;
                    chat.prepend(
                        template.message(
                            data[i]['_id'],
                            data[i].username,
                            data[i].userphoto,
                            data[i].message,
                            data[i].time,
                            content,
                            my,
                            quoteUser,
                            quoteText
                        )
                    ),
                    checkUrl(data[i].message) && content !== 'media' && linkPreview(
                        data[i].message.match(/(https?:\/\/[^\s]+)/g)[0],
                        data[i]['_id']
                    )
                })
            ),
            $('html, body').animate({ scrollTop: $(document).height() }, 0)
        ) : chat.html(template.error('No messages yet'))
    }),

    // UI: Adding new message
    socket.on('new_message', (data) => {
        let my = data.username === localStorage.getItem('username') ? true : false;
        let content = checkImg(data.message) ? 'media' : undefined;
        let sound = new Audio('./sounds/new_in.wav');
        let quoteUser = data.quote.message != null ? data.quote.message.username : undefined;
        let quoteText = data.quote.message != null ? data.quote.message.text : undefined;
        document.body.scrollHeight - (window.scrollY + window.innerHeight) < 150 && (
            $('html, body').animate({ scrollTop: $(document).height() }, 100)
        ),
        my ? $('html, body').animate({ scrollTop: $(document).height() }, 100) : (
            sound.play(),
            status.removeClass('typing').text()
        ),
        $('.empty-results').remove(),
        chat.append(
            template.message(
                data['_id'],
                data.username,
                data.userphoto,
                data.message,
                data.time,
                content,
                my,
                quoteUser,
                quoteText
            )
        ),
        checkUrl(data.message) && content !== 'media' && linkPreview(
            data.message.match(/(https?:\/\/[^\s]+)/g)[0],
            data['_id']
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
                    let my = data[i].username === localStorage.getItem('username') ? true : false;
                    let content = checkImg(data[i].message) ? 'media' : undefined;
                    let quoteUser = data[i].quote.message != null ? data[i].quote.message.username : undefined;
                    let quoteText = data[i].quote.message != null ? data[i].quote.message.text : undefined;
                    one_h = $('.message_item').outerHeight(true),
                    position += one_h,
                    chat.prepend(
                        template.message(
                            data[i]['_id'],
                            data[i].username,
                            data[i].userphoto,
                            data[i].message,
                            data[i].time,
                            content,
                            my,
                            quoteUser,
                            quoteText
                        )
                    ),
                    checkUrl(data[i].message) && content !== 'media' && linkPreview(
                        data[i].message.match(/(https?:\/\/[^\s]+)/g)[0],
                        data[i]['_id']
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
    }),


    message.bind('keyup', () => socket.emit('typing', { username: localStorage.getItem('username') })),
    socket.on('typing', (data) => {      
        const items = data.typings.filter(item => item !== localStorage.getItem('username'));
        let typers;
        data.typings.length < 3 ? (
            typers = items.join(', ') + ' typing a message...'
        ) : (
            typers = 'Several people are typing...'
        ),
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
