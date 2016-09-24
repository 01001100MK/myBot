'use strict';
// ------------------
//   myBot
//   version 1.0.2
// ------------------

var express = require('express');
var request = require('superagent');
var bodyParser = require('body-parser');
var path = require('path');

// Global Variables
var app = express();
var port = process.env.PORT || 8080;
var pageToken = 'EAACcZCe2TVjsBAPI3csZBAilLY0ZBiw8ZC2xZCgYPcgIwXeDvepigm4sgXkZB4GbM7887cyXf4yWKrrz09dGpEfbYTNcYB1B7kUZBBnP06g0jaXbdRwyTmVOID7Po8eOZB3fkl84FV4InaEfAGLK73cncZCZBK4Fn8GMo1fyQDRE3e9QZDZD';
var verifyToken = 'my_secret_token';

// configure body parser
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

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

// --- Initiate Messenger Bot
app.post('/webhook', function(req, res) {
    var messagingEvents = req.body.entry[0].messaging;
    var sender = messagingEvents[0].sender.id;
    console.log('SenderID: ' + sender);

    // Processing incoming messages
    messagingEvents.forEach(function(event) {
        var payload = '';
        var text = '';

        // PAYLOAD: Data from structured page
        if (event.postback) {
            // Start extract string from index one to skip quote (") character
            payload = JSON.stringify(event.postback.payload).trim().substring(1, 60);
            console.log('Payload: ' + payload);

            if (payload.substring(0, 10).toLowerCase() === 'showexrate') {
                getExRate(sender);
            } else if (payload.substring(0, 5).toLowerCase() === 'about') {
                sendTextMessage(sender, 'I am badass Alfred!');
            } else if (payload.substring(0, 4).toLowerCase() === 'help') {
                sendTextMessage(sender, "Save *name_without_space* *number*, Find *name_without_space*, " +
                    "Delete *name_without_space*");
            }
        }

        // MESSAGE: Data from user text input
        if ((event.message && event.message.text) && !payload) {
            text = event.message.text.trim();
            console.log('Text: ' + text);

            if (text.substring(0, 4).toLowerCase() === 'help' || text.substring(0, 4).toLowerCase() === 'menu') {
                showMenu(sender, 'Help menu');
            } else if (text.substring(0, 4).toLowerCase() === 'save') {
                var contactName = text.substring(5, text.lastIndexOf(' '));
                var contactNumber = text.substring(text.lastIndexOf(' ') + 1, text.length);
                if (contactName)
                    createContact({
                        name: contactName,
                        mobile1: contactNumber
                    }, function(err) {
                        if (!err)
                            sendTextMessage(sender, 'Contact Saved!');
                        else
                            sendTextMessage(sender, 'Error!')
                    });
            } else if (text.substring(0, 4).toLowerCase() === 'find') {
                var contactName = text.substring(5, text.length);
                if (contactName) {
                    findContact({
                        name: contactName
                    }, function(err, contact) {
                        if (!err)
                            sendTextMessage(sender, contact);
                    });
                }
            } else if (text.substring(0, 6).toLowerCase() === 'delete') {
                var contactName = text.substring(5, text.length);
                if (contactName) {
                    deleteContact({
                        name: contactName
                    }, function(!err) {
                        sendTextMessage(sender, "Contact Deleted!");
                    });
                }
            } else {
                sendTextMessage(sender, "This is Alfred! Don't mess up with me!");
            }
        }
    });
    res.sendStatus(200);
});

//--- To send plain text messages
function sendTextMessage(sender, textMsg) {
    sendMessage(sender, {
        text: textMsg
    });
}

//--- To send message bubbles (structured messages)
function showMenu(sender, messageDetails) {
    sendMessage(sender, {
        attachment: {
            type: 'template',
            payload: {
                template_type: 'generic',
                elements: [{
                    title: 'That is I do!',
                    subtitle: messageDetails,
                    image_url: 'http://media.comicbook.com/2015/12/alfredjeremyironsbatmanvsuperman-164095.png',
                    buttons: [{
                        type: 'postback',
                        title: 'About',
                        payload: 'about'
                    }, {
                        type: 'postback',
                        title: 'Help',
                        payload: 'help'
                    }, {
                        type: 'postback',
                        title: 'Exchange Rate',
                        payload: 'showexrate'
                    }]
                }]
            }
        }
    });
}

//--- Generic function to send messages
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

//--- Token
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

//--- Server start listening
app.listen(port);
console.log('\n========= myBot listening on port ' + port + ' =========\n');


// --------------------- Setting up Database -----------------------------
var mongoose = require('mongoose');
var Contact = require('./app/models/contact');

// Connect to MongoDB using Mongoose driver
mongoose.connect("mongodb://light:love@ds021346.mlab.com:21346/myai");

// Create a New Contact
function createContact(obj, callback) {
    var contact = new Contact(); // create a new instance of the Contact model
    contact.name = obj.name;
    contact.mobile1 = obj.mobile1;
    contact.save(function(err) {
        callback(err);
    });
}

// Get Contact by Name
function findContact(obj, callback) {
    Contact.findOne({
        name: obj.name
    }, function(err, contact) {
        if (err) {
            callback(err);
        } else {
            callback(contact);
        }
    });
}

function deleteContact(obj, callback) {
    Contact.remove({
        name: obj.name
    }, function(err) {
        callback(err);
    });
}
// --------------------- Setting up AP CALLS -----------------------------

function getExRate(sender) {
    request
        .get('http://openexchangerates.org/api/latest.json?app_id=440b42f70b964695a9d820bb96398caa')
        .set('Content-Type', 'application/json')
        .accept('application/json')
        .end(function(err, res) {
            if (err) {
                console.log('* Error * ');
            } else {
                var exgRate = '';
                var currencies = res.body;

                exgRate = currencies.rates.MMK;
                sendTextMessage(sender, 'USD vs. MMK: ' + exgRate.toString());
            }
        });
}
