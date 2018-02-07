var express = require('express');
var app = express();
var cron = require('node-cron');
var logger=require('./logger')();
var configFileNameParam=process.argv[2] || "config";
var database = require('./database');

database.setAppConfig(configFileNameParam);
var bot=require('./telBot.js');

var msgManager=require('./msgManager.js');
var appConfig=database.getAppConfig();
var appPort=appConfig["appPort"]||80;

msgManager.sendAppStartMsgToSysadmins(appConfig, function(err){
    if(err) return;
    startSendingSysAdminMsgBySchedule();
});

function startSendingSysAdminMsgBySchedule(){                                                           logger.info("startSendingSysAdminMsgBySchedule");
    var sysAdminSchedule=appConfig.sysadminsSchedule;
    var sysadminsMsgConfig = appConfig.sysadminsMsgConfig;
    if(!sysAdminSchedule||cron.validate(sysAdminSchedule)==false||!sysadminsMsgConfig )return;
    var scheduleSysAdminMsg =cron.schedule(sysAdminSchedule,
        function(){
            msgManager.makeDiskUsageMsg(sysadminsMsgConfig, function(err, adminMsg){
                if(err){
                    logger.error("FAILED to make disk usage msg. Reason: "+err);
                    return;
                }
                bot.sendMsgToAdmins(adminMsg);
            });
        });
    scheduleSysAdminMsg.start();
}

app.listen(appPort);



