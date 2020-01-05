$(document).ready(() => {
    const socket = io();

    const username = $('#nameInput');
    const message = $('#textInput');
    const send_message = $('#send_message');
    const chat = $('#chat');
    const message_form = $('.message_form');
    const status = $('#status');
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

    const getDate = (timestamp) => {
        const t = new Date(timestamp);
        return `${t.getDate()}.${t.getMonth()+1}.${t.getFullYear()}`
    };

    const timeFormat = (timestamp) => {
        const t = new Date(timestamp);
        const min = t.getMinutes() < 10 ? `0${t.getMinutes()}` : t.getMinutes();
        return `${t.getHours()}:${min}`
    };

    const dateFormat = (timestamp) => {
        const d = new Date();
        const t = new Date(timestamp);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const curYear = d.getFullYear();
        const curMonth = months[d.getMonth()];
        const curDate = d.getDate();

        const year = t.getFullYear();
        const month = months[t.getMonth()];
        const date = t.getDate();

        let thisYear;
        year !== curYear ? thisYear = ` ${year}` : thisYear = '';

        if (`${date}.${month}.${year}` === `${curDate}.${curMonth}.${curYear}`) {
            return `today`
        } else if (`${date}.${month}.${year}` === `${curDate - 1}.${curMonth}.${curYear}`) {
            return `yesterday`
        } else {
            return `${date} ${month}${thisYear}`
        }
    };

    const checkImg = (url) => url.toLowerCase().match(/\.(jpeg|jpg|png|webp|gif|bmp)$/) != null;

    const template = {
        message: (id, user, photo = '', content, time, type = '', my = false, group = false) => {
            return `
                ${group ? `<div class="date_group"><span>${dateFormat(time)}</span></div>` : ''}
                <div class="message_item${my ? ' my' : ''}" data-id="${id}">
                    <div class="message_block_left">
                        ${photo ? `
                            <div class="message_avatar"${photo ? ` style="background-image: url('./photos/${photo}');"` : ''}></div>
                        ` : `
                            <div class="message_avatar">${user ? user.slice(0, 1) : ''}</div>
                        `}
                    </div>

                    <div class="message_block_right ${type}">
                        <div class="message_user">${user}</div>
                        <div class="message_text">${type === 'media' ? `<img class="image" src="${content}" alt="">` : content}</div>
                        <div class="message_time">${timeFormat(time)}</div>
                    </div>

                    ${my ? '<div class="del"><i class="material-icons">delete</i></div>' : ''}
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
    const write = (text) => {
        let user = localStorage.getItem('username') ? localStorage.getItem('username') : username.val().trim();
        let photo = localStorage.getItem('userphoto') ? localStorage.getItem('userphoto') : null;

        localStorage.getItem('username') ? (
            user = localStorage.getItem('username')
        ) : (
            user.length > 3 && (
                user = username.val().trim(),
                localStorage.setItem('username', user),
                socket.emit('set_username', {
                    username: user
                }),
                username.remove(),
                message_form.prepend(`<label for="imageInput" class="user">${localStorage.getItem('username').slice(0, 1)}</label>`)
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
                time: Date.now()
            })
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

    // Handler: Uploading user photo
    const upload = (file) => {
        const formData = new FormData;
        formData.append('photo', file)
        fetch('/upload', {
            method: 'POST',
            body: formData
        }).then(
            (response) => response.json()
        ).then(
            (data) => {
                localStorage.setItem('userphoto', data.image),
                $('.user').empty().css('background-image', `url('./photos/${data.image}')`),
                socket.emit('set_userphoto', {
                    username: localStorage.getItem('username'),
                    userphoto: data.image
                }),
                warning('Successfully uploaded')
            }
        ).catch((err) => console.error(err))
    };

    // UI: Uploading user photo
    $(document).on('change', '#imageInput', (e) => {
        e.target.files[0].size > 0 ? upload(e.target.files[0]) : warning('Empty file', 'error')
    }),

    // UI: Check username in localstorage
    localStorage.getItem('username') && (
        socket.emit('set_username', {
            username: localStorage.getItem('username')
        }),
        username.remove(),
        message_form.prepend(`<label for="imageInput" class="user">${localStorage.getItem('username').slice(0, 1)}</label>`)
    ),

    // UI: Check photo in localstorage
    localStorage.getItem('userphoto') && (
        socket.emit('set_userphoto', {
            image: localStorage.getItem('userphoto')
        }),
        $('.user').empty().css('background-image', `url('./photos/${localStorage.getItem('userphoto')}')`)
    ),

    // UI: Send message via button
    send_message.on('click', () => {
        let text = message.val().replace(/(<([^>]+)>)/ig, '').trim();
        if (text.length > 1) {
            text.length > 1500 && (
                text = text.substr(0, 1500)
            );
            const value = text.split(/[\s,]+/);
            value[0] === '/clear' ? clear(value[1]) : write(text)
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
            value[0] === '/clear' ? clear(value[1]) : write(text)
        }
    }),

    // UI: Toggle visible sending button
    message.on('keyup', () => {
        message.val().trim().length > 1 && message_form.addClass('typed'),
        message.val().trim().length < 2 && message_form.removeClass('typed')
    });

    // UI: Output old messages from DB
    socket.on('output', (data) => {
        data.length > 0 ? (
            data.length < limit && socket.emit('get_more', { offset: offset += limit }),
            $('.empty-results').remove(),
            document.querySelector('#chat').children.length === 0 && (
                $.each(data, (i) => {
                    let my = data[i].username === localStorage.getItem('username') ? true : false;
                    let content = checkImg(data[i].message) ? 'media' : undefined;
                    let group = false;
                    chat.prepend(
                        template.message(
                            data[i]['_id'],
                            data[i].username,
                            data[i].userphoto,
                            data[i].message,
                            data[i].time,
                            content,
                            my,
                            group
                        )
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
                my
            )
        )
    }),

    // UI: Load more old messages from DB
    socket.on('more', (data) => {
        let position = 0;
        let one_h = 0;
        data.length > 0 ? (
            $('.empty-results').remove(),
            document.querySelector('#chat').children.length !== 0 && (
                $.each(data, (i, v) => {
                    let my = data[i].username === localStorage.getItem('username') ? true : false;
                    let content = checkImg(data[i].message) ? 'media' : undefined;
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
                            my
                        )
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
    socket.on('stop_typing', () => status.removeClass('typing').text()),


    $(document).on('click', '.del', function() {
        socket.emit('delete', {
            username: $(this).parent().find('.message_user').text(),
            id: $(this).parent().data('id')
        })
    }),
    socket.on('delete', (data) => $(`.message_item[data-id="${data.id}"]`).remove()),


    socket.on('cleared', () => {
        status.removeClass('typing').text(),
        chat.empty().html(template.error('No messages yet'))
    }),


    socket.on('alert', (data) => warning(data.message, data.type))
});
