var mysql = require("mysql");               // connect to mysql
var crypto = require('crypto');
var Connection = require('tedious').Connection;

var Request = require('tedious').Request;
var TYPES = require('tedious').TYPES;
var config = {
    userName: 'sa',
    password: 's2xEv!lFuck!ng',
    server: '14.0.21.62',
    // When you connect to Azure SQL Database, you need these next options.
    options: {
        encrypt: true, database: 'mpcdata', rowCollectionOnRequestCompletion: 'true',
        rowCollectionOnDone: 'true'
    }
};
var connection = new Connection(config);
connection.isConnected = false;
connection.on('connect', function (err) {
    // If no error, then good to proceed.
    connection.isConnected = true;
    console.log("database connected");
});


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

connection.listQuestions = function (model, callback) {
    var request = new Request("SELECT * FROM Stream_Questions WHERE IsDeleted='false' ORDER BY CreatedAt DESC", function (err, rowsCount, rows) {
        if (err) {
            console.log(err);
            callback(err);
            return;
        }
        if (rowsCount == 0) {
            callback(null, []);
            return
        }
        var questions = [];
        rows.forEach(function (columns) {
            if (columns.length == 0) {
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
            questions.push(result);
        })
        callback(null, questions);
    });
    connection.execSql(request);
}
connection.sendQuestion = function (question, callback) {
    var now = new Date(); // 2016-03-03 00:00:00.000
    var created = now.getFullYear() + '-' + now.getMonth() + '-' + now.getDay() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + '.' + now.getMilliseconds();
    console.log(question.Content);
    var request = new Request("INSERT INTO Stream_Questions (UserID, Title, Content, Image, IsDeleted) VALUES (" + question.UserID + ",N'"
        + question.Title + "',N'"
        + question.Content + "','"
        + question.Image + "',"
        + "'false');", function (err, rowsCount, rows) {
        if (err) {
            console.log(err);
            callback(err);
            return;
        }
        callback(null, {});
    });
    connection.execSql(request);
}

connection.deleteQuestion = function (id, callback) {
    var request = new Request("DELETE FROM Stream_Questions WHERE Stream_QuestionID=" + id, function (err, rowsCount) {
        if (err) {
            console.log(err);
            callback(err);
        }
        callback(null);
    });
    connection.execSql(request);
}

connection.listSchedules = function (model, callback) {
    var request = new Request("SELECT * FROM Stream_Schedules WHERE StreamTime>GETDATE() ORDER BY StreamTime ASC", function (err, rowsCount, rows) {
        if (err) {
            console.log(err);
            callback(err);
            return;
        }
        if (rowsCount == 0) {
            callback(null, []);
            return
        }
        var questions = [];
        rows.forEach(function (columns) {
            if (columns.length == 0) {
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
            questions.push(result);
        })
        callback(null, questions);
    });
    connection.execSql(request);
}
connection.addSchedule = function (schedule, callback) {
    var request = new Request("INSERT INTO Stream_Schedules (Title, Content, Image, StreamTime) VALUES (N'"
        + schedule.Title + "',N'"
        + schedule.Content + "','"
        + schedule.Image + "',"
        + "'" + schedule.StreamTime + "');", function (err, rowsCount, rows) {
        if (err) {
            console.log(err);
            callback(err);
            return;
        }
        callback(null, {});
    });
    connection.execSql(request);
}

connection.deleteSchedule = function (id, callback) {
    var request = new Request("DELETE FROM Stream_Schedules WHERE Stream_ScheduleID=" + id, function (err, rowsCount) {
        if (err) {
            console.log(err);
            callback(err);
        }
        callback(null);
    });
    connection.execSql(request);
}


module.exports = connection;