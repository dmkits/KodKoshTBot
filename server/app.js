var Promise = require('bluebird');
Promise.config({
    cancellation: true
});
var express = require('express');
var app = express();
var logger=require('./logger')();
var configFileNameParam=process.argv[2] || "config";
var database = require('./database');
database.setAppConfig(configFileNameParam);
var appConfig=database.getAppConfig();
database.connectToDB(function(err, res){

});
var appPort=appConfig["appPort"]||80;

// require('./bot_index.js');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use('/',express.static('public'));

app.use(function(req, res, next){
    console.log("req.url=",req.url);
    next();
});

process.on('uncaughtException', function(err) {
    logger.error('Server process failed! Reason:', err);
    console.log('Server process failed! Reason:', err);
});

require('./sysadmin')(app);
require('./mainPage')(app);


app.listen(appPort);