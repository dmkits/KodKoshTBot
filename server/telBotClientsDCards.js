var logger=require('./logger')();
var appConfig=require('./appConfig'),
    bot=require('./telBot.js'),
    database = require('./database');

var cron = require('node-cron');
var moment = require('moment');

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
    var dCardClientsSchedule="0 5 7-22/1 * * * ";
    if(!dCardClientsSchedule||cron.validate(dCardClientsSchedule)==false)return;
    var scheduledCardClientsMsg =cron.schedule(dCardClientsSchedule,
        function(){
            sendDCardsClientsMsg();
        });
    scheduledCardClientsMsg.start();
}
startScheduleToSendDCardClientsMsg();


function sendDCardsClientsMsg(){
    var today=moment(new Date()).format('YYYY-MM-DD');
    var curHour=new Date().getHours().toString();
    var query="select * from it_BotMessages where (DocDate=@p0 and ','+MsgHours+',' like '%,'+@p1+',%') "; +
        // "and (LTRIM(ISNULL(SendHours,''))='' " +
        // "OR ','+SendHours+',' not like '%,'+@p1+',%')";
    database.selectParamsMSSQLQuery (query,[today,curHour],
        function(err, res){                  console.log("res=",res);
        if(err){
            logger.error('Failed to get messages data for sending. Reason:'+err.message);
            return;
        }
        if(!res || res.length==0) return;
        var msgDataArr=res;
            database.getClientsForSendingMsg(function(err, chatIDDataArr){
                if(err){
                    logger.error("FAILED to get clients chat id. Reason:"+err);
                    return;
                }
                sendMsgRecursively(0,msgDataArr,curHour, chatIDDataArr);
            })
    })
}

function sendMsgRecursively(index,msgDataArr,curHour, chatIDDataArr){
    if(!msgDataArr[index]){
        return;
    }
    var MsgData=msgDataArr[index];
    sendMsgToDCardsClientsRecursively(0,MsgData, chatIDDataArr, function(){
        var query="update it_BotMessages  " +
            "set SendHours=ISNULL(SendHours,'')+CASE When LTRIM(ISNULL(SendHours,''))<>'' Then ',' Else '' END+@p0 " +
            "where ChID=@p1";
        database.executeMSSQLParamsQuery(query,[curHour, MsgData["ChID"]],
            function(err,res){
                if(err){
                    logger.error("Failed to update it_BotMessages after messages was sent. Reason: "+err.message);
                    return;
                }
                sendMsgRecursively(index+1,curHour,msgDataArr, chatIDDataArr)
        });
    });
};

function sendMsgToDCardsClientsRecursively(index, MsgData, chatIDDataArr,callback){
    if(!chatIDDataArr[index]){
        callback();
        return;
    }
    bot.sendMessage(chatIDDataArr[index]["TChatID"], MsgData["Msg"]);
    setTimeout(function(){
        sendMsgToDCardsClientsRecursively(index+1, MsgData, chatIDDataArr,callback)
    },300);
}



