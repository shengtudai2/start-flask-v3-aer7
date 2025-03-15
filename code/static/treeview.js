function toggleChildren(parentId, parentElement) {
    // 检查子元素是否已经加载
    if (parentElement.has("ul").length > 0) {
        // 子元素已加载，进行展开/折叠切换
        const chevron = parentElement.find('.fas.fa-chevron-right');
        chevron.toggleClass('rotate-90');
        parentElement.children("ul").slideToggle(200);
    } else {
        var underscoreCount = (parentId.match(/_/g) || []).length;
        if (underscoreCount == 3) {
            ShowTable(parentId);
            return;
        }
        // 显示加载状态
        parentElement.find('.fas.fa-chevron-right').addClass('animate-spin');
        
        // 子元素尚未加载，从服务器获取并展示子元素
        $.getJSON('/get_children/' + parentId)
        .done(function(data) {
            var subtree = $('<ul class="tree" style="display: none;">');
            $.each(data, function(id, name) {
                var listItem = $('<li>')
                    .attr('data-id', id)
                    .on('click', function(e) {
                        e.stopPropagation();
                        toggleChildren(id, $(this));
                    });
                
                var textSpan = $('<span></span>').text(name);
                
                // 根据层级判断是否添加表格图标
                var underscoreCount = (id.match(/_/g) || []).length;
                if (underscoreCount === 3) {
                    var tableIcon = $('<i class="fas fa-table mr-2 text-gray-400"></i>');
                    listItem.append(tableIcon);
                }
                
                listItem.append(textSpan);
                subtree.append(listItem);
            });
            parentElement.append(subtree);
            subtree.slideDown(200);
            parentElement.find('.fas.fa-chevron-right')
                .removeClass('animate-spin')
                .addClass('rotate-90');
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.error('加载数据失败:', textStatus, errorThrown);
            parentElement.find('.fas.fa-chevron-right').removeClass('animate-spin');
            const errorMsg = $('<div class="text-red-500 text-sm mt-2">加载失败，请重试</div>');
            parentElement.append(errorMsg);
            setTimeout(() => errorMsg.fadeOut(500, function() { $(this).remove(); }), 3000);
        });
    }
}

function ShowTable(itemId) {
    $('.loading-spinner').show();
    $.getJSON('/show_table/' + itemId)
    .done(function(data) {
        $('#table-name').text(data.fn);
        $('#unit').html('<i class="fas fa-ruler mr-2 text-blue-600"></i><span class="font-medium">单位：</span>' + data.unit);
        $('#data-source').html('<i class="fas fa-database mr-2 text-blue-600"></i><span class="font-medium">数据来源：</span>' + data.dataSource);

        var csvData = data.tb;
        var rows = csvData.split("\r\n");
        var headers = rows[0].split(",");

        if ($.fn.dataTable.isDataTable('#table-details')) {
            $('#table-details').DataTable().destroy();
        }
        
        $('#table-details').empty();

        var theadHtml = '<thead><tr>';
        headers.forEach(function(header) {
            theadHtml += '<th>' + header.trim() + '</th>';
        });
        theadHtml += '</tr></thead>';
        $('#table-details').append(theadHtml);

        var tbodyHtml = '<tbody>';
        rows.slice(1).forEach(function(row) {
            if(row.trim() === "") return;
            var cells = row.split(",");
            tbodyHtml += '<tr>';
            cells.forEach(function(cell) {
                tbodyHtml += '<td>' + cell.trim() + '</td>';
            });
            tbodyHtml += '</tr>';
        });
        tbodyHtml += '</tbody>';
        $('#table-details').append(tbodyHtml);

        $('#table-details').DataTable({
            "scrollX": true,
            "autoWidth": false,
            "language": {
                "search": "搜索：",
                "lengthMenu": "显示 _MENU_ 条记录",
                "info": "显示第 _START_ 至 _END_ 项结果，共 _TOTAL_ 项",
                "infoEmpty": "显示第 0 至 0 项结果，共 0 项",
                "infoFiltered": "(由 _MAX_ 项结果过滤)",
                "paginate": {
                    "first": "首页",
                    "last": "末页",
                    "next": "下一页",
                    "previous": "上一页"
                }
            }
        });
        $('.loading-spinner').hide();
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.error('加载表格数据失败:', textStatus, errorThrown);
        $('.loading-spinner').hide();
        const errorMsg = $('<div class="text-red-500 text-center py-4">加载数据失败，请刷新页面重试</div>');
        $('#table-details').html(errorMsg);
    });
}

function downloadTableToCSV() {
    var table = $('#table-details').DataTable();
    var data = table.rows().data();
    var csv = [];

    var tableName = $('#table-name').text();
    var filename = tableName.split('-').slice(-2).join('-') + '.csv';

    var headers = [];
    table.columns().every(function() {
        headers.push(this.header().textContent);
    });
    csv.push(headers.join(","));

    data.each(function(rowData) {
        var row = [];
        rowData.forEach(function(cellData) {
            row.push(cellData);
        });
        csv.push(row.join(","));
    });

    csv.push("\n" + $('#unit').text() + "\n" + $('#data-source').text());
    downloadCSVFile(csv.join("\n"), filename);
}

function downloadCSVFile(csv, filename) {
    var csvFile = new Blob(['\uFEFF', csv], {type: "text/csv;charset=gbk"});
    var downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

$(document).ready(function() {
    // 为根节点添加点击事件处理
    $('#tree-view li[data-id="root"]').on('click', function(e) {
        e.stopPropagation();
        toggleChildren('root', $(this));
    });
    // 隐藏根节点的文本，只保留箭头
    $('#tree-view li[data-id="root"] > span').hide();
    // 自动触发点击事件展开根节点
    $('#tree-view li[data-id="root"]').trigger('click');
});


// 添加拖拽调整功能
$(document).ready(function() {
    let isResizing = false;
    let lastDownX = 0;
    let sidebar = $('#sidebar');
    let resizer = $('#resizer');
    let defaultWidth = Math.max(window.innerWidth * 0.25, 200); // 默认宽度为屏幕宽度的1/4
    let minWidth = defaultWidth;
    let maxWidth = window.innerWidth * 0.5;
    let userSetWidth = null;

    // 初始化侧边栏宽度
    sidebar.css('width', defaultWidth + 'px');

    resizer.on('mousedown', function(e) {
        isResizing = true;
        lastDownX = e.clientX;
        $(document).on('mousemove', function(e) {
            if (!isResizing) return;
            let newWidth = sidebar.width() + (e.clientX - lastDownX);
            // 限制最小和最大宽度
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            sidebar.css('width', newWidth + 'px');
            userSetWidth = newWidth; // 记录用户手动设置的宽度
            lastDownX = e.clientX;
        });
    });

    $(document).on('mouseup', function() {
        isResizing = false;
        $(document).off('mousemove');
    });

    // 优化目录栏展开折叠效果
    function adjustSidebarWidth() {
        if (userSetWidth !== null) return; // 如果用户手动设置了宽度，则不自动调整

        let treeContent = $('#tree-view');
        let contentWidth = 0;

        // 计算所有可见元素的最大宽度
        $('#tree-view li:visible').each(function() {
            let itemWidth = $(this).outerWidth(true);
            contentWidth = Math.max(contentWidth, itemWidth);
        });

        // 添加padding和margin的空间
        contentWidth += 40;

        // 确保宽度不小于默认宽度
        contentWidth = Math.max(defaultWidth, Math.min(maxWidth, contentWidth));
        sidebar.css('width', contentWidth + 'px');
    }

    // 在树形结构变化时调整宽度
    const observer = new MutationObserver(function(mutations) {
        adjustSidebarWidth();
    });

    observer.observe(document.getElementById('tree-view'), {
        childList: true,
        subtree: true,
        attributes: true
    });

    // 监听slideToggle完成事件
    $('#tree-view').on('slideToggle', function() {
        adjustSidebarWidth();
    });

    // 双击resizer重置为自动宽度
    resizer.on('dblclick', function() {
        userSetWidth = null;
        adjustSidebarWidth();
    });

    // 监听窗口大小变化
    $(window).on('resize', function() {
        defaultWidth = Math.max(window.innerWidth * 0.25, 200);
        minWidth = defaultWidth;
        maxWidth = window.innerWidth * 0.5;
        if (!userSetWidth) {
            adjustSidebarWidth();
        }
    });
});


