// Load required modules
var http = require("http");              // http server core module
var express = require("express");           // web framework external module
var io = require("socket.io");         // web socket external module
var easyrtc = require("../");           // EasyRTC external module
var db = require("./db");
var https = require('https');
var fs = require('fs');
var url = require('url');
var bodyParser = require('body-parser');
// This line is from the Node.js HTTPS documentation.

var privateKey = fs.readFileSync('privatekey.key')
var certificate = fs.readFileSync('certificate.crt');
// pfx: fs.readFileSync('stackviet.pfx'),
//     passphrase: 'Test!234',
var options = {
    key: privateKey,
    cert: certificate,
    passphrase: 'Test!234',
};

var d = require('domain').create();

d.on('error', function (err) {
    console.log("domain caught", err);
});

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var httpApp = express();
httpApp.use(bodyParser.json({ limit: '50mb' })); // support json encoded bodies
httpApp.use(bodyParser.urlencoded({ extended: true, limit: '50mb' })); // support encoded bodies
httpApp.use(express.static(__dirname + "/stream/"));

httpApp.get('/getuser/:id?', function (req, res) {
    var id = req.params.id;
    db.getUserById(id, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});

httpApp.get('/getroom/:id?', function (req, res) {
    var id = req.params.id;
    db.query('SELECT * FROM sb_rooms WHERE sb_rooms.room_id = ' + id, function (err, result) {
        res.json(result);
    });
});

httpApp.post('/login/', function (req, res) {
    if (!req.body || !req.body.email || !req.body.password)
        res.json({ code: 'ERROR', message: 'email or pass can not empty!' })
    db.login(req.body, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});
httpApp.post('/listQuestions/', function (req, res) {
    console.log('get list')
    db.listQuestions({}, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});
httpApp.post('/sendQuestion/', function (req, res) {
    if (!req.body || !req.body.Title || !req.body.Content || !req.body.UserID)
        res.json({ code: 'ERROR', message: 'data is invalid!' })
    db.sendQuestion(req.body, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});

httpApp.post('/deleteQuestion/', function (req, res) {
    if (!req.body || !req.body.id)
        res.json({ code: 'ERROR', message: 'data is invalid!' })
    db.deleteQuestion(req.body.id, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});

httpApp.post('/listSchedules/', function (req, res) {
    console.log('get list')
    db.listSchedules({}, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});
httpApp.post('/addSchedule/', function (req, res) {
    if (!req.body || !req.body.Title || !req.body.Content || !req.body.StreamTime)
        res.json({ code: 'ERROR', message: 'data is invalid!' })
    db.addSchedule(req.body, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});

httpApp.post('/deleteSchedule/', function (req, res) {
    if (!req.body || !req.body.id)
        res.json({ code: 'ERROR', message: 'data is invalid!' })
    db.deleteSchedule(req.body.id, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});

httpApp.post('/banChat/', function (req, res) {
    if (!req.body || !req.body.id)
        res.json({ code: 'ERROR', message: 'data is invalid!' })
    db.banChat(req.body.id, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});

httpApp.post('/banView/', function (req, res) {
    if (!req.body || !req.body.id)
        res.json({ code: 'ERROR', message: 'data is invalid!' })
    db.banView(req.body.id, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});

httpApp.post('/unBanChat/', function (req, res) {
    if (!req.body || !req.body.id)
        res.json({ code: 'ERROR', message: 'data is invalid!' })
    db.unBanChat(req.body.id, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});

httpApp.post('/unBanView/', function (req, res) {
    if (!req.body || !req.body.id)
        res.json({ code: 'ERROR', message: 'data is invalid!' })
    db.unBanView(req.body.id, function (err, result) {
        if (err)
            res.json(err);
        else
            res.json(result);
    });
});



httpApp.get('/img_proxy/', function (request_from_client, res) {
    var image_url = request_from_client.query.image_url;
    var image_host_name = url.parse(image_url).hostname
    var filename = url.parse(image_url).pathname.split("/").pop()
    http.get(image_url, function (response) {
        var imageSize = parseInt(response.headers["content-length"]);
        var imageBuffer = new Buffer(imageSize);
        var bytes = 0;

        response.setEncoding("binary");

        response.on("data", function (chunk) {
            imageBuffer.write(chunk, bytes, "binary");
            bytes += chunk.length;
        });

        response.on("end", function () {
            console.log("Download complete, sending image.");
            res.setHeader("Content-Type", "image/png");
            res.status(200).send(imageBuffer);
            res.end();
        });

    });
});



// Start Express https server on port 8443
var webServer = https.createServer(options, httpApp).listen(443, '14.0.21.62');
//var webServer = https.createServer(options, httpApp).listen(443, '192.168.1.13');
//var webServer = https.createServer(options, httpApp).listen(443);
// Start Socket.io so it attaches itself to Express server
var socketServer = io.listen(webServer, { "log level": 1 });


// Start Express http server on port 8080
//var webServer = http.createServer(httpApp).listen(8080);

//https.createServer(options, httpApp).listen(443);

// Start Socket.io so it attaches itself to Express server
//var socketServer = io.listen(webServer, {"log level":1});
var myIceServers = [
    { "url": "stun:stun.anyfirewall.com:3478" },
    { "url": "stun:217.10.68.152" },
    { "url": "stun:stun.sipgate.net:10000" },
    { "url": "stun:217.10.68.152:10000" },
    {
        "url": "turn:turn.anyfirewall.com:443",
        "username": "angelit1507",
        "credential": "Test!234"
    },
    {
        'credential': "easyRTC@pass",
        'url': "turn:192.155.84.88",
        'username': "easyRTC"
    },
    {
        "url": "turn:turn.anyfirewall.com:443?transport=tcp",
        "username": "angelit1507",
        "credential": "Test!234"
    }
];

easyrtc.setOption("appIceServers", myIceServers);


easyrtc.setOption("logLevel", "error");

easyrtc.on("getIceConfig", function (connectionObj, callback) {
    console.log('get ice config');
    callback(null, myIceServers);
});

// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", function (socket, easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function (err, connectionObj) {
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }

        connectionObj.setField("credential", msg.msgData.credential, { "isShared": true });
        console.log("[" + easyrtcid + "] Credential saved!", connectionObj.getFieldValueSync("credential"));

        callback(err, connectionObj);
    });
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", function (connectionObj, roomName, roomParameter, callback) {
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Start EasyRTC server
var rtc = easyrtc.listen(httpApp, socketServer, null, function (err, rtcRef) {
    console.log("Initiated");

    rtcRef.events.on("roomCreate", function (appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});
