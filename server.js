'use strict';
// myBot
// Version 1.0.1

var express = require('express');
var request = require('superagent');
var bodyParser = require('body-parser');

// Global Variables
var app = express();
var port = process.env.PORT || 8080;
var pageToken = 'EAAZARCeCmajcBALOsTO4mOPAcruNQQZAzRNR9xE8cNOqe0pHe6qn5kkpLfhbXCIEkiiJ7XY71JpyhZABvoqlPdxkw9qX5qHA2OlXmDAZBk2CfvW6OpEtxX3pZAQ887c83DpdoZCy6QBVYBziEdZARYyvjSjfSLFeY8oqIao3dBYPQZDZD';
var verifyToken = 'my_secret_token';

// --------------------- Setting up Webhook -----------------------------
app.get('/webhook', function(req, res) {
    if (req.query['hub.verify_token'] === verifyToken) {
        console.log('* Handshaked! *');
        return res.send(req.query['hub.challenge']);
    }
    res.send('Error: Wrong validation token!');
});

app.get('/', function(req, res) {
    res.send('Success! This is Bot for Facebook Messenger.');
});

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// --------- Initiate Messenger Bot ---------
app.post('/webhook', function(req, res) {
    var messagingEvents = req.body.entry[0].messaging;
    var sender = messagingEvents[0].sender.id;
    console.log('SenderID: ' + sender);

    // Start processing incoming messages
    messagingEvents.forEach(function(event) {
        var payload = '';
        var text = '';

        // Return from structured page
        if (event.postback) {
            payload = JSON.stringify(event.postback.payload).trim().substring(0, 60);
            console.log('Payload: ' + payload);
            if (payload.substring(0, 4).toLowerCase() === 'help') {
                sendTextMessage(sender, 'Show help menu');
            }
            else if (payload.substring(0, 5).toLowerCase() === 'about') {
                sendTextMessage(sender, 'This is myBot written for MEAN Workshop');
            }
        }

        // Branch into separate functions
        if ((event.message && event.message.text) && !payload) {
            text = event.message.text.trim();
            console.log('Text: ' + text);

            if (text.substring(0, 4).toLowerCase() === 'help' || text.substring(0, 4).toLowerCase() === 'menu') {
                showMenu(sender, 'Help menu');
            } else {
                sendTextMessage(sender, 'This is myBot, type MENU for help');
            }
        }
    });
    res.sendStatus(200);
});

// To send plain text messages
function sendTextMessage(sender, textMsg) {
   sendMessage(sender, {
         text: textMsg
   });
}

// To send message bubbles (structured messages)
function showMenu(sender, messageDetails) {
    sendMessage(sender, {
        attachment: {
            type: 'template',
            payload: {
                template_type: 'generic',
                elements: [{
                    title: 'myBot for Messenger',
                    subtitle: messageDetails,
                    image_url: 'http://i446.photobucket.com/albums/qq190/naytunthein/iLedger_red_zps6opcv9lt.png',
                    buttons: [{
                        type: 'postback',
                        title: 'Help',
                        payload: 'help'
                    }, {
                        type: 'postback',
                        title: 'About',
                        payload: 'about'
                    }]
                }]
            }
        }
    });
}

// Generic function to send messages
function sendMessage(sender, message) {
    request
        .post('https://graph.facebook.com/v2.6/me/messages')
        .set('Content-Type', 'application/json')
        .query({
            access_token: pageToken
        })
        .send({
            recipient: {
                id: sender
            },
            message: message
        })
        .end(function(err, res) {
            if (err) {
                console.log('* Error sending message * ' + JSON.stringify(err));
            } else if (res.body.error) {
                console.log('Error: ', res.body.error);
            }
        });
}

//----- Token
// update and check page token for an existing app
app.post('/token', function(req, res) {
    if (req.body.verifyToken === verifyToken) {
        pageToken = req.body.token;
        return res.sendStatus(200);
    }
    res.sendStatus(403);
});

app.get('/token', function(req, res) {
    if (req.body.verifyToken === verifyToken) {
        console.log(verifyToken);
        return res.send({
            token: pageToken
        });
    }
    console.log('error in token');
    res.sendStatus(403);
});

app.listen(port);
console.log('\n========= myBot listening on port ' + port + ' =========\n');

