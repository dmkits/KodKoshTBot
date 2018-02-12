var logger=require('./logger')();

var appConfig=require('./appConfig'),
    bot=require('./telBot.js'),
    database = require('./database');

var fs = require('fs'), path = require('path'), moment = require('moment');
var cron = require('node-cron');
var diskusage = require('diskusage-ng');

module.exports.checkAndRegisterSysAdmin=function (msg,phoneNumber, callback){
    var configSysadmins=appConfig.getAppConfigParam('sysadmins');
    if(!configSysadmins||configSysadmins.length==0) return;
    try{
        var registeredSysadmins=JSON.parse(fs.readFileSync(path.join(__dirname,"../sysadmins.json")));
    }catch(e){
        if (e.code == "ENOENT") {
            registeredSysadmins =[];
        }else{
            logger.error("FAILED to get registeredSysAdmins list. Reason:"+e);
            return;
        }
    }
    for(var i=0; i<configSysadmins.length; i++){
        var configSysadminTelNum = configSysadmins[i];
        if(configSysadminTelNum!=phoneNumber) continue;
        registeredSysadmins[phoneNumber]=msg.chat.id;
        fs.writeFile(path.join(__dirname, "../sysadmins.json"),JSON.stringify(registeredSysadmins), {flag:'w+'},
            function(err){
                if (err) {
                    logger.error("FAILED to register sysadmin. Reason: "+err);
                    bot.sendMessage(msg.chat.id, "Ошибка регистрации системного администратора. "+err);
                    callback(true,err);
                    return;
                }
                logger.info("New sysadmin registered successfully. Msg is sending.  Phone number: "+phoneNumber);
                bot.sendMessage(msg.chat.id, "Регистрация системного администратора прошла успешно.");
                makeSysadminMsg(function(err, adminMsg){
                    if(err){
                        return;
                    }
                    logger.info("Disk usage msg is sending for new sysadmin.  Phone number: " + phoneNumber);
                    bot.sendMessage(msg.chat.id, adminMsg, {parse_mode: "HTML"});
                });
                callback(true);
            });
        return;
    }
};

module.exports.sendAppStartMsgToSysadmins=function(kbActions){                                               logger.info("sendAppStartMsgToSysadmins");
    var msgStr="<b>Telegram bot started.</b>";
    msgStr=msgStr+"<b>\ndbHost:</b>"+appConfig.getAppConfigParam("dbHost");
    msgStr=msgStr+"<b>\ndbPort:</b>"+appConfig.getAppConfigParam("dbPort");
    msgStr=msgStr+"<b>\ndatabase:</b>"+appConfig.getAppConfigParam("database");
    msgStr=msgStr+"<b>\ndbUser:</b>"+appConfig.getAppConfigParam("dbUser");
    msgStr=msgStr+"<b>\nappPort:</b>"+appConfig.getAppConfigParam("appPort");
    var sysadminsMsgConfig= appConfig.getAppConfigParam("sysadminsMsgConfig");
    if(sysadminsMsgConfig) {
        msgStr=msgStr+"<b>\nsysadminsMsgConfig:</b>"+JSON.stringify(sysadminsMsgConfig);
    }else msgStr=msgStr+"\n<b>sysadminsMsgConfig</b> NOT SPECIFIED";
    var sysadminsSchedule= appConfig.getAppConfigParam("sysadminsSchedule");
    if(sysadminsSchedule){                                                                                   logger.info("sysadminsSchedule=",sysadminsSchedule);
        msgStr=msgStr+"<b>\nsysadminsSchedule:</b>"+sysadminsSchedule;
        if(cron.validate(sysadminsSchedule)==false){                                                         logger.error("sysadminsSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\nsysadminsSchedule</b> NOT SPECIFIED";
    var dCardClientsSchedule= appConfig.getAppConfigParam("dCardClientsSchedule");
    if(dCardClientsSchedule){                                                                                logger.info("dCardClientsSchedule=",dCardClientsSchedule);
        msgStr=msgStr+"<b>\ndCardClientsSchedule:</b>"+dCardClientsSchedule;
        if(cron.validate(dCardClientsSchedule)==false){                                                      logger.error("dCardClientsSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\ndCardClientsSchedule</b> NOT SPECIFIED";
    database.connectToDB(function(errMsg){
        if (errMsg){
            logger.error("Failed to connect to database on sendAppStartMsgToSysadmins! Reason:",errMsg);
            sendMsgToSysadmins(msgStr+"\n Failed to connect to database! Reason:"+errMsg,kbActions);
            return;
        }
        sendMsgToSysadmins(msgStr + "\n Connected to database successfully!",kbActions);
    });
};
function sendMsgToSysadmins(msg,kbActions){
    try{
        var registeredSysadmins = JSON.parse(fs.readFileSync(path.join(__dirname, '../sysadmins.json')));
    }catch(e){
        logger.error("FAILED to get admin list. Reason: "+e);
        return;
    }
    var configSysadmins=appConfig.getAppConfigParam('sysadmins');
    for(var i in configSysadmins){
        var configSysadminTelNum=configSysadmins[i];
        var registeredSysadminChatId=registeredSysadmins[configSysadminTelNum];
        if(!registeredSysadminChatId) continue;
        if(database.getDbConnectionError()){
            logger.warn("DB connection failed. Sending msg to sysadmin. Chat ID: "+registeredSysadminChatId);
            bot.sendMessage(registeredSysadminChatId, msg,
                {parse_mode:"HTML",
                    reply_markup: {
                        keyboard: [
                            [kbActions.connectToDB]
                        ]}
                });
            continue;
        }
        logger.info("Sending msg to sysadmin. Chat ID: "+ registeredSysadminChatId);
        bot.sendMessage(registeredSysadminChatId, msg, {parse_mode:"HTML", reply_markup: {remove_keyboard: true} });
    }
}
module.exports.sendMsgToSysadmins=sendMsgToSysadmins;

function startScheduleToSendSysadminsMsg(){                                                                     logger.info("startSendingSysadminsMsgBySchedule");
    var configSysadminsSchedule=appConfig.getAppConfigParam('sysadminsSchedule'),
        sysadminsMsgConfig = appConfig.getAppConfigParam('sysadminsMsgConfig');
    if(!configSysadminsSchedule||cron.validate(configSysadminsSchedule)==false||!sysadminsMsgConfig )return;
    var scheduleSysAdminMsg =cron.schedule(configSysadminsSchedule,
        function(){
            makeSysadminMsg(function(err, adminMsg){
                if(err){
                    return;
                }
                sendMsgToSysadmins(adminMsg);
            });
        });
    scheduleSysAdminMsg.start();
}
startScheduleToSendSysadminsMsg();

function makeSysadminMsg(callback){
    var adminMsg='<b>Информация системному администратору на '+moment(new Date()).format('HH:mm DD.MM.YYYY')+' </b> \n';
    var sysadminsMsgConfig = appConfig.getAppConfigParam('sysadminsMsgConfig');
    getDiscUsageInfo(sysadminsMsgConfig, function(err, diskSpase){
        if(err){
            adminMsg +='\n '+err;
        }
        if(diskSpase && diskSpase.system){
            adminMsg += "Ресурс: \n System: объем:"+diskSpase.system.total+"Гб, свободно:"+diskSpase.system.free+ "Гб ("+diskSpase.system.freePercent +"%).";
        }
        if(diskSpase && diskSpase.backup){
            adminMsg += "\n Ресурс: \n Backup: объем:"+diskSpase.backup.total+"Гб, свободно:"+diskSpase.backup.free+ "Гб ("+diskSpase.backup.freePercent +"%).";
        }
        getLastBackupFile(sysadminsMsgConfig, function(err,lastBackpupFile){
            if(err){
                adminMsg +='\n '+err;
            }
            if(lastBackpupFile && lastBackpupFile.backupDate && lastBackpupFile.fileName){
                adminMsg+="\n Последняя резервная копия БД "+ lastBackpupFile.fileName+" от " + moment(lastBackpupFile.backupDate).format("DD.MM.YYYY HH:mm:ss");
            }
            callback(null,adminMsg);
        })
    });
}
function getDiscUsageInfo(sysadminsMsgConfig, callback) {
    var system = sysadminsMsgConfig.system ? sysadminsMsgConfig.system.trim() : "";
    var backup = sysadminsMsgConfig.backup ? sysadminsMsgConfig.backup.trim() : "";
    var diskSpase = {};
    if(system){
        diskusage(system,function(err, info){
            if(err){
                callback(err);
                return;
            }
            diskSpase.system = {};
            diskSpase.system.total = parseInt(info.total/1073741824 );//parseInt (info.size / 1073741824);
            diskSpase.system.free = parseInt(info.available/1073741824 );// parseInt(info.available / 1073741824);
            diskSpase.system.freePercent = parseInt(diskSpase.system.free*100/diskSpase.system.total);
            if(backup){
                diskusage(backup,function(err,info ){
                    if(err){
                        callback(err);
                        return;
                    }
                    diskSpase.backup = {};
                    diskSpase.backup.total = parseInt(info.total/1073741824); // parseInt (info.size / 1073741824);
                    diskSpase.backup.free = parseInt(info.available/1073741824); //parseInt(info.available / 1073741824);
                    diskSpase.backup.freePercent = parseInt(diskSpase.backup.free*100/diskSpase.backup.total);
                    callback(null,diskSpase);
                });
                return;
            }
            callback(null,diskSpase);
        });
        return;
    }
    if(backup){
        diskusage(backup,function(err,info){
            if(err){
                callback(err);
                return;
            }
            diskSpase.backup = {};
            diskSpase.backup.total = parseInt(info.total/1073741824);
            diskSpase.backup.free = parseInt(info.available/1073741824);
            diskSpase.backup.freePercent = parseInt(diskSpase.backup.free*100/diskSpase.backup.total);
            callback(null,diskSpase);
        });
    }
}
function getLastBackupFile(sysadminsMsgConfig, callback){
    var backup = sysadminsMsgConfig.backup ? sysadminsMsgConfig.backup.trim() : "";
    if(!backup){
        callback("Не удалось найти путь к папке резервных коний БД.");
        return;
    }
    var backupFileName=sysadminsMsgConfig.dbBackupFileName ? sysadminsMsgConfig.dbBackupFileName.trim():"";
    if(!backupFileName){
        callback("Не удалось найти шаблон имени файла резервных коний БД.");
        return;
    }
    var backupFileNameTemplate=new RegExp("^"+backupFileName.substring(0,backupFileName.indexOf("*"))+".*\\"+backupFileName.substring(backupFileName.indexOf("*")+1)+"$");
    try{
        var files = fs.readdirSync(backup);
    }catch(e){
        callback(e);
        return;
    }
    var lastBackpupFile={};
    lastBackpupFile.backupDate=0;
    lastBackpupFile.fileName="";
    for (var i in files){
        var stat = fs.statSync(path.join(backup+files[i]));
        if(files[i].match(backupFileNameTemplate)){
            if(stat.mtime>lastBackpupFile.backupDate){
                lastBackpupFile.backupDate=stat.mtime;
                lastBackpupFile.fileName=files[i];
            }
        }
    }
    callback(null, lastBackpupFile);
}






