var Promise = require('bluebird');
var TelegramBot = require('node-telegram-bot-api');
var fs=require('fs');
var path = require('path');
var database=require('./database');
var logger=require('./logger')();
var configObj=database.getAppConfig();
var TOKEN=configObj['botToken'];
var bot = new TelegramBot(TOKEN, {polling: true});
var msgManager=require('./msgManager');
var sysAdminTelArr=configObj["sysadmins"];
Promise.config({
    cancellation: true
});

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

bot.on('error', (error) => {
    logger.error("Bot ERROR=",error);
});

bot.on('polling_error', (error) => {
  logger.error(error);
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

        database.getDbConnectionError(function(dbConnectionError){
            if(dbConnectionError){
                checkAndRegisterSysAdmin(msg, function(sysAdminRegistered){
                    if(!sysAdminRegistered){
                        bot.sendMessage(msg.chat.id, "Не улалось зарегистрировать пользователя Telegram. Обратитесь к системному администратору.").catch((error)=>{
                            logger.warn("Failed to send msg to user. Chat ID:"+ msg.chat.id +" Reason: ",error.response.body);
                        });
                    }
                });
                return;
            }
            checkAndRegisterSysAdmin(msg, function(sysAdminRegistered){
                database.checkPhoneAndWriteChatID(phoneNumber,msg.chat.id,
                    function(err,employeeDataArr){
                        if(err){
                            logger.error("Failed to check phone number and write chat ID to database. Reason: "+err);
                            bot.sendMessage(msg.chat.id, "Не улалось зарегистрировать пользователя. Обратитесь к системному администратору.").catch((error)=>{
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
            });
        });
    }
});


function checkAndRegisterSysAdmin(msg, callback){
    var phoneNumber=msg.contact.phone_number;
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
    for(var k in registeredSysAdmins){
        var registeredSysAdmin=registeredSysAdmins[k];
            if(registeredSysAdmin[phoneNumber]){
                registeredSysAdmin[phoneNumber]=msg.chat.id;
                logger.info("Sysadmin registered successfully. Msg is sending.  Phone number: "+phoneNumber);
                bot.sendMessage(msg.chat.id, "Регистрация системного администратора прошла успешно.").catch((error)=>{
                    logger.warn("Failed to send msg to user. Chat ID:"+ msg.chat.id +" Reason: ",error.response.body);
                });
                    msgManager.makeDiskUsageMsg(null, function(err, adminMsg){
                        if(err){
                          logger.error("FAILED to make disk usage msg. Reason: "+err);
                            return;
                        }
                        logger.info("Disk usage msg is sending for existed sysadmin. Phone number: "+phoneNumber);
                        bot.sendMessage(msg.chat.id, adminMsg, {parse_mode:"HTML"}).catch((error)=>{
                            logger.warn("Failed to send msg to user. Chat ID:"+ msg.chat.id +" Reason:error.response.body=",error.response.body);
                        });
                        callback(true);
                    });
                return;
            }
    }
    if(! sysAdminTelArr ||sysAdminTelArr.length==0) return;
    for(var i=0; i<sysAdminTelArr.length; i++){
        var adminTelNum = sysAdminTelArr[i];
        if(adminTelNum==phoneNumber){
            var registeredSysAdmin={};
            registeredSysAdmin[adminTelNum]=msg.chat.id;
            registeredSysAdmins.push(registeredSysAdmin);
             fs.writeFile(path.join(__dirname, "../sysadmins.json"),JSON.stringify(registeredSysAdmins), {flag:'w+'},
                 function(err){
                     if (err) {
                         logger.error("FAILED to register sysadmin. Reason: "+err);
                         bot.sendMessage(msg.chat.id, "Ошибка регистрации системного администратора. "+err).catch((error)=>{
                             logger.warn("Failed to send msg to user. Chat ID:"+ msg.chat.id +" Reason: ",error.response.body);
                         });
                         return;
                     }
                     logger.info("New sysadmin registered successfully. Msg is sending.  Phone number: "+phoneNumber);
                     bot.sendMessage(msg.chat.id, "Регистрация системного администратора прошла успешно.").catch((error)=>{
                         logger.warn("Failed to send msg to user. Chat ID:"+ msg.chat.id +" Reason: ",error.response.body);
                     });
                          msgManager.makeDiskUsageMsg(null, function(err, adminMsg){
                              if(err){
                                  logger.error("FAILED to make disk usage msg. Reason: "+err);
                                  return;
                              }
                              logger.info("Disk usage msg is sending for new sysadmin.  Phone number: " + phoneNumber);
                              bot.sendMessage(msg.chat.id, adminMsg, {parse_mode: "HTML"}).catch((error)=> {
                                  logger.warn("Failed to send msg to user. Chat ID:" + msg.chat.id + " Reason: ", error.response.body);
                              });
                          });
                     callback(true);
                 });
            return;
        }
        if(i==sysAdminTelArr.length-1){
            callback();
        }
    }
}



module.exports.sendMsgToChatId=function(chatId, msg, params={}){
    logger.info("Msg is sending to chat id:"+chatId+". MSG: "+msg+".");
    bot.sendMessage(chatId,msg, params).catch((error)=>{
        logger.warn("Failed to send msg to user. Chat ID:"+ chatId+" Reason: ",error.response.body);
    });
};

module.exports.sendMsgToAdmins=function(msg){
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
                            }).catch((error)=>{
                            logger.warn("Failed to send msg to user. Chat ID:"+ adminChatId +" Reason: ",error.response.body);
                        });
                        continue;
                    }
                    logger.info("Sending msg to sysadmin. Chat ID: "+ adminChatId);
                    bot.sendMessage(adminChatId, msg,
                        {parse_mode:"HTML", reply_markup: {remove_keyboard: true}
                        }).catch((error)=>{
                        logger.warn("Failed to send msg to user. Chat ID:"+ adminChatId +" Reason: ",error.response.body);
                    });
                }
            }
        }
    });
};