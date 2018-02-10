var path=require ('path');
var uid = require('uniqid');
var BigNumber = require('big-number');
var moment = require('moment');
var database=require('./database');

module.exports= function(app){
    app.get("/", function (req, res) {
        res.sendFile(path.join(__dirname, '../pages/', 'main.html'));
    });
    app.get("/get_main_data", function(req, res){
        var outData = {};//main data
        var menuBar= [];//menu bar list
        outData.title= "BOT";
        database.connectToDB(function(DBConnectError){
            if (DBConnectError) outData.error= DBConnectError;
            menuBar.push({itemname:"menuBarItemDCards",itemtitle:"Дисконтные карты",
                action:"open",content:"/getDCards", id:"DcardsTable",title:"Справочник дисконтных карт", closable:false});
            menuBar.push({itemname:"menuBarItemBotMsg",itemtitle:"Рассылка сообщений",
                action:"open",content:"/getBotMsgTable", id:"botMsgTable",title:"Рассылка сообщений (telegram bot) ", closable:false});
            menuBar.push({itemname:"menuBarClose",itemtitle:"Выход",action:"close"});
            menuBar.push({itemname:"menuBarAbout",itemtitle:"О программе",action:"help_about"});
            outData.menuBar= menuBar;
            outData.autorun= [];
            outData.autorun.push({menuitem:"menuBarItemDCards", runaction:1});
            res.send(outData);
        });
    });
    app.get("/getDCards", function (req, res) {
        res.sendFile(path.join(__dirname, '../pages/', 'dCardsTable.html'));
    });
    app.get("/getBotMsgTable", function (req, res) {
        res.sendFile(path.join(__dirname, '../pages/', 'botMsgTable.html'));
    });
    var dCardsTableColumns=[
        // {data: "ChID", name: "ChID", width: 100, type: "text", visible:false},
        {data: "DCardID", name: "Номер катры", width: 100, type: "text"},
        //{data: "Discount", name: "Discount", width: 100, type: "text"},
        //{data: "SumCC", name: "SumCC", width: 100, type: "text"},
        {data: "InUse", name: "Активна", width: 100, type: "text"},
        //{data: "Notes", name: "Notes", width: 100, type: "text"},
      //  {data: "IsCrdCard", name: "IsCrdCard", width: 100, type: "text"},
        //{data: "EDate", name: "EDate", width: 100, type: "text",datetimeFormat:"DD.MM.YYYY HH:mm:ss" },
        {data: "ClientName", name: "Полное имя клиента", width: 300, type: "text"},
        //{data: "DCTypeCode", name: "DCTypeCode", width: 100, type: "text"},
        //{data: "BirthDate", name: "BirthDate", width: 100, type: "text",datetimeFormat:"DD.MM.YYYY"},
      //  {data: "FactDistrict", name: "FactDistrict", width: 100, type: "text"},
       // {data: "FactCity", name: "FactCity", width: 100, type: "text"},
        {data: "PhoneMob", name: "Моб. тел.", width: 100, type: "text"},
        //{data: "PhoneHome", name: "PhoneHome", width: 100, type: "text"},
        //{data: "EMail", name: "EMail", width: 100, type: "text"},
        //{data: "Status", name: "Status", width: 100, type: "text"},
      //  {data: "TChatID", name: "TChatID", width: 100, type: "text"},
    ];

    //ChID	CompID	DCardID	Discount	SumCC	InUse	Notes	Value1	Value2	Value3
    // IsCrdCard	Note1	EDate	ClientName	DCTypeCode	BirthDate	FactRegion	FactDistrict
    // FactCity	FactStreet	FactHouse	FactBlock	FactAptNo	FactPostIndex
    // PhoneMob	PhoneHome	PhoneWork	EMail	SumBonus	Status	TChatID

    app.get('/DCards/getDataForTable', function (req, res) {
        var outData = {};
        outData.columns = dCardsTableColumns;

        outData.items = [];
        var queryText="select ChID, DCardID, InUse, ClientName, PhoneMob " +
            "from r_DCards;";
        database.executeQuery(queryText, function(err,result){
            if(err){
                outData.error=err.message;
                res.send(outData);
                return;
            }
            outData.identifier="DCardID";
            outData.items=result.recordset;
            res.send(outData);
        });
    });
    app.post("/DCards/storeDCardsTableData", function(req, res){
        console.log("storeDCardsTableData req.body=",req.body);
        var newData=req.body;
        newData.PhoneMob=newData.PhoneMob|| "";  // TODO undefined check
        var outData={};
        database.executeQuery("update r_DCards set InUse='"+newData.InUse+"', ClientName='"+newData.ClientName+"', " +
            "PhoneMob='"+newData.PhoneMob+"' where DCardID='"+newData.DCardID+"'", function(err,result){   console.log("result=",result);
            if(err){
                outData.error=err;
                res.send(outData);
                return;
            }
            outData.updateCount=result.rowsAffected.length;
            var queryText="select ChID, DCardID, InUse, ClientName, PhoneMob " +
                "from r_DCards where DCardID='"+newData.DCardID+"'";
            database.executeQuery(queryText, function(err,result){
                if(err){
                    outData.error=err.message;
                    res.send(outData);
                    return;
                }
                outData.resultItem=result.recordset[0];
                res.send(outData);
            });
        });
    });

    var botMsgTableColumns=[
        {data: "ChID", name: "ChID", width: 100, type: "text",visible:false},
        {data: "DocDate", name: "Дата рассылки", width: 100, type: "text",datetimeFormat:"DD.MM.YYYY"},
        {data: "Msg", name: "Текст сообщения", width: 400, type: "text"},
        {data: "MsgHours", name: "Часы рассылки", width: 100, type: "text"},
        {data: "SendHours", name: "Сообщения отправлены", width: 100, type: "text"},
    ];
    app.get('/botMsg/getDataForTable', function (req, res) {
        var outData = {};
        outData.columns = botMsgTableColumns;

        outData.items = [];
        var queryText="select ChID, DocDate, Msg, MsgHours, SendHours " +
            "from it_BotMessages;";
        database.executeQuery(queryText, function(err,result){
            if(err){
                outData.error=err.message;
                res.send(outData);
                return;
            }
            outData.identifier="ChID";
            outData.items=result.recordset;  console.log("outData=",outData);
            res.send(outData);
        });
    });

    app.get('/botMsg/newDataForBotMsgTable', function (req, res) {
        setDataItemForTable({tableColumns:botMsgTableColumns,
                values:[new Date(),"","13,18","",""]},
            function(result){
                res.send(result);
            });
    });

    app.post("/botMsg/storeBotMsgTableData", function(req, res){
       var dataToInsert={};
        dataToInsert.tableName="it_BotMessages";
        dataToInsert.insData =req.body;
        var outData={};
        if(newData.ChID){
            prepareUpdateTableStatement(newData, function(err, res){

            });
            return;
        }
        dataToInsert.idFieldName="ChID";
        insDataItemWithNewID(dataToInsert, function(err, res){

        });

        // database.executeQuery("update r_DCards set InUse='"+newData.InUse+"', ClientName='"+newData.ClientName+"', " +
        //     "PhoneMob='"+newData.PhoneMob+"' where DCardID='"+newData.DCardID+"'", function(err,result){   console.log("result=",result);
        //     if(err){
        //         outData.error=err;
        //         res.send(outData);
        //         return;
        //     }
        //     outData.updateCount=result.rowsAffected.length;
        //     var queryText="select ChID, DCardID, InUse, ClientName, PhoneMob " +
        //         "from r_DCards where DCardID='"+newData.DCardID+"'";
        //     database.executeQuery(queryText, function(err,result){
        //         if(err){
        //             outData.error=err.message;
        //             res.send(outData);
        //             return;
        //         }
        //         outData.resultItem=result.recordset[0];
        //         res.send(outData);
        //     });
        // });
    });
};

function setDataItemForTable(params, resultCallback){
    var itemData={};
    for(var columnIndex=0; columnIndex<params.tableColumns.length; columnIndex++){
        var fieldName= params.tableColumns[columnIndex].data, value=params.values[columnIndex];
        if (value!=undefined) itemData[fieldName]=value;
    }
    resultCallback({item:itemData});
}

/**
 * params = { tableName, idFieldName,
 *      insData = {<tableFieldName>:<value>,<tableFieldName>:<value>,<tableFieldName>:<value>,...}
 * }
 * resultCallback = function(result = { updateCount, error, resultItem }
 */
function insDataItemWithNewID(params, resultCallback) {
    if (!params) {                                                                                      log.error("FAILED _insDataItemWithNewID! Reason: no parameters!");//test
        resultCallback({ error:"Failed insert data item with new ID! Reason:no function parameters!"});
        return;
    }
    var idFieldName= params.idFieldName;
    if (!idFieldName) {                                                                                 log.error("FAILED _insDataItemWithNewID "+params.tableName+"! Reason: no id field!");//test
        resultCallback({ error:"Failed insert data item with new ID! Reason:no id field name!"});
        return;
    }
    params.insData[idFieldName]=getUIDNumber();
    // this.insDataItem({idFieldName:idFieldName, insData:params.insData}, function(result){
    //     if(result&&result.updateCount>0)result.resultItem=params.insData;
    //     resultCallback(result);
    // });
    insDataItem(params,resultCallback);
}
function getUIDNumber(){
    var str= uid.time();
    var len = str.length;
    var num = BigNumber(0);
    for (var i = (len - 1); i >= 0; i--)
        num.plus(BigNumber(256).pow(i).mult(str.charCodeAt(i)));
    return num.toString();
}
/**
 * params = { tableName,
 *      insData = {<tableFieldName>:<value>,<tableFieldName>:<value>,<tableFieldName>:<value>,...}
 * }
 * <value> instanceof Date converted to sting by format yyyy-mm-dd HH:MM:ss !!!
 * resultCallback = function(result = { updateCount, error }
 */
function insDataItem(params, resultCallback){
    if (!params) {                                                                                      log.error("FAILED _insDataItem! Reason: no parameters!");//test
        resultCallback({ error:"Failed insert data item! Reason:no function parameters!"});
        return;
    }
    if(!params.tableName&&this.source) params.tableName=this.source;
    if (!params.tableName) {                                                                            log.error("FAILED _insDataItem! Reason: no table name!");//test
        resultCallback({ error:"Failed insert data item! Reason:no table name for insert!"});
        return;
    }
    if (!params.insData) {                                                                              log.error("FAILED _insDataItem into "+params.tableName+"! Reason: no data for insert!");//test
        resultCallback({ error:"Failed insert data item! Reason:no data for insert!"});
        return;
    }
    var queryFields="", queryInputParamsObj={}, queryFieldsValues="";
    for(var fieldName in params.insData) {
        if (queryFields!="") queryFields+= ",";
        if (queryFieldsValues!="") queryFieldsValues+= ",";
        queryFields+= fieldName;
        queryFieldsValues+= "@"+fieldName;
        var insDataItemValue=params.insData[fieldName];
        if(insDataItemValue&&(insDataItemValue instanceof Date)) {
            insDataItemValue=moment(insDataItemValue).format("YYYY-MM-DD HH:mm:ss");
        }
        queryInputParamsObj[fieldName]=insDataItemValue;
    }

    var insQuery="insert into "+params.tableName+"("+queryFields+") values("+queryFieldsValues+")";
    database.executeParamsQuery(insQuery,queryInputParamsObj,function(err, updateCount){
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