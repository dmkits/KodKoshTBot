var logger=require('./logger')() ;
var appConfig=require('./appConfig');
var moment = require('moment');
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


function selectMSSQLQuery(query, callback) {                                                        logger.debug("database selectMSSQLQuery query:",query);
    var request = new mssql.Request();
    request.query(query,
        function (err, result) {
            if (err) {                                                                              logger.error('database: selectMSSQLQuery error:',err.message,{});//test
                callback(err);
                return;
            }
            callback(null, result.recordset, result.rowsAffected.length);
        });
}

/**
 * for MS SQL database query select
 * parameters = [ <value1>, <value2>, ...] - values for replace '@p<Index>' in query
 * callback = function(err, recordset, count)
 */
function selectParamsMSSQLQuery(query, parameters, callback) {                                      logger.debug("database selectParamsMSSQLQuery query:",query," parameters:",parameters,{});
    var request = new mssql.Request();
    for(var i in parameters){
        request.input('p'+i,parameters[i]);
    }
    request.query(query,
        function (err, result) {
            if (err) {                                                                              logger.error('database: selectParamsMSSQLQuery error:',err.message,{});//test
                callback(err);
                return;
            }                                                                                       //logger.debug('database: selectParamsMSSQLQuery:',result.recordset,{});//test
            callback(null, result.recordset, result.rowsAffected.length);
        });
}
module.exports.selectParamsMSSQLQuery=selectParamsMSSQLQuery;
/**
 * for MS SQL database query insert/update/delete
 * query= <MS SQL queryStr>
 * callback = function(err, updateCount)
 */
module.exports.executeMSSQLQuery=function(query,callback){                                      logger.debug("database executeMSSQLQuery:",query);
    var request = new mssql.Request();
    request.query(query,
        function(err,result){
            if(err){                                                                            logger.error('database: executeMSSQLQuery error:',err.message,{});//test
                callback(err);
                return;
            }
            callback(null, result.rowsAffected.length);
        });
};

/**
 * for MS SQL database query insert/update/delete
 * query= <MS SQL queryStr>
 * paramsValueObj = {<paramName>:<paramValue>,...}
 * callback = function(err, updateCount)
 */
module.exports.executeMSSQLParamsQuery= function(query, parameters, callback) {                 logger.debug("database executeMSSQLParamsQuery:",query,parameters);
    var request = new mssql.Request();
    for(var i in parameters){
        request.input('p'+i,parameters[i]);
    }
    request.query(query,
        function (err, result) {
            if (err) {                                                                          logger.error('database: executeMSSQLParamsQuery error:',err.message,{});//test
                callback(err);
                return;
            }                                                                                   logger.debug('database: executeMSSQLParamsQuery recordset:',result.recordset,{});//test
            callback(null, result.rowsAffected.length);
        });
};

/**
 * params = { source,
 *      fields = [ <fieldName> or <functionFieldName>, ... ],
 *      conditions={ <condition>:<conditionValue>, ... } OR conditions=[ { fieldName:"...", condition:"...", value:"..." }, ... ],
 *      order = "<fieldName>" OR "<fieldName>,<fieldName>,..." OR [ <fieldName>, ... ]
 * }
 * resultCallback = function(err, recordset)
 */
function getSelectItems(params, resultCallback){
    if(!params){                                                                                        logger.error("FAILED _getSelectItems! Reason: no function parameters!");//test
        resultCallback("FAILED _getSelectItems! Reason: no function parameters!");
        return;
    }
    if(!params.source){                                                                                 logger.error("FAILED _getSelectItems! Reason: no source!");//test
        resultCallback("FAILED _getSelectItems! Reason: no source!");
        return;
    }
    if(!params.fields){                                                                                 logger.error("FAILED _getSelectItems from source:"+params.source+"! Reason: no source fields!");//test
        resultCallback("FAILED _getSelectItems from source:"+params.source+"! Reason: no source fields!");
        return;
    }
    var queryFields="";
    for(var fieldNameIndex in params.fields) {
        if (queryFields!="") queryFields+= ",";
        var fieldName=params.fields[fieldNameIndex], fieldFunction=null;
        queryFields+= ((fieldFunction)?fieldFunction+" as ":"") + fieldName;
    }
    var selectQuery="select "+queryFields+" from "+params.source;
    var wConditionQuery, coditionValues=[];
    if (params.conditions&&typeof(params.conditions)=="object"&&params.conditions.length===undefined) {//object
        for(var conditionItem in params.conditions) {
            var conditionItemValue=params.conditions[conditionItem];
            var conditionItemValueQuery= (conditionItemValue===null||conditionItemValue==='null')?conditionItem:conditionItem+"@p"+coditionValues.length;
            conditionItemValueQuery= conditionItemValueQuery.replace("~","=");
            wConditionQuery= (!wConditionQuery)?conditionItemValueQuery:wConditionQuery+" and "+conditionItemValueQuery;
            if (conditionItemValue!==null) coditionValues.push(conditionItemValue);
        }
    } else if (params.conditions&&typeof(params.conditions)=="object"&&params.conditions.length>0) {//array
        for(var ind in params.conditions) {
            var conditionItem= params.conditions[ind];
            var conditionFieldName=conditionItem.fieldName;
            if(params.fieldsSources&&params.fieldsSources[conditionFieldName])
                conditionFieldName= params.fieldsSources[conditionFieldName];
            var conditionItemValueQuery=
                (conditionItem.value===null)?conditionFieldName+conditionItem.condition:conditionFieldName+conditionItem.condition+"@p"+coditionValues.length;
            wConditionQuery= (!wConditionQuery)?conditionItemValueQuery:wConditionQuery+" and "+conditionItemValueQuery;
            if (conditionItem.value!==null) coditionValues.push(conditionItem.value);
        }
    }
    if(wConditionQuery)selectQuery+=" where "+wConditionQuery;
    if (params.order) selectQuery+=" order by "+params.order;
    if (coditionValues.length==0)
        selectMSSQLQuery(selectQuery,function(err, recordset, count){
            if(err) {                                                                                       logger.error("FAILED _getSelectItems selectMSSQLQuery! Reason:",err.message,"!");//test
                resultCallback(err);
            } else
                resultCallback(null,recordset);
        });
    else
        selectParamsMSSQLQuery(selectQuery,coditionValues, function(err, recordset, count){
            if(err) {                                                                                       logger.error("FAILED _getSelectItems selectParamsMSSQLQuery! Reason:",err.message,"!");//test
                resultCallback(err);
            } else
                resultCallback(null,recordset);
        });

}
/**
 * params = { source,
 *      tableColumns = [
 *          {data:<dataFieldName>, name:<tableColumnHeader>, width:<tableColumnWidth>, type:<dataType>, readOnly:true/false, visible:true/false },
 *          ...
 *      ],
 *      conditions={ <condition>:<conditionValue>, ... },
 *      order = "<orderFieldsList>",
 *      tableData = { columns:tableColumns, identifier:identifier }
 * }
 * tableColumns: -<dataType> = text / html_text / text_date / text_datetime / date / numeric / numeric2 / checkbox
 * OR tableColumns: -<dataType> = text / text & dateFormat:"DD.MM.YY HH:mm:ss" / html_text / date /
 *              numeric format:"#,###,###,##0.00[#######]" language:"ru-RU" /
 *              checkbox checkedTemplate:1 uncheckedTemplate:0 /
 *              autocomplete strict allowInvalid sourceURL
 * tableColumns: -readOnly default false, visible default true
 * resultCallback = function( tableData = { columns:tableColumns, identifier:identifier, items:[ {<tableFieldName>:<value>,...}, {}, {}, ...],
 *      error:errorMessage } )
 */
function getDataItemsForTable(params, resultCallback){
    var tableData={};
    if(!params){                                                                                        logger.error("FAILED _getDataItemsForTable! Reason: no function parameters!");//test
        tableData.error="FAILED _getDataItemsForTable! Reason: no function parameters!";
        resultCallback(tableData);
        return;
    }
    if(params.tableData) tableData=params.tableData;
    if(!params.tableColumns){                                                                           logger.error("FAILED _getDataItemsForTable! Reason: no table columns!");//test
        tableData.error="FAILED _getDataItemsForTable! Reason: no table columns!";
        resultCallback(tableData);
        return;
    }
    params.fields=[];
    for(var i in params.tableColumns) {
        params.fields.push(params.tableColumns[i].data);
    }
    tableData.tableColumns=params.tableColumns;
    getSelectItems(params, function(err, recordset){
        if(err) tableData.error="Failed get data for table! Reason:"+err.message;
        tableData.items= recordset;
        formatItemsByColumnsTypes(tableData);
        resultCallback(tableData);
    });
}
function getDataItemForTable(params, resultCallback){
    getDataItemsForTable(params,function(tableData){
        var tableDataItem={};
        for(var itemName in tableData){
            if(itemName!="items"){
                tableDataItem[itemName]=tableData[itemName];
                continue;
            }
            var tableDataItems=tableData.items;
            if(tableDataItems&&tableDataItems.length>1){
                tableDataItem.error="Failed get data item for table! Reason: result contains more that one items!";
                continue;
            } else if(!tableDataItems||tableDataItems.length==0){
                continue;
            }
            tableDataItem.item=tableDataItems[0];
        }
        resultCallback(tableDataItem);
    });
}

/**
 * tableColumns = [
 *      { data:<tableFieldName>, name:<tableColumnHeader>, width:<tableColumnWidth>, type:<dataType>, align:"left"/"center"/"right",
 *          useFilter:true/false default:true, readOnly:true/false, default:false, visible:true/false default:true },
 *       ...
 * ]
 * tableColumns: -<dataType> = text / html_text / text_date / text_datetime / date / numeric / numeric2 / checkbox
 *                              / combobox,sourceURL / comboboxWN,sourceURL
 * OR tableColumns: -<dataType> = text / text & dateFormat:"DD.MM.YY HH:mm:ss" / html_text / date /
 *              numeric format:"#,###,###,##0.00[#######]" language:"ru-RU" /
 *              checkbox, checkedTemplate:1, uncheckedTemplate:0 /
 *              autocomplete, strict, allowInvalid, sourceURL
 */
function getTableColumnsDataForHTable(tableColumns){
    if (!tableColumns) return tableColumns;
    var tableColumnsDataForHTable=[];
    for(var col=0;col<tableColumns.length;col++){
        var tableColData=tableColumns[col];
        if(!tableColData||!tableColData.data||!tableColData.name) continue;
        var tableColumnsDataItemForHTable= { data:tableColData.data };
        if(tableColData.name!==undefined) tableColumnsDataItemForHTable.name=tableColData.name;
        if(tableColData.width!==undefined) tableColumnsDataItemForHTable.width=tableColData.width;
        if(tableColData.type!==undefined) tableColumnsDataItemForHTable.type=tableColData.type;
        if(tableColData.align!==undefined) tableColumnsDataItemForHTable.align=tableColData.align;
        if(tableColData.useFilter!==undefined) tableColumnsDataItemForHTable.useFilter=tableColData.useFilter;
        if(tableColData.readOnly!==undefined) tableColumnsDataItemForHTable.readOnly=tableColData.readOnly;
        if(tableColData.visible!==undefined) tableColumnsDataItemForHTable.visible=tableColData.visible;
        if(tableColData.format!==undefined) tableColumnsDataItemForHTable.format=tableColData.format;
        if(tableColData.dateFormat!==undefined) tableColumnsDataItemForHTable.dateFormat=tableColData.dateFormat;
        if(tableColData.datetimeFormat!==undefined) tableColumnsDataItemForHTable.datetimeFormat=tableColData.datetimeFormat;
        if(tableColData.format!==undefined) tableColumnsDataItemForHTable.format=tableColData.format;
        if(tableColData.language!==undefined) tableColumnsDataItemForHTable.language=tableColData.language;
        if(tableColData.checkedTemplate!==undefined) tableColumnsDataItemForHTable.checkedTemplate=tableColData.checkedTemplate;
        if(tableColData.uncheckedTemplate!==undefined) tableColumnsDataItemForHTable.uncheckedTemplate=tableColData.uncheckedTemplate;
        if(tableColData.strict!==undefined) tableColumnsDataItemForHTable.strict=tableColData.strict;
        if(tableColData.allowInvalid!==undefined) tableColumnsDataItemForHTable.allowInvalid=tableColData.allowInvalid;
        if(tableColData.sourceURL!==undefined) tableColumnsDataItemForHTable.sourceURL=tableColData.sourceURL;
        tableColumnsDataForHTable.push(tableColumnsDataItemForHTable);
        if (tableColumnsDataItemForHTable.type=="dateAsText"){
            tableColumnsDataItemForHTable.type="text";
            //if(!tableColumnsDataItemForHTable.dateFormat) tableColumnsDataItemForHTable.dateFormat="DD.MM.YY";
            if(!tableColumnsDataItemForHTable.datetimeFormat) tableColumnsDataItemForHTable.datetimeFormat="DD.MM.YY";
        } else if (tableColumnsDataItemForHTable.type=="datetimeAsText"){
            tableColumnsDataItemForHTable.type="text";
            //if(!tableColumnsDataItemForHTable.dateFormat) tableColumnsDataItemForHTable.dateFormat="DD.MM.YY HH:mm:ss";
            if(!tableColumnsDataItemForHTable.datetimeFormat) tableColumnsDataItemForHTable.datetimeFormat="DD.MM.YY HH:mm:ss";
        } else if(tableColumnsDataItemForHTable.type=="numeric"){
            if(!tableColumnsDataItemForHTable.format) tableColumnsDataItemForHTable.format="#,###,###,##0.[#########]";
            if(!tableColumnsDataItemForHTable.language) tableColumnsDataItemForHTable.language="ru-RU";
        } else if(tableColumnsDataItemForHTable.type=="numeric2"){
            tableColumnsDataItemForHTable.type="numeric";
            if(!tableColumnsDataItemForHTable.format) tableColumnsDataItemForHTable.format="#,###,###,##0.00[#######]";
            if(!tableColumnsDataItemForHTable.language) tableColumnsDataItemForHTable.language="ru-RU";
        } else if(tableColumnsDataItemForHTable.type=="checkbox"){
            if(!tableColumnsDataItemForHTable.checkedTemplate) tableColumnsDataItemForHTable.checkedTemplate="1";
            if(!tableColumnsDataItemForHTable.uncheckedTemplate) tableColumnsDataItemForHTable.uncheckedTemplate="0";
        } else if(tableColumnsDataItemForHTable.type=="checkboxMSSQL"){
            tableColumnsDataItemForHTable.type="checkbox";
            if(!tableColumnsDataItemForHTable.checkedTemplate) tableColumnsDataItemForHTable.checkedTemplate="true";
            if(!tableColumnsDataItemForHTable.uncheckedTemplate) tableColumnsDataItemForHTable.uncheckedTemplate="false";
        } else if(tableColumnsDataItemForHTable.type=="combobox"||tableColumnsDataItemForHTable.type=="comboboxWN") {
            tableColumnsDataItemForHTable.strict= true;
            if(tableColumnsDataItemForHTable.type=="combobox") tableColumnsDataItemForHTable.allowInvalid=false; else tableColumnsDataItemForHTable.allowInvalid=true;
            tableColumnsDataItemForHTable.filter= false;
            tableColumnsDataItemForHTable.type="autocomplete";
        } else if(!tableColumnsDataItemForHTable.type) tableColumnsDataItemForHTable.type="text";
    }
    return tableColumnsDataForHTable;
}
function formatItemsByColumnsTypes(tableData){
    if(!tableData.tableColumns||!tableData.items||tableData.items.length==0) return tableData;
    for(var i in tableData.tableColumns){
        var colData= tableData.tableColumns[i];
        if(colData.type=="date"&&colData.dateFormat){
            for(var row in tableData.items){
                var rowData= tableData.items[row];
                if(!rowData||!rowData[colData.data]) continue;
                rowData[colData.data]= moment(rowData[colData.data]).format(colData.dateFormat); //format rowData[colData.data] by colData.type=="date"&&colData.dateFormat
            }
        }
    }
}
/**
 * params = { source,
 *      tableColumns = [
 *          {data:<sourceFieldName>, name:<tableColumnHeader>, width:<tableColumnWidth>, type:<dataType>, readOnly:true/false, visible:true/false,
 *                dataSource:<sourceName>, sourceField:<sourceFieldName> },
 *          ...
 *      ],
 *      identifier= <sourceIDFieldName>,
 *      conditions={ <condition>:<conditionValue>, ... },
 *      order = "<orderFieldsList>"
 * }
 * tableColumns: -<dataType> = text / html_text / text_date / text_datetime / date / numeric / numeric2 / checkbox
 * OR tableColumns: -<dataType> = text / text & dateFormat:"DD.MM.YY HH:mm:ss" / html_text / date /
 *              numeric format:"#,###,###,##0.00[#######]" language:"ru-RU" /
 *              checkbox checkedTemplate:1 uncheckedTemplate:0 /
 *              autocomplete strict allowInvalid sourceURL
 * tableColumns: -readOnly default false, visible default true
 * resultCallback = function( tableData = { columns:tableColumns, identifier:identifier, items:[ {<tableFieldName>:<value>,...}, {}, {}, ...],
 *      error:errorMessage } )
 */
function getDataForTable(params, resultCallback){
    var tableData={};
    if(!params){                                                                                        logger.error("FAILED _getDataForTable! Reason: no function parameters!");//test
        tableData.error="FAILED _getDataForTable! Reason: no function parameters!";
        resultCallback(tableData);
        return;
    }
    if(!params.tableColumns){                                                                           logger.error("FAILED _getDataForTable! Reason: no table columns!");//test
        tableData.error="FAILED _getDataForTable! Reason: no table columns!";
        resultCallback(tableData);
        return;
    }
    tableData.columns= getTableColumnsDataForHTable(params.tableColumns);
    tableData.identifier=params.identifier;
    if (!params.conditions) {
        resultCallback(tableData);
        return;
    }
    var hasConditions=false;
    for(var conditionItem in params.conditions){
        hasConditions=true; break;
    }
    if (!hasConditions) {
        resultCallback(tableData);
        return;
    }
    params.tableData=tableData;
    getDataItemsForTable(params,resultCallback);
}
module.exports.getDataForTable=getDataForTable;

/**
 * params = { tableName,
 *      insData = {<tableFieldName>:<value>,<tableFieldName>:<value>,<tableFieldName>:<value>,...}
 * }
 * <value> instanceof Date converted to sting by format yyyy-mm-dd HH:MM:ss !!!
 * resultCallback = function(result = { updateCount, error }
 */
function insDataItem(params, resultCallback) {
    if (!params) {                                                                                      logger.error("FAILED _insDataItem! Reason: no parameters!");//test
        resultCallback({ error:"Failed insert data item! Reason:no function parameters!"});
        return;
    }
    if (!params.tableName) {                                                                            logger.error("FAILED _insDataItem! Reason: no table name!");//test
        resultCallback({ error:"Failed insert data item! Reason:no table name for insert!"});
        return;
    }
    if (!params.insData) {                                                                              logger.error("FAILED _insDataItem into "+params.tableName+"! Reason: no data for insert!");//test
        resultCallback({ error:"Failed insert data item! Reason:no data for insert!"});
        return;
    }
    var queryFields="", queryInputParams=[], queryFieldsValues="";
    for(var fieldName in params.insData) {
        if (queryFields!="") queryFields+= ",";
        if (queryFieldsValues!="") queryFieldsValues+= ",";
        queryFields+= fieldName;
        queryFieldsValues+= "@p"+queryInputParams.length;
        var insDataItemValue=params.insData[fieldName];
        if(insDataItemValue&&(insDataItemValue instanceof Date)) {
            insDataItemValue=moment(insDataItemValue).format("YYYY-MM-DD HH:mm:ss");
        }
      //  queryInputParamsObj[fieldName]=insDataItemValue;
        queryInputParams.push(insDataItemValue);
    }
    var insQuery="insert into "+params.tableName+"("+queryFields+") values("+queryFieldsValues+")";
    module.exports.executeMSSQLParamsQuery(insQuery,queryInputParams,function(err, updateCount){
        var insResult={};
        if(err) {
            insResult.error="Failed insert data item! Reason:"+err.message;
            resultCallback(insResult);
            return;
        }
        insResult.updateCount= updateCount;
        if (updateCount==0) insResult.error="Failed insert data item! Reason: no inserted row count!";
        resultCallback(insResult);
    });
}
/**
 * params = { tableName, idFieldName, tableColumns
 *      insTableData = {<tableFieldName>:<value>,<tableFieldName>:<value>,<tableFieldName>:<value>,...}
 * }
 * resultCallback = function(result = { updateCount, resultItem:{<tableFieldName>:<value>,...}, error })
 */
function insTableDataItem(params, resultCallback) {
    if (!params) {                                                                                          logger.error("FAILED _insTableDataItem! Reason: no parameters!");//test
        resultCallback({ error:"Failed insert table data item! Reason:no parameters!"});
        return;
    }
    if (!params.tableName) {                                                                                logger.error("FAILED _insTableDataItem! Reason: no table name!");//test
        resultCallback({ error:"Failed insert table data item! Reason:no table name!"});
        return;
    }
    if (!params.insTableData) {                                                                             logger.error("FAILED _insTableDataItem "+params.tableName+"! Reason: no data for insert!");//test
        resultCallback({ error:"Failed insert table data item! Reason:no data for insert!"});
        return;
    }
    var idFieldName= params.idFieldName;
    if (!idFieldName) {                                                                                     logger.error("FAILED _insTableDataItem "+params.tableName+"! Reason: no id field!");//test
        resultCallback({ error:"Failed insert table data item! Reason:no id field name!"});
        return;
    }
    if (!params.tableColumns) {                                                                             logger.error("FAILED _insTableDataItem "+params.tableName+"! Reason: no table columns!");//test
        resultCallback({ error:"Failed insert table data item! Reason:no table columns!"});
        return;
    }
    if(params.insTableData) params.insData=params.insTableData;
    insDataItem(params, function(insResult){
        if(insResult.error){
            resultCallback(insResult);
            return;
        }
        var resultFields=[];
        for(var fieldName in params.insTableData) resultFields.push(fieldName);
        var getResultConditions={}; getResultConditions[params.tableName+"."+idFieldName+"="]=params.insTableData[idFieldName];
        getDataItemForTable({source:params.tableName, tableColumns:params.tableColumns, conditions:getResultConditions},
            function(result){
                if(result.error) insResult.error="Failed get result inserted data item! Reason:"+result.error;
                if (result.item) insResult.resultItem= result.item;
                resultCallback(insResult);
            });
    });
}
/**
 * params = { tableName, idFieldName,
 *      insData = {<tableFieldName>:<value>,<tableFieldName>:<value>,<tableFieldName>:<value>,...}
 * }
 * resultCallback = function(result = { updateCount, error, resultItem }
 */
function insTableDataWithNewID(params, resultCallback) {
    if (!params) {                                                                                      logger.error("FAILED insTableDataWithNewID! Reason: no parameters!");//test
        resultCallback({ error:"Failed insert data item with new ID! Reason:no function parameters!"});
        return;
    }
    var idFieldName= params.idFieldName;
    if (!idFieldName) {                                                                                 logger.error("FAILED insTableDataWithNewID "+params.tableName+"! Reason: no id field!");//test
        resultCallback({ error:"Failed insert data item with new ID! Reason:no id field name!"});
        return;
    }
    var sqlSelectMaxID="select ISNULL(MAX("+idFieldName+"),0)+1 as MAXCHID from "+params.tableName;
    selectMSSQLQuery(sqlSelectMaxID,function(err, recordset, count){
        if(err) {                                                                                       logger.error("FAILED insTableDataWithNewID selectMSSQLQuery! Reason:",err.message,"!");//test
            resultCallback(err);
            return;
        }
        params.insTableData[idFieldName]=recordset[0]["MAXCHID"];
        insTableDataItem(params,resultCallback);
    });
}

function getDateFromFormattedStr(columnsData, tableData){
    if(!columnsData||!tableData||columnsData.length==0) return tableData;

    for(var i in columnsData){
        var colData= columnsData[i];
        if(colData.type=="date"&&colData.dateFormat){
            if(tableData[colData.data])
            tableData[colData.data]= moment(tableData[colData.data], colData.dateFormat).format('YYYY-MM-DD HH:mm:ss');
        }
    }
}

/**
 * params = { tableName, idFieldName, tableColumns,
 *      storeTableData = {<tableFieldName>:<value>,<tableFieldName>:<value>,<tableFieldName>:<value>,...}
 * }
 * resultCallback = function(result = { updateCount, resultItem:{<tableFieldName>:<value>,...}, error } )
 */
module.exports.storeTableDataItem = function (params, resultCallback) {
    if (!params) {                                                                                      logger.error("FAILED _storeTableDataItem! Reason: no parameters!");//test
        resultCallback({ error:"Failed store table data item! Reason:no function parameters!"});
        return;
    }
    if (!params.tableName) {                                                                            logger.error("FAILED _storeTableDataItem! Reason: no table name!");//test
        resultCallback({ error:"Failed store table data item! Reason:no table name for store!"});
        return;
    }
    if (!params.storeTableData) {                                                                       logger.error("FAILED _storeTableDataItem "+params.tableName+"! Reason: no data for store!");//test
        resultCallback({ error:"Failed store table data item! Reason:no data for store!"});
        return;
    }
    var idFieldName= params.idFieldName;
    if (!idFieldName) {                                                                                 logger.error("FAILED _storeTableDataItem "+params.tableName+"! Reason: no id field!");//test
        resultCallback({ error:"Failed store table data item! Reason:no id field name!"});
        return;
    }
    if (!params.tableColumns) {                                                                         logger.error("FAILED _storeTableDataItem "+params.tableName+"! Reason: no table columns!");//test
        resultCallback({ error:"Failed store table data item! Reason:no table columns!"});
        return;
    }
    var idValue=params.storeTableData[idFieldName];
    getDateFromFormattedStr(params.tableColumns,params.storeTableData);
    if (idValue===undefined||idValue===null){//insert
        insTableDataWithNewID({tableName:params.tableName, idFieldName:idFieldName, tableColumns:params.tableColumns,
            insTableData:params.storeTableData}, resultCallback);
        return;
    }
    //update
   updTableDataItem({tableName:params.tableName, idFieldName:idFieldName, tableColumns:params.tableColumns,
        updTableData:params.storeTableData}, resultCallback);
};
/**
 * params = { tableName, idFieldName,
 *      tableColumns=[ {<tableColumnData>},... ],
 *      updTableData = {<tableFieldName>:<value>,<tableFieldName>:<value>,<tableFieldName>:<value>,...}
 * }
 * resultCallback = function(result = { updateCount, resultItem:{<tableFieldName>:<value>,...}, error })
 */
function updTableDataItem(params, resultCallback) {
    if (!params) {                                                                                      log.error("FAILED _updTableDataItem! Reason: no parameters!");//test
        resultCallback({ error:"Failed update table data item! Reason:no function parameters!"});
        return;
    }
    if(!params.tableName&&this.source) params.tableName=this.source;
    if (!params.tableName) {                                                                            log.error("FAILED _updTableDataItem! Reason: no table name!");//test
        resultCallback({ error:"Failed update table data item! Reason:no table name!"});
        return;
    }
    if (!params.updTableData) {                                                                         log.error("FAILED _updTableDataItem "+params.tableName+"! Reason: no data for update!");//test
        resultCallback({ error:"Failed update table data item! Reason:no data for update!"});
        return;
    }
    var idFieldName= params.idFieldName;
    if (!idFieldName) {                                                                                 log.error("FAILED _updTableDataItem "+params.tableName+"! Reason: no id field!");//test
        resultCallback({ error:"Failed update table data item! Reason:no id field name!"});
        return;
    }
    params.updData={};
    if(this.fields){
        for(var i in this.fields){
            var fieldName=this.fields[i];
            if(fieldName!=idFieldName)params.updData[fieldName]=params.updTableData[fieldName];
        }
    } else {
        for(var updFieldName in params.updTableData)
            if(updFieldName!=idFieldName) params.updData[updFieldName]=params.updTableData[updFieldName];
    }
    params.conditions={}; params.conditions[idFieldName+"="]=params.updTableData[idFieldName];
    updDataItem(params, function(updResult){
        if(updResult.error){
            resultCallback(updResult);
            return;
        }
        var resultFields=[];
        for(var fieldName in params.updTableData) resultFields.push(fieldName);
        var getResultConditions={}; getResultConditions[params.tableName+"."+idFieldName+"="]=params.updTableData[idFieldName];
        getDataItemForTable({source:params.tableName, tableColumns:params.tableColumns, conditions:getResultConditions},
            function(result){
                if(result.error) updResult.error="Failed get result updated data item! Reason:"+result.error;
                if (result.item) updResult.resultItem= result.item;
                resultCallback(updResult);
            });
    });
}

/**
 * params = { tableName,
 *      updData = {<tableFieldName>:<value>,<tableFieldName>:<value>,<tableFieldName>:<value>,...},
 *      conditions = { <tableFieldNameCondition>:<value>, ... }
 * }
 * resultCallback = function(result = { updateCount, error })
 */
function updDataItem(params, resultCallback) {
    if (!params) {                                                                                      log.error("FAILED _updDataItem! Reason: no parameters!");//test
        resultCallback({ error:"Failed update data item! Reason:no function parameters!"});
        return;
    }
    if(!params.tableName&&this.source) params.tableName=this.source;
    if (!params.tableName) {                                                                            log.error("FAILED _updDataItem! Reason: no table name!");//test
        resultCallback({ error:"Failed update data item! Reason:no table name for update!"});
        return;
    }
    if (!params.updData) {                                                                              log.error("FAILED _updDataItem "+params.tableName+"! Reason: no data for update!");//test
        resultCallback({ error:"Failed update data item! Reason:no data for update!"});
        return;
    }
    if (!params.conditions) {                                                                           log.error("FAILED _updDataItem "+params.tableName+"! Reason: no conditions!");//test
        resultCallback({ error:"Failed update data item! Reason:no update conditions!"});
        return;
    }
    var queryFields="", fieldsValues=[];
    for(var fieldName in params.updData) {
        if (queryFields!="") queryFields+= ",";
        queryFields+= fieldName+"=@p"+fieldsValues.length;
        var updDataItemValue=params.updData[fieldName];
        if(updDataItemValue&&(updDataItemValue instanceof Date)) {
            updDataItemValue=moment(updDataItemValue).format('YYYY-MM-DD HH:mm:ss');
        }
        fieldsValues.push(updDataItemValue);
    }
    var updQuery="update "+params.tableName+" set "+queryFields;
    var queryConditions="";
    for(var fieldNameCondition in params.conditions) {

        if (queryConditions!="") queryConditions+= " and ";
        queryConditions+= fieldNameCondition.replace("~","=")+"@p"+fieldsValues.length;
        fieldsValues.push(params.conditions[fieldNameCondition]);
    }

    updQuery+= " where "+queryConditions;
    module.exports.executeMSSQLParamsQuery(updQuery,fieldsValues,function(err, updateCount){
        var updResult={};
        if(err) {
            updResult.error="Failed update data item! Reason:"+err.message;
            resultCallback(updResult);
            return;
        }
        updResult.updateCount= updateCount;
        if (updateCount==0) updResult.error="Failed update data item! Reason: no updated row count!";
        resultCallback(updResult);
    });
}
