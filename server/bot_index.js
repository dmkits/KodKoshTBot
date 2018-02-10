
var cron = require('node-cron');
var logger=require('./logger')();
var appConfigModule=require('./appConfig');
var msgManager=require('./msgManager.js');
var appConfig=appConfigModule.loadAppConfig();
var bot=require('./telBot.js');

// msgManager.sendAppStartMsgToSysadmins(appConfig, function(err){
//     if(err) return;
//     startSendingSysAdminMsgBySchedule();
//     startSendingDCardClientsMsgBySchedule();
// });


function startSendingDCardClientsMsgBySchedule(){                                                           logger.info("startSendingDCardClientsMsgBySchedule");
    var dCardClientsSchedule=appConfig.dCardClientsSchedule;

    if(!dCardClientsSchedule||cron.validate(dCardClientsSchedule)==false)return;
    var scheduledCardClientsMsg =cron.schedule(dCardClientsSchedule,
        function(){
            msgManager.makeAndSendDCardClientsMsg();
        });
    scheduledCardClientsMsg.start();
}





