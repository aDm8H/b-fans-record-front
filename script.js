const $ = mdui.$;
const isDark = moment().hour() >= 6 && moment().hour() < 18 ? false : true;
if (isDark) $("body")[0].classList += "mdui-theme-layout-dark";

chartSize($(".mdui-col-xs-6")[0], $("#dayChart"));
chartSize($(".mdui-col-xs-6")[1], $("#recentChart"));

const numSpan = $("#rt-fans-num");
const timeSpan = $("#update-time");
const trendingArrow = $("#trending-arrow");

var allDataArr = [];
var recentDataArr = [];

var wsURL = getQueryVariable("ws");
if (!wsURL) wsURL = "ws://127.0.0.1:12102";
var ws = new ReconnectingWebSocket(wsURL);
ws.addEventListener("open", () => {
    console.log("[WS]连接成功");

    ws.send(JSON.stringify({ type: "range", len: RECENT_LENGTH, sampling: false }));
    ws.send(JSON.stringify({ type: HUGECHART_TYPE, len: HUGECHART_LENGTH, sampling: HUGECHART_TYPE == "all" ? true : false }));
});
var ltNum;
const COLOR_UP = isDark ? "#FF6341" : "#C80000",
    COLOR_DOWN = isDark ? "#34E36F" : "#006D21";
ws.addEventListener("message", msg => {
    console.debug("[WS]收到数据", msg);
    var res = JSON.parse(msg.data);

    function handleLabels(_LastTimeNum, _ThisTimeNum, _ThisTimeTime) {
        if (_LastTimeNum > _ThisTimeNum) {
            //跌
            numSpan.css("color", COLOR_DOWN);
            trendingArrow.css("color", COLOR_DOWN);
            trendingArrow.text("trending_down");
        } else if (_LastTimeNum < _ThisTimeNum) {
            //涨
            numSpan.css("color", COLOR_UP);
            trendingArrow.css("color", COLOR_UP);
            trendingArrow.text("trending_up");
        }
        numSpan.text(`${_ThisTimeNum.toLocaleString()}（${(_ThisTimeNum / 10000).toFixed(2)}万）`);
        timeSpan.text(moment(_ThisTimeTime).format("HH:mm:ss"));
    }

    if (res.type == "rt") {
        HUGECHART_TYPE == "all" || allDataArr.length < HUGECHART_LENGTH ? 1 : allDataArr.pop();
        allDataArr.unshift(res.data);
        recentDataArr.length < RECENT_LENGTH ? 1 : recentDataArr.pop();
        recentDataArr.unshift(res.data);

        var num = res.data[1];
        if (!ltNum) ltNum = num;
        handleLabels(ltNum, num, res.data[0]);
        ltNum = num;
    } else if (res.type == "range") {
        if (res.len > RECENT_LENGTH) allDataArr = res.data;
        else {
            recentDataArr = res.data;
            var num = recentDataArr[0][1];
            ltNum = recentDataArr[1][1];
            handleLabels(ltNum, num, recentDataArr[0][0]);
            ltNum = num;
        }
    } else if (res.type == "all") {
        allDataArr = res.data;
    }

    //线性回归
    var regression = linearRegression();
    console.debug("线性回归计算", regression);
    var dNumps = (regression.b * 60 * 1000).toFixed(1);

    var compliedTitle = RECENT_DURATION;
    if (dNumps == 0) compliedTitle += "（粉丝量稳定）";
    else compliedTitle += dNumps > 0 ? `（线性回归斜率: +${dNumps}人/分钟）` : `（线性回归斜率: ${dNumps}人/分钟）`;
    var allDataOpt = {
        series: [
            {
                name: "粉丝数",
                data: allDataArr,
            },
        ],
    };
    var recentDataOpt = {
        title: {
            text: compliedTitle,
        },
        series: [
            {
                name: "粉丝数",
                data: recentDataArr,
            },
            {
                name: "线性回归",
                type: "line",
                data: regression.points,
                lineStyle: {
                    color: dNumps > 0 ? COLOR_UP : COLOR_DOWN,
                },
            },
        ],
    };
    dayChart.setOption(allDataOpt);
    recentChart.setOption(recentDataOpt);
});

var dayChart = echarts.init(document.getElementById("dayChart"), typeof isDark != "undefined" && isDark ? "dark" : "light");
var recentChart = echarts.init(document.getElementById("recentChart"), typeof isDark != "undefined" && isDark ? "dark" : "light");

var allChartDefaultOpt = {
    backgroundColor: "",
    title: {
        text: HUGECHART_TEXT,
    },
    xAxis: {
        type: "time",
        splitLine: {
            show: false,
        },
    },
    yAxis: {
        type: "value",
        min: function (value) {
            return value.min - (value.max - value.min) / 10;
        },
        axisLabel: {
            formatter: num2w,
        },
    },
    series: [
        {
            name: "粉丝数",
            type: "line",
            sampling: "lttb",
            showSymbol: false,
            lineStyle: {
                width: 4,
                shadowColor: isDark ? "rgba(255,255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)",
                shadowBlur: 6,
            },
        },
    ],
    grid: {
        left: 5,
        right: 20,
        bottom: 20,
        containLabel: true,
    },
};
var recentChartDefaultOpt = {
    backgroundColor: "",

    xAxis: {
        type: "time",
        splitLine: {
            show: false,
        },
        axisLabel: {
            hideOverlap: true,
        },
    },
    yAxis: {
        type: "value",
        min: function (value) {
            return (value.min - 2).toFixed(0);
        },
        max: function (value) {
            return (value.max + 2).toFixed(0);
        },
    },
    series: [
        {
            name: "粉丝数",
            type: "line",
            showSymbol: true,
            symbolSize: 6,
            lineStyle: {
                width: 3,
                shadowColor: isDark ? "rgba(255,255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)",
                shadowBlur: 5,
            },
        },
        {
            name: "",
            type: "line",
            showSymbol: false,
            lineStyle: {
                width: 3,
                opacity: isDark ? 0.7 : 0.8,
            },
        },
    ],
    grid: {
        left: 5,
        right: 22,
        bottom: 20,
        containLabel: true,
    },
};

dayChart.setOption(allChartDefaultOpt);
recentChart.setOption(recentChartDefaultOpt);

//以下为封装的函数

//改变图表宽高
function chartSize(container, charts) {
    function getStyle(el, name) {
        if (window.getComputedStyle) {
            return window.getComputedStyle(el, null);
        } else {
            return el.currentStyle;
        }
    }
    var wi = getStyle(container, "width").width;
    var hi = getStyle(container, "height").height;
    charts.width = wi;
    charts.height = hi;
    console.debug("图表宽高: ", wi, hi);
}

//计算回归方程

function linearRegression() {
    var St = 0,
        Sy = 0;
    var len = recentDataArr.length;
    recentDataArr.forEach(row => {
        St += row[0];
        Sy += row[1];
    });
    var tAvg = St / len,
        yAvg = Sy / len;
    var Sc = 0,
        Sm = 0;
    recentDataArr.forEach(row => {
        Sc += (row[0] - tAvg) * (row[1] - yAvg);
        Sm += (row[0] - tAvg) * (row[0] - tAvg);
    });
    var b = Sc / Sm;
    var a = yAvg - b * tAvg;

    var points = [
        [recentDataArr[0][0], b * recentDataArr[0][0] + a],
        [recentDataArr[recentDataArr.length - 1][0], b * recentDataArr[recentDataArr.length - 1][0] + a],
    ];
    var regression = {
        b: b,
        a: a,
        points: points,
    };
    return regression;
}

//数字转换为以万为单位
function num2w(num) {
    return `${(num / 10000).toFixed(2)}w`;
}

//获取URL参数
function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return false;
}
