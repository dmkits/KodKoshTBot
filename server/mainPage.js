var path=require ('path');
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
            menuBar.push({itemname:"menuBarItemDCards",itemtitle:"Dcards",
                action:"open",content:"/getDCards" /*"/reports/reportPage"*/, id:"ReportRetail",title:"Dcards", closable:false});
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
};