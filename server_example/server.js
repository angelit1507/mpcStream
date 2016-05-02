// Load required modules
var http = require("http");              // http server core module
var express = require("express");           // web framework external module
var io = require("socket.io");         // web socket external module
var easyrtc = require("../");           // EasyRTC external module
var db = require("./db");
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');
// This line is from the Node.js HTTPS documentation.
var options = {
    pfx: fs.readFileSync('stackviet.pfx'),
    passphrase: 'Test!234'
};


// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var httpApp = express();
httpApp.use(bodyParser.json({limit: '50mb'})); // support json encoded bodies
httpApp.use(bodyParser.urlencoded({extended: true,limit: '50mb'})); // support encoded bodies
httpApp.use(express.static(__dirname + "/static/"));

httpApp.get('/getuser/:id?', function (req, res) {
    var id = req.params.id;
    db.getUserById(id, function (err, result) {
        if (err)
            res.send(err);
        else
            res.send(result);
    });
});

httpApp.get('/getroom/:id?', function (req, res) {
    var id = req.params.id;
    db.query('SELECT * FROM sb_rooms WHERE sb_rooms.room_id = ' + id, function (err, result) {
        if (err)
            throw err;
        else
            res.send(result);
    });
});

httpApp.post('/login/', function (req, res) {
    if (!req.body || !req.body.email || !req.body.password)
        res.json({code: 'ERROR', message: 'email or pass can not empty!'})
    db.login(req.body, function (err, result) {
        if (err)
            res.send(err);
        else
            res.send(result);
    });
});
httpApp.post('/listQuestions/', function (req, res) {
    console.log('get list')
    db.listQuestions({}, function (err, result) {
        if (err)
            res.send(err);
        else
            res.send(result);
    });
});
httpApp.post('/sendQuestion/', function (req, res) {
    if (!req.body || !req.body.Title || !req.body.Content || !req.body.UserID)
        res.json({code: 'ERROR', message: 'data is invalid!'})
    db.sendQuestion(req.body, function (err, result) {
        if (err)
            res.send(err);
        else
            res.send(result);
    });
});

httpApp.post('/deleteQuestion/', function (req, res) {
    if (!req.body || !req.body.id)
        res.json({code: 'ERROR', message: 'data is invalid!'})
    db.deleteQuestion(req.body.id, function (err, result) {
        if (err)
            res.send(err);
        else
            res.send(result);
    });
});


// Start Express https server on port 8443
var webServer = https.createServer(options, httpApp).listen(443, '14.0.24.9');
//var webServer = https.createServer(options, httpApp).listen(443);
// Start Socket.io so it attaches itself to Express server
var socketServer = io.listen(webServer, {"log level": 1});


// Start Express http server on port 8080
//var webServer = http.createServer(httpApp).listen(8080);

//https.createServer(options, httpApp).listen(443);

// Start Socket.io so it attaches itself to Express server
//var socketServer = io.listen(webServer, {"log level":1});

easyrtc.setOption("logLevel", "error");

// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", function (socket, easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function (err, connectionObj) {
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }

        connectionObj.setField("credential", msg.msgData.credential, {"isShared": false});

        console.log("[" + easyrtcid + "] Credential saved!", connectionObj.getFieldValueSync("credential"));

        callback(err, connectionObj);
    });
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", function (connectionObj, roomName, roomParameter, callback) {
    console.log("[" + connectionObj.getEasyrtcid() + "] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Start EasyRTC server
var rtc = easyrtc.listen(httpApp, socketServer, null, function (err, rtcRef) {
    console.log("Initiated");

    rtcRef.events.on("roomCreate", function (appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);

        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});
