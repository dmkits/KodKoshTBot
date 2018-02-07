var database = require('./database');
var diskusage = require('diskusage-ng');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var bot=require('./telBot.js');
var logger=require('./logger')();
var cron = require('node-cron');

module.exports.makeDiskUsageMsg=function(sysadminsMsgConfig, callback){
    var adminMsg='<b>Информация системному администратору на '+moment(new Date()).format('HH:mm DD.MM.YYYY')+' </b> \n';
    if(!sysadminsMsgConfig){
        var serverConfig=database.getAppConfig();
        var sysadminsMsgConfig = serverConfig.sysadminsMsgConfig;
        if(!sysadminsMsgConfig){
            callback ("FAIL! Reason: 'sysadminsMsgConfig' wasn't found in config params.");
            return;
        }
    }
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
};

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
module.exports.sendAppStartMsgToSysadmins=function(appConfig, callback){                                     logger.info("sendAppStartMsgToSysadmins");
    var msgStr="<b>Telegram bot started.</b>";
    msgStr=msgStr+"<b>\ndbHost:</b>"+appConfig["dbHost"];
    msgStr=msgStr+"<b>\ndbPort:</b>"+appConfig["dbPort"];
    msgStr=msgStr+"<b>\ndatabase:</b>"+appConfig["database"];
    msgStr=msgStr+"<b>\ndbUser:</b>"+appConfig["dbUser"];
    msgStr=msgStr+"<b>\nappPort:</b>"+appConfig["appPort"];
    if(appConfig["sysadminsMsgConfig"]) {
        msgStr=msgStr+"<b>\nsysadminsMsgConfig:</b>"+JSON.stringify(appConfig["sysadminsMsgConfig"]);
    }else msgStr=msgStr+"\n<b>sysadminsMsgConfig</b> NOT SPECIFIED";
    if(appConfig["sysadminsSchedule"]){                                                                      logger.info("sysadminsSchedule=",appConfig["sysadminsSchedule"]);
        msgStr=msgStr+"<b>\nsysadminsSchedule:</b>"+appConfig["sysadminsSchedule"];
        if(cron.validate(appConfig["sysadminsSchedule"])==false){                                            logger.error("sysadminsSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\nsysadminsSchedule</b> NOT SPECIFIED";
    if(appConfig["adminSchedule"]){                                                                          logger.info("adminSchedule=",appConfig["adminSchedule"]);
        msgStr=msgStr+"<b>\nadminSchedule:</b>"+appConfig["adminSchedule"];
        if(cron.validate(appConfig["adminSchedule"])==false){                                                logger.error("adminSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\nadminSchedule</b> NOT SPECIFIED";
    if(appConfig["dailySalesRetSchedule"]){                                                                  logger.info("dailySalesRetSchedule=",appConfig["dailySalesRetSchedule"]);
        msgStr=msgStr+"<b>\ndailySalesRetSchedule:</b>"+appConfig["dailySalesRetSchedule"];
        if(cron.validate(appConfig["dailySalesRetSchedule"])==false){                                        logger.error("dailySalesRetSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\ndailySalesRetSchedule</b> NOT SPECIFIED";
    if(appConfig["cashierSchedule"]){                                                                        logger.info("cashierSchedule=",appConfig["cashierSchedule"]);
        msgStr=msgStr+"<b>\ndCardClientsSchedule:</b>"+appConfig["dCardClientsSchedule"];
        if(cron.validate(appConfig["dCardClientsSchedule"])==false){                                         logger.error("dCardClientsSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\ndCardClientsSchedule</b> NOT SPECIFIED";
    database.connectToDB(function(err){
        if (err){
            bot.sendMsgToAdmins(msgStr+"\n Failed to connect to database! Reason:"+err);
            callback(err);
            return;
        }
        bot.sendMsgToAdmins(msgStr + "\n Connected to database successfully!");
        callback();
    });
};

module.exports.makeAndSendDCardClientsMsg=function(){
    database.getClientsForSendingMsg(function(err, chatIDDataArr){
        if(err){
            logger.error("FAILED to get clients chat id. Reason:"+err);
            return;
        }
        sendMsgToClientsRecursively(0,chatIDDataArr);
    })
};

function sendMsgToClientsRecursively(index, data){
    if(!data[index]){
        logger.info("All messages was sent successfully to clients!");
        return;
    }
    bot.sendMsgToChatId(data[index].TChatID, "Дорогой клиент, рады сообщить, что Вы получили это сообщение!");
    setTimeout(function(){
        sendMsgToClientsRecursively(index+1, data)
    },300);
};