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

module.exports.makeUnconfirmedDocsMsg =function(callback){
    var adminMsg='<b>Информация администратору на '+moment(new Date()).format('HH:mm DD.MM.YYYY')+' </b> \n';
    database.getTRecData(function(err, res){
        if(err){
            callback(err);
            return;
        }
        var tRecArr=res;
        if(tRecArr.length==0) {
            adminMsg+="\n<b>Все приходные накладные подтверждены.</b>";
            callback(null,adminMsg);
        }else{
            adminMsg+="<b>Неподтвержденные приходные накладные:</b> ";
            for (var i in tRecArr){
                var dataItem=tRecArr[i];
                adminMsg+="\n &#12539 "+dataItem.StockName+": "+dataItem.Total;
            }
        }
        database.getTExcData(function(err, res){
            if(err){
                callback(err);
                return;
            }
            var tExpArr=res;
            if(tExpArr.length==0) {
                adminMsg+="\n<b>Все  накладные перемещения подтверждены.</b>";
                callback(null,adminMsg);
                return;
            }
            adminMsg+="\n<b>Неподтвержденные накладные перемещения:</b>";
            for (var k in tExpArr){
                var dataItem=tExpArr[k];
                adminMsg+="\n &#12539 "+dataItem.StockName+": "+dataItem.Total;
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

module.exports.makeCashierMsg=function(cashierData, callback){
    var stockID=cashierData["StockID"];
    var StockName=cashierData["StockName"];
    var CRName=cashierData["CRName"];
    var cashierMsg="";
    database.getTRecByStockId(stockID, function(err, res){
        if(err){
            callback(err);
            return;
        }
        if(res.recordset && res.recordset.length>0){
            cashierMsg='<b>Информация кассиру на '+moment(new Date()).format('HH:mm DD.MM.YYYY')+' </b> ';
            cashierMsg+="\n<b>Касса:</b> "+ CRName +"\n<b>Склад:</b> "+StockName;
            cashierMsg+="\n<b>Неподтвержденные приходные накладные:</b> ";
            var unconfirmedRecArr=res.recordset;
            for(var j in unconfirmedRecArr){
                cashierMsg += "\n &#12539 № "+unconfirmedRecArr[j]["DocID"] +" от "+moment(unconfirmedRecArr[j]["DocDate"]).format("DD.MM.YYYY");
            }
            database.getTExcByStockId(stockID,function(err, res){
                if(err){
                    callback(err);
                    return;
                }
                if(res.recordset && res.recordset.length>0) {
                    cashierMsg += "\n<b>Неподтвержденные накладные перемещения:</b> ";
                    var unconfirmedExcArr = res.recordset;
                    for (var j in unconfirmedExcArr) {
                        cashierMsg += "\n &#12539 № " + unconfirmedExcArr[j]["DocID"] + " от " + moment(unconfirmedExcArr[j]["DocDate"]).format("DD.MM.YYYY");
                    }
                    database.getTSestByStockId(stockID,function(err,res){
                        if(err){
                            callback(err);
                            return;
                        }
                        if(res.recordset && res.recordset.length>0){
                            cashierMsg += "\n<b>Переоценка цен продажи:</b> ";
                            var priceChangedDocsArr=res.recordset;
                            for (var e in priceChangedDocsArr) {
                                cashierMsg += "\n &#12539 № " + priceChangedDocsArr[e]["DocID"] + " от " + moment(priceChangedDocsArr[e]["DocDate"]).format("DD.MM.YYYY");
                                var chId=priceChangedDocsArr[e]["ChID"];
                                sestSendChIDObj[chId]=true;
                            }
                        }
                        callback(null,cashierMsg);
                    });
                    return;
                }
                database.getTSestByStockId(stockID,function(err,res){
                    if(err){
                        callback(err);
                        return;
                    }
                    if(res.recordset && res.recordset.length>0){
                        cashierMsg += "\n<b>Переоценка цен продажи:</b> ";
                        var priceChangedDocsArr=res.recordset;
                        for (var e in priceChangedDocsArr) {
                            cashierMsg += "\n &#12539 № " + priceChangedDocsArr[e]["DocID"] + " от " + moment(priceChangedDocsArr[e]["DocDate"]).format("DD.MM.YYYY");
                            var chId=priceChangedDocsArr[e]["ChID"];
                            sestSendChIDObj[chId]=true;
                        }
                    }
                    callback(null,cashierMsg);
                });
            })
        }else{
            database.getTExcByStockId(stockID,function(err, res){
                if(err){
                    callback(err);
                    return;
                }
                if(res.recordset && res.recordset.length>0) {
                    cashierMsg='<b>Информация кассиру на '+moment(new Date()).format('HH:mm DD.MM.YYYY')+' </b> ';
                    cashierMsg+="\n<b>Касса:</b> "+ CRName +"\n<b>Склад:</b> "+StockName;
                    cashierMsg+= "\n<b>Неподтвержденные накладные перемещения:</b> ";
                    var unconfirmedExcArr = res.recordset;
                    for (var j in unconfirmedExcArr) {
                        cashierMsg += "\n &#12539 № " + unconfirmedExcArr[j]["DocID"] + " от " + moment(unconfirmedExcArr[j]["DocDate"]).format("DD.MM.YYYY");
                    }
                    database.getTSestByStockId(stockID,function(err,res){
                        if(err){
                            callback(err);
                            return;
                        }
                        if(res.recordset && res.recordset.length>0){
                            cashierMsg += "\n<b>Переоценка цен продажи:</b> ";
                            var priceChangedDocsArr=res.recordset;
                            for (var e in priceChangedDocsArr) {
                                cashierMsg += "\n &#12539 № " + priceChangedDocsArr[e]["DocID"] + " от " + moment(priceChangedDocsArr[e]["DocDate"]).format("DD.MM.YYYY");
                                var chId=priceChangedDocsArr[e]["ChID"];
                                sestSendChIDObj[chId]=true;
                            }
                        }
                        callback(null,cashierMsg);
                    });
                    return;
                }
                database.getTSestByStockId(stockID,function(err,res){
                    if(err){
                        callback(err);
                        return;
                    }
                    if(res.recordset && res.recordset.length>0){
                        cashierMsg='<b>Информация кассиру на '+moment(new Date()).format('HH:mm DD.MM.YYYY')+' </b> ';
                        cashierMsg+="\n<b>Касса:</b> "+ CRName +"\n<b>Склад:</b> "+StockName;
                        cashierMsg += "\n<b>Переоценка цен продажи:</b> ";
                        var priceChangedDocsArr=res.recordset;
                        for (var e in priceChangedDocsArr) {
                            cashierMsg += "\n &#12539 № " + priceChangedDocsArr[e]["DocID"] + " от " + moment(priceChangedDocsArr[e]["DocDate"]).format("DD.MM.YYYY");
                            var chId=priceChangedDocsArr[e]["ChID"];
                            sestSendChIDObj[chId]=true;
                        }
                    }
                    callback(null,cashierMsg);
                });
            });
        }
    });
};

var sestSendChIDObj={};

module.exports.sendCashierMsgRecursively=function(index, cashierDataArr, scheduleCall, callback){
    if(!cashierDataArr[index]){
        if(callback)callback();
        if(scheduleCall && Object.keys(sestSendChIDObj).length>0){

             var chIDArr=[];
            for(var i in sestSendChIDObj)chIDArr.push(i);
          insertSEstMsgCountRecursively(0,chIDArr,function(){
                sestSendChIDObj={};
            });
        }
        return;
    }
    var cashierData=cashierDataArr[index];
    var TChatID=cashierDataArr[index]["TChatID"];
    module.exports.makeCashierMsg(cashierData, function(err, resMsg){
        if(err){
            logger.error("FAILED to create msg for cashier. Reason: "+err);
            return;
        }

        if(resMsg) bot.sendMsgToChatId(TChatID, resMsg, {parse_mode:"HTML"});
        module.exports.sendCashierMsgRecursively(index+1,cashierDataArr,scheduleCall,callback);
    });
};

function insertSEstMsgCountRecursively(index,chIDArr,callback){
    if(!chIDArr[index]){
        callback();
        return;
    }
    database.setSEstMsgCount(chIDArr[index], function(){
        insertSEstMsgCountRecursively (index+1,chIDArr,callback);
    });
}
module.exports.makeSalesAndReturnsMsg =function(callback){
    var adminMsg='<b>Информация о суммах движения товара на '+moment(new Date()).format('HH:mm DD.MM.YYYY')+' </b> \n';
   database.getSalesAndRetSum(function(err, res){
       if(err) {
           callback(err);
           return;
       }
       var sumData=res;
       if(sumData.length==0) {
           adminMsg+="\n<b>Нет данных.</b>";
           callback(null,adminMsg);
       }else{
           for (var i in sumData){
               var dataItem=sumData[i];
               adminMsg+="\n <b> "+dataItem.StockName+"</b>:   +"+dataItem.SaleSum +",   -"+dataItem.RetSum;
           }
           callback(null,adminMsg);
       }
   })
};
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
        msgStr=msgStr+"<b>\ncashierSchedule:</b>"+appConfig["cashierSchedule"];
        if(cron.validate(appConfig["cashierSchedule"])==false){                                              logger.error("cashierSchedule NOT VALID");
            msgStr=msgStr+" - NOT VALID";
        }else msgStr=msgStr+" - valid";
    } else msgStr=msgStr+"<b>\ncashierSchedule</b> NOT SPECIFIED";
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

