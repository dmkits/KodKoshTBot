var logger=require('./logger')();

var appConfig=require('./appConfig'),
    bot=require('./telBot.js'),
    database = require('./database');

var cron = require('node-cron');

module.exports.checkAndRegisterClientsDCards = function(msg, phoneNumber){
    database.checkPhoneAndWriteChatID(phoneNumber,msg.chat.id,
        function(err,employeeDataArr){
            if(err){
                logger.error("Failed to check phone number and write chat ID to database. Reason: "+err);
                bot.sendMessage(msg.chat.id, "Не удалось зарегистрировать пользователя. Обратитесь к системному администратору.");
                return;
            }
            if(!employeeDataArr || employeeDataArr.length==0){
                logger.warn("Failed to register user. Phone number was not found in DB . Phone number: "+phoneNumber);
                bot.sendMessage(msg.chat.id, "Номер телефона не найден в справочнике клиентов ДК.");
            }
            // Несколько пользователей на одном номере тел.?
            bot.sendMessage(msg.chat.id, "Вы удачно зарегистрировались");
        })
};

function startScheduleToSendDCardClientsMsg(){                                                              logger.info("startScheduleToSendDCardClientsMsg");
    var dCardClientsSchedule=appConfig.getAppConfigParam("dCardClientsSchedule");
    if(!dCardClientsSchedule||cron.validate(dCardClientsSchedule)==false)return;
    var scheduledCardClientsMsg =cron.schedule(dCardClientsSchedule,
        function(){
            sendDCardsClientsMsg();
        });
    scheduledCardClientsMsg.start();
}
startScheduleToSendDCardClientsMsg();

function sendDCardsClientsMsg(){
    database.getClientsForSendingMsg(function(err, chatIDDataArr){
        if(err){
            logger.error("FAILED to get clients chat id. Reason:"+err);
            return;
        }
        sendMsgToDCardsClientsRecursively(0,chatIDDataArr);
    })
}
function sendMsgToDCardsClientsRecursively(index, data){
    if(!data[index]&&index>0){
        logger.info("All messages was sent successfully to "+index+" clients!");
        return;
    }
    bot.sendMessage(data[index].TChatID, "Дорогой клиент, рады сообщить, что Вы получили это сообщение!");
    setTimeout(function(){
        sendMsgToDCardsClientsRecursively(index+1, data)
    },300);
}

