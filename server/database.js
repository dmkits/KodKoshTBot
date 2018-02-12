var logger=require('./logger')() ;
var appConfig=require('./appConfig');

var mssql=require('mssql');
var dbConnectionError=null;

module.exports.getDbConnectionError= function(){
   return dbConnectionError;
};
// module.exports.getDbConnectionError= function(callback){
//     setImmediate(function(){
//         callback(dbConnectionError);
//     });
// };

module.exports.connectToDB=function(callback){
    mssql.close();
    mssql.connect({
        "user": appConfig.getAppConfigParam('dbUser'),
        "password": appConfig.getAppConfigParam('dbPassword'),
        "server": appConfig.getAppConfigParam('dbHost'),
        "database": appConfig.getAppConfigParam('database')
    }, function(err){
        if(err){
            dbConnectionError=err.message;
            logger.error("FAILED to connect to DB. Reason: "+dbConnectionError);
            callback(err.message);
            return;
        }
        var request = new mssql.Request();
        request.query('select 1',
            function(err,res) {
                if (err) {
                    dbConnectionError = err.message;
                    callback(dbConnectionError);
                    return;
                }
                dbConnectionError=null;
                callback();
            });
    });
};

module.exports.checkPhoneAndWriteChatID=function(phoneNum, chatId, callback){
    var request = new mssql.Request();
    request.input('PhoneMob', phoneNum);
    request.query('select DCardID from r_DCards WHERE PhoneMob=@PhoneMob',
        function(err,res){
            if(err){
                callback(err);
                return;
            }
            var employeeDataArr  =res.recordset;
            request.input('TChatID', chatId);
            request.query('update r_DCards set TChatID=@TChatID where PhoneMob=@PhoneMob',
                function(err, res){
                    if(err){
                        callback(err);
                        return;
                    }
                    callback(null,employeeDataArr);
                });
    })
};

module.exports.getClientsForSendingMsg=function(callback){
    var request = new mssql.Request();
    request.query("select TChatID from r_DCards where LTRIM(ISNULL(PhoneMob,''))<>'' and LTRIM(ISNULL(TChatID,''))<>''",
        function(err,res){
            if(err){
                callback(err);
                return;
            }
            if(!res.recordset || res.recordset.length==0){
                callback({err:"Не удалось найти ни одного клиента для рассылки сообщений."});
                return;
            }
            callback(null,res.recordset);
        });
};


module.exports.executeQuery=function(queryText,callback){
    var request = new mssql.Request();
    request.query(queryText,
        function(err,res){
            if(err){
                callback(err);
                return;
            }
            callback(null, res);
        });
};

/**
 * for database query insert/update/delete
 * parameters = [ <value1>, <value2>, ...] - values for replace '?' in query
 * callback = function(err, updateCount)
 */
module.exports.executeParamsQuery= function(query, paramsValueObj, callback) {                                  log.debug("database executeParamsQuery:",query,parameters);
    var request = new mssql.Request();
    var paramNames=Object.keys(paramsValueObj);
    for(var i in paramNames){
        request.input(paramNames[i], paramsValueObj[paramNames[i]]);
    }
    request.query(query,
        function (err, result) {
            if (err) {                                                                                      log.error("database executeParamsQuery err=",err.message);
                callback(err);
                return;
            }
            callback(null, result.rowsAffected.length);
        });
};