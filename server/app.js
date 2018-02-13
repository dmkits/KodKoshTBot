try {
    console.log("APP STARTING...");
    var logger=require('./logger')();
} catch (e){
    console.log("FAILED TO LOAD LOGGER! APP START IMPOSSIBLE!");
    return;
}
try {
    var express = require('express');
    var app = express();
    var cookieParser = require('cookie-parser');
    var bodyParser = require('body-parser');
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.text());
    app.use(bodyParser.json());
    app.use('/',express.static('public'));
} catch (e){
    console.log("FAILED TO LOAD CORE MODULES! APP START IMPOSSIBLE!");
    logger.error("FAILED TO LOAD CORE MODULES! APP START IMPOSSIBLE!");
    return;
}

try {
    var appConfig=require ('./appConfig');
    var configFileName=process.argv[2] || "config";
    appConfig.setAppConfigName(configFileName);
    appConfig.loadAppConfig();
} catch (e){
    console.log("FAILED TO LOAD appConfig! APP START IMPOSSIBLE! REASON:",e.message);
    logger.error("FAILED TO LOAD appConfig! APP START IMPOSSIBLE! REASON:",e.message);
    return;
}
var appPort= appConfig.getAppConfigParam("appPort") || 80;

process.on('uncaughtException', function(err) {
    logger.error('Server process failed! Reason:', err);
});

app.use(function(req, res, next){
    logger.info(req.method," url=",req._parsedUrl.pathname," params:",req.query,{});
    next();
});

try{
    var db=require('./database');
    require('./sysadmin')(app);
    require('./mainPage')(app);
    require('./clientsDCards')(app);
    require('./telegramMsg')(app);
    // var telBot= require('./telBot');
} catch (e){
    console.log("FAILED TO LOAD APP MODULES! APP START IMPOSSIBLE! REASON:",e.message);
    logger.error("FAILED TO LOAD APP MODULES! APP START IMPOSSIBLE! REASON:",e.message);
    return;
}

db.connectToDB(function(){
    app.listen(appPort,function(err){
        if(err) logger.error("FAILED TO START APP! REASON:",err.message);
        else logger.info("APP STARTED ON PORT ",appPort);
    });
    // telBot.sendStartMsg();
});
