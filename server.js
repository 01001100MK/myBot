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
var pageToken = 'EAAZARCeCmajcBALOsTO4mOPAcruNQQZAzRNR9xE8cNOqe0pHe6qn5kkpLfhbXCIEkiiJ7XY71JpyhZABvoqlPdxkw9qX5qHA2OlXmDAZBk2CfvW6OpEtxX3pZAQ887c83DpdoZCy6QBVYBziEdZARYyvjSjfSLFeY8oqIao3dBYPQZDZD';
var verifyToken = 'my_secret_token';

// configure body parser
app.use(bodyParser.urlencoded({ extended: true }));
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

            if (payload.substring(0, 12).toLowerCase() === 'showallbears') {
                getBears(function(bears){
                    if (bears) sendTextMessage(sender, bears);
                });
            } else if (payload.substring(0, 5).toLowerCase() === 'about') {
                sendTextMessage(sender, 'This is myBot written for MEAN Workshop');
            }
        }

        // MESSAGE: Data from user text input
        if ((event.message && event.message.text) && !payload) {
            text = event.message.text.trim();
            console.log('Text: ' + text);

            if (text.substring(0, 4).toLowerCase() === 'help' || text.substring(0, 4).toLowerCase() === 'menu') {
                showMenu(sender, 'Help menu');
            } else if (text.substring(0, 4).toLowerCase() === 'add '){
                var bear_name = text.substring(4, 20);
                if (bear_name) createBear({name: bear_name}, function(err){
                    if (!err) sendTextMessage(sender, 'Bear Added!');
                });
            } else {
                sendTextMessage(sender, 'This is myBot, type MENU for help, ADD <name> to add');
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
                    title: 'myBot for Messenger',
                    subtitle: messageDetails,
                    image_url: 'http://i446.photobucket.com/albums/qq190/naytunthein/iLedger_red_zps6opcv9lt.png',
                    buttons: [{
                        type: 'postback',
                        title: 'Show All Bears',
                        payload: 'showallbears'
                    }, {
                        type: 'web_url',
                        title: 'Wind Weather',
                        url: 'https://mybot12345.herokuapp.com/weather/'
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
        return res.send({ token: pageToken });
    }
    console.log('error in token');
    res.sendStatus(403);
});

//--- Server start listening
app.listen(port);
console.log('\n========= myBot listening on port ' + port + ' =========\n');


// --------------------- Setting up Database -----------------------------
var mongoose   	= require('mongoose');
var Bear     	= require('./app/models/bear');

// Connect to MongoDB using Mongoose driver
mongoose.connect('mongodb://naytunAdmin:Password99@ds023654.mlab.com:23654/mean'); 

// Create a New Bear
function createBear(obj, callback){		
    var bear = new Bear();		// create a new instance of the Bear model
    bear.name = obj.name;       
    bear.save(function(err) {
        callback(err);
    });
}

// Get All Bears
function getBears(callback){
    Bear.find({}).exec(function(err, bears) {
        if (err) {
            console.log(err);
        } else {
            var result = '';
            // Extract each row from json object
            bears.forEach(function(bear){
                result += '- ' + bear.name + "\n";
            });
            console.log(result);
            callback(result);
        }
    });
}


app.get('/weather', function(req, res) {
    res.render(path.join(__dirname + '/app/index.html'));
});
