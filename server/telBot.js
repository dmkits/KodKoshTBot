var logger=require('./logger')();
var appConfig=require('./appConfig')

var Promise = require('bluebird');
Promise.config({
    cancellation: true
});
var TelegramBot = require('node-telegram-bot-api');
var TOKEN=appConfig.getAppConfigParam('botToken');
var bot = new TelegramBot(TOKEN, {polling: true});

var fs=require('fs'), path = require('path');
var database=require('./database');

module.exports.sendMessage= function(chatId, text, form){
    bot.sendMessage(chatId, text, form).catch((error)=>{
        logger.warn("Failed to send msg to user. Chat ID:"+ chatId +" Reason: ",error.response.body);
    });
};

// var msgManager=require('./msgManager');

// var sysAdminTelArr=configObj["sysadmins"];
var telBotSysadmins= require('./telBotSysadmins');
var telBotClientsDCards= require('./telBotClientsDCards');

var KB={
    registration:'Зарегистироваться',
    dbConnection:'Подключиться к БД'
};
bot.onText(/\/start/, function(msg, resp) {
    logger.info("New chat started. Greeting msg is sending. Chat ID: "+msg.chat.id);
    bot.sendMessage(msg.chat.id, "Здравствуйте! \n Пожалуйста, зарегистрируйтесь для получения сообщений.", {
        reply_markup: {
            keyboard: [
                [{text:KB.registration , "request_contact": true}]
            ],
            one_time_keyboard: true
        }
    }).catch((error)=>{
        logger.warn("Failed to send msg to user. Chat ID:"+ msg.chat.id +" Reason: error.response.body=",error.response.body);
    });
});

bot.on('message',(msg)=>{
    if(msg.text==KB.dbConnection){
        database.connectToDB(function(err){
            if (err){
                module.exports.sendMsgToAdmins("Не удалось подключиться к БД! Причина:"+err);
                return;
            }
             module.exports.sendMsgToAdmins("Подключение к БД установлено успешно!");
        })
    }

    if(msg.contact && msg.contact.phone_number){
        var phoneNumber=msg.contact.phone_number;
        if(phoneNumber[0]=="+")phoneNumber=phoneNumber.substring(1);

        telBotSysadmins.checkAndRegisterSysAdmin(msg,phoneNumber, function(sysAdminRegistered){
            // if(!sysAdminRegistered){
            //     bot.sendMessage(msg.chat.id, "Не удалось зарегистрировать пользователя Telegram. Обратитесь к системному администратору.").catch((error)=>{
            //         logger.warn("Failed to send msg to user. Chat ID:"+ msg.chat.id +" Reason: ",error.response.body);
            //     });
            // }
        });
        telBotClientsDCards.checkAndRegisterClientsDCards(phoneNumber);
    }
});
// module.exports.sendMsgToChatId=function(chatId, msg, params){
//     if(!params)params={};
//     logger.info("Msg is sending to chat id:"+chatId+". MSG: "+msg+".");
//     bot.sendMessage(chatId,msg, params).catch((error)=>{
//         logger.warn("Failed to send msg to user. Chat ID:"+ chatId+" Reason: ",error.response.body);
//     });
// };

bot.on('error', (error) => {
    logger.error("Bot ERROR=",error);
});
bot.on('polling_error', (error) => {
    logger.error(error);
});

telBotSysadmins.sendAppStartMsgToSysadmins();