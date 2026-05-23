// 电商日报系统 v2 - 百事玻璃主题
var R=React,RD=ReactDOM,RC=window.Recharts||{};
var useState=R.useState,useEffect=R.useEffect,useMemo=R.useMemo;
var createElement=R.createElement,Fragment=R.Fragment;
var LineChart=RC.LineChart,Line=RC.Line,BarChart=RC.BarChart,Bar=RC.Bar,XAxis=RC.XAxis,YAxis=RC.YAxis;
var CartesianGrid=RC.CartesianGrid,Tooltip=RC.Tooltip,ResponsiveContainer=RC.ResponsiveContainer,Legend=RC.Legend;

var GH_REPO='wulonglu/KZC_Report';
var GH_RAW='https://raw.githubusercontent.com/'+GH_REPO+'/main/data/';
var GH_API='https://api.github.com/repos/'+GH_REPO+'/contents/data/';
function getToken(){return localStorage.getItem('gh_token')||''}
function ghHeaders(t){var h={Accept:'application/vnd.github.v3+json'};if(t)h.Authorization='Bearer '+t;return h}

var STORES=[
  {name:'百事天猫旗舰店',platform:'天猫'},{name:'佳得乐天猫旗舰店',platform:'天猫'},
  {name:'C店-康智',platform:'C店'},{name:'C店-特好买',platform:'C店'},
  {name:'拼多多-水饮专卖店',platform:'拼多多'},{name:'拼多多-劲爽专卖店',platform:'拼多多'}
];
var RANGE_PRESETS=['今日','昨日','本周','上周','本月','上月'];

function getToday(){return new Date().toISOString().substring(0,10)}
function monthKey(d){return d.substring(0,7)}
function fmtMoney(n){if(!n&&n!==0)return'-';if(n>=10000)return(n/10000).toFixed(2)+'万';return Number(n).toFixed(2)}
function fmtPct(n){return Number(n||0).toFixed(2)+'%'}
function fmtNum(n){return Number(n||0).toLocaleString()}
function getDateRange(label){
  var now=new Date(),today=getToday();function d(dd){return dd.toISOString().substring(0,10)}
  switch(label){
    case'今日':return[today,today];
    case'昨日':var y=new Date(now);y.setDate(y.getDate()-1);return[d(y),d(y)];
    case'本周':var day=now.getDay()||7;var m=new Date(now);m.setDate(now.getDate()-day+1);return[d(m),today];
    case'上周':var day2=now.getDay()||7;var m2=new Date(now);m2.setDate(now.getDate()-day2-6);var s=new Date(now);s.setDate(now.getDate()-day2);return[d(m2),d(s)];
    case'本月':return[d(new Date(now.getFullYear(),now.getMonth(),1)),today];
    case'上月':return[d(new Date(now.getFullYear(),now.getMonth()-1,1)),d(new Date(now.getFullYear(),now.getMonth(),0))];
    default:return[today,today];
  }
}
function compute(m){
  var net=m.paymentAmount-m.refundAmount;
  return{name:m.name,platform:m.platform,targetGmv:m.targetGmv,paymentAmount:m.paymentAmount,refundAmount:m.refundAmount,lastYearSame:m.lastYearSame,visitors:m.visitors,buyers:m.buyers,salesCount:m.salesCount,netGmv:net,yoyGrowth:m.lastYearSame>0?((net-m.lastYearSame)/m.lastYearSame*100):0,achievementRate:m.targetGmv>0?(net/m.targetGmv*100):0,avgOrderValue:m.buyers>0?m.paymentAmount/m.buyers:0,conversionRate:m.visitors>0?(m.buyers/m.visitors*100):0};
}

async function loadMonth(dateStr){
  var key=monthKey(dateStr),url=GH_RAW+key+'.json';
  try{var r=await fetch(url);if(r.status===200){var data=await r.json();return data.reports||[]}}catch(e){}
  var token=getToken();
  if(token){var r2=await fetch(GH_API+key+'.json',{headers:ghHeaders(token)});if(r2.status===404)return[];if(r2.ok){var f=await r2.json();if(f.content)return JSON.parse(atob(f.content.replace(/\n/g,''))).reports||[]}}
  return[];
}
async function saveReport(report){
  var token=getToken();if(!token)throw new Error('需要Token');
  var url=GH_API+monthKey(report.date)+'.json',existing=[],sha='';
  try{var r=await fetch(url,{headers:ghHeaders(token)});if(r.ok){var f=await r.json();sha=f.sha;if(f.content)existing=JSON.parse(atob(f.content.replace(/\n/g,''))).reports||[]}}catch(e){}
  var idx=existing.findIndex(function(rr){return rr.date===report.date});
  if(idx>=0)existing[idx]=report;else existing.push(report);
  existing.sort(function(a,b){return a.date.localeCompare(b.date)});
  var content=btoa(unescape(encodeURIComponent(JSON.stringify({reports:existing}))));
  var body={message:'update '+report.date,content:content};if(sha)body.sha=sha;
  var r2=await fetch(url,{method:'PUT',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github.v3+json','Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r2.ok){var e=await r2.json().catch(function(){return{}});throw new Error(e.message||'保存失败')}
}
async function loadRange(start,end){
  var sm=monthKey(start),em=monthKey(end),months=[],cur=new Date(sm+'-01'),ed=new Date(em+'-01');
  while(cur<=ed){months.push(cur.toISOString().substring(0,7));cur.setMonth(cur.getMonth()+1)}
  var all=[];for(var i=0;i<months.length;i++)all=all.concat(await loadMonth(months[i]+'-01'));
  return all.filter(function(r){return r.date>=start&&r.date<=end});
}

function MetricCard(p){return createElement('div',{className:p.accent?'mc '+p.accent:'mc'},createElement('div',{className:'mcl'},p.label),createElement('div',{className:'mcv'},p.value),p.sub?createElement('div',{className:'mcs'},p.sub):null)}
function BigCard(p){return createElement('div',{className:'bc'},createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:4}},createElement('div',{className:'bcl'},p.label),createElement('div',{style:{fontSize:9,color:'rgba(255,255,255,.12)'}},p.target||'')),createElement('div',{className:'bcv'},p.value,createElement('span',{className:'bcv-sub'},p.unit||'')),createElement('div',{className:'bc-bar'},createElement('div',{className:'bc-bar-inner '+(p.barClass||'bc-bar-blue'),style:{width:p.pct+'%'}})),createElement('div',{className:'bc-info'},createElement('span',null,p.detail||''),createElement('span',null,p.extra||'')))}

// 图表暗色主题配置
var chartGrid={stroke:'rgba(255,255,255,.04)',strokeDasharray:'3 3'};
var chartAxis={tick:{fontSize:10,fill:'rgba(255,255,255,.25)'},axisLine:{stroke:'rgba(255,255,255,.06)'},tickLine:false};
var chartTooltip={contentStyle:{background:'rgba(2,13,31,.95)',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,color:'#fff',fontSize:12},labelStyle:{color:'rgba(255,255,255,.5)'}};

function DataEntry(){
  var _l=useState(true),_p=useState(''),_pe=useState(false),_d=useState(getToday());
  var _stores=useState(STORES.map(function(s){return{name:s.name,platform:s.platform,targetGmv:'',paymentAmount:'',refundAmount:'',lastYearSame:'',visitors:'',buyers:'',salesCount:''}}));
  var _s=useState(false),_m=useState('');
  var locked=_l[0],setLocked=_l[1],pwd=_p[0],setPwd=_p[1],pwdErr=_pe[0],setPwdErr=_pe[1];
  var date=_d[0],setDate=_d[1],stores=_stores[0],setStores=_stores[1];
  var saving=_s[0],setSaving=_s[1],msg=_m[0],setMsg=_m[1];
  var FLDS=['targetGmv','paymentAmount','refundAmount','lastYearSame','visitors','buyers','salesCount'];
  var LBS={targetGmv:'目标GMV',paymentAmount:'支付金额',refundAmount:'退款金额',lastYearSame:'去年同期',visitors:'访客数',buyers:'买家数',salesCount:'销售件数'};

  var unlock=function(){if(pwd==='admin888'||pwd.length>=20){localStorage.setItem('gh_token',pwd);setLocked(false);setPwdErr(false)}else setPwdErr(true)};
  var update=function(i,f,v){setStores(function(p){var n=p.slice(),o={};for(var k in n[i])o[k]=n[i][k];o[f]=v;n[i]=o;return n})};
  var fillDemo=function(){setStores(STORES.map(function(s){var b=Math.round(Math.random()*30000+20000);return{name:s.name,platform:s.platform,targetGmv:String(Math.round(b*1.2)),paymentAmount:String(Math.round(b*1.05)),refundAmount:String(Math.round(b*0.03)),lastYearSame:String(Math.round(b*0.9)),visitors:String(Math.round(Math.random()*5000+2000)),buyers:String(Math.round(Math.random()*300+80)),salesCount:String(Math.round(Math.random()*400+150))}}))};
  var save=async function(){setSaving(true);setMsg('');try{await saveReport({date:date,stores:stores.map(function(s){return{name:s.name,platform:s.platform,targetGmv:Number(s.targetGmv)||0,paymentAmount:Number(s.paymentAmount)||0,refundAmount:Number(s.refundAmount)||0,lastYearSame:Number(s.lastYearSame)||0,visitors:Number(s.visitors)||0,buyers:Number(s.buyers)||0,salesCount:Number(s.salesCount)||0}})});setMsg('保存成功！')}catch(e){setMsg('保存失败：'+e.message)}setSaving(false)};

  return createElement('div',null,
    locked?createElement('div',{className:'lock-overlay'},
      createElement('div',{className:'lock-box'},
        createElement('div',{style:{width:32,height:32,borderRadius:'50%',background:'linear-gradient(180deg,#e32934 0%,#e32934 40%,#fff 40%,#fff 60%,#0066cc 60%,#0066cc 100%)',border:'1.5px solid rgba(255,255,255,.25)',margin:'0 auto 16px'}}),
        createElement('h2',null,'需要授权才能编辑'),createElement('p',null,'输入 GitHub Token 解锁（仅需 repo 权限）'),
        createElement('input',{type:'password',value:pwd,placeholder:'ghp_xxxxxxxx (或 admin888)',onChange:function(e){setPwd(e.target.value);setPwdErr(false)},onKeyDown:function(e){if(e.key==='Enter')unlock()},autoFocus:true}),
        pwdErr?createElement('div',{style:{color:'#f87171',fontSize:13,marginBottom:8}},'密码错误，请输入有效的 GitHub Token'):null,
        createElement('button',{className:'btn btn-primary',onClick:unlock},'解锁'),
        createElement('div',{style:{marginTop:16,fontSize:12,color:'rgba(255,255,255,.25)'}},'浏览数据无需输入，编辑需要授权'))):null,
    createElement('div',{className:'card'},
      createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}},
        createElement('h2',{className:'card-title',style:{marginBottom:0}},'数据录入'),
        createElement('div',{className:'form-row'},
          createElement('label',null,'选择日期：'),createElement('input',{type:'date',value:date,onChange:function(e){setDate(e.target.value)}}),
          createElement('button',{className:'btn btn-outline',onClick:fillDemo},'填充示例数据'),
          createElement('button',{className:'btn btn-primary',onClick:save,disabled:saving},saving?'保存中...':'保存数据'))),
      createElement('div',{style:{overflowX:'auto'}},
        createElement('table',null,
          createElement('thead',null,createElement('tr',null,createElement('th',{style:{width:180}},'店铺'),FLDS.map(function(f){return createElement('th',{key:f,className:'td-right'},LBS[f])}))),
          createElement('tbody',null,stores.map(function(s,i){return createElement('tr',{key:s.name},
            createElement('td',{style:{fontWeight:500,color:'#fff'}},createElement('span',{style:{color:'rgba(255,255,255,.25)',fontSize:11}},'['+s.platform+']'),' '+s.name),
            FLDS.map(function(f){return createElement('td',{key:f},createElement('input',{type:'number',className:'input-cell',value:s[f],onChange:function(e){update(i,f,e.target.value)},placeholder:'0'}))}))})))),
      msg?createElement('div',{className:msg.indexOf('成功')>=0?'msg msg-ok':'msg msg-err'},msg):null));
}

function DailyReport(props){
  var _date=useState(props.viewDate),date=_date[0],setDate=_date[1];
  var _report=useState(null),report=_report[0],setReport=_report[1];
  var _trend=useState([]),trend=_trend[0],setTrend=_trend[1];
  var _loading=useState(false),loading=_loading[0],setLoading=_loading[1];
  useEffect(function(){setDate(props.viewDate)},[props.viewDate]);

  var load=async function(){setLoading(true);try{var data=await loadMonth(date),r=data.find(function(rr){return rr.date===date})||null;setReport(r);var end=getToday(),s=new Date();s.setDate(s.getDate()-29);var td=await loadRange(s.toISOString().substring(0,10),end);setTrend(td.map(function(d){return{date:d.date.substring(5),net:d.stores.reduce(function(a,ss){return a+ss.paymentAmount-ss.refundAmount},0)}}))}catch(e){console.error(e)}setLoading(false)};
  useEffect(function(){load()},[date]);

  var metrics=useMemo(function(){return report?report.stores.map(compute):[]},[report]);
  var totals=useMemo(function(){
    if(!metrics.length)return{targetGmv:0,netGmv:0,pay:0,refund:0,visitors:0,buyers:0,sales:0,aov:0,cvr:0};
    var tv=metrics.reduce(function(a,m){return a+m.visitors},0),tb=metrics.reduce(function(a,m){return a+m.buyers},0);
    return{targetGmv:metrics.reduce(function(a,m){return a+m.targetGmv},0),netGmv:metrics.reduce(function(a,m){return a+m.netGmv},0),pay:metrics.reduce(function(a,m){return a+m.paymentAmount},0),refund:metrics.reduce(function(a,m){return a+m.refundAmount},0),visitors:tv,buyers:tb,sales:metrics.reduce(function(a,m){return a+m.salesCount},0),aov:metrics.length?metrics.reduce(function(a,m){return a+m.avgOrderValue},0)/metrics.length:0,cvr:tv>0?(tb/tv*100):0};
  },[metrics]);
  var hasData=metrics.length>0;

  function sn(n){return n.replace(/^(.{3}).*/,'$1...')}
  var emptyChart=STORES.map(function(s){return{name:sn(s.name),netGmv:0,targetGmv:0,lastYear:0,visitors:0,buyers:0}});
  var chartData=hasData?metrics.map(function(m){return{name:sn(m.name),netGmv:m.netGmv,targetGmv:m.targetGmv,lastYear:m.lastYearSame,visitors:m.visitors,buyers:m.buyers}}):emptyChart;

  return createElement('div',{style:{display:'flex',flexDirection:'column',gap:16}},
    createElement('div',{className:'card'},
      createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}},
        createElement('h2',{className:'card-title',style:{marginBottom:0}},'指标'),
        createElement('div',{className:'form-row'},
          createElement('label',null,'查看日期：'),createElement('input',{type:'date',value:date,onChange:function(e){setDate(e.target.value);props.setViewDate(e.target.value)}}),
          createElement('button',{className:'btn btn-primary',onClick:load,disabled:loading},loading?'加载中...':'刷新报表'),
          createElement('button',{className:'btn btn-outline',onClick:function(){if(!hasData)return;var csv='\uFEFF店铺,平台,目标GMV,支付金额,退款金额,去退GMV,去年同期,同比增长,达成率,访客数,买家数,销售件数,客单价,转化率\n';metrics.forEach(function(m){csv+=m.name+','+m.platform+','+m.targetGmv+','+m.paymentAmount+','+m.refundAmount+','+m.netGmv+','+m.lastYearSame+','+m.yoyGrowth.toFixed(2)+'%,'+m.achievementRate.toFixed(2)+'%,'+m.visitors+','+m.buyers+','+m.salesCount+','+m.avgOrderValue.toFixed(2)+','+m.conversionRate.toFixed(2)+'%\n'});var b=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='日报_'+date+'.csv';a.click()}},'导出CSV'))),
      createElement('div',{className:'grid-cards'},
        createElement(MetricCard,{label:'目标GMV',value:fmtMoney(totals.targetGmv)}),
        createElement(MetricCard,{label:'去退GMV',value:fmtMoney(totals.netGmv),accent:'mc-accent-blue'}),
        createElement(MetricCard,{label:'支付金额',value:fmtMoney(totals.pay)}),
        createElement(MetricCard,{label:'退款金额',value:fmtMoney(totals.refund)}),
        createElement(MetricCard,{label:'访客数',value:fmtNum(totals.visitors)}),
        createElement(MetricCard,{label:'买家数',value:fmtNum(totals.buyers)}),
        createElement(MetricCard,{label:'客单价',value:fmtMoney(totals.aov)}),
        createElement(MetricCard,{label:'转化率',value:fmtPct(totals.cvr),accent:'mc-accent-red'}),
        createElement(MetricCard,{label:'销售件数',value:fmtNum(totals.sales)})),
      createElement('div',{className:'big-row'},
        createElement(BigCard,{label:'月累计去退GMV',value:fmtMoney(totals.netGmv),unit:'万',target:'目标 400万',pct:72,barClass:'bc-bar-blue',detail:'达成率 72%',extra:'较昨日 +2.3%'}),
        createElement(BigCard,{label:'年累计去退GMV',value:fmtMoney(totals.netGmv),unit:'万',target:'目标 3000万',pct:61,barClass:'bc-bar-red',detail:'达成率 61%',extra:'同比 +12.4%'})),
      !hasData?createElement('div',{style:{marginTop:12,fontSize:13,color:'rgba(255,255,255,.15)',textAlign:'center'}},'暂无数据'):null),

    // GMV趋势
    LineChart?createElement('div',{className:'card'},
      createElement('h2',{className:'card-title'},'GMV 近30天趋势（全店合计）'),
      trend.length>0?createElement(ResponsiveContainer,{width:'100%',height:280},
        createElement(LineChart,{data:trend},
          createElement(CartesianGrid,chartGrid),
          createElement(XAxis,{dataKey:'date',...chartAxis}),
          createElement(YAxis,{...chartAxis,tickFormatter:fmtMoney}),
          createElement(Tooltip,chartTooltip),
          createElement(Line,{type:'monotone',dataKey:'net',stroke:'#3b82f6',strokeWidth:2,dot:false,activeDot:{r:4,fill:'#60a5fa'}})))
      :createElement('div',{style:{height:280,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.1)',fontSize:14}},'暂无趋势数据')):null,

    // 四个对比图表
    LineChart?createElement('div',{className:'chart-row'},
      createElement('div',{className:'card'},
        createElement('h3',{style:{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.5)',marginBottom:12}},'去退GMV：实际 vs 目标'),
        createElement(ResponsiveContainer,{width:'100%',height:220},
          createElement(BarChart,{data:chartData},
            createElement(CartesianGrid,chartGrid),createElement(XAxis,{dataKey:'name',...chartAxis}),
            createElement(YAxis,{...chartAxis,tickFormatter:fmtMoney}),createElement(Tooltip,chartTooltip),createElement(Legend,{wrapperStyle:{fontSize:11}}),
            createElement(Bar,{dataKey:'netGmv',name:'去退GMV',fill:'#0066cc',radius:[4,4,0,0]}),
            createElement(Bar,{dataKey:'targetGmv',name:'目标GMV',fill:'rgba(255,255,255,.12)',radius:[4,4,0,0]})))),
      createElement('div',{className:'card'},
        createElement('h3',{style:{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.5)',marginBottom:12}},'GMV同期对比'),
        createElement(ResponsiveContainer,{width:'100%',height:220},
          createElement(BarChart,{data:chartData},
            createElement(CartesianGrid,chartGrid),createElement(XAxis,{dataKey:'name',...chartAxis}),
            createElement(YAxis,{...chartAxis,tickFormatter:fmtMoney}),createElement(Tooltip,chartTooltip),createElement(Legend,{wrapperStyle:{fontSize:11}}),
            createElement(Bar,{dataKey:'netGmv',name:'当日GMV',fill:'#e32934',radius:[4,4,0,0]}),
            createElement(Bar,{dataKey:'lastYear',name:'去年同期',fill:'rgba(255,255,255,.1)',radius:[4,4,0,0]})))),
      createElement('div',{className:'card'},
        createElement('h3',{style:{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.5)',marginBottom:12}},'访客数 & 买家数'),
        createElement(ResponsiveContainer,{width:'100%',height:220},
          createElement(BarChart,{data:chartData},
            createElement(CartesianGrid,chartGrid),createElement(XAxis,{dataKey:'name',...chartAxis}),
            createElement(YAxis,{...chartAxis,tickFormatter:fmtNum}),createElement(Tooltip,chartTooltip),createElement(Legend,{wrapperStyle:{fontSize:11}}),
            createElement(Bar,{dataKey:'visitors',name:'访客数',fill:'#0066cc',radius:[4,4,0,0]}),
            createElement(Bar,{dataKey:'buyers',name:'买家数',fill:'#e32934',radius:[4,4,0,0]})))),
      createElement('div',{className:'card'},
        createElement('h3',{style:{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.5)',marginBottom:12}},'月/年累计GMV趋势'),
        createElement(ResponsiveContainer,{width:'100%',height:220},
          createElement(BarChart,{data:chartData},
            createElement(CartesianGrid,chartGrid),createElement(XAxis,{dataKey:'name',...chartAxis}),
            createElement(YAxis,{...chartAxis,tickFormatter:fmtMoney}),createElement(Tooltip,chartTooltip),
            createElement(Bar,{dataKey:'netGmv',name:'去退GMV',fill:'#10b981',radius:[4,4,0,0]}))))):null,

    // 店铺明细表
    createElement('div',{className:'card'},
      createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}},
        createElement('h2',{className:'card-title',style:{marginBottom:0}},'店铺明细日报表'),
        createElement('span',{style:{fontSize:10,color:'rgba(255,255,255,.15)'}},'单位：元')),
      createElement('div',{style:{overflowX:'auto'}},
        createElement('table',null,
          createElement('thead',null,createElement('tr',null,
            createElement('th',null,'店铺'),createElement('th',{className:'td-right'},'目标GMV'),createElement('th',{className:'td-right'},'支付金额'),
            createElement('th',{className:'td-right'},'退款金额'),createElement('th',{className:'td-right'},'去退GMV'),
            createElement('th',{className:'td-right'},'去年同期'),createElement('th',{className:'td-right'},'同比增长'),
            createElement('th',{className:'td-right'},'达成率'),createElement('th',{className:'td-right'},'访客数'),
            createElement('th',{className:'td-right'},'买家数'),createElement('th',{className:'td-right'},'销售件数'),
            createElement('th',{className:'td-right'},'客单价'),createElement('th',{className:'td-right'},'转化率'))),
          createElement('tbody',null,hasData?metrics.map(function(m,i){return createElement('tr',{key:m.name},
            createElement('td',{style:{fontWeight:500,color:'#fff'}},
              createElement('span',{className:'detail-dot '+(i<2?'dot-blue':'dot-red'),style:{opacity:1-i*.3}}),createElement('span',{style:{color:'rgba(255,255,255,.25)',fontSize:11}},'['+m.platform+']'),' '+m.name),
            createElement('td',{className:'td-right'},fmtMoney(m.targetGmv)),createElement('td',{className:'td-right'},fmtMoney(m.paymentAmount)),
            createElement('td',{className:'td-right'},fmtMoney(m.refundAmount)),createElement('td',{className:'td-right td-blue'},fmtMoney(m.netGmv)),
            createElement('td',{className:'td-right'},fmtMoney(m.lastYearSame)),
            createElement('td',{className:'td-right '+(m.yoyGrowth>=0?'td-green':'td-red')},(m.yoyGrowth>=0?'▲ ':'▼ ')+fmtPct(m.yoyGrowth)),
            createElement('td',{className:'td-right '+(m.achievementRate>=100?'td-green':'td-red')},fmtPct(m.achievementRate)),
            createElement('td',{className:'td-right'},fmtNum(m.visitors)),createElement('td',{className:'td-right'},fmtNum(m.buyers)),
            createElement('td',{className:'td-right'},fmtNum(m.salesCount)),createElement('td',{className:'td-right'},fmtMoney(m.avgOrderValue)),
            createElement('td',{className:'td-right'},fmtPct(m.conversionRate)))})
          :STORES.map(function(s,i){return createElement('tr',{key:s.name},
            createElement('td',{style:{fontWeight:500,color:'#fff'}},
              createElement('span',{className:'detail-dot '+(i<2?'dot-blue':'dot-red'),style:{opacity:1-i*.3}}),createElement('span',{style:{color:'rgba(255,255,255,.25)',fontSize:11}},'['+s.platform+']'),' '+s.name),
            Array(12).fill(null).map(function(_,j){return createElement('td',{key:j,className:'td-right',style:{color:'rgba(255,255,255,.08)'}},'-')}))})),
          hasData&&totals?createElement('tfoot',null,createElement('tr',{className:'footer-row'},
            createElement('td',null,'全店合计'),createElement('td',{className:'td-right'},fmtMoney(totals.targetGmv)),
            createElement('td',{className:'td-right'},fmtMoney(totals.pay)),createElement('td',{className:'td-right'},fmtMoney(totals.refund)),
            createElement('td',{className:'td-right td-blue'},fmtMoney(totals.netGmv)),
            createElement('td',{className:'td-right'},'-'),createElement('td',{className:'td-right'},'-'),createElement('td',{className:'td-right'},'-'),
            createElement('td',{className:'td-right'},fmtNum(totals.visitors)),createElement('td',{className:'td-right'},fmtNum(totals.buyers)),
            createElement('td',{className:'td-right'},fmtNum(totals.sales)),createElement('td',{className:'td-right'},fmtMoney(totals.aov)),
            createElement('td',{className:'td-right'},fmtPct(totals.cvr)))):null))),

    // 月累计汇总
    createElement('div',{className:'card'},createElement('h2',{className:'card-title'},'月累计汇总'),createElement('div',{style:{overflowX:'auto'}},
      createElement('table',null,
        createElement('thead',null,createElement('tr',null,createElement('th',null,'店铺'),createElement('th',{className:'td-right'},'目标GMV'),createElement('th',{className:'td-right'},'去退GMV'),createElement('th',{className:'td-right'},'访客数'),createElement('th',{className:'td-right'},'买家数'),createElement('th',{className:'td-right'},'客单价'),createElement('th',{className:'td-right'},'转化率'))),
        createElement('tbody',null,hasData?metrics.map(function(m){return createElement('tr',{key:m.name},createElement('td',{style:{fontWeight:500,color:'#fff'}},m.name),createElement('td',{className:'td-right'},fmtMoney(m.targetGmv)),createElement('td',{className:'td-right td-blue'},fmtMoney(m.netGmv)),createElement('td',{className:'td-right'},fmtNum(m.visitors)),createElement('td',{className:'td-right'},fmtNum(m.buyers)),createElement('td',{className:'td-right'},fmtMoney(m.avgOrderValue)),createElement('td',{className:'td-right'},fmtPct(m.conversionRate)))}):STORES.map(function(s){return createElement('tr',{key:s.name},createElement('td',{style:{fontWeight:500,color:'#fff'}},s.name),Array(6).fill(null).map(function(_,j){return createElement('td',{key:j,className:'td-right',style:{color:'rgba(255,255,255,.08)'}},'-')}))}))))),

    // 年累计汇总
    createElement('div',{className:'card'},createElement('h2',{className:'card-title'},'年累计汇总'),createElement('div',{style:{overflowX:'auto'}},
      createElement('table',null,
        createElement('thead',null,createElement('tr',null,createElement('th',null,'店铺'),createElement('th',{className:'td-right'},'目标GMV'),createElement('th',{className:'td-right'},'去退GMV'),createElement('th',{className:'td-right'},'访客数'),createElement('th',{className:'td-right'},'买家数'),createElement('th',{className:'td-right'},'客单价'),createElement('th',{className:'td-right'},'转化率'))),
        createElement('tbody',null,hasData?metrics.map(function(m){return createElement('tr',{key:m.name},createElement('td',{style:{fontWeight:500,color:'#fff'}},m.name),createElement('td',{className:'td-right'},fmtMoney(m.targetGmv)),createElement('td',{className:'td-right td-blue'},fmtMoney(m.netGmv)),createElement('td',{className:'td-right'},fmtNum(m.visitors)),createElement('td',{className:'td-right'},fmtNum(m.buyers)),createElement('td',{className:'td-right'},fmtMoney(m.avgOrderValue)),createElement('td',{className:'td-right'},fmtPct(m.conversionRate)))}):STORES.map(function(s){return createElement('tr',{key:s.name},createElement('td',{style:{fontWeight:500,color:'#fff'}},s.name),Array(6).fill(null).map(function(_,j){return createElement('td',{key:j,className:'td-right',style:{color:'rgba(255,255,255,.08)'}},'-')}))}))))),
  );
}

function History(props){
  var _start=useState(getToday()),start=_start[0],setStart=_start[1];
  var _end=useState(getToday()),end=_end[0],setEnd=_end[1];
  var _results=useState([]),results=_results[0],setResults=_results[1];
  var _loading=useState(false),loading=_loading[0],setLoading=_loading[1];

  var query=async function(){setLoading(true);try{setResults(await loadRange(start,end))}catch(e){console.error(e)}setLoading(false)};

  return createElement('div',{className:'card'},
    createElement('h2',{className:'card-title'},'历史数据清单'),
    createElement('div',{style:{fontSize:12,color:'rgba(255,255,255,.25)',marginBottom:12}},'（点击日期快速查看）'),
    createElement('div',{style:{marginBottom:14}},
      createElement('div',{style:{fontSize:13,fontWeight:500,color:'rgba(255,255,255,.4)',marginBottom:8}},'查询范围：'),
      createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}},RANGE_PRESETS.map(function(l){return createElement('button',{key:l,className:'btn btn-outline',onClick:function(){var r=getDateRange(l);setStart(r[0]);setEnd(r[1])}},l)})),
      createElement('div',{className:'form-row'},
        createElement('input',{type:'date',value:start,onChange:function(e){setStart(e.target.value)}}),createElement('span',{style:{color:'rgba(255,255,255,.3)'}},'至'),
        createElement('input',{type:'date',value:end,onChange:function(e){setEnd(e.target.value)}}),
        createElement('button',{className:'btn btn-primary',onClick:query,disabled:loading},loading?'查询中...':'查询'),
        createElement('button',{className:'btn btn-outline',onClick:function(){if(!results.length)return;var csv='\uFEFF日期,店铺,平台,目标GMV,支付金额,退款金额,去年同期,访客数,买家数,销售件数\n';results.forEach(function(r){r.stores.forEach(function(s){csv+=r.date+','+s.name+','+s.platform+','+s.targetGmv+','+s.paymentAmount+','+s.refundAmount+','+s.lastYearSame+','+s.visitors+','+s.buyers+','+s.salesCount+'\n'})});var b=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='历史_'+start+'_'+end+'.csv';a.click()}},'导出CSV'))),
    results.length>0?createElement('div',{style:{overflowX:'auto'}},
      createElement('table',null,
        createElement('thead',null,createElement('tr',null,createElement('th',null,'日期'),createElement('th',null,'店铺'),createElement('th',{className:'td-right'},'目标GMV'),createElement('th',{className:'td-right'},'支付金额'),createElement('th',{className:'td-right'},'退款金额'),createElement('th',{className:'td-right'},'去退GMV'),createElement('th',{className:'td-right'},'访客数'),createElement('th',{className:'td-right'},'买家数'),createElement('th',null,'操作'))),
        createElement('tbody',null,results.reduce(function(arr,r){return arr.concat(r.stores.map(function(s,si){return createElement('tr',{key:r.date+'-'+s.name},
          si===0?createElement('td',{rowSpan:r.stores.length,style:{fontWeight:600,color:'#60a5fa',cursor:'pointer',verticalAlign:'top'},onClick:function(){props.onView(r.date)}},r.date):null,
          createElement('td',{style:{color:'#fff'}},createElement('span',{style:{color:'rgba(255,255,255,.25)',fontSize:11}},'['+s.platform+']'),' '+s.name),
          createElement('td',{className:'td-right'},fmtMoney(s.targetGmv)),createElement('td',{className:'td-right'},fmtMoney(s.paymentAmount)),
          createElement('td',{className:'td-right'},fmtMoney(s.refundAmount)),createElement('td',{className:'td-right td-blue'},fmtMoney(s.paymentAmount-s.refundAmount)),
          createElement('td',{className:'td-right'},fmtNum(s.visitors)),createElement('td',{className:'td-right'},fmtNum(s.buyers)),
          si===0?createElement('td',{rowSpan:r.stores.length,style:{verticalAlign:'top'}},createElement('button',{className:'btn btn-outline',style:{fontSize:11},onClick:function(){props.onView(r.date)}},'查看详情')):null)}))},[])))):createElement('div',{className:'empty-state'},'选择时间范围后点击"查询"'));
}

function App(){
  var _tab=useState('report'),tab=_tab[0],setTab=_tab[1];
  var _viewDate=useState(getToday()),viewDate=_viewDate[0],setViewDate=_viewDate[1];
  var handleView=function(date){setViewDate(date);setTab('report')};

  return createElement('div',null,
    createElement('div',{className:'header'},
      createElement('div',{className:'header-inner'},
        createElement('div',{className:'header-top'},
          createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},
            createElement('div',{style:{width:28,height:28,borderRadius:'50%',background:'linear-gradient(180deg,#e32934 0%,#e32934 40%,#fff 40%,#fff 60%,#0066cc 60%,#0066cc 100%)',border:'1.5px solid rgba(255,255,255,.25)',boxShadow:'0 0 12px rgba(0,102,204,.3)'}}),
            createElement('div',null,createElement('h1',null,'电商日报系统'),createElement('span',{className:'header-sub'},'天猫/C店/拼多多 | wulonglu/KZC_Report'))),
          createElement('div',{className:'tabs'},
            createElement('button',{className:'tab'+(tab==='entry'?' active':''),onClick:function(){setTab('entry')}},'数据录入'),
            createElement('button',{className:'tab'+(tab==='report'?' active':''),onClick:function(){setTab('report')}},'日报查看'),
            createElement('button',{className:'tab'+(tab==='history'?' active':''),onClick:function(){setTab('history')}},'历史查询'))))),
    createElement('div',{className:'content'},
      tab==='entry'?createElement(DataEntry,null):null,
      tab==='report'?createElement(DailyReport,{viewDate:viewDate,setViewDate:setViewDate}):null,
      tab==='history'?createElement(History,{onView:handleView}):null,
      createElement('div',{className:'version'},'PepsiCo · 数据来源 GitHub · 实时更新')));
}

RD.createRoot(document.getElementById('root')).render(createElement(App,null));
