var mysql = require("mysql");               // connect to mysql
var crypto = require('crypto');
var Connection = require('tedious').Connection;
var config = {
    userName: 'sa',
    password: 's2xEv!lFuck!ng',
    server: '14.0.21.62',
    // When you connect to Azure SQL Database, you need these next options.
    options: {encrypt: true, database: 'mpcdata'}
};
var connection = new Connection(config);
connection.on('connect', function (err) {
    // If no error, then good to proceed.
    console.log("Connected");
});

var Request = require('tedious').Request;
var TYPES = require('tedious').TYPES;

connection.getUserById = function (userId, callback) {
    var request = new Request("SELECT * FROM Users WHERE UserID=" + userId, function (err, rowsCount, rows) {
        if (err) {
            console.log(err);
            callback(err);
        }
        if (rowsCount == 0)
            callback({code: 'NotFound'});
    });
    request.on('row', function (columns) {
        if (columns.length == 0) {
            callback({code: 'NotFound'}, null);
            return
        }
        var result = {};
        columns.forEach(function (column) {
            if (column.value === null) {
                console.log('NULL');
            } else {
                result[column.metadata.colName] = column.value;
            }
        });
        callback(null, result);
    });

    request.on('done', function (rowCount, more) {
        console.log(rowCount + ' rows returned');
        callback(null, rowCount)
    });
    connection.execSql(request);
}

connection.login = function (user, callback) {
    var request = new Request("SELECT * FROM Users WHERE Email='" + user.email + "'", function (err, rowsCount, rows) {
        if (err) {
            console.log(err);
            callback(err);
        }
        if (rowsCount == 0)
            callback({code: 'NotFound'});
    });
    request.on('row', function (columns) {
        if (columns.length == 0) {
            callback({code: 'NotFound'}, null);
            return
        }
        var result = {};
        columns.forEach(function (column) {
            if (column.value === null) {
                console.log('NULL');
            } else {
                result[column.metadata.colName] = column.value;
            }
        });
        // check password
        var hash = crypto.createHash('md5').update(user.password).digest("hex");
        if (hash != result.PassWord) {
            callback({code: 'PassNotMatch'});
            return;
        }
        result.PassWord = '';
        callback(null, result);
    });

    request.on('done', function (rowCount, more) {
        console.log(rowCount + ' rows returned');
        callback(null, rowCount)
    });
    connection.execSql(request);
}

module.exports = connection;