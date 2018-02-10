var logger=require('./logger')();

var appConfig=require('./appConfig');
var bot=require('./telBot.js');
var database = require('./database');

var fs = require('fs'), path = require('path'), moment = require('moment');
var diskusage = require('diskusage-ng');
var cron = require('node-cron');

var sysAdminSchedule=appConfig.getAppConfigParam('sysadminsSchedule');

var sysadminsMsgConfig = appConfig.getAppConfigParam('sysadminsMsgConfig');


module.exports.checkAndRegisterSysAdmin=function (msg,phoneNumber, callback){   
    
    var sysAdminTelArr=appConfig.getAppConfigParam('sysadmins');
    if(! sysAdminTelArr ||sysAdminTelArr.length==0) return;
    var registeredSysAdmins;
    try{
        registeredSysAdmins=JSON.parse(fs.readFileSync(path.join(__dirname,"../sysadmins.json")));
    }catch(e){
        if (e.code == "ENOENT") {
            registeredSysAdmins =[];
        }else{
            logger.error("FAILED to get registeredSysAdmins list. Reason:"+e);
            return;
        }
    }
    for(var i=0; i<sysAdminTelArr.length; i++){
        var adminTelNum = sysAdminTelArr[i];
        if(adminTelNum!=phoneNumber) continue;
        var newSysAdmin={};
        newSysAdmin[adminTelNum]=msg.chat.id;
        registeredSysAdmins.push(newSysAdmin);
        fs.writeFile(path.join(__dirname, "../sysadmins.json"),JSON.stringify(registeredSysAdmins), {flag:'w+'},
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

module.exports.sendAppStartMsgToSysadmins=function(){                                                        logger.info("sendAppStartMsgToSysadmins");
    var msgStr="<b>Telegram bot started.</b>";
    msgStr=msgStr+"<b>\ndbHost:</b>"+appConfig.getAppConfigParam("dbHost");
    msgStr=msgStr+"<b>\ndbPort:</b>"+appConfig.getAppConfigParam("dbPort");
    msgStr=msgStr+"<b>\ndatabase:</b>"+appConfig.getAppConfigParam("database");
    msgStr=msgStr+"<b>\ndbUser:</b>"+appConfig.getAppConfigParam("dbUser");
    msgStr=msgStr+"<b>\nappPort:</b>"+appConfig.getAppConfigParam("appPort");
    if(appConfig["sysadminsMsgConfig"]) {
        msgStr=msgStr+"<b>\nsysadminsMsgConfig:</b>"+JSON.stringify(appConfig["sysadminsMsgConfig"]);
    }else msgStr=msgStr+"\n<b>sysadminsMsgConfig</b> NOT SPECIFIED";
    if(appConfig["sysadminsSchedule"]){                                                                      logger.info("sysadminsSchedule=",appConfig["sysadminsSchedule"]);
        var sysadminsSchedule= appConfig.getAppConfigParam("sysadminsSchedule")
        msgStr=msgStr+"<b>\nsysadminsSchedule:</b>"+sysadminsSchedule;
        if(cron.validate(sysadminsSchedule)==false){                                                         logger.error("sysadminsSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\nsysadminsSchedule</b> NOT SPECIFIED";
    if(appConfig["adminSchedule"]){                                                                          logger.info("adminSchedule=",appConfig["adminSchedule"]);
        var adminSchedule= appConfig.getAppConfigParam('adminSchedule');
        msgStr=msgStr+"<b>\nadminSchedule:</b>"+adminSchedule;
        if(cron.validate(adminSchedule)==false){                                                             logger.error("adminSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\nadminSchedule</b> NOT SPECIFIED";
    if(appConfig["dailySalesRetSchedule"]){                                                                  logger.info("dailySalesRetSchedule=",appConfig["dailySalesRetSchedule"]);
        var dailySalesRetSchedule= appConfig.getAppConfigParam("dailySalesRetSchedule");
        msgStr=msgStr+"<b>\ndailySalesRetSchedule:</b>"+dailySalesRetSchedule;
        if(cron.validate(dailySalesRetSchedule)==false){                                                     logger.error("dailySalesRetSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\ndailySalesRetSchedule</b> NOT SPECIFIED";
    if(appConfig["cashierSchedule"]){                                                                        logger.info("cashierSchedule=",appConfig["cashierSchedule"]);
        var dCardClientsSchedule= appConfig.getAppConfigParam("dCardClientsSchedule");
        msgStr=msgStr+"<b>\ndCardClientsSchedule:</b>"+dCardClientsSchedule;
        if(cron.validate(dCardClientsSchedule)==false){                                                      logger.error("dCardClientsSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\ndCardClientsSchedule</b> NOT SPECIFIED";
    database.connectToDB(function(errMsg){  console.log("database.connectToDB errMsg=",errMsg);
        if (errMsg){
            logger.error("Failed to connect to database on sendAppStartMsgToSysadmins! Reason:",errMsg);
            sendMsgToAdmins(msgStr+"\n Failed to connect to database! Reason:"+errMsg);

            return;
        }
        sendMsgToAdmins(msgStr + "\n Connected to database successfully!");
    });
};
function sendMsgToAdmins(msg){  console.log("sendMsgToAdmins");
    database.getDbConnectionError(function(dbConnectionError){
        var reconBut=false;
        if(dbConnectionError)reconBut=true;
        try{
            var admins = JSON.parse(fs.readFileSync(path.join(__dirname, '../sysadmins.json')));
        }catch(e){
            logger.error("----------------- FAILED to get admin list. Reason: "+e);
            return;
        }
        for(var j in admins){
            var admin=admins[j];
            for(var h in admin){
                var adminChatId=admin[h];
                if(adminChatId){
                    if(reconBut){
                        logger.warn("DB connection failed. Sending msg to sysadmin. Chat ID: "+adminChatId);
                        bot.sendMessage(adminChatId, msg,
                            {parse_mode:"HTML",
                                reply_markup: {
                                    keyboard: [
                                        [KB.dbConnection]
                                    ]}
                            });
                        continue;
                    }
                    logger.info("Sending msg to sysadmin. Chat ID: "+ adminChatId);
                    bot.sendMessage(adminChatId, msg, {parse_mode:"HTML", reply_markup: {remove_keyboard: true} });
                }
            }
        }
    });
}

function startSendingSysAdminMsgBySchedule(){                                                           logger.info("startSendingSysAdminMsgBySchedule");
    if(!sysAdminSchedule||cron.validate(sysAdminSchedule)==false||!sysadminsMsgConfig )return;
    var scheduleSysAdminMsg =cron.schedule(sysAdminSchedule,
        function(){
            makeSysadminMsg(function(err, adminMsg){
                if(err){
                    return;
                }
                sendMsgToAdmins(adminMsg);
            });
        });
    scheduleSysAdminMsg.start();
}

function makeSysadminMsg(callback){
    var adminMsg='<b>Информация системному администратору на '+moment(new Date()).format('HH:mm DD.MM.YYYY')+' </b> \n';
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






