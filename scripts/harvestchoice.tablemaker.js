//-------------------------------
// CONFIGURATION
//-------------------------------
var _downloadURL = 'http://dev.harvestchoice.org/tablemaker/downloads/';//location of customized tables created for download 
var _apiURL = 'http://dev.harvestchoice.org/harvestchoiceapi/0.3/api/';//location of the Harvest Choice API (data source)
var _rawDownloadURL = 'http://dev.harvestchoice.org/data_downloads/'; //location of individual indicator raw data zip files
var _mapprURL = 'http://dev.harvestchoice.org/mappr/'; //MAPPR Url
var _URL = 'http://dev.harvestchoice.org/tablemaker/index.html'; //app url
    //LOCAL
    //var _downloadURL = 'http://localhost/appoutput/'; 
    //var _apiURL = 'http://localhost:54038/api/'; 
//-------------------------------
// DECLARATIONS
//-------------------------------
//list of all categories
var _categories = [];
//list of all indicators
var _indicators = [];
//list of all domains
var _domains = [];
//list of all regions (CountryCollections - grouped countries)
var _regions = [];
//list of all countries
var _countries = [];
//list of currently selected indicators
var _selectedIndicators = [];
//row domain id
var _rowDomainId = null;
//sub-row domain id
var _subRowDomainId = 0;
//API parameter & list of in-use domains
var _domainIds = [];
//column domain id & API parameter
var _pivotDomainId = 0;
//API parameter & list of countries according to region selection
var _countryIds = [];
//selected region id
var _regionId = null;
//selected country id
var _countryId = null;
//default setting for decimal separator
var _separator = 'Period';
//store of all domains in ddslick format
var _ddDomains = [];
//store of all regions in ddslick format
var _ddRegions = [];
//store of all countries in ddslick format
var _ddCountry = [];
//current rows menu data in ddslick format
var _ddrowsMenu = [];
//current sub-rows menu data in ddslick format
var _ddsubRowsMenu = [];
//current sub-columns menu data in ddslick format
var _ddsubColumnsMenu = [];
//holds the current domains being displayed by tables
var _tableDomainIds = [];
//holds the current countries being displayed by tables
var _tableCountryIds = [];
//ddslick default text when there is no selection
var _menuText = "No domain split";
//contains query string parameters
var _actionLinkParams = [], hash;
//currnet cateogry expanded
var _categoryIndex = null;
//current region option selection
var _regionOption = null;

//Initialize Tablemaker (called by body on onload method)
function initTablemaker() {       
    callCategories();//call the Harvest Choice API Categories method for category data (indicators grouped into categories and sub-categories)
    callIndicators();//call the Harvest Choice API Indicator method for indicator data (list of ungrouped indicators)
    callDomains();//call the Harvest Choice API Domains method for domain data (list of domains - geographical areas sharing similar characteristics) 
    //createSeparatorMenu(); //create the seperator menu (removed as commas pose problem with the csv)
    callCountryCollections();//call the Harvest Choice API CountryCollecions method for region data       
    callCountries();//call the Harvest Choice API Countries method for country data       
}

//-------------------------------
// UI BUILDERS
//-------------------------------
//(Choose Indicators)creates Category menu
function createCategoryMenu(categories) {   
    $.each(categories, function (i, category) {
        var menuDiv = $('#categoryMenu');
        //   

        var menuImage = '<img src="style/images/' + category.Name + '.png">'
        var menuText = '<span>' + this.Name.toString().toUpperCase() + '</span>'
        var menu = '<table onclick="createSubCategoryMenu(this);"><tr><td class="categoryMenuImg">' + menuImage + '</td><td class="categoryMenuTxt">' + menuText + '</td><td><span class="menuPointer dd-pointer-down"></span></td></tr></table>';
        var subMenu = '<div class="subCategoryMenu"></div>';
        var categoryMenu = '<div id="' + category.Name.replace(/ /g, '') + '" class="categoryMenu">'
            + menu + subMenu
            + '</div>';

        menuDiv.append(categoryMenu);
        //$('.categoryMenu table').click(createSubCategoryMenu);
    });
}
//(Choose Indicators)creates the sub-category menu based on users Category menu selection
function createSubCategoryMenu(categoryChoice) {

    //get the name of the category selected
    var id = $(categoryChoice).parent().attr("id");

    //get the category and subcategory divs
    var categoryDiv = $(categoryChoice).parent();
    var subCategoryDiv = $('div.subCategoryMenu:first', categoryDiv[0]);
    
    //toggle the down arrow/up arrow
    var div = $("span.menuPointer:first", categoryChoice);
    $(div[0]).toggleClass('dd-pointer-down dd-pointer-up');

    //loop through the categories to find the selection
    $.each(_categories, function (catIdx, category) {
        if (category.Name.toUpperCase().replace(/ /g, '')
            == id.toUpperCase())
        {
            //if the current category menu has a sub category menu then just clear it
            if (subCategoryDiv[0].innerHTML != "")
            {
                $('.subCategoryMenu').html(''); //empty all sub category menu divs
            }
            //if current category menu is empty fill it
            else
            {
                _categoryIndex = catIdx;
                
                //loop through all the menus and if a menu has a sub cateogry menu
                //toggle the menu arrow and clear the sub menu
                $('.subCategoryMenu').each(function (i, x) {
                    if (x.innerHTML != "") {                  
                        var d = $("span.menuPointer:first", $(x).parent());
                        $(d[0]).toggleClass('dd-pointer-down dd-pointer-up');
                        $(x).html('');
                    }
                });

                //hide the intro if visiable
                toggleIntro('hide');


                //foreach subcategory add to subcategorymenu div
                $.each(this.Subcategories, function (subidx, subCategory) {
                    var html = '<div class="subCategoryItem"><span>' + this.Name +
                        '<div class="collapsed"></div></span></div><div id=subCatMenu' + catIdx + subidx + ' class="aggregateMenu"></div>';
                    subCategoryDiv.append(html);
                });

                //add onclick event to each menu item
                $(".subCategoryItem span").click(createAggregateMenu);

            }
            return false; //break out of the loop
        }
    });
}
//(Choose Indicators)creates the indicator menu options based on the Sub-Category menu selection
function createAggregateMenu(subCategoryChoice)
{
    var div = $(this).children();
    $(div[0]).toggleClass('collapsed expanded');
 
    //loop through the subcategories to find the selected item
    $.each(_categories[_categoryIndex].Subcategories, function (subidx, subcategory) {                
        if (this.Name == subCategoryChoice.currentTarget.textContent)
        {
            //if the sub-category menu div is empty fill it with indicator choices
            var menu = $('#subCatMenu' + _categoryIndex + subidx);
            if (menu.is(':empty')) {

                //$('.aggregateMenu').html("");

                //loop through all the menus and if a menu has a sub cateogry menu
                //toggle the menu arrow and clear the sub menu
                $('.subCategoryItem').each(function (i, x) {
                    var aggMenu = $(x).next('.aggregateMenu');
                    if (aggMenu[0].innerHTML != "") {
                        var div = $(x).children().children();
                        $(div[0]).toggleClass('collapsed expanded');
                        $(aggMenu[0]).html('');
                    }
                });

                var itemCount = 0;
                //loop through all the aggregates and add to the aggregateMenu div
                $.each(this.Aggregates, function (aggidx, aggregate) {
                        
                    if (aggregate.Name != null && aggregate.IsDomain == false) {
                        menu.append('<div class="aggregateTitle">' + toTitleCase(this.Name) + ':</div>');
                    }
                    //loop through all the indicators and add them too
                    $.each(aggregate.Indicators, function (indidx, indicator) {
                        if (indicator.IsDomain == false) {
                            menu.append('<label class="aggregateItem"><input type="checkbox" onchange="indicatorSelection(this)" value="' + indicator.MicroLabel + '" id="' + indicator.Id + '"/>'
                                + indicator.MicroLabel + '<div id=info' + indicator.Id + ' class="aggregateInfo" onmouseover="showIndicatorInfo(this);"></div></label>');
                        }
                    });

                    setSelectedIndicators();

                    // return false;
                });
            }
            else//otherwise delete all aggregate menus
                $('.aggregateMenu').html("");
        }
    });

}
//(Customize Table)creates/updates the row drop-down menu
function createRowMenu() {
    //this function implements a ddSlick dropdown plugin
    //The follwoing is the format for the ddData - not using all functionality for HC
    //var ddData = [
    //    {
    //        text: "Facebook",
    //        value: 1,
    //        selected: false,
    //        description: "Description with Facebook",
    //        imageSrc: "http://dl.dropbox.com/u/40036711/Images/facebook-icon-32.png"
    //    }
    //];   

    //create the ddslick dropdown object 
    $('#rowsMenu').ddslick({
        id: "rowsMenuSelect",
        data: _ddrowsMenu,
        width: "215px",
        selectText: _menuText, //this is what is displayed before a selection is made
        //defaultSelectedIndex: 9,//setting the menu to iso3
        onSelected: function (data) {
            //do somthing when you select an menu item            
            domainMenuSelection(data);
        }
    });
}
//(Customize Table)creates/updates the sub-row drop-down menu
function createSubRowMenu() {
    //this function implements a ddSlick dropdown plugin
    //The follwoing is the format for the ddData - not using all functionality for HC
    //var ddData = [
    //    {
    //        text: "Facebook",
    //        value: 1,
    //        selected: false,
    //        description: "Description with Facebook",
    //        imageSrc: "http://dl.dropbox.com/u/40036711/Images/facebook-icon-32.png"
    //    }
    //];

    //create the ddslick dropdown object 
    $('#subRowsMenu').ddslick({
        data: _ddsubRowsMenu,
        width: "215px",
        selectText: _menuText, //this is what is displayed before a selection is made
        onSelected: function (data) {
            //do somthing when you select an menu item
            domainMenuSelection(data);
        }
    });
}
//(Customize Table)creates/updates the columns menus 
function createColumnMenu() {
    //this function implements a ddSlick dropdown plugin
    //The follwoing is the format for the ddData - not using all functionality for HC
    //var ddData = [
    //    {
    //        text: "Facebook",
    //        value: 1,
    //        selected: false,
    //        description: "Description with Facebook",
    //        imageSrc: "http://dl.dropbox.com/u/40036711/Images/facebook-icon-32.png"
    //    }
    //];
   
    //create the ddslick dropdown object 
    $('#subColumnsMenu').ddslick({
        data: _ddsubColumnsMenu,
        width: "215px",
        selectText: _menuText, //this is what is displayed before a selection is made
        onSelected: function (data) {
            //do somthing when you select an menu item
            domainMenuSelection(data);
        }
    });
}
//(Customize Table)creates the column filter
function createColumnFilter(columns) {
    var columnFilter = $('#columnFilter .mCSB_container');
    columnFilter.html('');//clear the menu
    var numCols = columns.length;

    //adjust the height of the div for UX
    var height = numCols * 25;
    if (height > 200)
        height = 200;
    if (height < 80)
        height = 80;

    $('#columnFilter').css('height', height);

    $('#columnFilterTitle').show();

    $.each(columns, function (idx, column) {
        $('<input />', { type: 'checkbox', checked: 'true', id: 'cb' + idx, value: idx, onchange: 'columnFilterSelected(this);' }).appendTo(columnFilter);
        if (columns.length == idx + 1 && (_pivotDomainId == 0 || _pivotDomainId == null))
            $('<label />', { 'for': 'cb' + idx, text: 'Indicator' }).appendTo(columnFilter);
        else
            $('<label />', { 'for': 'cb' + idx, text: column.sTitle }).appendTo(columnFilter);
        $('<br />').appendTo(columnFilter);
    });
    $("#columnFilter").mCustomScrollbar("update");
}
//(Customize Table)creates the table option menu
function createSeparatorMenu() {
    //this function implements a ddSlick dropdown plugin
    //The follwoing is the format for the ddData - not using all functionality for HC
    //var ddData = [
    //    {
    //        text: "Facebook",
    //        value: 1,
    //        selected: false,
    //        description: "Description with Facebook",
    //        imageSrc: "http://dl.dropbox.com/u/40036711/Images/facebook-icon-32.png"
    //    }
    //];

    var ddData = [
        {
            text: "Period",
            value: 0,
            selected: true
        },
        {
            text: "Comma",
            value: 1,
            selected: false
        }
    ];
    
    //create the ddslick dropdown object 
    $('#separatorMenu').ddslick({
        data: ddData,
        width: "215px",
        onSelected: function (data) {
            //do somthing when you select an menu item
            separatorMenuSelected(data);
        }
    });
}
//(Customize Table)creates the region menu 
function createRegionMenu() {
    //this function implements a ddSlick dropdown plugin
    //The follwoing is the format for the ddData - not using all functionality for HC
    //var ddData = [
    //    {
    //        text: "Facebook",
    //        value: 1,
    //        selected: false,
    //        description: "Description with Facebook",
    //        imageSrc: "http://dl.dropbox.com/u/40036711/Images/facebook-icon-32.png"
    //    }
    //];

    //create the ddslick dropdown object 
    $('#regionMenu').ddslick({
        data: _ddRegions,
        width: "205px",
        imagePosition: "left",
        selectText: "Choose a region", //this is what is displayed before a selection is made
        onSelected: function (data) {
            //do somthing when you select an menu item
            regionMenuSelection(data);
        }
    });
}
//(Customize Table)creates the country menu 
function createCountryMenu() {
    var menu = $('#countryMenu');
    menu.html('');
    //var menu = $('#countryMenu .mCSB_container');
    //var itemCount = 0;
    //
    $.each(_countries, function (i, country) {
        //loop through all the indicators and add them too       
        menu.append('<label class="country"><input type="radio" name="country" onchange="countryMenuSelection(this)" value="' + country.Name + '" id="' + country.ISO + '"/>'
                + country.Label + '</label><br/>');
    });

    $("#countryMenu").mCustomScrollbar({
        scrollButtons: {
            enable: true
        }
    });
    //$("#countryMenu").mCustomScrollbar("update");
    return false;
}
//Download table options
function createDownloadOptions() {
    var height = 220;
    var heightAdjust = 20;
    var checkboxIds = [];

    if (_selectedIndicators.length > 0) {
        var html = '<h3>Export Tables</h3><p>Bacon ipsum dolor sit amet short ribs cow shank, tail tongue venison filet mignon. Doner pancetta turducken filet mignon boudin andouille ribeye sausage fatback corned beef beef ribs pig.</p>';
        //create checkboxes for each table
        $.each(_selectedIndicators, function (idx, indicator) {
            var checkboxId = 'opt' + indicator.Id;
            var input = '<label><input id="' + checkboxId + '" class="downloadOption" type="checkbox" value="' + indicator.Id + '" />' + indicator.MicroLabel + '</label><br/>'
            html += input;
            height += heightAdjust;
            checkboxIds.push(checkboxId);
        });

        var metadataOption = '<label><input id="optMetadata" class="downloadOption metadata" type="checkbox" value="metadata" />Include Metadata</label><br/>'
        html += metadataOption;
        checkboxIds.push('optMetadata');

        var downloadButton = '<a href="#" class="button right" onclick="downloadTables();">Download Tables</a>';
        html += downloadButton;

    }
    else
        var html = '<h3>Export Tables</h3><p>Please select at least one table.</p>';

    html = '<div id="downloadOptions"><div id="blockUIClose" onClick="$.unblockUI();" class="closeOptions"></div>' + html + '</div>';
    
    $.blockUI({
        message: html,
        css: {
            width: '516px', height: height + 'px',
            padding: '25px',
            backgroundColor: 'white',
            top: '20%',
            textAlign: 'left',
            border: '1px solid #ebebeb',
            //borderRadius: '5px',
            //mozBorderRadius: '5px',
            position: 'absolute'
        }

    });

    $.each(checkboxIds, function (i, id) {
        $('#' + id).prop('checked', true);
    });
}
//-------------------------------
// UI METHODS
//-------------------------------
//(Choose Indicators)called when users clicks on an indicator checkbox
function indicatorSelection(indicatorClicked) {
    if (indicatorClicked.checked) {
        addIndicator(indicatorClicked.id);
    }
    else {
        removeIndicator(indicatorClicked.id);
    }
}
//(Choose Indicators)called when user clicks on delete icon next to a selected indicator
function deleteIndicator(indicatorClicked) {
    removeIndicator(indicatorClicked.id.replace('indIcon_', ''));
}
//(Choose Indicators)called when user hovers over a info icon in the indicator menu
function showIndicatorInfo(aggregateInfoDiv) {
 
        
        var indicator = $.grep(_indicators, function (e) { return e.Id == aggregateInfoDiv.id.replace('info', '') });
        //console.log(indicator[0].MicroLabel);
        
        var year = "Data not available";
        var aggFormula = "n/a";

        if (typeof indicator[0].Year != 'undefined' && indicator[0].Year != null) year = indicator[0].Year;
        if (typeof indicator[0].AggFormula != 'undefined' && indicator[0].AggFormula != null) aggFormula = indicator[0].AggFormula;
        if (typeof indicator[0].EndYear != 'undefined' && indicator[0].EndYear != null && year != "Data not available") year += '-'+ indicator[0].EndYear;

        $('#aggregateInfoPanel').html('');
       // var html = '<span class="ui-icon ui-icon-close infoClose" onmouseover="$(\'#aggregateInfoPanel\').hide();"></span>';
        var html = '<b>Name:</b> ' + indicator[0].MicroLabel + '<br />';
        html += '<b>Description:</b> ' + indicator[0].ShortLabel + '<br />';
        html += '<b>Unit:</b> ' + indicator[0].Unit + '<br />';
        html += '<b>Year:</b> ' + year + '<br />';
        html += '<b>Aggregation formula:</b> ' + aggFormula + '<br />';
        html += '<b>Source:</b> ' + indicator[0].Source + '<br />';
        html += '<b class="notch"></b>';
        $('#aggregateInfoPanel').append(html);

        //calculate postion
        var offset = $(aggregateInfoDiv).offset();
        var top = offset.top;
        var height = $('#aggregateInfoPanel').height() / 2;        
        top = top - height;
        var left = offset.left + 33;

        $('.aggregateInfoPanel').css('top', top);
        $('.aggregateInfoPanel').css('left', left);
        $('.notch').css('top', height - 4);
        $('#aggregateInfoPanel').show();
        $(aggregateInfoDiv).mouseout(function () { $('#aggregateInfoPanel').hide(); });
               
}
//(Choose Indicators)called when user clicks raw data download link
function rawDataDownload() {
    //get the downloads div (holds all the download links for each table)
    var downloads = $('#downloads');
    //clear the downloads div of previous downloads
    downloads.html('');
    //add the trigger link for downloads (multiDownload plugin)
    downloads.append('<a href="#" id="trigger"></a>');
    //using the multiDownload plugin method to remove all download links
    $.fn.multiDownloadRemove();
    //create random unqiue number for filename prefix
    var filenamePrefix = randomString(12, true);
    
    //callDataDownloadCreateCSVRaw(filenamePrefix, _selectedIndicators);
    $.each(_selectedIndicators, function (i, indicator) {
        //add zip file as a link
        var zippath = _rawDownloadURL + indicator.ColumnName + ".zip";
        var ziplink = $('<a/>').attr('href', zippath).attr('id', 'zip');
        $('#downloads').append(ziplink);
        ziplink.multiDownloadAdd();
    });
     
    //trigger the file download
    var trigger = $('#trigger');
    trigger.multiDownload('click');
    trigger.click();
    
}
//(Choose Indicators)called when user clicks view indicators in MAPPR link
function linkToMappr() {
    var params = null;

    $.each(_selectedIndicators, function (idx, indicator) {
        if (params == null)
            params = '?columnName=' + indicator.ColumnName;
        else
            params += '&columnName=' + indicator.ColumnName;
    });

    window.open(_mapprURL + params);
    return false;
}
//(Choose Indicators)called when users clicks on Share your table link
function shareLink() {
    var height = 220;

   var html = '<h3>Share Your Table</h3><p>To share your table, copy and paste the following url into an email or post on your favorite social network.</p>';
   
   html += '<textarea class="sharelink">' + _URL + getShareLinkParameters() + '</textarea>';



   html = '<div id="shareContent"><div id="blockUIClose" onClick="$.unblockUI();" class="closeOptions"></div>' + html + '</div>';

    $.blockUI({
        message: html,
        css: {
            width: '516px', height: height + 'px',
            padding: '25px',
            backgroundColor: 'white',
            top: '20%',
            textAlign: 'left',
            border: '1px solid #ebebeb',
            //borderRadius: '5px',
            //mozBorderRadius: '5px',
            position: 'absolute'
        }

    });

}
//(Customize Table)called when the user selects an option from the Decimal Separator menu
function separatorMenuSelected(separatorChoice) {
    //set the global variable 
    _separator = separatorChoice.selectedData.text;
    //using the datatables plug-in to get all the datatables 
    var tables = $.fn.dataTable.fnTables(false);
    //if we found some then loop through them
    if (tables.length > 0) {
        $.each(tables, function (i, t) {
            //inti datatable on the current table
            var table = $(t).dataTable();
            //use the plug-in's getData function to get the data
            var data = table.fnGetData();
            //call our custom function to swap out commas or decimals according the the users selection
            var formatedData = tableDataNumericCharReplacer(data, separatorChoice.selectedData.text);
           //use the plug-in function to clear the table
            table.fnClearTable();
            //use the plug-in function to add the formatted data back to the table
            table.fnAddData(formatedData);
        });
    }
}
//(Customize Table)called when the users selects a column filter
function columnFilterSelected(columnChoice) {
    $.each(_selectedIndicators, function (idx, indicator) {
        var table = $('#table' + indicator.Id).dataTable();
        var bVis = table.fnSettings().aoColumns[columnChoice.value].bVisible;
        table.fnSetColumnVis(columnChoice.value, bVis ? false : true);       
    });
}
//(Customize Table)called when the users selects an option from any row/column menu
function domainMenuSelection(menuChoice)
{   
    var menu = menuChoice.original.context.attributes[0].value;
    var selectText = menuChoice.selectedData.text;
    var selectValue = menuChoice.selectedData.value;

    //if selected item is the same as the set domain id dont do anything no change the
    //action is from setting the menu to the selection after creation
    if (getMenuDomainId(menu) != selectValue) {    
        //console.log(menu + " requesting domain: " + selectText);
        setClearMenuOptions(); //turn on/off clear menu options
        setDomainIds();
        updateTableMenus();
        updateTables();
    }    
}
//(Customize Table)called when the users selects an option from the region menu
function regionMenuSelection(menuChoice) {
    var menuId = menuChoice.original.context.attributes[0].value;
    var regionLabel = menuChoice.selectedData.text;
    var selectedIdx = menuChoice.selectedData.value;

    //get the region from the global list of regions
    var regions = $.grep(_regions, function (e) { return e.Label == regionLabel; });
    
    setClearMenuOptions();

    //if the user has a selection for country, clear it
    if (_countryId != null) {
        $('#countryClear').hide();
        $('#countryMenu input[name="country"]').prop('checked', false);
        _countryIds = [];
        _countryId = null;
    }

    //change the region radio to optGeographic
    $("#optGeographic").prop("checked", true);

    //assign ISOs to global parameter
    _countryIds = regions[0].ISOs;
    _regionId = regions[0].Name;

    updateTables();
}
//(Customize Table)called when the users selects an option from the country menu
function countryMenuSelection(menuChoice) {  

    //get the country from the global list of countries
    var country = $.grep(_countries, function (e) { return e.Name == menuChoice.value; });

    setClearMenuOptions();

    //if the user has a selection for region, clear it
    if (_regionId != null)
    {
        $('#regionClear').hide();
        $('#regionMenu').ddslick('destroy');
        _countryIds = [];
        _regionId = null;
        createRegionMenu();
    }

    //change the region radio to optCountry
    $("#optCountry").prop("checked", true);

    //assign ISOs to global parameter
    _countryIds = [];
    _countryIds.push(country[0].ISO);
    _countryId = country[0].ISO;

    updateTables();
}
//(Customize Table)called when the users selects an option from the region options menu
function regionOptionsSelection(optionChoice) {
 
    switch (optionChoice.id) {
        case "optCountry":
            clearMenu("regionMenu");
            $("#optCountry").prop("checked", true);
            break;
        case "optGeographic":
            clearMenu("countryMenu");
            $("#optGeographic").prop("checked", true);
            break;
    }
}
//(Table) called when the the user clicks the download button
function downloadButtonClicked() {   
    createDownloadOptions();
}
//(Customize Table)called when the users selects clear option for a menu
function clearMenu(menu) {
    switch (menu) {
        case "subRowsMenu":            
            $('#subRowsClear').hide();
            $('#subRowsMenu').ddslick('destroy');
            createSubRowMenu();
            setDomainIds();
            updateTableMenus(menu);
            updateTables();
            break;
        case "subColumnsMenu":
            $('#subColumnsClear').hide();
            $('#subColumnsMenu').ddslick('destroy');
            createColumnMenu();
            setDomainIds();
            updateTableMenus(menu);
            updateTables();
            break;
        case "regionMenu":
            $('#regionClear').hide();
            $('#regionMenu').ddslick('destroy');
            _countryIds = [];
            _regionId = null;
            createRegionMenu();            
            updateTables();
            $('input[name="regionOptions"]').prop('checked', false);
            break;
        case "countryMenu":
            $('#countryClear').hide();
            $('#countryMenu input[name="country"]').prop('checked', false);
            $('input[name="regionOptions"]').prop('checked', false);
            _countryIds = [];
            _countryId = null;
            updateTables();
            break;
        default:
            break;
    }
}
//-------------------------------
// API METHODS
//-------------------------------
//calls the Categories method of the HarvestChoice API
function callCategories() {
    var cats = [];
    //call to the HarvestChoiceWebApi to get all the categories
    $.ajax({
        url: _apiURL + 'categories?returnDoamins=false',
        type: 'GET',
        dataType: 'jsonp',
        success: function (categories) {
            $.each(categories, function () {
                var obj = {
                    Name: this.Name,
                    Subcategories: this.Subcategories
                };

                cats.push(obj);

            });

            //send the categories object to make the ddSlick dropdown menu
            createCategoryMenu(cats);
            window._categories = cats;

            //was there any query string parameters?
            if (isActionLink()) {
                getActionLinkParameters();
                validateActionLinkParameters();
            }

            return cats;
        },
        error: function (message) {
            alert(message.status);
            return false;
        }
    });      
}
//calls the Indicators method of the HarvestChoice API
function callIndicators() {
    var ind = [];
    //call to the HarvestChoiceWebApi to get all the categories
    $.ajax({
        url: _apiURL + 'indicators',
        type: 'GET',
        dataType: 'jsonp',
        success: function (indicators) {

            $.each(indicators, function () {
                var obj = {
                    Id: this.Id,
                    ColumnName: this.ColumnName,
                    MicroLabel: this.MicroLabel,
                    ShortLabel: this.ShortLabel,
                    FullLabel: this.FullLabel,
                    Unit: this.Unit,
                    Year: this.Year,
                    EndYear: this.EndYear,
                    DecimalPlaces: this.DecimalPlaces,
                    ClassificationType: this.ClassificationType,
                    AggType: this.AggType,
                    AggFormula: this.AggFormula,
                    LongDescription: this.LongDescription,
                    Source: this.Source,
                    DataWorker: this.DataWorker
                };
                ind.push(obj);

            });
         
            window._indicators = ind;
            return ind;
        },
        error: function (message) {
            return false;
        }
    });
}
//calls the Domains method of the HarvestChoice API
function callDomains() {
    var doms = [];
    //call to the HarvestChoiceWebApi to get all the categories
    $.ajax({
        url: _apiURL + 'domains',
        type: 'GET',
        dataType: 'jsonp',
        success: function (domains) {
           
            $.each(domains, function () {

                //count the number of domain areas
                var numDomainAreas = 0;
                $.each(this.DomainAreas, function () {
                    numDomainAreas++;
                });
                //only collect domains with 1 domain area
                if (numDomainAreas == 1) {
                    var obj = {
                        Id: this.Id,
                        Description: this.Description,
                        Name: this.Name,
                        DomainAreas: this.DomainAreas
                    };
                    doms.push(obj);

                    //take the domains and format for ddslick dropdowns
                    var obj2 = {
                        text: this.Name,
                        value: this.Id
                    };
                    _ddDomains.push(obj2);
                }
            });

            //send the domains object to make the ddSlick dropdown menus for rows
            window._domains = doms;

            //order menu data alphabetically
            _ddDomains.sort(function (a, b) {
                // if they are equal, return 0 (no sorting)
                if (a.text == b.text) { return 0; }
                if (a.text > b.text) {
                    // if a should come after b, return 1
                    return 1;
                }
                else {
                    // if b should come after a, return -1
                    return -1;
                }
            });

            //initialize the row & column menus
            _ddrowsMenu = _ddDomains;
            _ddsubRowsMenu = _ddDomains;
            _ddsubColumnsMenu = _ddDomains;
                      
            //create row and columm menus
            createRowMenu();
            createSubRowMenu();
            createColumnMenu();
            
            //locate the countries menu option and select it for the rows menu  
            $.each(_ddrowsMenu, function (index, obj) {
                $.each(obj, function (attr, value) {
                    if (value == 'Agro-Ecological Zones (5 Class)')
                        $('#subRowsMenu').ddslick('select', { index: index });//by default have the iso3 selected for rows
                    if (value == 'Countries') //minus one for the aez5
                        $('#rowsMenu').ddslick('select', { index: index -1 });//by default have the iso3 selected for rows
                   
                });
            });
            
            return doms;
        },
        error: function (message) {
            return false;
        }
    });
}
//calls the CountryCollections method of the HarvestChoice API
function callCountryCollections() {
    var reg = [];
    //call to the HarvestChoiceWebApi to get all the regions
    $.ajax({
        url: _apiURL + 'countrycollections',
        type: 'GET',
        dataType: 'jsonp',
        success: function (regions) {

            $.each(regions, function (idx, region) {
                var obj = {
                    Name: region.name,
                    Label: region.label,
                    Code: region.code,
                    Group: region.group,
                    ISOs: region.ISOs
                };
                reg.push(obj);

                //take the regions and format for ddslick dropdowns
                var obj2 = {
                    text: region.label,
                    value: idx,
                    selected: false,
                    description: region.group
                };
                _ddRegions.push(obj2);
            });

            window._regions = reg;

           
            //sort the data by desciption (group)
            try {
                _ddRegions.sort(function (obj1, obj2) {
                    var group1 = obj1.text.toLowerCase();
                    var group2 = obj2.text.toLowerCase();
                    return ((group1 < group2) ? -1 : ((group1 > group2) ? 1 : 0));
                });
            }
            catch (e) {
                //didn't sort
            }

            //send the region object to make the ddSlick dropdown menu
            createRegionMenu();
            
            return reg;
        },
        error: function (message) {
            return false;
        }
    });
}
//calls the Countries method of the HarvestChoice API
function callCountries() {
    var cntry = [];
    //call to the HarvestChoiceWebApi to get all the regions
    $.ajax({
        url: _apiURL + 'countries',
        type: 'GET',
        dataType: 'jsonp',
        success: function (countries) {

            $.each(countries, function (idx, country) {
                var obj = {
                    Name: country.name,
                    Label: country.label,
                    ISO: country.id
                };
                cntry.push(obj);
                
                //take the countries and format for ddslick dropdowns
                var obj2 = {
                    text: country.label,
                    value: idx,
                    selected: false
                };
                _ddCountry.push(obj2);
            });

            window._countries = cntry;


            //sort the data by name 
            try {
                _ddCountry.sort(function (obj1, obj2) {
                    var group1 = obj1.text.toLowerCase();
                    var group2 = obj2.text.toLowerCase();
                    return ((group1 < group2) ? -1 : ((group1 > group2) ? 1 : 0));
                });
            }
            catch (e) {
                //didn't sort
            }

            //send the region object to make the ddSlick dropdown menu
            createCountryMenu();

            return cntry;
        },
        error: function (message) {
            return false;
        }
    });
}
//calls the CellValues method of the HarvestChoice API
function callCellValues(indicator, tableExists) {
    var aoColumnDefs = [];
    var aoColumns = [];//
    //var tabTemplate = "<li><a href='#{href}'>#{label}</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>";

    //get the tab container
    var tableTabs = $("#tableTabs").tabs();
    tableTabs.show();

    //loading animation
    var loading = '<div class="loading"><img src="style/images/spinner.gif" alt="loading" /><div>';

    //inner div of table's tab
    var tabDiv;

    //does the table currently exist 
    if (tableExists)
    {
        tabDiv = $("#tableTab" + indicator.Id).html(loading);
    }
    else {//make the tab
        //assign loading animation to table tab
        tabDiv = "<div id=tableTab" + indicator.Id + ">" + loading + "</div>";
        var tabs = $("#tableTabs");
        var tabId = '#tableTab' + indicator.Id;
        tabs.tabs('add', tabId, indicator.MicroLabel);
        $(tabId).append(tabDiv);
    }    

    //make the created table active
    tableTabs.tabs("option", "active", -1);

    //set the row domain to iso3 if it is null
    if (_domainIds.length == 0)
    { _domainIds.push(33); }
  
    //create API parameter
    var apiData = {};
    apiData.indicatorIds = [indicator.Id]; //add indicators
    apiData.domainIds = _domainIds; //add domains
    if (_pivotDomainId != null) apiData.pivotDomainId = _pivotDomainId;
    if (_countryIds.length != 0) apiData.countryIds = _countryIds;

    $.ajax({
        url: _apiURL + 'CellValues',
        type: 'GET',
        data: apiData,
        dataType: 'jsonp',
        success: function (result) {
            var spliceCount = 0;
            var mDataIndexes = []; //datatable plugin variable

            //loop through the column list
            $.each(result.ColumnList, function (i, col) {
                //if it is a sort column get rid of it we don't use them in Tablr
                if (col.ColumnName.toLowerCase().indexOf("sortorder_") >= 0) {
                    var columnIndex = this.ColumnIndex;
                    //remove the column from the value list as well
                    $.each(result.ValueList, function () {
                        this.splice(columnIndex - spliceCount, 1);
                    });
                    spliceCount++;
                }
                //if it is NOT a sort column process it
                else {
                    //get the index of the column we are about to process
                    var columnIndex = this.ColumnIndex - spliceCount;


                    //No sub-columns/Not pivoted
                    if (_pivotDomainId == null)
                    {
                        //Indicator column
                        //if the column name & indicator name match use the microlabel its prettier
                        if (this.ColumnName == indicator.ColumnName) {
                            var type = this.ColumnDataType;
                            //if the data type is numeric format it to use a , for thousands seperator
                            if (this.ColumnDataType === "int" || this.ColumnDataType === "float"
                                || this.ColumnDataType === "real" || this.ColumnDataType === "bigint") {
                                aoColumnDefs.push({
                                    sTitle: indicator.FullLabel,
                                    "aTargets": [columnIndex],
                                    "sClass": 'numericTableData',
                                    "bUseRendered": false,
                                    "fnRender": function (o) {
                                        var formattedNumber;
                                        var number = parseFloat(o.aData[columnIndex]);
                                        var numberAsString = number.toFixed(2).toString();
                                        var numberParts = numberAsString.split('.');
                                        if (numberParts.length > 0) {
                                            if (numberParts[0]!='NaN')
                                            { formattedNumber = o.oSettings.fnFormatNumber(parseInt(numberParts[0])).toString(); }
                                            else {
                                                formattedNumber = '0';
                                            }
                                            
                                            if (numberParts[1]) {
                                                if (numberParts[1].length == 1)
                                                    formattedNumber += '.' + numberParts[1] + '0';
                                                else
                                                    formattedNumber += '.' + numberParts[1];
                                            }
                                            else {
                                                if (type === "System.Double")
                                                    formattedNumber += '.00';
                                            }
                                        }
                                        else
                                            formattedNumber = number.toString();

                                        return formattedNumber;
                                    }
                                });
                            }
                            else
                                aoColumnDefs.push({ sTitle: indicator.FullLabel, "aTargets": [columnIndex] });

                            aoColumns.push({ sTitle: indicator.FullLabel });
                        }
                            //domain row column
                        else {
                            var items = $.grep(_domains, function (e) { return e.Id == _domainIds[columnIndex] });
                            switch (columnIndex) {
                                case 0://first domain
                                    if (_domainIds[columnIndex] == 33) {//if ISO3 use the desc instead
                                        aoColumnDefs.push({ sTitle: items[0].Description, sClass: 'tableRow', "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: items[0].Description, sClass: 'tableRow' });
                                    }
                                    else {
                                        aoColumnDefs.push({ sTitle: items[0].Name, sClass: 'tableRow', "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: items[0].Name, sClass: 'tableRow' });
                                    }
                                    break;
                                case 1://second domain
                                    if (_domainIds[columnIndex] == 33) {//if ISO3 use the desc instead
                                        aoColumnDefs.push({ sTitle: items[0].Description, sClass: 'tableSubRow', "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: items[0].Description, sClass: 'tableSubRow' });
                                    }
                                    else {
                                        aoColumnDefs.push({ sTitle: items[0].Name, sClass: 'tableSubRow', "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: items[0].Name, sClass: 'tableSubRow' });
                                    }
                                    break;
                            }
                        }
                    }
                    else //pivoted on a domain (has sub columns)
                    {
                        //only one domain
                        if (_domainIds.length == 1)
                        {
                            //domain row column
                            if (columnIndex == 0) {//first column
                                var items = $.grep(_domains, function (e) { return e.Id == _domainIds[columnIndex] });
                                if (_domainIds[columnIndex] == 33) {//if ISO3 use the desc instead
                                    aoColumnDefs.push({ sTitle: items[0].Description, sClass: 'tableRow', "aTargets": [columnIndex] });
                                    aoColumns.push({ sTitle: items[0].Description, sClass: 'tableRow' });
                                }
                                else {
                                    aoColumnDefs.push({ sTitle: items[0].Name, sClass: 'tableRow', "aTargets": [columnIndex] });
                                    aoColumns.push({ sTitle: items[0].Name, sClass: 'tableRow' });
                                }
                            }
                            //pivoted domain columns
                            else {
                                //if pivot domain is ISO we want to use the ISO name not the code for readability
                                if (_pivotDomainId == 33) {
                                    //get the country from the global regions list if the value is the same as a ISO code
                                    var colname = this.ColumnName;
                                    var country = $.grep(_countries, function (c) { return c.Name == colname; });

                                    //if country is not empty then a match was found
                                    //and we'll switch with the name of the country instead of the iso code
                                    if (country.length > 0) {
                                        aoColumnDefs.push({ sTitle: country[0].Label, "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: country[0].Label });
                                    }
                                    else {
                                        aoColumnDefs.push({ sTitle: this.ColumnName, "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: this.ColumnName });
                                    }
                                }
                                else {
                                    var type = this.ColumnDataType;
                                    //if the data type is numeric format it to use a , for thousands seperator
                                    if (this.ColumnDataType === "System.Double" || this.ColumnDataType === "System.Int32") 
                                        aoColumnDefs.push({
                                            "sTitle": this.ColumnName,
                                            "aTargets": [columnIndex],                                             
                                            "sClass": 'numericTableData',
                                            "bUseRendered": false,
                                            "fnRender": function (o) {
                                                var formattedNumber;
                                                var number = parseFloat(o.aData[columnIndex]);
                                                var numberAsString = number.toFixed(2).toString();
                                                var numberParts = numberAsString.split('.');
                                                if (numberParts.length > 0) {
                                                    if (numberParts[0] != 'NaN')
                                                    { formattedNumber = o.oSettings.fnFormatNumber(parseInt(numberParts[0])).toString(); }
                                                    else {
                                                        formattedNumber = '0';
                                                    }

                                                    if (numberParts[1]) {
                                                        if (numberParts[1].length == 1)
                                                            formattedNumber += '.' + numberParts[1] + '0';
                                                        else
                                                            formattedNumber += '.' + numberParts[1];
                                                    }
                                                    else {
                                                        if (type === "System.Double")
                                                            formattedNumber += '.00';
                                                    }
                                                }
                                                else
                                                    formattedNumber = number.toString();

                                                return formattedNumber;
                                            }
                                        });
                                    else //not a numeric column
                                        aoColumnDefs.push({ sTitle: this.ColumnName, "aTargets": [columnIndex] });

                                    aoColumns.push({ sTitle: this.ColumnName });
                                }
                            }
                        }
                        //two domains (rows and sub-rows) and pivoted on a domain
                        else
                        {
                            switch (columnIndex)
                            {
                                //row column
                                case 0:
                                    var items = $.grep(_domains, function (e) { return e.Id == _domainIds[columnIndex] });
                                    if (_domainIds[columnIndex] == 33) {//if ISO3 use the desc instead
                                        aoColumnDefs.push({ sTitle: items[0].Description, sClass: 'tableRow', "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: items[0].Description, sClass: 'tableRow' });
                                    }
                                    else {
                                        aoColumnDefs.push({ sTitle: items[0].Name, sClass: 'tableRow', "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: items[0].Name, sClass: 'tableRow' });
                                    }
                                    break;
                                //sub-row column
                                case 1:
                                    var items = $.grep(_domains, function (e) { return e.Id == _domainIds[columnIndex] });
                                    if (_domainIds[columnIndex] == 33) {//if ISO3 use the desc instead
                                        aoColumnDefs.push({ sTitle: items[0].Description, sClass: 'tableSubRow', "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: items[0].Description, sClass: 'tableSubRow' });
                                    }
                                    else {
                                        aoColumnDefs.push({ sTitle: items[0].Name, sClass: 'tableSubRow', "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: items[0].Name, sClass: 'tableSubRow' });
                                    }
                                    break;
                                //pivoted domain columns
                                default:
                                    //if pivot domain is ISO we want to use the ISO name not the code for readability
                                    if (_pivotDomainId == 33) {
                                        var cname = this.ColumnName;
                                        //get the country from the global regions list if the value is the same as a ISO code
                                        var cntry = $.grep(_countries, function (y) { return y.ISO == cname; });

                                        //if country is not empty then a match was found
                                        //and we'll switch with the name of the country instead of the iso code
                                        if (cntry.length > 0) {
                                            aoColumnDefs.push({ sTitle: cntry[0].Label, "aTargets": [columnIndex] });
                                            aoColumns.push({ sTitle: cntry[0].Label });
                                        }
                                        else {
                                            aoColumnDefs.push({ sTitle: this.ColumnName, "aTargets": [columnIndex] });
                                            aoColumns.push({ sTitle: this.ColumnName });
                                        }
                                    }
                                    else {
                                        var type = this.ColumnDataType;
                                        //if the data type is numeric format it to use a , for thousands seperator
                                        if (this.ColumnDataType === "System.Double" || this.ColumnDataType === "System.Int32")
                                            aoColumnDefs.push({
                                                sTitle: this.ColumnName,
                                                "aTargets": [columnIndex],
                                                "sClass": 'numericTableData',
                                                "bUseRendered": false,
                                                "fnRender": function (o) {
                                                    var formattedNumber;
                                                    var number = parseFloat(o.aData[columnIndex]);
                                                    var numberAsString = number.toFixed(2).toString();
                                                    var numberParts = numberAsString.split('.');
                                                    if (numberParts.length > 0) {
                                                        if (numberParts[0] != 'NaN')
                                                        { formattedNumber = o.oSettings.fnFormatNumber(parseInt(numberParts[0])).toString(); }
                                                        else {
                                                            formattedNumber = '0';
                                                        }

                                                        if (numberParts[1]) {
                                                            if (numberParts[1].length == 1)
                                                                formattedNumber += '.' + numberParts[1] + '0';
                                                            else
                                                                formattedNumber += '.' + numberParts[1];
                                                        }
                                                        else {
                                                            if (type === "System.Double")
                                                                formattedNumber += '.00';
                                                        }
                                                    }
                                                    else
                                                        formattedNumber = number.toString();

                                                    return formattedNumber;
                                                }
                                            });
                                        else //not a numeric column
                                            aoColumnDefs.push({ sTitle: this.ColumnName, "aTargets": [columnIndex] });
                                        aoColumns.push({ sTitle: this.ColumnName });
                                    }
                                    break;
                            }

                        }
                            
                    }
                }
            });

            var tablemaker = '<table cellpadding="0" cellspacing="0" border="0" class="display" id=table' + indicator.Id + '></table>';
            tabDiv = $('#tableTab' + indicator.Id);

            tabDiv.html(tablemaker);

            //check to see if the users has comma selected for the decimal 
            //seperator, if so format the data before sending it to the table
            var data = [];
            if (_separator == 'Comma')
                data = tableDataNumericCharReplacer(result.ValueList, _separator);
            else
                data = result.ValueList;

            //check to see if the users have selected ISOs for any domains
            //need to swap the ISO codes for ISO names 
            var isoFormattedData = [];
            if ($.inArray(33, _domainIds) >= 0 || _pivotDomainId == 33)
            {
                isoFormattedData = tableDataISOCodeReplacer(data);
            }

            if (isoFormattedData.length > 0)
                data = isoFormattedData;

            var mData = null;
            if (mDataIndexes.length > 0)
                mData = mDataIndexes.splice(",");

            //create the datatable
            $('#table' + indicator.Id).dataTable({
                "aaData": data,
                "aoColumnDefs": aoColumnDefs,
                "sScrollY": 600,
                "sScrollX": 650,
                "bPaginate": false,
                "bLengthChange": false,
                "bFilter": false,
                "bJQueryUI": true,
                "bAutoWidth": false,
                "oLanguage": {
                    "sInfoThousands": ","
                },
                "fnDrawCallback": function (oSettings) {
                    var table = $('#table' + indicator.Id);
                    var coltotal = 0;
                    var cells = [];
                    var html;
                    $.each(aoColumnDefs, function (i, aoColumnDef) {
                        coltotal++;
                        if (aoColumnDef.sClass == "numericTableData") {
                            var indicatorTotal = 0;
                            for (var x = 0 ; x < data.length ; x++) {
                                indicatorTotal += data[x][i] * 1;
                            }
                            var formattedNumber;
                            var numberAsString = indicatorTotal.toFixed(2).toString();
                            var numberParts = numberAsString.split('.');
                            if (numberParts.length > 0) {
                                if (numberParts[0] != 'NaN')
                                { formattedNumber = oSettings.fnFormatNumber(parseInt(numberParts[0])).toString(); }
                                else {
                                    formattedNumber = '0';
                                }

                                if (numberParts[1]) {
                                    if (numberParts[1].length == 1)
                                        formattedNumber += '.' + numberParts[1] + '0';
                                    else
                                        formattedNumber += '.' + numberParts[1];
                                }
                                else {
                                    if (type === "System.Double")
                                        formattedNumber += '.00';
                                }
                            }
                            else
                                formattedNumber = number.toString();


                            cells.push('<td class="numericTableData">' + formattedNumber + '</td>');
                        }
                    });
                    html = '<tfoot>';
                    var colspan = coltotal - cells.length - 1;
                    if (colspan > 0)
                        html += '<td colspan="' + colspan + '"></td>';

                    html += '<td>Totals</td>';
                    $.each(cells, function (i, cell) {
                        html += cell;
                    });
                    html += '</tfoot>';
                    table.append(html);
                }
            });
          
            //send columns to the columnFilter
            createColumnFilter(aoColumnDefs);

            //add a title row to span all columns to table
            var numCols = result.ColumnList.length - spliceCount;
            var colspan = '<tr role="row"><th class="ui-state-default tableColumn" colspan=' + numCols + '><div class="DataTables_sort_wrapper">' + indicator.FullLabel + '</div></th></tr>';
            $('#table' + indicator.Id + '_wrapper thead:first').prepend(colspan);

            setTableDomainIds(); //keep track of what domain ids the tables are using
        },
        error: function (message) {
            alert(message);
        }
    });
   
    //dojo.xhrPost({
    //        url: 'http://dev.harvestchoice.org/harvestchoiceapi/0.1/api/cellvalues',
    //        postData: dojo.toJson({ indicatorIds: [indicator.Id], domainIds: [33] }),
    //        contentType:"application/json; charset=utf-8",
    //        handleAs: "json",
    //        load:successful,
    //        error:onError
    //    });
}
//-------------------------------
// LOGIC 
//-------------------------------
//add the indicator to the global list of selected indicators and the UI panel
function addIndicator(id) {
    //get the indicator from the global list of indicators
    var indicators = $.grep(_indicators, function (e) { return e.Id == id; });

    //loop through the indicators (only one is returned)
    //add to the global list of selected indicators and the UI panel
    $.each(indicators, function () {
        _selectedIndicators.push(this);
        //toggleIntro('hide');        
        toggleMenuIndicators('show');
        var info = '<div id=info' + this.Id + ' class="infoIndicator" onmouseover="showIndicatorInfo(this);"></div>';
        var del = '<div onclick="deleteIndicator(this)" class="deleteIndicator" id=indIcon_' + this.Id + '></div>';

        $("#indicators").append('<table class="indicator" id=indLabel_' + this.Id + '><tr><td class="labelIndicator">' + this.MicroLabel + '</td><td>' + del + '</td><td>' + info + '</td></tr></table>');
        callCellValues(this, false);
    });    
}
//remove the indicator to the global list of selected indicators and the UI panel
function removeIndicator(id) {
    //remove the indicator from the global list of selected indicators
    _selectedIndicators = $.grep(_selectedIndicators, function (e) { return e.Id != id });

    //Remove the indicator from the 'Selected Indicator' panel
    $('#indLabel_' + id).remove(); //remove the indicator label 
  //  $('#indIcon_' + id).remove(); //remove the indicatior delete icon

    //Uncheck the indicator in the menu
    $('#' + id).prop('checked', false); //uncheck the indicator

    //Remove the tableTabs
    var tabs = $("#tableTabs").tabs();
    var index = $('#tableTabs a[href="#tableTab' + id + '"]').parent().index();    

    if ($('.ui-tabs-paging-prev').length > 0)
        index = index - 1; //minus the prev button tab index

    //remove the tabs using the ui.tabs.paging method
    tabs.tabs('remove', index);

    //check to see if there are any tabs left
    var tabCount = $("#tableTabs li").size();

    if (tabCount < 1 || tabCount == null){
        var tableTabs = $("#tableTabs");
        tableTabs.hide();
        //toggleIntro('show');
        toggleMenuIndicators('show');
        //remove the column filter
        $('#columnFilter .mCSB_container').html('');
        $("#columnFilter").mCustomScrollbar("update");
        $('#columnFilter').css('height', 80);
        $('#columnFilterTitle').hide();
        
    }
         
}
//put check by any indicators that have been selected by the user
function setSelectedIndicators() {
    $.each(_selectedIndicators, function () {
        $('#' + this.Id).prop('checked', true);
    });
}
//sets the global domain variables with current user selections
function setDomainIds() {
    _domainIds.length = 0; //clear the array
    _subRowDomainId = null;
    _rowDomainId = null;
    _pivotDomainId = null;

    var ddRowsData = $('#rowsMenu').data('ddslick');
    var ddSubRowsData = $('#subRowsMenu').data('ddslick');
    var ddSubColumnsData = $('#subColumnsMenu').data('ddslick');

    //if rows menu has a selection capture it
    if (ddRowsData) {
        if (ddRowsData.selectedIndex != -1) {
            _rowDomainId = ddRowsData.selectedData.value;
            _domainIds.push(_rowDomainId);
        }
    }
    //if sub-rows has a selection capture it
    if (ddSubRowsData) {
        if (ddSubRowsData.selectedIndex != -1) {
            _subRowDomainId = ddSubRowsData.selectedData.value;
            _domainIds.push(_subRowDomainId);
        }
    }
    //if sub-columns has a selection capture it
    if (ddSubColumnsData) {
        if (ddSubColumnsData.selectedIndex != -1) {
            _pivotDomainId = ddSubColumnsData.selectedData.value;
        }
    }

}
//sets the global table domain variable
function setTableDomainIds() {
    _tableDomainIds = [];
    _tableCountryIds = [];
    //set the row domains
    if (_domainIds.length > 0)
    {
        $.each(_domainIds, function (idx, id) {
            _tableDomainIds.push(id);
        });
    }
    //set the pivot domain
    if (_pivotDomainId != null)
    {
        _tableDomainIds.push(_pivotDomainId);
    }
    //set the collection of countries
    if (_countryIds.length > 0)
    {
        $.each(_countryIds, function (idx, id) {
            _tableCountryIds.push(id);
        });
    }
}
//update table menus
function updateTableMenus(clearMenu) {

    var menus = ["rowsMenu", "subRowsMenu", "subColumnsMenu"];
    var menuSelections = []; 

    //loop through the menus and update
    $.each(menus, function (i, menu) {
        //save current selection 
        var selection = $('#' + menu).data('ddslick');
        var selectedIndex = null;
        var needsUpdate = false;

        if (menu != clearMenu)
            needsUpdate = true;

        var myDomainId = getMenuDomainId(menu);

        
        //check to see if the menu contains domains in use        
        if (_rowDomainId && _rowDomainId != myDomainId) {
            var items = $.grep(eval('_dd' + menu), function (e) { return e.value == _rowDomainId });
            if (items.length > 0) {
                //console.log('remove ' + items[0].text + ' from ' + menu);
                needsUpdate = true;
            }
        }
        if (_subRowDomainId && _subRowDomainId != myDomainId) {
            var items = $.grep(eval('_dd' + menu), function (e) { return e.value == _subRowDomainId });
            if (items.length > 0) {
                //console.log('remove ' + items[0].text + ' from ' + menu);
                needsUpdate = true;
            }
        }
        if (_pivotDomainId && _pivotDomainId != myDomainId) {
            var items = $.grep(eval('_dd' + menu), function (e) { return e.value == _pivotDomainId });
            if (items.length > 0) {
                //console.log('remove ' + items[0].text + ' from ' + menu);
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            var data = _ddDomains;
            if (_rowDomainId && _rowDomainId != myDomainId) data = $.grep(data, function (e) { return e.value != _rowDomainId });
            if (_subRowDomainId && _subRowDomainId != myDomainId) data = $.grep(data, function (e) { return e.value != _subRowDomainId });
            if (_pivotDomainId && _pivotDomainId != myDomainId) data = $.grep(data, function (e) { return e.value != _pivotDomainId });
            window['_dd' + menu] = data;

            //if there is an existing selection
            if (selection && selection.selectedIndex > -1) {
                var selectedItem = $.grep(eval('_dd' + menu), function (e) { return e.value == selection.selectedData.value });
                selectedIndex = $.inArray(selectedItem[0], eval('_dd' + menu));
            }

            $('#' + menu).ddslick('destroy');

            

            //if (selectedIndex) 
            //    menuSelections.push(selectedIndex);
            //else
            //    menuSelections.push(-1);

            if (selectedIndex != null && selectedIndex > -1) {
                //create the ddslick dropdown object 
                $('#' + menu).ddslick({
                    id: menu + "Select",
                    data: eval('_dd' + menu),
                    width: "215px",
                    defaultSelectedIndex: selectedIndex,
                    onSelected: function (d) {
                            //do somthing when you select an menu item            
                            domainMenuSelection(d);
                    }
                });               
            }
            else {
                //console.log('recreate ' + menu);
                //create the ddslick dropdown object 
                $('#' + menu).ddslick({
                    id: menu + "Select",
                    data: eval('_dd' + menu),
                    width: "215px",
                    selectText: _menuText, //this is what is displayed before a selection is made
                    onSelected: function (d) {
                        //do somthing when you select an menu item            
                        domainMenuSelection(d);
                    }
                });
            }
        }

    });

}
//get domain id for menu
function getMenuDomainId(menu) {
    switch (menu) {
        case "rowsMenu":            
            return _rowDomainId;
            break;
        case "subRowsMenu":
            return _subRowDomainId;
            break;
        case "subColumnsMenu":
            return _pivotDomainId;
            break;
        default:
            break;
    }
}
//replaces ,/. in numeric values within a datatable dataset
function tableDataNumericCharReplacer(data, setChar) {

    var formatedData = [];

    $.each(data, function () {
        var row = [];
        $.each(this, function (index, item) {
            if ($.isNumeric(item) ||
                $.isNumeric(item.toString().replace(',', '.'))
                ) {
                //console.log(item + ' is numeric');
                if (setChar == 'Comma') {
                    item = item.toString().replace('.', ',');
                }
                else {//its a period
                    item = item.toString().replace(',', '.');
                    item = parseFloat(item);
                    //console.log(item + ' is numeric');
                }
            }
            row.push(item);
        });
        formatedData.push(row);
    });

    return formatedData;
}
//replaces ISO codes with ISO names within a datatable dataset
function tableDataISOCodeReplacer(data)
{
    var formattedData = [];

    $.each(data, function () {
        var row = [];
        $.each(this, function (index, item) {
            //look for ISO codes and replace them
            //get the country from the global regions list if the value is the same as a ISO code
            var country = $.grep(_countries, function (e) { return e.ISO == item; });

            //if country is not empty then a match was found
            //and we'll switch with the name of the country instead of the iso code
            if (country.length > 0)
            {
                item = country[0].Label;
            }
            row.push(item);
        });
        formattedData.push(row);
    });

    return formattedData;
}
//returns the current number of tables
function getTableCount() {
    var tables = $.fn.dataTable.fnTables(false);
    return tables.length;
}
//updates current tables with user selections
function updateTables() {

    if (getTableCount() > 0) {
        if (tablesCurrent()) {
            console.log("tables are current");
        }
        else {
            //update the tables
            console.log("tables are not current...updating");
            //using the datatables plug-in to get all the datatables 
            var tables = $.fn.dataTable.fnTables(false);
            //if we found some then loop through them
            if (tables.length > 0) {
                $.each(tables, function (i, t) {
                    //inti datatable on the current table
                    var table = $(t).dataTable();
                    //use the plug-in's getData function to get the data
                    var data = table.fnGetData();
                    var indicatorId = table.context.id.toString().substr(5, table.context.id.length - 5);
                    //get the indicator from the global list of indicators
                    var indicators = $.grep(_indicators, function (e) { return e.Id == indicatorId; });
                    callCellValues(indicators[0], true);               
                });
            }
        }
    }
   // console.log("there are " + getTableCount() + " tables to update");
}
//toggle intro panel
function toggleIntro(action) {
    switch (action) {
        case 'show':
            $('#rightPanel').hide();
            $('#introPanel').show();
            break;
        default:
            $('#rightPanel').show();
            $('#introPanel').hide();
            break;            
    }

    $("#countryMenu").mCustomScrollbar("update");
}
//toggle indicator menu
function toggleMenuIndicators(action) {
    switch (action) {
        case 'hide':
            $('#menuIndicators').hide();
            $('#exportButton').hide();
            break;
        default:
            $('#menuIndicators').show();
            $('#exportButton').show();
            break;
    }
}
//checks to see if all tables are current/consistant with user's choices (returns true or false)
function tablesCurrent() {
    //first check and see if _tableDomainIds holds the same variables as the
    //menus current settings: if yes the tables are up to date, if not they require updating
    var tablesAreCurrent = true;
    var foundValue = null;

    //if the _pivotDomainId has a value (users has a column choice)
    //see if the _tableDomainIds array has the value (then the tables have been updated with this parameter)
    if(_pivotDomainId != null)
        foundValue = $.inArray(_pivotDomainId, _tableDomainIds);
    //if no value was found then tables are not current
    if (foundValue == -1)
        return tablesAreCurrent = false;
    //go through the _domainIds and see if they are in the _tableDomainIds
    //if they are the tables are up to date if not they are not current
    $.each(_domainIds, function (idx, id) {
        foundValue = $.inArray(id, _tableDomainIds);
        if (foundValue == -1)
            return tablesAreCurrent = false;
    });

    //go through the _tableDomainIds and see if they are in the _domainIds
    //if they are the tables are up to date if not they are not current
    $.each(_tableDomainIds, function (idx, id) {
        foundValue = $.inArray(id, _domainIds);
        if (foundValue == -1)
            return tablesAreCurrent = false;
    });

    //go through the _countryIds and see if they are in the _tableCountryIds
    //if they are the tables are up to date if not they are not current
    $.each(_countryIds, function (idx, iso) {
        foundValue = $.inArray(iso, _tableCountryIds);
        if (foundValue == -1)
            return tablesAreCurrent = false;
    });

    //go through the _tableCountryIds and see if they are in the _countryIds
    //if they are the tables are up to date if not they are not current
    $.each(_tableCountryIds, function (idx, iso) {
        foundValue = $.inArray(iso, _countryIds);
        if (foundValue == -1)
            return tablesAreCurrent = false;
    });

    return tablesAreCurrent;
}
//hide/show clear menu options 
function setClearMenuOptions() {
    var selection;

    //get the selection from the sub rows menu
    selection = $('#subRowsMenu').data('ddslick');
    //if there is a selection show the clear menu option
    if (selection && selection.selectedIndex > -1)
        $('#subRowsClear').show();
    else
        $('#subRowsClear').hide();

    //get the selection from the sub columns menu
    selection = $('#subColumnsMenu').data('ddslick');
    //if there is a selection show the clear menu option
    if (selection && selection.selectedIndex > -1)
        $('#subColumnsClear').show();
    else
        $('#subColumnsClear').hide();

    //get the selection from the region menu
    selection = $('#regionMenu').data('ddslick');
    //if there is a selection show the clear menu option
    if (selection && selection.selectedIndex > -1)
        $('#regionClear').show();
    else
        $('#regionClear').hide();

    //get the selection from the country menu
    selection = $("#countryMenu input[type='radio']:checked").val();
    //if there is a selection show the clear menu option
    if (selection)
        $('#countryClear').show();
    else
        $('#countryClear').hide();
}
//logic to create zip download of all tables and disclaimer
function downloadTables() {
    //loop through tables creating csv with same random number on server
    if (getTableCount() > 0) {
        var selectedIndicators = []; //variable to hold the selected indicator tables from the download options
        //using the datatables plug-in to get all the datatables 
        var tables = $.fn.dataTable.fnTables(false);
        //get the downloads div (holds all the download links for each table)
        var downloads = $('#downloads');
        //clear the downloads div of previous downloads
        downloads.html('');
        //add the trigger link for downloads (multiDownload plugin)
        downloads.append('<a href="#" id="trigger"></a>');
        //using the multiDownload plugin method to remove all download links
        $.fn.multiDownloadRemove();
        //create random unqiue number for filename prefix
        var filenamePrefix = randomString(12, true);
        //if we found some tables  then loop through them
        if (tables.length > 0) {
            $.each(tables, function (i, t) {

                //inti datatable on the current table
                var table = $(t).dataTable();
                //get the indicator id from the table's name
                var indicatorId = table.context.id.toString().substr(5, table.context.id.length - 5);
                //get the indicator from the global list of indicators
                var indicators = $.grep(_indicators, function (e) { return e.Id == indicatorId; });
                //download csv for the indicator if its checked (selected for download) 
                var optionChecked = $('#opt' + indicatorId);
                if (optionChecked != 'undefined' && optionChecked.length > 0) {
                    if (optionChecked[0].checked) {
                        selectedIndicators.push(indicators[0]);
                        //console.log("Preparing for download " + indicators[0].MicroLabel);
                        //create random unqiue number for name + indicator id
                        var filename = filenamePrefix + "_" + indicatorId;
                        //prepare the data for a csv using the
                        var datatable = 'table#table' + indicatorId + '.display';
                        var columntable = '#table' + indicatorId + '_wrapper thead:first';
                        var footertable = '#table' + indicatorId + ' tfoot:first';
                        var csvFormattedData = table2csv(table, 'full', datatable, columntable, footertable);
                        //call the data download web service to create the csv in the appoutput
                        callDataDownloadCreateCSV(filename, csvFormattedData);
                    }
                }
            });

            //create custom disclaimer
            callDataDownloadCreateDisclaimer(filenamePrefix, selectedIndicators);

            //zip up all our files 
            callDataDownloadZipDownload(filenamePrefix, selectedIndicators);

            //add zip file as a link
            var zippath = _downloadURL + filenamePrefix + '.zip';
            var ziplink = $('<a/>').attr('href', zippath).attr('id', 'zip');
            $('#downloads').append(ziplink);
            ziplink.multiDownloadAdd();

            //trigger the file download
            var trigger = $('#trigger');
            trigger.multiDownload('click');
            trigger.click();

            //unblock the UI
            $.unblockUI();
        }
    }
    //create personalized metadata file with same random number on server
    //use multidownload plugin to zip up the files with same random number
    //create a script to clean up the directory
}
function downloadSuccess(result) { }
function downloadFail() { }
//call internal web service to create the csv file from formatted table data
function callDataDownloadCreateCSV(filename, data) {
    $.ajax({
        type: "POST",
        url: "DataDownload.asmx/CreateCSV",
        data: JSON.stringify({ filename: filename, csvData: data }),
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        async: false,
        success: function (result) { downloadSuccess(result); },
        error:
          function (xhr, ajaxOptions, thrownError) {
              downloadFail();
          }
    });
}
//call internal web service to create the customized disclaimer
function callDataDownloadCreateDisclaimer(filename, indicators) {
    $.ajax({
        type: "POST",
        url: "DataDownload.asmx/CreateDisclaimer",
        data: JSON.stringify({ filename: filename, indicators: indicators }),
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        async: false,
        success: function (result) { downloadSuccess(result); },
        error:
          function (xhr, ajaxOptions, thrownError) {
              downloadFail();
          }
    });
}
//call internal web service to create the customized disclaimer
function callDataDownloadZipDownload(filenamePrefix, indicators) {
    $.ajax({
        type: "POST",
        url: "DataDownload.asmx/ZipDownload",
        data: JSON.stringify({ filenamePrefix: filenamePrefix, indicators: indicators }),
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        async: false,
        success: function (result) { downloadSuccess(result); },
        error:
          function (xhr, ajaxOptions, thrownError) {
              downloadFail();
          }
    });
}
//take a dataTable (jquery plugin) and convert it to a csv format 
function table2csv(oTable, exportmode, dataTable, colTable, footer) {
    var csv = '';
    var headers = [];
    var footers = [];
    var rows = [];

    // Get header names that have a colspan = 1
    // columns with colspan > 1 are title rows and we don't want them in the export
    $(colTable).find('th[colspan=1]').each(function () {
        var $th = $(this);
        var text = $th.text();
        var header = '"' + text + '"';
        if (text != "") headers.push(header); // actually datatables seems to copy my original headers so there ist an amount of TH cells which are empty
    });
    csv += headers.join(',') + "\n";

    // get all of table data (hidden & visible)
    if (exportmode == "full") { // total data
        var total = oTable.fnSettings().fnRecordsTotal()
        for (i = 0; i < total; i++) {
            var row = oTable.fnGetData(i);
            row = strip_tags(row);
            rows.push(row);
        }
    } else { // visible rows only
        $(dataTable + ' tbody tr:visible').each(function (index) {
            var row = oTable.fnGetData(this);
            row = strip_tags(row);
            rows.push(row);
        })
    }

    csv += rows.join("\n");

    $(footer).find('td').each(function () {
        var cell = this.outerHTML;
        cell = strip_tags(cell);
        if (cell) {
            cell = cell.replace(/,/g, '');
            footers.push(cell);
        }
        else {
            footers.push(' ');
        }
    });
        
    csv += "\n" + footers.join(',') + "\n";

    // if a csv div is already open, delete it
    //if ($('.csv-data').length) $('.csv-data').remove();
    //// open a div with a download link
    //$('body').append('<div class="csv-data"><form enctype="multipart/form-data" method="post" action="/csv.php"><textarea class="form" name="csv">' + csv + '</textarea><input type="submit" class="submit" value="Download as file" /></form></div>');

    return csv;
}
//determine (true/false) if the url contains a useable query parameter
function isActionLink() {
    //get the search string - everything after the (?) 
    var pageSearchString = document.URL.split('?')[1];
    
    if (pageSearchString != undefined) {
        return true;        
    }
    return false;
}
//extracts the query string parameters and puts them into the global variable _actionLinkParams
function getActionLinkParameters() {
    //list of valid parameters
    var validParameters = ["indicatorids", "rowdomainid", "subrowdomainid", "columndomainid", "regionname"];

    var pageSearchString = document.URL.split('?')[1];
    if (pageSearchString != undefined && pageSearchString != "") {
        var parameterPairs = pageSearchString.split('&');
        for (var i = 0; i < parameterPairs.length; i++) {
            hash = parameterPairs[i].split('=');
            // _actionLinkParams.push(hash[1]);
            var key = hash[0].toLowerCase();
            var value = hash[1];

            if($.inArray(key, validParameters) > -1){
                if (typeof _actionLinkParams[key] === "undefined") {
                    _actionLinkParams[key] = [];
                    _actionLinkParams[key].push(value);
                }
                else {
                    _actionLinkParams[key].push(value);
                }
            }

        }
    }
    //expecting the following parameters - 1 to many indicators, and one selection for the rest

    //average grow & var grow (row: Farming Systems sub-row: Rural Pop cols: AEZ-5 region: Agra Countries)
    //?indicatorIds=379&indicatorIds=272&rowDomainId=32&subRowDomainId=3&columnDomainId=1&regionName=AGRA

    //console.log("Indicators: " + _actionLinkParams['indicatorIds']
    //    + " Row Selection: " + _actionLinkParams['rowDomainId']
    //    + " Sub-Row Selection: " + _actionLinkParams['subRowDomainId']
    //    + " Column Selection: " + _actionLinkParams['columnDomainId']
    //    + " Region Selection: " + _actionLinkParams['regionName']
    //    );
}
//creates actionlink parameters for sharing tables
function getShareLinkParameters() {
    //list of valid parameters
    var validParameters = ["indicatorids", "rowdomainid", "subrowdomainid", "columndomainid", "regionname"];

    var sharelink = '?';
    var parameters = [];
    if(_selectedIndicators.length > 0)
    {
        $.each(_selectedIndicators, function (i, ind) {
            parameters.push("indicatorids=" + ind.Id);
        });
    }
    if (_rowDomainId > 0)
        parameters.push("rowdomainid=" + _rowDomainId);
    if (_subRowDomainId > 0)
        parameters.push("subrowdomainid=" + _subRowDomainId);
    if (_pivotDomainId > 0)
        parameters.push("columndomainid=" + _pivotDomainId);
    if (_regionId)
        parameters.push("regionname=" + _regionId);

    return sharelink += parameters.join("&");

}
//validates the action link parameters and removes invalid parameters
function validateActionLinkParameters() {

    //check that the params have at least one valid indicator
    var hasValidIndicator = false;
    $.each(_actionLinkParams["indicatorids"], function (i, id) {
        if (validIndicator(id)) {
            hasValidIndicator = true;
        }
    });

    //if there is at least one valid indicator, first cycle through the other params and add them to the global variables
    if (hasValidIndicator) {
        for (var parm in _actionLinkParams) {
            switch (parm) {                
                case "rowdomainid":
                    if (validDomain(_actionLinkParams[parm][0])) {
                        //get id as number
                        var id = parseInt(_actionLinkParams[parm][0]);
                        //set the menu
                        $.each(_ddrowsMenu, function (idx, m) {
                            if (m.value == id)
                            { $('#rowsMenu').ddslick('select', { index: idx }); }
                        });
                    }
                    break;
                case "subrowdomainid":
                    if (validDomain(_actionLinkParams[parm][0])) {
                        //get id as number
                        var id = parseInt(_actionLinkParams[parm][0]);
                        //set the menu
                        $.each(_ddsubRowsMenu, function (idx, m) {
                            if (m.value == id)
                            { $('#subRowsMenu').ddslick('select', { index: idx }); }
                        });
                    }
                    break;
                case "columndomainid":
                    if (validDomain(_actionLinkParams[parm][0])) {
                        //get id as number
                        var id = parseInt(_actionLinkParams[parm][0]);
                        //set the menu
                        $.each(_ddsubColumnsMenu, function (idx, m) {
                            if (m.value == id)
                            {
                                $('#subColumnsMenu').ddslick('select', { index: idx });
                            }
                        });
                    }
                    break;
                case "regionname":
                    if (validRegion(_actionLinkParams[parm][0])) {
                        //get id as number
                        var name = _actionLinkParams[parm][0].toUpperCase();
                        var region = $.grep(_regions, function (x) { return x.Name == name; });
                        //set the menu
                        $.each(_ddRegions, function (idx, m) {
                            if (m.text == region[0].Label)
                            { $('#regionMenu').ddslick('select', { index: idx }); }
                        });                    
                    }
                    break;
            }
        }

        $.each(_actionLinkParams["indicatorids"], function (i, id) {
            if (validIndicator(id)) {
                addIndicator(id);
                toggleIntro('hide');
            }
        });
    }

    //setDomainIds();
    //updateTables();
}
//-------------------------------
// UTILITY METHODS 
//-------------------------------
//change a string to title case
function toTitleCase(str) {
    return str.replace(/(?:^|\s)\w/g, function (match) {
        return match.toUpperCase();
    });
}
//create a random string
function randomString(length, specialChars) {
    var iteration = 0;
    var randomString = "";
    var randomNumber;
    if (special == undefined) {
        var special = false;
    }
    while (iteration < length) {
        randomNumber = (Math.floor((Math.random() * 100)) % 94) + 33;
        if (!special) {
            if ((randomNumber >= 33) && (randomNumber <= 47)) { continue; }
            if ((randomNumber >= 58) && (randomNumber <= 64)) { continue; }
            if ((randomNumber >= 91) && (randomNumber <= 96)) { continue; }
            if ((randomNumber >= 123) && (randomNumber <= 126)) { continue; }
        }
        iteration++;
        randomString += String.fromCharCode(randomNumber);
    }
    randomString = "HarvestChoiceData_" + randomString;
    return randomString;
}
//remove all the tags and return just the text values
function strip_tags(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText;
}
//validates a indicator id
function validIndicator(id) {
    var indicator = $.grep(_indicators, function (x) { return x.Id == id; });
    if (indicator.length > 0) 
        return true;
    else
        return false;
}
//validates a domain id
function validDomain(id) {
    var domain = $.grep(_domains, function (x) { return x.Id == id; });
    if (domain.length > 0)
        return true;
    else
        return false;
}
//validates a region name
function validRegion(name) {
    var region = $.grep(_regions, function (x) { return x.Name == name; });
    if (region.length > 0)
        return true;
    else
        return false;
}