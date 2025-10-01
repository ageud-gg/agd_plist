fx_version 'cerulean'
game 'gta5'

author 'ageud'
description 'Active Police Menu'
version '1.0.0'

-- Load oxmysql server library
server_script '@oxmysql/lib/MySQL.lua'

server_scripts {
    'server.lua'
}

client_scripts {
    'client.lua'
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js'
}

dependencies {
    'oxmysql'
}
