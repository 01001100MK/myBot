'use strict';
// ------------------
//   myBot
//   version 1.0.2
// ------------------

var express = require('express');
var request = require('superagent');
var bodyParser = require('body-parser');
var path = require('path');
var movieApi = require("./app/controllers/movieApi");
// Global Variables
var app = express();
var port = process.env.PORT || 8080;
var pageToken = 'EAACcZCe2TVjsBANPmkMgDlT2FNZBGZB5cG5BexQ6SDLqkvYQxm5sQNcU0O5kmF9LZBkGVztZCazMQnAuMdZBZAAqRgBc7ZAUhPqgVUPkB82Rys1JMFufx1HfjsdNCQX7XPKZA2UVZBT9LIZA5wdtyooaokssOjPwytIR4jrXx78yEETMAZDZD';
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
                            sendTextMessage(sender, "Contact Found!");
                    });
                }
            } else if (text.substring(0, 6).toLowerCase() === 'delete') {
                var contactName = text.substring(5, text.length);
                if (contactName) {
                    deleteContact({
                        name: contactName
                    }, function(err) {
                        if (!err) {
                            sendTextMessage(sender, "Contact Deleted!");
                        }
                    });
                }
            } else if (text.charAt(0) === '?') {
                var word = text.substring(1, text.length);
                if (word) {
                    getDictionary(sender, word);
                }
            } else if (text.substring(0, 2).toLowerCase() === 'mv') {
                var movie = text.substring(3, text.length);
                if (movie) {
                    searchMovie(sender, movie);
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

function getDictionary(sender, word) {
    request
        .get("http://api.pearson.com/v2/dictionaries/lasde/entries?headword=" + word + "&limit=3")
        .set('Content-Type', 'application/json')
        .accept('application/json')
        .end(function(err, res) {
            if (err) {
                console.log('* Error *');
            } else {
                var dict = res.body;
                for (var i = 0; i < dict.count; i++) {
                    var headword = dict.results[i].headword;
                    var part_of_speech = dict.results[i].part_of_speech;
                    try {
                        var ipa = dict.results[i].pronunciations[0].ipa;
                    } catch (err) {}

                    var definition = dict.results[i].senses[0].definition[0];
                    try {
                        var example = dict.results[i].senses[0].gramatical_examples[0].examples[0].text;
                    } catch (err) {}
                    try {
                        var example2 = dict.results[i].senses[0].collocation_examples[0].example.text;
                    } catch (err) {}
                    try {
                        var example3 = dict.results[i].senses[0].examples[0].text;
                    } catch (err) {}

                    sendTextMessage(sender, "word: " + headword);
                    sendTextMessage(sender, "part of speech: " + part_of_speech);
                    sendTextMessage(sender, "ipa: " + ipa);
                    sendTextMessage(sender, "def: " + definition);
                    sendTextMessage(sender, example);
                    sendTextMessage(sender, example2);
                    sendTextMessage(sender, example3);
                }
            }
        });
}

function searchMovie(sender, movie) {
    request
        .get("https://api.themoviedb.org/3/search/movie?api_key=81d7640dffed48055b1803be5b452893&query=" + movie)
        .set('Content-Type', 'application/json')
        .accept('application/json')
        .end(function(err, res) {
            if (err) {
                console.error(err);
            } else {
                var movie = res.body.results[0];

                sendTextMessage(sender, movie.title);
                sendTextMessage(sender, movie.release_date);
                sendTextMessage(sender, movie.vote_average);
                sendTextMessage(sender, movie.id);

                if (movie.overview > 320) {
                    var overview = movie.overview.substring(0, 320);
                    sendTextMessage(sender, overview);

                    var overview2 = movie.overview.substring(320, 640);
                    sendTextMessage(sender, overview2);

                    var overview3 = movie.overview.substring(640, 960);
                    sendTextMessage(sender, overview3);
                } else {
                    sendTextMessage(sender, movie.overview);
                }
            }
        });
};
