var database = require('./database');
var diskusage = require('diskusage-ng');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var bot=require('./telBot.js');
var logger=require('./logger')();
var cron = require('node-cron');



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