var DataTable = $.fn.dataTable;
var SearchPane = /** @class */ (function () {
    /**
     * Creates the panes, sets up the search function
     * @param paneSettings The settings for the searchPanes
     * @param opts The options for the default features
     * @param idx the index of the column for this pane
     * @returns {object} the pane that has been created, including the table and the index of the pane
     */
    function SearchPane(paneSettings, opts, idx, layout, panes) {
        var _this = this;
        if (panes === void 0) { panes = {}; }
        // Check that the required version of DataTables is included
        if (!DataTable || !DataTable.versionCheck || !DataTable.versionCheck('1.10.0')) {
            throw new Error('SearchPane requires DataTables 1.10 or newer');
        }
        // Check that Select is included
        if (!DataTable.select) {
            throw new Error('SearchPane requires Select');
        }
        var table = new DataTable.Api(paneSettings);
        if (table.ajax.url() !== undefined && table.ajax.url() !== null) {
            table.one('init', function () {
                _this.rebuildPane();
            });
        }
        this.classes = $.extend(true, {}, SearchPane.classes);
        if (Object.keys(panes).length > 0) {
            this.customPaneSettings = panes;
        }
        // Add extra elements to DOM object including clear and hide buttons
        this.layout = layout;
        var layVal = parseInt(layout.split('-')[1], 10);
        this.dom = {
            container: $('<div/>').addClass(this.classes.container).addClass(this.classes.layout +
                (layVal < 7 ? layout : layout.split('-')[0] + '-6')),
            topRow: $('<div/>').addClass(this.classes.topRow)
        };
        // Get options from user
        this.c = $.extend(true, {}, SearchPane.defaults, opts);
        this.s = {
            colOpts: [],
            columns: [],
            dt: table,
            filteringActive: false,
            index: idx,
            redraw: false,
            updating: false
        };
        this.displayed = false;
        table = this.s.dt;
        this.selections = this.s.columns;
        var rowLength = table.columns().eq(0).toArray().length;
        this.colExists = idx < rowLength;
        this.s.colOpts = this.colExists ? this._getOptions() : this._getBonusOptions(rowLength);
        var colOpts = this.s.colOpts;
        var clear = $('<button type="button">X</button>').addClass(this.classes.paneButton);
        clear[0].innerHTML = table.i18n('searchPanes.clearPane', 'X');
        this.s.index = idx;
        // Custom search function for table
        $.fn.dataTable.ext.search.push(function (settings, searchData, dataIndex, origData) {
            if (settings.nTable !== table.table(0).node()) {
                return true;
            }
            // If no data has been selected then show all
            if (_this.selections.length === 0) {
                return true;
            }
            var filter = '';
            if (_this.colExists && colOpts.combiner === 'or') {
                // Get the current filtered data
                filter = searchData[idx];
                if (colOpts.orthogonal.filter !== 'filter') {
                    var cell = table.cell(dataIndex, idx);
                    filter = typeof (colOpts.orthogonal) === 'string'
                        ? cell.render(colOpts.orthogonal)
                        : cell.render(colOpts.orthogonal.search);
                    if (filter instanceof $.fn.dataTable.Api) {
                        filter = filter.toArray();
                    }
                }
                // For each item selected in the pane, check if it is available in the cell
                for (var _i = 0, _a = _this.selections; _i < _a.length; _i++) {
                    var colSelect = _a[_i];
                    if (Array.isArray(filter)) {
                        if (filter.indexOf(colSelect.filter) !== -1) {
                            return true;
                        }
                    }
                    else if (typeof colSelect.filter === 'function') {
                        if (colSelect.filter.call(table, table.row(dataIndex).data(), dataIndex)) {
                            if (!_this.s.redraw) {
                                _this.repopulatePane();
                            }
                            return true;
                        }
                    }
                    else {
                        if (filter === colSelect.filter) {
                            return true;
                        }
                    }
                }
                return false;
            }
            else if (colOpts.combiner === 'and') {
                var allow = true;
                for (var _b = 0, _c = _this.selections; _b < _c.length; _b++) {
                    var colSelect = _c[_b];
                    if (Array.isArray(filter)) {
                        if (filter.indexOf(colSelect.filter) !== -1) {
                            return true;
                        }
                    }
                    else if (typeof colSelect.filter === 'function') {
                        if (colSelect.filter.call(table, table.row(dataIndex).data(), dataIndex)) {
                            if (!_this.s.redraw) {
                                _this.repopulatePane();
                            }
                        }
                        else {
                            allow = false;
                        }
                    }
                    else {
                        if (filter === colSelect.filter) {
                            return true;
                        }
                    }
                }
                return allow;
            }
            else if (!_this.colExists) {
                for (var _d = 0, _e = _this.selections; _d < _e.length; _d++) {
                    var colSelect = _e[_d];
                    if (Array.isArray(filter)) {
                        if (filter.indexOf(colSelect.filter) !== -1) {
                            return true;
                        }
                    }
                    else if (typeof colSelect.filter === 'function') {
                        if (colSelect.filter.call(table, table.row(dataIndex).data(), dataIndex)) {
                            if (!_this.s.redraw) {
                                _this.repopulatePane();
                            }
                            return true;
                        }
                    }
                    else {
                        if (filter === colSelect.filter) {
                            return true;
                        }
                    }
                }
                return false;
            }
            return false;
        });
        this.buildPane();
        // If the clear button for this pane is clicked clear the selections
        if (this.c.clear) {
            clear[0].addEventListener('click', function () {
                var searches = _this.dom.container.getElementsByClassName(_this.classes.search);
                for (var _i = 0, searches_1 = searches; _i < searches_1.length; _i++) {
                    var search = searches_1[_i];
                    $(search).val('');
                    $(search).trigger('input');
                }
                _this.clearPane();
            });
        }
        this.s.dt.on('draw', function () {
            _this._adjustTopRow();
        });
        $(window).on('resize.dtr', DataTable.util.throttle(function () {
            _this._adjustTopRow();
        }));
        return this;
    }
    /**
     * Adjusts the layout of the top row when the screen is resized
     */
    SearchPane.prototype._adjustTopRow = function () {
        var subContainers = this.dom.container.find('.' + this.classes.subRowsContainer);
        var topRow = this.dom.container.find('.' + this.classes.topRow);
        var column = this.s.dt.column(this.colExists ? this.s.index : 0);
        var searchBox = $('<input/>')
            .addClass(this.classes.paneInputButton)
            .addClass(this.classes.search)
            .attr('placeholder', this.colExists ? $(this.s.dt.column(this.s.index).header()).text() : this.customPaneSettings.header);
        this.dom.searchBox = searchBox;
        var clear = $('<button type="button">&#215;</button>')
            .addClass(this.classes.paneButton)
            .addClass(this.classes.exit);
        if (this._getSelected(0)[0] === 0) {
            $(clear).addClass(this.classes.dull);
        }
        var nameButton = $('<button type="button">&#128475;↕</button>').addClass(this.classes.paneButton);
        var countButton = $('<button type="button">#↕</button>').addClass(this.classes.paneButton);
        var searchButton = $('<button type = "button"><span class="' + this.classes.searchIcon + '">⚲</span></button>')
            .addClass(this.classes.paneButton)
            .addClass(this.classes.searchLabel);
        var dtP = $('<table><thead><tr><th>' + (this.colExists ?
            $(column.header()).text() :
            this.customPaneSettings.header) + '</th><th/></tr></thead></table>');
        if ($(subContainers[0]).width() < 252 || $(topRow[0]).width() < 252) {
            $(subContainers[0]).addClass(this.classes.narrow);
            //this._displayPane(searchBox, searchButton, clear, nameButton, countButton, dtP, true);
        }
        else {
            $(subContainers[0]).removeClass(this.classes.narrow);
            //this._displayPane(searchBox, searchButton, clear, nameButton, countButton, dtP, false);
        }
    };
    /**
     * Adjusts the width of the columns
     */
    SearchPane.prototype.adjust = function () {
        this.s.dtPane.columns.adjust();
    };
    /**
     * Rebuilds the panes from the start having deleted the old ones
     */
    SearchPane.prototype.rebuildPane = function () {
        this.dom.container.empty();
        this.dom.container.removeClass(this.classes.hidden);
        this.buildPane();
    };
    /**
     * Repopulates the options of the pane
     */
    SearchPane.prototype.repopulatePane = function () {
        var updating = this.s.updating;
        this.s.updating = true;
        var filterCount = 0;
        var filterIdx;
        // If the viewTotal option is active then it must be determined whether there is a filter in place already
        if (this.c.viewTotal) {
            // Check each pane to find how many filters are in place in each
            var selectArray = this._getSelected(filterCount);
            // If there is only one in place then find the index of the corresponding pane
            if (filterCount === 1) {
                filterIdx = selectArray.indexOf(1);
            }
        }
        this._updateCommon(filterIdx);
        this.s.updating = updating;
    };
    /**
     * Caclulate the count for each different value in a column.
     * @param data The data to be binned
     * @return {object} out Object of different cell values as keys and counts as values
     */
    SearchPane.prototype._binData = function (data) {
        var out = {};
        data = this._flatten(data);
        for (var i = 0, ien = data.length; i < ien; i++) {
            var d = data[i].filter;
            if (d === null || d === undefined) {
                continue;
            }
            if (!out[d]) {
                out[d] = 1;
            }
            else {
                out[d]++;
            }
        }
        return out;
    };
    /**
     * Method to construct the actual pane.
     */
    SearchPane.prototype.buildPane = function () {
        var _this = this;
        this.selections = this.s.columns;
        var table = this.s.dt;
        var column = table.column(this.colExists ? this.s.index : 0);
        var colOpts = this.s.colOpts;
        var searchBox = $('<input/>')
            .addClass(this.classes.paneInputButton)
            .addClass(this.classes.search)
            .attr('placeholder', this.colExists ? $(table.column(this.s.index).header()).text() : this.customPaneSettings.header);
        this.dom.searchBox = searchBox;
        var clear = $('<button type="button">&#215;</button>')
            .addClass(this.classes.dull)
            .addClass(this.classes.paneButton)
            .addClass(this.classes.exit);
        var nameButton = $('<button type="button">&#128475;↕</button>').addClass(this.classes.paneButton);
        var countButton = $('<button type="button">#↕</button>').addClass(this.classes.paneButton);
        var searchButton = $('<button type = "button"><span class="' + this.classes.searchIcon + '">⚲</span></button>')
            .addClass(this.classes.paneButton)
            .addClass(this.classes.searchLabel);
        var rowLength = table.columns().eq(0).toArray().length;
        var dtP = $('<table><thead><tr><th>' + (this.colExists ?
            $(column.header()).text() :
            this.customPaneSettings.header) + '</th><th/></tr></thead></table>');
        var countMessage = table.i18n('searchPanes.count', '{total}');
        var filteredMessage = table.i18n('searchPanes.countFiltered', '{shown} ({total})');
        var arrayFilter = [];
        var arrayTotals = [];
        var bins = {};
        var binsTotal = {};
        // If it is not a custom pane in place
        if (this.colExists) {
            // Perform checks that do not require populate pane to run
            if (colOpts.show === false
                || (colOpts.show !== undefined && colOpts.show !== true)) {
                this.dom.container.addClass(this.classes.hidden);
                return;
            }
            else if (colOpts.show === true) {
                this.displayed = true;
            }
            arrayFilter = this._populatePane();
            bins = this._binData(this._flatten(arrayFilter));
            // Don't show the pane if there isn't enough variance in the data
            // colOpts.options is checked incase the options to restrict the choices are selected
            var binLength = Object.keys(bins).length;
            var uniqueRatio = this._uniqueRatio(binLength, table.rows()[0].length);
            if (this.displayed === false && ((colOpts.show === undefined && (colOpts.threshold === undefined ?
                uniqueRatio > this.c.threshold :
                uniqueRatio > colOpts.threshold))
                || (colOpts.show !== true && binLength <= 1))) {
                this.dom.container.addClass(this.classes.hidden);
                return;
            }
            // If the option viewTotal is true then find
            // the total count for the whole table to display alongside the displayed count
            if (this.c.viewTotal) {
                arrayTotals = this._detailsPane();
                binsTotal = this._binData(this._flatten(arrayTotals));
            }
            else {
                binsTotal = bins;
            }
            this.dom.container.addClass(this.classes.show);
            this.displayed = true;
        }
        else {
            this.displayed = true;
        }
        // If the varaince is accceptable then display the search pane
        this._displayPane(searchBox, searchButton, clear, nameButton, countButton, dtP);
        var errMode = $.fn.dataTable.ext.errMode;
        $.fn.dataTable.ext.errMode = 'none';
        this.s.dtPane = $(dtP).DataTable($.extend(true, {
            columnDefs: [
                {
                    data: 'display',
                    render: function (data, type, row) {
                        if (type === 'sort') {
                            return row.sort;
                        }
                        else if (type === 'type') {
                            return row.type;
                        }
                        return !_this.c.dataLength ?
                            data : data.length > _this.c.dataLength ?
                            data.substr(0, _this.c.dataLength) + '...' :
                            data;
                    },
                    targets: 0,
                    // Accessing the private datatables property to set type based on the original table.
                    // This is null if not defined by the user, meaning that automatic type detection would take place
                    type: table.settings()[0].aoColumns[this.s.index] !== undefined ?
                        table.settings()[0].aoColumns[this.s.index]._sManualType :
                        null
                },
                {
                    className: 'dtsp-countColumn ' + this.classes.badgePill,
                    data: 'count',
                    render: function (data, type, row) {
                        var message;
                        _this.s.filteringActive
                            ? message = filteredMessage.replace(/{total}/, row.total)
                            : message = countMessage.replace(/{total}/, row.total);
                        message = message.replace(/{shown}/, row.shown);
                        while (message.indexOf('{total}') !== -1) {
                            message = message.replace(/{total}/, row.total);
                        }
                        while (message.indexOf('{shown}') !== -1) {
                            message = message.replace(/{shown}/, row.shown);
                        }
                        return '<div class="' + _this.classes.pill + '">' + message + '</div>';
                    },
                    targets: 1
                }
            ],
            info: false,
            paging: false,
            scrollY: '200px',
            select: true,
            stateSave: table.settings()[0].oFeatures.bStateSave ? true : false
        }, this.c.dtOpts, colOpts !== undefined ? colOpts.dtOpts : {}));
        var state = this.s.dtPane.state.loaded();
        $(dtP).addClass(this.classes.table);
        // As the pane table is not in the document yet we must initialise select ourselves
        $.fn.dataTable.select.init(this.s.dtPane);
        $.fn.dataTable.ext.errMode = errMode;
        // If it is not a custom pane
        if (this.colExists) {
            // On initialisation, do we need to set a filtering value from a
            // saved state or init option?
            var search = column.search();
            search = search ? search.substr(1, search.length - 2).split('|') : [];
            var dataFilter = [];
            // Make sure that the values stored are unique
            this._findUnique(dataFilter, arrayFilter);
            // Count the number of empty cells
            var count_1 = 0;
            arrayFilter.forEach(function (element) {
                if (element.filter === '') {
                    count_1++;
                }
            });
            // Add all of the search options to the pane
            for (var i = 0, ien = dataFilter.length; i < ien; i++) {
                if (dataFilter[i]) {
                    if (bins[dataFilter[i].filter] !== undefined || !this.c.cascadePanes) {
                        var row = this._addRow(dataFilter[i].display, dataFilter[i].filter, bins[dataFilter[i].filter], bins[dataFilter[i].filter], dataFilter[i].sort, dataFilter[i].type);
                        if (this.s.colOpts.preSelect !== undefined && this.s.colOpts.preSelect.indexOf(dataFilter[i].filter) !== -1) {
                            row.select();
                        }
                    }
                }
                else {
                    this._addRow(this.c.emptyMessage, count_1, count_1, this.c.emptyMessage, this.c.emptyMessage, this.c.emptyMessage);
                }
            }
        }
        // If there are custom options set or it is a custom pane then get them
        if (colOpts.options !== undefined ||
            (this.customPaneSettings !== undefined && this.customPaneSettings.searchPanes.options !== undefined)) {
            this._getComparisonRows(bins, binsTotal);
        }
        DataTable.select.init(this.s.dtPane);
        // Display the pane
        this.s.dtPane.draw();
        // Hide the count column if that is desired
        if (colOpts.hideCount || this.c.hideCount) {
            this.s.dtPane.column(1).visible(false);
        }
        var loadedFilter;
        if (table.state.loaded()) {
            loadedFilter = table.state.loaded();
            this._reloadSelect(loadedFilter);
            $(searchBox).val(state.search.search);
            this.s.dtPane.column(0).order(state.order[0][0]);
            this.s.dtPane.column(1).order(state.order[0][1]);
        }
        // Declare timeout Variable
        var t0;
        this.s.dtPane.on('user-select.dt', function (e, _dt, type, cell, originalEvent) {
            originalEvent.stopPropagation();
        });
        // When an item is selected on the pane, add these to the array which holds selected items.
        // Custom search will perform.
        this.s.dtPane.on('select.dt', function () {
            clearTimeout(t0);
            $(clear).removeClass(_this.classes.dull);
            if (!_this.s.updating) {
                _this._makeSelection(true);
            }
        });
        nameButton[0].addEventListener('click', function () {
            var currentOrder = _this.s.dtPane.order()[0][1];
            _this.s.dtPane.order([0, currentOrder === 'asc' ? 'desc' : 'asc']).draw();
        });
        countButton[0].addEventListener('click', function () {
            var currentOrder = _this.s.dtPane.order()[0][1];
            _this.s.dtPane.order([1, currentOrder === 'asc' ? 'desc' : 'asc']).draw();
        });
        clear[0].addEventListener('click', function () {
            var searches = _this.dom.container.find('.' + _this.classes.search);
            for (var _i = 0, searches_2 = searches; _i < searches_2.length; _i++) {
                var search = searches_2[_i];
                $(search).val('');
                $(search).trigger('input');
            }
            _this.clearPane();
        });
        searchButton[0].addEventListener('click', function () {
            $(searchBox).focus();
        });
        $(searchBox).on('input', function () {
            _this.s.dtPane.search($(searchBox).val()).draw();
        });
        // When saving the state store all of the selected rows for preselection next time around
        this.s.dt.on('stateSaveParams.dt', function (e, settings, data) {
            var paneColumns = [];
            var searchTerm;
            if (_this.s.dtPane !== undefined) {
                paneColumns = _this.s.dtPane.rows({ selected: true }).data().pluck('filter').toArray();
                searchTerm = searchBox[0].innerHTML;
            }
            if (data.searchPanes === undefined) {
                data.searchPanes = [];
            }
            data.searchPanes.push({
                id: _this.s.index,
                searchTerm: searchTerm,
                selected: paneColumns
            });
        });
        // When an item is deselected on the pane, re add the currently selected items to the array
        // which holds selected items. Custom search will be performed.
        this.s.dtPane.on('deselect.dt', function () {
            t0 = setTimeout(function () {
                if (_this._getSelected(0)[0] === 0) {
                    $(clear).addClass(_this.classes.dull);
                }
                _this._makeSelection(false);
            }, 50);
        });
        this.s.dtPane.state.save();
    };
    /**
     * Appends all of the HTML elements to their relevant parent Elements
     * @param searchBox HTML Element for the searchBox
     * @param searchButton HTML Element for the searchButton
     * @param clear HTML Element for the clearButton
     * @param nameButton HTML Element for the nameButton
     * @param countButton HTML element for the countButton
     * @param dtP HTML element for the DataTable
     */
    SearchPane.prototype._displayPane = function (searchBox, searchButton, clear, nameButton, countButton, dtP) {
        var searchCont = $('<div/>').addClass(this.classes.searchCont);
        var searchLabelCont = $('<div/>').addClass(this.classes.searchLabelCont);
        var buttonGroup = $('<div/>').addClass(this.classes.buttonGroup);
        var container = this.dom.container;
        var colOpts = this.s.colOpts;
        var upper;
        var lower;
        $(this.dom.topRow).empty();
        $(dtP).empty();
        $(this.dom.topRow).addClass(this.classes.topRow);
        var layVal = parseInt(this.layout.split('-')[1], 10);
        if (layVal > 3) {
            $(this.dom.container).addClass(this.classes.smallGap);
        }
        $(this.dom.topRow).addClass(this.classes.subRowsContainer);
        upper = $('<div/>').addClass(this.classes.subRows);
        lower = $('<div/>').addClass(this.classes.subRows);
        $(upper).appendTo(this.dom.topRow);
        $(lower).appendTo(this.dom.topRow);
        $(searchCont).appendTo(upper);
        $(buttonGroup).appendTo(lower);
        if ((this.c.dtOpts !== undefined &&
            this.c.dtOpts.searching === false) ||
            (colOpts.dtOpts !== undefined &&
                colOpts.dtOpts.searching === false)) {
            $(searchBox).attr('disabled', 'disabled')
                .removeClass(this.classes.paneInputButton)
                .addClass(this.classes.disabledButton);
        }
        $(searchBox).appendTo(searchCont);
        if (this.classes.searchCont === 'ui icon input eight wide column') {
            $('<i class="' + this.classes.paneInputButton + '"></i>').appendTo(searchCont);
        }
        else {
            $(searchButton).appendTo(searchLabelCont);
            if (!((this.c.dtOpts !== undefined &&
                this.c.dtOpts.searching === false) ||
                (colOpts.dtOpts !== undefined &&
                    colOpts.dtOpts.searching === false))) {
                $(searchLabelCont).appendTo(searchCont);
            }
        }
        if (this.c.clear) {
            $(clear).appendTo(buttonGroup);
        }
        $(nameButton).appendTo(buttonGroup);
        if (!this.c.hideCount && !colOpts.hideCount) {
            $(countButton).appendTo(buttonGroup);
        }
        $(this.dom.topRow).prependTo(this.dom.container);
        $(container).append(dtP);
    };
    /**
     * Clear the selections in the pane
     */
    SearchPane.prototype.clearPane = function () {
        // Deselect all rows which are selected and update the table and filter count.
        this.s.dtPane.rows({ selected: true }).deselect();
        this._updateTable(false);
        this._updateFilterCount();
    };
    /**
     * Get the bins for the custom options
     * @param val the data in a row
     * @param comparisonObj The data for the custom Option
     * @param bins The counts for each of the different options in the column
     * @param binsTotal The total counts for each of the different options in the column
     * @return {object} comparisonObj the same object as a parameter but with updated counts
     */
    SearchPane.prototype._comparisonStatUpdate = function (val, comparisonObj, bins, binsTotal) {
        // If the value of the filter is a function then it will throw an error if we try to push on to it
        if (typeof comparisonObj.filter !== 'function') {
            comparisonObj.filter.push(val.filter);
        }
        // Update the totals
        bins !== undefined ? comparisonObj.shown += bins : comparisonObj.shown += 0;
        binsTotal !== undefined ? comparisonObj.total += binsTotal : comparisonObj.total += 0;
        return comparisonObj;
    };
    /**
     * Update the array which holds the display and filter values for the table
     */
    SearchPane.prototype._detailsPane = function () {
        var _this = this;
        var table = this.s.dt;
        var arrayTotals = [];
        table.rows().every(function (rowIdx, tableLoop, rowLoop) {
            _this._populatePaneArray(rowIdx, arrayTotals);
        });
        return arrayTotals;
    };
    /**
     * flattens?
     * @param arr the array to be flattened
     */
    SearchPane.prototype._flatten = function (arr) {
        return arr.reduce(function flatten(res, a) {
            Array.isArray(a) ? a.reduce(flatten, res) : res.push(a);
            return res;
        }, []);
    };
    /**
     * Find the unique filter values in an array
     * @param data empty array to populate with data which has not yet been found
     * @param arrayFilter the array of all of the display and filter values for the table
     */
    SearchPane.prototype._findUnique = function (data, arrayFilter) {
        var prev = [];
        for (var _i = 0, arrayFilter_1 = arrayFilter; _i < arrayFilter_1.length; _i++) {
            var filterEl = arrayFilter_1[_i];
            // If the data has not already been processed then add it to the unique array and the previously processed array.
            if (prev.indexOf(filterEl.filter) === -1) {
                data.push({
                    display: filterEl.display,
                    filter: filterEl.filter,
                    sort: filterEl.sort,
                    type: filterEl.type
                });
                prev.push(filterEl.filter);
            }
        }
    };
    /**
     * Gets the options for the row for the customPanes
     * @returns {object} The options for the row extended to include the options from the user.
     */
    SearchPane.prototype._getBonusOptions = function (rowLength) {
        var idx = this.s.index - rowLength;
        var defaults = {
            grouping: undefined,
            orthogonal: {
                comparison: undefined,
                display: 'display',
                hideCount: false,
                search: 'filter',
                show: undefined,
                sort: 'sort',
                threshold: undefined,
                type: 'type'
            },
            preSelect: undefined
        };
        return $.extend(true, {}, defaults, this.c !== undefined ? this.c : {});
    };
    /**
     * Adds the custom options to the pane
     * @param bins The counts of the different values which are currently visible in the column of the DataTable
     * @param binsTotal The counts of the different values which are in the original column of the DataTable
     * @returns {Array} Returns the array of rows which have been added to the pane
     */
    SearchPane.prototype._getComparisonRows = function (bins, binsTotal) {
        var colOpts = this.s.colOpts;
        var vals = this.s.dtPane.rows().data();
        // Find the appropriate options depending on whether this is a pane for a specific column or a custom pane
        var options = colOpts.options !== undefined ?
            colOpts.options :
            this.customPaneSettings.searchPanes !== undefined && this.customPaneSettings.searchPanes.options !== undefined ?
                this.customPaneSettings.searchPanes.options :
                undefined;
        if (options === undefined) {
            return;
        }
        var tableVals = this.s.dt.rows({ search: 'applied' }).data().toArray();
        var appRows = this.s.dt.rows({ search: 'applied' });
        var tableValsTotal = this.s.dt.rows().data().toArray();
        var allRows = this.s.dt.rows();
        // Clear all of the other rows from the pane, only custom options are to be displayed when they are defined
        this.s.dtPane.clear();
        var rows = [];
        for (var _i = 0, options_1 = options; _i < options_1.length; _i++) {
            var comp = options_1[_i];
            // Initialise the object which is to be placed in the row
            var comparisonObj = {
                display: comp.label !== '' ? comp.label : this.c.emptyMessage,
                filter: typeof comp.value === 'function' ? comp.value : [],
                shown: 0,
                total: 0,
                sort: comp.label !== '' ? comp.label : this.c.emptyMessage,
                type: comp.label !== '' ? comp.label : this.c.emptyMessage
            };
            // If a custom function is in place
            if (typeof comp.value === 'function') {
                var count = 0;
                var total = 0;
                // Count the number of times the function evaluates to true for the data currently being displayed
                for (var tVal = 0; tVal < tableVals.length; tVal++) {
                    if (comp.value.call(this.s.dt, tableVals[tVal], appRows[0][tVal])) {
                        count++;
                    }
                }
                // Count the number of times the function evaluates to true for the original data in the Table
                for (var i = 0; i < tableValsTotal.length; i++) {
                    if (comp.value.call(this.s.dt, tableValsTotal[i], allRows[0][i])) {
                        total++;
                    }
                }
                // Update the comparisonObj
                comparisonObj = this._comparisonStatUpdate(comp, comparisonObj, count, total);
            }
            // If not a custom option must be a predefined contition
            else {
                for (var _a = 0, vals_1 = vals; _a < vals_1.length; _a++) {
                    var val = vals_1[_a];
                    var condition = comp.condition;
                    // If the condition is one of the predefined conditions and the value
                    // of the rows filter meets the condition update the comparisonObj
                    if ((condition === '==' && val.filter === comp.value) ||
                        (condition === '!=' && val.filter !== comp.value) ||
                        (condition === '<' && val.filter < comp.value) ||
                        (condition === '>' && val.filter > comp.value) ||
                        (condition === '<=' && val.filter <= comp.value) ||
                        (condition === '>=' && val.filter >= comp.value) ||
                        (condition === 'includes' && val.filter.indexOf(comp.value) !== -1)) {
                        comparisonObj = this._comparisonStatUpdate(val, comparisonObj, bins[val.filter], binsTotal[val.filter]);
                    }
                }
            }
            // If cascadePanes is not active or if it is and the comparisonObj should be shown then add it to the pane
            if (!this.c.cascadePanes || (this.c.cascadePanes && comparisonObj.shown !== 0)) {
                rows.push(this._addRow(comparisonObj.display, comparisonObj.filter, comparisonObj.shown, comparisonObj.total, comparisonObj.sort, comparisonObj.type));
            }
        }
        return rows;
    };
    /**
     * Gets the options for the row for the customPanes
     * @returns {object} The options for the row extended to include the options from the user.
     */
    SearchPane.prototype._getOptions = function () {
        var table = this.s.dt;
        var defaults = {
            combiner: 'or',
            grouping: undefined,
            orthogonal: {
                comparison: undefined,
                display: 'display',
                hideCount: false,
                search: 'filter',
                show: undefined,
                sort: 'sort',
                threshold: undefined,
                type: 'type'
            },
            preSelect: undefined
        };
        return $.extend(true, {}, defaults, table.settings()[0].aoColumns[this.s.index].searchPanes);
    };
    /**
     * Adds to an array the number of selections which have been made in the certain pane.
     * @param filterCount a running total of the number of filters in place
     * @returns {integer} filterCount
     */
    SearchPane.prototype._getSelected = function (filterCount) {
        var selectArray = [];
        // If the pane doesn't exist there are no filters in place on it
        if (this.s.dtPane !== undefined) {
            var selected = this.s.dtPane.rows({ selected: true }).data().toArray().length;
            if (selected > 0) {
                this.s.filteringActive = true;
            }
            // Push on the number of selected rows in this pane and update filterCount
            selectArray.push(selected);
            filterCount += selected;
        }
        else {
            selectArray.push(0);
        }
        return selectArray;
    };
    /**
     * This method allows for changes to the panes and table to be made when a selection or a deselection occurs
     * @param select Denotes whether a selection has been made or not
     */
    SearchPane.prototype._makeSelection = function (select) {
        this._updateTable(select);
        this._updateFilterCount();
        this.s.updating = true;
        this.s.dt.draw();
        this.s.updating = false;
    };
    /**
     * Fill the array with the values that are currently being displayed in the table
     * @returns {array} arrayFilter The array containing all of the elements currently being shown in the table
     */
    SearchPane.prototype._populatePane = function () {
        var _this = this;
        var table = this.s.dt;
        var arrayFilter = [];
        if (this.c.cascadePanes || this.c.viewTotal) {
            table.rows({ search: 'applied' }).every(function (rowIdx, tableLoop, rowLoop) {
                _this._populatePaneArray(rowIdx, arrayFilter);
            });
        }
        else {
            table.rows().every(function (rowIdx, tableLoop, rowLoop) {
                _this._populatePaneArray(rowIdx, arrayFilter);
            });
        }
        return arrayFilter;
    };
    /**
     * populates an array with all of the data for the table
     * @param rowIdx The current row index to be compared
     */
    SearchPane.prototype._populatePaneArray = function (rowIdx, arrayFilter) {
        var colOpts = this.s.colOpts;
        var table = this.s.dt;
        var classes = this.classes;
        var array = [];
        var idx = this.s.index;
        var cell = table.cell(rowIdx, idx);
        // Retrieve the rendered data from the cell
        var filter = typeof (colOpts.orthogonal) === 'string'
            ? cell.render(colOpts.orthogonal)
            : cell.render(colOpts.orthogonal.search);
        var display = typeof (colOpts.orthogonal) === 'string'
            ? cell.render(colOpts.orthogonal)
            : cell.render(colOpts.orthogonal.display);
        var sort = cell.render(colOpts.orthogonal) === 'string'
            ? cell.render(colOpts.orthogonal)
            : cell.render(colOpts.orthogonal.sort);
        var type = cell.render(colOpts.orthogonal) === 'string'
            ? cell.render(colOpts.orthogonal)
            : cell.render(colOpts.orthogonal.type);
        // If the filter is an array then take a note of this, and add the elements to the arrayFilter array
        if (Array.isArray(filter) || filter instanceof DataTable.Api) {
            if (classes.arrayCols.indexOf(idx) === -1) {
                classes.arrayCols.push(idx);
            }
            if (filter instanceof DataTable.Api) {
                filter = filter.toArray();
                display = display.toArray();
            }
            if (filter.length === display.length) {
                for (var i = 0; i < filter.length; i++) {
                    arrayFilter.push({
                        display: display[i],
                        filter: filter[i],
                        sort: sort,
                        type: type
                    });
                }
            }
            else {
                throw new Error('display and filter not the same length');
            }
        }
        else {
            arrayFilter.push({
                display: display,
                filter: filter,
                sort: sort,
                type: type
            });
        }
    };
    /**
     * Reloads all of the previous selects into the panes
     * @param loadedFilter The loaded filters from a previous state
     */
    SearchPane.prototype._reloadSelect = function (loadedFilter) {
        // If the state was not saved don't selected any
        if (loadedFilter === undefined) {
            return;
        }
        // For each pane, check that the loadedFilter list exists and is not null,
        // find the id of each search item and set it to be selected.
        var idx;
        for (var i = 0; i < loadedFilter.searchPanes.length; i++) {
            if (loadedFilter.searchPanes[i].id === this.s.index) {
                idx = i;
                break;
            }
        }
        if (idx !== undefined) {
            var table = this.s.dtPane;
            var rows = table.rows({ order: 'index' }).data().pluck('filter').toArray();
            this.dom.searchBox.innerHTML = loadedFilter.searchPanes[idx].searchTerm;
            for (var _i = 0, _a = loadedFilter.searchPanes[idx].selected; _i < _a.length; _i++) {
                var filter = _a[_i];
                var id = rows.indexOf(filter);
                if (id > -1) {
                    table.row(id).select();
                }
            }
        }
    };
    /**
     * Adds outline to the pane when a selection has been made
     */
    SearchPane.prototype._searchExtras = function () {
        var updating = this.s.updating;
        this.s.updating = true;
        var filters = this.s.dtPane.rows({ selected: true }).data().pluck('filter').toArray();
        var nullIndex = filters.indexOf(this.c.emptyMessage);
        var container = $(this.s.dtPane.table().container());
        // If null index is found then search for empty cells as a filter.
        if (nullIndex > -1) {
            filters[nullIndex] = '';
        }
        // If a filter has been applied then outline the respective pane, remove it when it no longer is.
        if (filters.length > 0) {
            container.addClass(this.classes.selected);
        }
        else if (filters.length === 0) {
            container.removeClass(this.classes.selected);
        }
        this.s.updating = updating;
    };
    /**
     * Finds the ratio of the number of different options in the table to the number of rows
     * @param bins the number of different options in the table
     * @param rowCount the total number of rows in the table
     * @returns {number} returns the ratio
     */
    SearchPane.prototype._uniqueRatio = function (bins, rowCount) {
        if (rowCount > 0) {
            return bins / rowCount;
        }
        else {
            return 1;
        }
    };
    /**
     * updates the options within the pane
     * @param filterIdx the index of the postition of a sole selected option
     * @param draw a flag to define whether this has been called due to a draw event or not
     */
    SearchPane.prototype._updateCommon = function (filterIdx, draw) {
        if (draw === void 0) { draw = false; }
        // Update the panes if doing a deselect. if doing a select then
        // update all of the panes except for the one causing the change
        if (this.s.dtPane !== undefined && (!this.s.filteringActive || draw === true)) {
            var colOpts = this.s.colOpts;
            var selected = this.s.dtPane.rows({ selected: true }).data().toArray();
            var scrollTop = $(this.s.dtPane.table().node()).parent()[0].scrollTop;
            var arrayFilter = [];
            var arrayTotals = [];
            var data = [];
            var bins = {};
            var binsTotal = {};
            // Clear the pane in preparation for adding the updated search options
            this.s.dtPane.clear();
            // If it is not a custom pane
            if (this.colExists) {
                arrayFilter = this._populatePane();
                bins = this._binData(this._flatten(arrayFilter));
                this._findUnique(data, arrayFilter);
                // If the viewTotal option is selected then find the totals for the table
                if (this.c.viewTotal) {
                    data = [];
                    arrayTotals = this._detailsPane();
                    binsTotal = this._binData(this._flatten(arrayTotals));
                    this._findUnique(data, arrayTotals);
                }
                else {
                    binsTotal = bins;
                }
                // If a filter has been removed so that only one remains then the remaining filter should have
                // the non filtered formatting, therefore set filteringActive to be false.
                if (filterIdx !== undefined && filterIdx === this.s.index) {
                    this.s.filteringActive = false;
                }
                var _loop_1 = function (dataP) {
                    if (dataP) {
                        var row = void 0;
                        // If both view Total and cascadePanes have been selected and the count of the row is not 0 then add it to pane
                        // Do this also if the viewTotal option has been selected and cascadePanes has not
                        if ((bins[dataP.filter] !== undefined && this_1.c.cascadePanes) || !this_1.c.cascadePanes) {
                            row = this_1._addRow(dataP.display, dataP.filter, !this_1.c.viewTotal
                                ? bins[dataP.filter]
                                : bins[dataP.filter] !== undefined
                                    ? bins[dataP.filter]
                                    : '0', this_1.c.viewTotal
                                ? String(binsTotal[dataP.filter])
                                : bins[dataP.filter], dataP.sort, dataP.type);
                        }
                        // Find out if the filter was selected in the previous search, if so select it and remove from array.
                        var selectIndex = selected.findIndex(function (element) {
                            return element.filter === dataP.filter;
                        });
                        if (selectIndex !== -1) {
                            row.select();
                            selected.splice(selectIndex, 1);
                        }
                    }
                };
                var this_1 = this;
                for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
                    var dataP = data_1[_i];
                    _loop_1(dataP);
                }
            }
            if ((colOpts.searchPanes !== undefined && colOpts.searchPanes.options !== undefined) ||
                colOpts.options !== undefined ||
                (this.customPaneSettings !== undefined && this.customPaneSettings.searchPanes.options !== undefined)) {
                var rows = this._getComparisonRows(bins, binsTotal);
                var _loop_2 = function (row) {
                    var selectIndex = selected.findIndex(function (element) {
                        if (element.display === row.data().display) {
                            return true;
                        }
                    });
                    if (selectIndex !== -1) {
                        row.select();
                        selected.splice(selectIndex, 1);
                    }
                };
                for (var _a = 0, rows_1 = rows; _a < rows_1.length; _a++) {
                    var row = rows_1[_a];
                    _loop_2(row);
                }
            }
            // Set filtering Active to be again if it was previously set to false,
            // so that succeeding panes have the correct formatting.
            if (filterIdx !== undefined && filterIdx === this.s.index) {
                this.s.filteringActive = true;
            }
            // Add search options which were previously selected but whos results are no
            // longer present in the resulting data set.
            for (var _b = 0, selected_1 = selected; _b < selected_1.length; _b++) {
                var selectedEl = selected_1[_b];
                if ((draw && bins[selectedEl.filter] !== undefined) || !draw) {
                    var row = this._addRow(selectedEl.display, selectedEl.filter, 0, 0, selectedEl.filter, selectedEl.filter);
                    row.select();
                }
                else {
                    var id = void 0;
                    for (var _c = 0, _d = this.s.columns[this.s.index]; _c < _d.length; _c++) {
                        var selection = _d[_c];
                        if (selection.filter === selectedEl.filter) {
                            id = this.s.columns[this.s.index].indexOf(selection);
                            break;
                        }
                    }
                    if (id !== undefined) {
                        this.s.columns[this.s.index].splice(id, 1);
                    }
                }
            }
            if (this.s.dtPane.rows().data().toArray().length === 0) {
                arrayTotals = this._detailsPane();
                binsTotal = this._binData(this._flatten(arrayTotals));
                this._findUnique(data, arrayTotals);
                for (var _e = 0, data_2 = data; _e < data_2.length; _e++) {
                    var element = data_2[_e];
                    this._addRow(element.filter, element.filter, binsTotal[element.filter], binsTotal[element.filter], element.sort, element.type);
                }
            }
            this.s.dtPane.draw();
            this.s.dtPane.table().node().parentNode.scrollTop = scrollTop;
        }
    };
    /**
     * Updates the panes if one of the options to do so has been set to true
     * @param select whether this has been triggered by a select event or not
     */
    SearchPane.prototype._updateTable = function (select) {
        var selectedRows = this.s.dtPane.rows({ selected: true }).data().toArray();
        this.selections = selectedRows;
        this._searchExtras();
        // If either of the options that effect how the panes are displayed are selected then update the Panes
        if (this.c.cascadePanes || this.c.viewTotal) {
            this._updatePane(select, true);
        }
    };
    /**
     * Updates the number of filters that have been applied in the title
     */
    SearchPane.prototype._updateFilterCount = function () {
        return this.s.dtPane !== undefined ?
            this.s.dtPane.rows({ selected: true }).data().toArray().length :
            0;
    };
    /**
     * Updates the values of all of the panes
     * @param select whether a select has been made in a pane or not
     * @param draw whether this has been triggered by a draw event or not
     */
    SearchPane.prototype._updatePane = function (select, filteringActive, draw) {
        if (draw === void 0) { draw = false; }
        this.s.updating = true;
        this.s.filteringActive = false;
        var selectArray = [];
        var filterCount = 0;
        var filterIdx;
        // If the viewTotal option is active then it must be determined whether there is a filter in place already
        if (this.c.viewTotal) {
            // There is if select is true
            if (select || filteringActive) {
                this.s.filteringActive = true;
            }
            // If there is only one in place then find the index of the corresponding pane
            if (filterCount === 1) {
                filterIdx = selectArray.indexOf(1);
            }
        }
        this._updateCommon(filterIdx, draw);
        this.s.updating = false;
    };
    SearchPane.prototype._addRow = function (display, filter, shown, total, sort, type) {
        return this.s.dtPane.row.add({
            display: display !== '' ? display : this.c.emptyMessage,
            filter: filter,
            shown: shown,
            total: total,
            sort: sort !== '' ? sort : this.c.emptyMessage,
            type: type
        });
    };
    SearchPane.version = '0.0.2';
    SearchPane.classes = {
        arrayCols: [],
        badgePill: '',
        buttonGroup: 'dtsp-buttonGroup',
        buttonSub: 'dtsp-buttonSub',
        clear: 'dtsp-clear',
        clearAll: 'dtsp-clearAll',
        container: 'dtsp-searchPane',
        disabledButton: 'dtsp-disabledButton',
        dull: 'dtsp-dull',
        hidden: 'dtsp-hidden',
        hide: 'dtsp-hide',
        item: {
            count: 'dtsp-count',
            label: 'dtsp-label',
            selected: 'dtsp-selected'
        },
        layout: 'dtsp-',
        narrow: 'dtsp-narrow',
        pane: {
            active: 'dtsp-filtering',
            container: 'dtsp-pane',
            scroller: 'dtsp-scroller',
            title: 'dtsp-title'
        },
        paneButton: 'dtsp-paneButton',
        paneInputButton: 'dtsp-paneInputButton',
        pill: 'dtsp-pill',
        search: 'dtsp-search',
        searchCont: 'dtsp-searchCont',
        searchIcon: 'dtsp-searchIcon',
        searchLabelCont: 'dtsp-searchButtonCont',
        selected: 'dtsp-selected',
        smallGap: 'dtsp-smallGap',
        subRows: 'dtsp-subRows',
        subRowsContainer: 'dtsp-subRowsContainer',
        title: 'dtsp-title',
        topRow: 'dtsp-topRow'
    };
    // Define SearchPanes default options
    SearchPane.defaults = {
        cascadePanes: false,
        clear: true,
        container: function (dt) {
            return dt.table().container();
        },
        dataLength: 30,
        emptyMessage: '<i>No Data</i>',
        threshold: 0.6,
        viewTotal: false
    };
    return SearchPane;
}());
export default SearchPane;
