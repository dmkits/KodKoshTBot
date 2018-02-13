var database=require('./database');
var path=require('path');

module.exports= function(app) {
    app.get("/getClientsDCards", function (req, res) {
        res.sendFile(path.join(__dirname, '../pages/', 'dCardsTable.html'));
    });
    var dCardsTableColumns=[
        // {data: "ChID", name: "ChID", width: 100, type: "text", visible:false},
        {data: "DCardID", name: "Номер (штрихкод)", width: 120, type: "text", align:"center"},
        {data: "InUse", name: "Активна", width: 70, type: "checkboxMSSQL", align:"center"},
        {data: "ClientName", name: "Полное имя клиента", width: 300, type: "text"},
        {data: "Discount", name: "Скидка, %", width: 70, type: "text", align:"center"},
        {data: "SumBonus", name: "Сумма бонусов", width: 70, type: "numeric"},
        {data: "PhoneMob", name: "Моб. тел.", width: 120, type: "text", align:"center"},
        {data: "Notes", name: "Примечание", width: 300, type: "text"},
        {data: "EDate", name: "Конечная дата", width: 120, type: "text",datetimeFormat:"DD.MM.YYYY", align:"center"},
        //{data: "SumCC", name: "SumCC", width: 100, type: "text"},
        //  {data: "IsCrdCard", name: "IsCrdCard", width: 100, type: "text"},
        //{data: "DCTypeCode", name: "DCTypeCode", width: 100, type: "text"},
        //{data: "BirthDate", name: "BirthDate", width: 100, type: "text",datetimeFormat:"DD.MM.YYYY"},
        //  {data: "FactDistrict", name: "FactDistrict", width: 100, type: "text"},
        // {data: "FactCity", name: "FactCity", width: 100, type: "text"},
        //{data: "PhoneHome", name: "PhoneHome", width: 100, type: "text"},
        //{data: "EMail", name: "EMail", width: 100, type: "text"},
        //{data: "Status", name: "Status", width: 100, type: "text"},
        //  {data: "TChatID", name: "TChatID", width: 100, type: "text"},
    ];

    //ChID	CompID	DCardID	Discount	SumCC	InUse	Notes	Value1	Value2	Value3
    // IsCrdCard	Note1	EDate	ClientName	DCTypeCode	BirthDate	FactRegion	FactDistrict
    // FactCity	FactStreet	FactHouse	FactBlock	FactAptNo	FactPostIndex
    // PhoneMob	PhoneHome	PhoneWork	EMail	SumBonus	Status	TChatID

    app.get('/clientsDCards/getDataForTable', function (req, res) {
        database.getDataForTable({source:"r_DCards",
                tableColumns:dCardsTableColumns, identifier:dCardsTableColumns[0].data, conditions:req.query} ,
            function(result){
                res.send(result);
            });

    });
    app.post("/DCards/storeDCardsTableData", function(req, res){
        database.storeTableDataItem({tableName:"r_DCards",idFieldName:"ChID",tableColumns:dCardsTableColumns,
            storeTableData:req.body}, function(err, res/*updateCount, resultItem*/){

        })
    });
};