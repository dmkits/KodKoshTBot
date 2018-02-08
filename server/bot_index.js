
var cron = require('node-cron');
var logger=require('./logger')();
var database = require('./database');


var msgManager=require('./msgManager.js');
var appConfig=database.getAppConfig();
var bot=require('./telBot.js');

msgManager.sendAppStartMsgToSysadmins(appConfig, function(err){
    if(err) return;
    startSendingSysAdminMsgBySchedule();
    startSendingDCardClientsMsgBySchedule();
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

function startSendingDCardClientsMsgBySchedule(){                                                           logger.info("startSendingDCardClientsMsgBySchedule");
    var dCardClientsSchedule=appConfig.dCardClientsSchedule;

    if(!dCardClientsSchedule||cron.validate(dCardClientsSchedule)==false)return;
    var scheduledCardClientsMsg =cron.schedule(dCardClientsSchedule,
        function(){
            msgManager.makeAndSendDCardClientsMsg();
        });
    scheduledCardClientsMsg.start();
}





