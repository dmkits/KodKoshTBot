var logger=require('./logger')();

var appConfig=require('./appConfig');
var bot=require('./telBot.js');
var database = require('./database');

module.exports.checkAndRegisterClientsDCards = function(){
    // database.getDbConnectionError(function(dbConnectionError){
    //     if(dbConnectionError){
    //         return;
    //     }
    //     telBotSysadmins.checkAndRegisterSysAdmin(msg, function(sysAdminRegistered){
    //
    //     });
    // });
    database.checkPhoneAndWriteChatID(phoneNumber,msg.chat.id,
        function(err,employeeDataArr){
            if(err){
                logger.error("Failed to check phone number and write chat ID to database. Reason: "+err);
                bot.sendMessage(msg.chat.id, "Не удалось зарегистрировать пользователя. Обратитесь к системному администратору.").catch((error)=>{
                    logger.warn("Failed to send msg to user. Chat ID:"+ msg.chat.id +" Reason: ",error.response.body);
                });
                return;
            }
            if((!employeeDataArr || employeeDataArr.length==0) && !sysAdminRegistered){
                logger.warn("Failed to register user. Phone number was not found in DB . Phone number: "+phoneNumber);
                bot.sendMessage(msg.chat.id, "Номер телефона не найден в справочнике сотрудников.").catch((error)=>{
                    logger.warn("Failed to send msg to user. Chat ID:"+ msg.chat.id +" Reason: ",error.response.body);
                });
            }
            // Несколько пользователей на одном номере тел.?
            bot.sendMessage(msg.chat.id, "Вы удачно зарегистрировались").catch((error)=>{
                logger.warn("Failed to send msg to user. Chat ID:"+ chatId+" Reason: ",error.response.body);
            });
        })
};