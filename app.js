const BUDGETS = [
  { id:"event", name:"행사운영비", budget:2600000, subs:[
    {name:"플랜카드 제작", budget:100000},
    {name:"행사운영비(재료비)", budget:2500000}
  ]},
  { id:"office", name:"사무관리비", budget:1500000, subs:[
    {name:"소모성물품구입비", budget:900000},
    {name:"식비/다과비", budget:600000}
  ]},
  { id:"rent", name:"임차료", budget:400000, subs:[{name:"임차료", budget:400000}] },
  { id:"allowance", name:"운영수당", budget:1500000, subs:[{name:"자문료", budget:1500000}] }
];

const KEY="mujigaebansa_budget_transactions_v1";
const ST_KEY="mujigaebansa_stationery_transactions_v1";
const EVIDENCE_KEY="mujigaebansa_evidence_docs_v1";
const TODO_KEY="mujigaebansa_todos_v1";
const MEETING_KEY="mujigaebansa_meetings_v1";
const MEETING_TODO_KEY="mujigaebansa_meeting_todos_v1";
const ST_PAYMENT_KEY="mujigaebansa_stationery_month_payments_v1";

let transactions=JSON.parse(localStorage.getItem(KEY)||"[]");
let stationeryTransactions=JSON.parse(localStorage.getItem(ST_KEY)||"[]");
let evidenceDocs=JSON.parse(localStorage.getItem(EVIDENCE_KEY)||"{}");
let todos=JSON.parse(localStorage.getItem(TODO_KEY)||"[]");
let meetings=JSON.parse(localStorage.getItem(MEETING_KEY)||"[]");
let meetingTodos=JSON.parse(localStorage.getItem(MEETING_TODO_KEY)||"[]");
let stationeryPayments=JSON.parse(localStorage.getItem(ST_PAYMENT_KEY)||'{"8":false,"9":false,"10":false}');

const $=s=>document.querySelector(s);
const fmt=n=>Number(n||0).toLocaleString("ko-KR")+"원";
const catById=id=>BUDGETS.find(x=>x.id===id);
const monthKey=d=>String(d||"").slice(0,7);
const escapeHtml=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const save=()=>localStorage.setItem(KEY,JSON.stringify(transactions));
const saveStationery=()=>localStorage.setItem(ST_KEY,JSON.stringify(stationeryTransactions));
const saveEvidence=()=>localStorage.setItem(EVIDENCE_KEY,JSON.stringify(evidenceDocs));
const saveTodos=()=>localStorage.setItem(TODO_KEY,JSON.stringify(todos));
const saveMeetings=()=>localStorage.setItem(MEETING_KEY,JSON.stringify(meetings));
const saveMeetingTodos=()=>localStorage.setItem(MEETING_TODO_KEY,JSON.stringify(meetingTodos));
const saveStationeryPayments=()=>localStorage.setItem(ST_PAYMENT_KEY,JSON.stringify(stationeryPayments));

function uid(){return crypto.randomUUID?crypto.randomUUID():"id-"+Date.now()+"-"+Math.random().toString(16).slice(2)}
let lockedScrollY=0;
function lockBackground(){
  if(document.body.classList.contains("modal-open")) return;
  lockedScrollY=window.scrollY||document.documentElement.scrollTop||0;
  document.body.style.top=`-${lockedScrollY}px`;
  document.body.classList.add("modal-open");
}
function unlockBackground(){
  if(!document.body.classList.contains("modal-open")) return;
  document.body.classList.remove("modal-open");
  document.body.style.top="";
  window.scrollTo(0,lockedScrollY);
}
function openDialog(d){
  lockBackground();
  if(typeof d.showModal==="function") d.showModal();
  else d.setAttribute("open","");
}
function closeDialog(d){
  if(typeof d.close==="function") d.close();
  else d.removeAttribute("open");
  unlockBackground();
}

function switchPage(name){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===name+"Page"));
  document.querySelectorAll(".bottom-tab").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  window.scrollTo({top:0,behavior:"smooth"});
}
function clearBudgetFilters(){
  $("#filterCategory").value="";
  updateFilterSubcategories();
  $("#filterSubCategory").value="";
  $("#filterEvidence").value="";
  renderTransactions();
}
document.querySelectorAll(".bottom-tab").forEach(b=>b.onclick=()=>{
  const page=b.dataset.page;
  if(page==="budget" && $("#budgetPage").classList.contains("active")){
    clearBudgetFilters();
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }
  switchPage(page);
});
$("#spentSummaryCard").onclick=()=>{clearBudgetFilters();switchPage("budget")};
$("#spentSummaryCard").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();clearBudgetFilters();switchPage("budget")}});
$("#stationerySummaryCard").onclick=()=>switchPage("stationery");
$("#stationerySummaryCard").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();switchPage("stationery")}});


function migrateRentSubs(){
  let changed=false;
  transactions=transactions.map(t=>{
    if(t.category==="rent" && ["프로그램 공간 임대료","전시실 임대료"].includes(t.subCategory)){
      changed=true;return {...t,subCategory:"임차료"};
    }
    return t;
  });
  if(changed)save();
}

/* 할 일 */
function renderTodos(){
  $("#todoList").innerHTML=todos.map(t=>`
    <div class="todo-item ${t.done?'done':''}" data-id="${t.id}">
      <input type="checkbox" ${t.done?'checked':''}>
      <div class="todo-text">${escapeHtml(t.text)}</div>
      <button class="todo-delete" type="button">✕</button>
    </div>`).join("");
  document.querySelectorAll(".todo-item").forEach(el=>{
    const id=el.dataset.id;
    el.querySelector('input').onchange=e=>{const t=todos.find(x=>x.id===id);if(t){t.done=e.target.checked;saveTodos();renderTodos()}};
    el.querySelector('button').onclick=()=>{todos=todos.filter(x=>x.id!==id);saveTodos();renderTodos()};
  });
  const full=todos.length>=3;
  $("#todoInput").disabled=full;
  $("#todoAddBtn").disabled=full;
  $(".todo-panel .todo-add-row").classList.toggle("hidden",full);
}
function addTodo(){const text=$("#todoInput").value.trim();if(!text||todos.length>=3)return;todos.push({id:uid(),text,done:false});saveTodos();$("#todoInput").value="";renderTodos()}
$("#todoAddBtn").onclick=addTodo;
$("#todoInput").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addTodo()}});


/* 회의 탭 할 일 - 무제한 */
function renderMeetingTodos(){
  $("#meetingTodoList").innerHTML=meetingTodos.map(t=>`
    <div class="todo-item ${t.done?'done':''}" data-id="${t.id}">
      <input type="checkbox" ${t.done?'checked':''}>
      <div class="todo-text">${escapeHtml(t.text)}</div>
      <button class="todo-delete" type="button">✕</button>
    </div>`).join("");

  document.querySelectorAll("#meetingTodoList .todo-item").forEach(el=>{
    const id=el.dataset.id;
    el.querySelector('input').onchange=e=>{
      const t=meetingTodos.find(x=>x.id===id);
      if(!t)return;
      t.done=e.target.checked;
      saveMeetingTodos();
      renderMeetingTodos();
    };
    el.querySelector('button').onclick=()=>{
      meetingTodos=meetingTodos.filter(x=>x.id!==id);
      saveMeetingTodos();
      renderMeetingTodos();
    };
  });
}
function addMeetingTodo(){
  const text=$("#meetingTodoInput").value.trim();
  if(!text)return;
  meetingTodos.push({id:uid(),text,done:false});
  saveMeetingTodos();
  $("#meetingTodoInput").value="";
  renderMeetingTodos();
}
$("#meetingTodoAddBtn").onclick=addMeetingTodo;
$("#meetingTodoInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    addMeetingTodo();
  }
});

/* 증빙 템플릿 */
function evidenceTemplate(t){
  const resolution={name:"지출결의서",checked:false,required:true,custom:false};
  const card={name:"지원금 전용 체크카드 영수증",checked:false,required:true,custom:false};
  const transfer={name:"계좌이체 확인증",checked:false,required:true,custom:false};

  if(t.category==="event"&&t.subCategory==="플랜카드 제작"){
    const docs=[resolution];
    if(t.payment==="계좌이체") docs.push(
      {name:"세금계산서 또는 현금영수증",checked:false,required:true,custom:false},
      {name:"사업자등록증",checked:false,required:true,custom:false},
      {name:"사업자 통장사본",checked:false,required:true,custom:false},
      transfer,
      {name:"홍보물 사진",checked:false,required:true,custom:false}
    );
    else docs.push(card,{name:"견적서",checked:false,required:true,custom:false},{name:"결과물 사진",checked:false,required:true,custom:false});
    return {rule:"홍보비 · 최신 지출증빙 서식 기준",docs};
  }
  if(t.category==="office"&&t.subCategory==="소모성물품구입비")return {rule:"소모품비 · 최신 지출증빙 서식 기준",docs:[
    resolution,{name:"카드영수증 또는 거래명세표",checked:false,required:true,custom:false},
    {name:"구매물품 사진",checked:false,required:true,custom:false},
    {name:"행사결과보고서",checked:false,required:true,custom:false},
    {name:"참가자 서명부",checked:false,required:true,custom:false}
  ]};
  if(t.category==="rent"){
    const docs=[resolution];
    if(t.payment==="계좌이체") docs.push(
      {name:"세금계산서",checked:false,required:true,custom:false},
      {name:"임차계약서",checked:false,required:true,custom:false},
      {name:"사업자등록증",checked:false,required:true,custom:false},
      {name:"사업자 통장사본",checked:false,required:true,custom:false},
      {name:"행사결과보고서",checked:false,required:true,custom:false},
      {name:"참가자 서명부",checked:false,required:true,custom:false},
      {name:"임차물품(장소) 사진",checked:false,required:true,custom:false}
    );
    else docs.push(card,{name:"임차계약서",checked:false,required:true,custom:false},{name:"사업자등록증",checked:false,required:true,custom:false},{name:"행사결과보고서",checked:false,required:true,custom:false},{name:"참가자 서명부",checked:false,required:true,custom:false},{name:"임차물품(장소) 사진",checked:false,required:true,custom:false});
    return {rule:"임차비 · 최신 지출증빙 서식 기준",docs};
  }
  if(t.category==="allowance")return {rule:"인건비(강사비·자문료 등) · 최신 지출증빙 서식 기준",docs:[
    resolution,{name:"강사등급 확인서류",checked:false,required:true,custom:false},{name:"전문가 프로필",checked:false,required:true,custom:false},
    {name:"강의확인서",checked:false,required:true,custom:false},{name:"통장사본",checked:false,required:true,custom:false},
    {name:"계좌이체 확인증",checked:false,required:true,custom:false},{name:"활동자료(강의자료·강의사진 등)",checked:false,required:true,custom:false},
    {name:"원천징수 납부확인증 (동일인 월 125,000원 초과 시)",checked:false,required:false,custom:false},
    {name:"행사결과보고서",checked:false,required:true,custom:false},{name:"참가자 서명부",checked:false,required:true,custom:false}
  ]};
  if(t.category==="event"&&t.subCategory==="행사운영비(재료비)")return {rule:"행사운영비 · 최신 지출증빙 서식 기준",docs:[
    resolution,card,{name:"결과보고서",checked:false,required:true,custom:false},{name:"참가자 서명부",checked:false,required:true,custom:false},{name:"관련 사진",checked:false,required:true,custom:false}
  ]};
  if(t.category==="office"&&t.subCategory==="식비/다과비")return {rule:"회의비(식·다과비) · 최신 지출증빙 서식 기준",docs:[
    resolution,card,{name:"회의록+서명부 또는 행사결과보고서+서명부",checked:false,required:true,custom:false},{name:"관련 사진",checked:false,required:true,custom:false}
  ]};
  return {rule:"기타 집행 · 최신 지출증빙 서식 기준",docs:[resolution,t.payment==="계좌이체"?transfer:card]};
}
function mergeEvidence(t){
  const tpl=evidenceTemplate(t),old=evidenceDocs[t.id]||[],map=new Map(old.map(d=>[d.name,d]));
  const aliases={
    "결과물 사진":["증빙사진","홍보물 사진"],
    "홍보물 사진":["증빙사진","결과물 사진"],
    "카드영수증 또는 거래명세표":["지원금 전용 체크카드 영수증","거래명세표 또는 견적서"],
    "구매물품 사진":["증빙사진","구입물품 사진"],
    "행사결과보고서":["행사(강의) 결과보고서","행사결과보고서","결과보고서"],
    "결과보고서":["행사결과보고서","행사(강의) 결과보고서"],
    "임차물품(장소) 사진":["활동사진"],
    "강사등급 확인서류":["강사등급 확인 서류"],
    "전문가 프로필":["강사/자문자 프로필"],
    "강의확인서":["강의확인서 또는 자문확인서 (주소 명시)"],
    "통장사본":["강사/자문자 통장사본"],
    "활동자료(강의자료·강의사진 등)":["강의·자문 자료","강의·자문 사진"],
    "원천징수 납부확인증 (동일인 월 125,000원 초과 시)":["원천징수 납부 확인서 (월 125,000원 초과 지급 시)"],
    "회의록+서명부 또는 행사결과보고서+서명부":["참가자 서명부","행사(강의) 결과보고서 또는 회의록"]
  };
  const findOld=name=>{
    if(map.has(name)) return map.get(name);
    for(const alt of aliases[name]||[]) if(map.has(alt)) return map.get(alt);
    return null;
  };
  const merged=tpl.docs.map(d=>{const o=findOld(d.name);return {...d,checked:o?!!o.checked:d.checked}});
  old.filter(d=>d.custom).forEach(d=>{if(!merged.some(x=>x.name===d.name))merged.push(d)});
  evidenceDocs[t.id]=merged;saveEvidence();
}
function ensureEvidence(t){
  if(!Array.isArray(evidenceDocs[t.id])||!evidenceDocs[t.id].length){evidenceDocs[t.id]=evidenceTemplate(t).docs;saveEvidence()}
}
function evidenceDone(t){
  ensureEvidence(t);
  const req=evidenceDocs[t.id].filter(d=>d.required!==false);
  return req.length>0&&req.every(d=>d.checked);
}
function syncEvidence(t){t.evidence=evidenceDone(t)?"done":"todo"}

/* 셀렉트 */
function initSelects(){
  $("#category").innerHTML=BUDGETS.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  $("#filterCategory").innerHTML='<option value="">전체 항목</option>'+BUDGETS.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  updateSubCategorySelect();
  updateFilterSubcategories();
}
function updateSubCategorySelect(){
  const b=catById($("#category").value)||BUDGETS[0];
  $("#subCategory").innerHTML=b.subs.map(s=>`<option value="${s.name}">${s.name}</option>`).join("");
}
function updateFilterSubcategories(){
  const id=$("#filterCategory").value;
  const items=id?(catById(id)?.subs||[]):BUDGETS.flatMap(b=>b.subs);
  const unique=[...new Set(items.map(s=>s.name))];
  $("#filterSubCategory").innerHTML='<option value="">전체 세부항목</option>'+unique.map(s=>`<option>${s}</option>`).join("");
}
$("#category").onchange=()=>{updateSubCategorySelect();refreshEvidenceEditor()};
$("#payment").onchange=refreshEvidenceEditor;
$("#filterCategory").onchange=()=>{updateFilterSubcategories();renderTransactions()};
$("#filterSubCategory").onchange=renderTransactions;
$("#filterEvidence").onchange=renderTransactions;

/* 홈 */
function spentFor(cat,sub=null){
  return transactions.filter(t=>t.category===cat&&(!sub||t.subCategory===sub)).reduce((a,t)=>a+Number(t.amount||0),0);
}
function renderHome(){
  const total=BUDGETS.reduce((a,b)=>a+b.budget,0);
  const spent=transactions.reduce((a,t)=>a+Number(t.amount||0),0);
  const stSpent=stationeryTransactions.reduce((a,t)=>a+Number(t.total??t.amount??0),0);
  $("#totalBudget").textContent=fmt(total);$("#spentTotal").textContent=fmt(spent);$("#remainingTotal").textContent=fmt(total-spent);
  $("#spentRate").textContent=(spent/total*100).toFixed(1)+"% 집행";$("#remainingRate").textContent=Math.max(0,(total-spent)/total*100).toFixed(1)+"% 남음";
  $("#stationerySpentTop").textContent=fmt(stSpent);
  const pendingMonth=[8,9,10].find(m=>!stationeryPayments[String(m)]);
  $("#stationeryPaymentNotice").textContent=pendingMonth?`${pendingMonth}월 결제 필요`:"8·9·10월 결제 완료";

  const cards=BUDGETS.map(b=>{
    const catSpent=spentFor(b.id),catRem=b.budget-catSpent;
    const subs=b.subs.map(s=>{const ss=spentFor(b.id,s.name),rem=s.budget-ss;return {...s,spent:ss,remaining:rem,done:rem<=0}})
      .sort((a,b)=>Number(a.done)-Number(b.done));
    return {...b,spent:catSpent,remaining:catRem,done:subs.every(s=>s.done),subs};
  }).sort((a,b)=>Number(a.done)-Number(b.done));

  $("#budgetOverview").innerHTML=cards.map(b=>`
    <article class="overview-card ${b.done?'exhausted':''}">
      <div class="overview-head">
        <div><div class="overview-name">${b.name}</div><div class="overview-sub-meta">예산 ${fmt(b.budget)}</div></div>
        <div class="overview-total">${fmt(b.spent)}<div class="overview-sub-meta">${b.remaining>=0?'잔액 '+fmt(b.remaining):'초과 '+fmt(-b.remaining)}</div></div>
      </div>
      <div class="overview-sublist">
        ${b.subs.map(s=>`
          <div class="overview-sub ${s.done?'done':''}" data-cat="${b.id}" data-sub="${escapeHtml(s.name)}">
            <div>
              <div class="overview-sub-name">${escapeHtml(s.name)}</div>
              <div class="overview-sub-meta">${fmt(s.spent)} / ${fmt(s.budget)} · ${s.remaining>=0?'잔액 '+fmt(s.remaining):'초과 '+fmt(-s.remaining)}</div>
              <div class="progress"><i style="width:${Math.min(100,s.spent/s.budget*100)}%"></i></div>
            </div>
            <div class="overview-sub-amount">${s.done?'사용 완료':'보기 ›'}</div>
          </div>`).join("")}
      </div>
    </article>`).join("");

  document.querySelectorAll(".overview-sub").forEach(el=>el.onclick=()=>{
    $("#filterCategory").value=el.dataset.cat;updateFilterSubcategories();$("#filterSubCategory").value=el.dataset.sub;$("#filterEvidence").value="";
    renderTransactions();switchPage("budget");
  });
}

/* 사업비 목록 */
function renderTransactions(){
  let rows=[...transactions].sort((a,b)=>b.date.localeCompare(a.date));
  const cat=$("#filterCategory").value,sub=$("#filterSubCategory").value,ev=$("#filterEvidence").value;
  if(cat)rows=rows.filter(t=>t.category===cat);
  if(sub)rows=rows.filter(t=>t.subCategory===sub);
  if(ev)rows=rows.filter(t=>(t.evidence||"todo")===ev);
  const cap=[];if(cat)cap.push(catById(cat)?.name||"");if(sub)cap.push(sub);if(ev)cap.push(ev==="done"?"증빙 완료":"증빙 필요");
  $("#budgetListCaption").textContent=cap.length?cap.join(" · "):"전체 내역";
  $("#txList").innerHTML=rows.map(t=>`
    <div class="tx" data-id="${t.id}">
      <div class="tx-title-row"><div class="tx-title">${escapeHtml(t.merchant)}</div><div class="tx-amount">${fmt(t.amount)}</div></div>
      <div class="tx-meta">${t.date} · ${catById(t.category)?.name||""} › ${escapeHtml(t.subCategory)} · ${escapeHtml(t.payment||"")}
        <span class="badge ${(t.evidence||"todo")==="todo"?'todo':''}">${(t.evidence||"todo")==="done"?'증빙 완료':'증빙 필요'}</span>
      </div>
      ${t.memo?`<div class="tx-note">${escapeHtml(t.memo)}</div>`:""}
    </div>`).join("");
  $("#txEmpty").style.display=rows.length?"none":"block";
  document.querySelectorAll("#txList .tx").forEach(el=>el.onclick=()=>openTxEdit(el.dataset.id));
}

/* 사업비 편집 + 증빙 */
let workingEvidence=[];
function refreshEvidenceEditor(){
  const id=$("#editId").value;
  const temp={id:id||"temp",category:$("#category").value,subCategory:$("#subCategory").value,payment:$("#payment").value};
  const tpl=evidenceTemplate(temp);
  $("#evidenceRuleText").textContent=tpl.rule;
  if(!id){
    const oldMap=new Map(workingEvidence.map(d=>[d.name,d]));
    workingEvidence=tpl.docs.map(d=>({...d,checked:oldMap.get(d.name)?.checked||false}));
  }else{
    const original=transactions.find(t=>t.id===id);
    if(original){
      mergeEvidence({...original,category:temp.category,subCategory:temp.subCategory,payment:temp.payment});
      workingEvidence=(evidenceDocs[id]||[]).map(d=>({...d}));
    }
  }
  renderEvidenceEditor();
}
function renderEvidenceEditor(){
  $("#evidenceChecklist").innerHTML=workingEvidence.map((d,i)=>`
    <label class="evidence-doc">
      <input type="checkbox" data-i="${i}" ${d.checked?'checked':''}>
      <span class="doc-main"><span class="doc-title">${escapeHtml(d.name)}</span><span class="doc-tag ${d.required===false?'conditional':'required'}">${d.required===false?'조건부':'필수'}</span></span>
      ${d.custom?`<button type="button" data-del="${i}">✕</button>`:""}
    </label>`).join("");
  document.querySelectorAll("#evidenceChecklist input").forEach(c=>c.onchange=()=>{workingEvidence[Number(c.dataset.i)].checked=c.checked;updateEvidenceBadge()});
  document.querySelectorAll("#evidenceChecklist button").forEach(b=>b.onclick=()=>{workingEvidence.splice(Number(b.dataset.del),1);renderEvidenceEditor()});
  updateEvidenceBadge();
}
function updateEvidenceBadge(){
  const req=workingEvidence.filter(d=>d.required!==false),done=req.length&&req.every(d=>d.checked);
  $("#evidenceStateBadge").textContent=done?"증빙 완료":"증빙 필요";$("#evidenceStateBadge").classList.toggle("todo",!done);
}
$("#addEvidenceDocBtn").onclick=()=>{const n=$("#newEvidenceDoc").value.trim();if(!n)return;workingEvidence.push({name:n,checked:false,required:true,custom:true});$("#newEvidenceDoc").value="";renderEvidenceEditor()};

function openTxNew(){
  $("#txDialogTitle").textContent="사업비 내역 추가";$("#editId").value="";$("#date").value=new Date().toISOString().slice(0,10);
  $("#category").value=BUDGETS[0].id;updateSubCategorySelect();$("#merchant").value="";$("#amount").value="";$("#payment").value="전용카드";$("#memo").value="";
  workingEvidence=[];refreshEvidenceEditor();$("#deleteTxBtn").classList.add("hidden");openDialog($("#txDialog"));
}
function openTxEdit(id){
  const t=transactions.find(x=>x.id===id);if(!t)return;
  $("#txDialogTitle").textContent="사업비 내역 수정";$("#editId").value=id;$("#date").value=t.date;$("#category").value=t.category;updateSubCategorySelect();$("#subCategory").value=t.subCategory;
  $("#merchant").value=t.merchant;$("#amount").value=t.amount;$("#payment").value=t.payment||"전용카드";$("#memo").value=t.memo||"";
  ensureEvidence(t);workingEvidence=(evidenceDocs[id]||[]).map(d=>({...d}));$("#evidenceRuleText").textContent=evidenceTemplate(t).rule;renderEvidenceEditor();
  $("#deleteTxBtn").classList.remove("hidden");openDialog($("#txDialog"));
}
$("#addTxBtn").onclick=openTxNew;$("#closeTxDialog").onclick=()=>closeDialog($("#txDialog"));
$("#txForm").addEventListener("submit",e=>{
  e.preventDefault();
  const obj={id:$("#editId").value||uid(),date:$("#date").value,category:$("#category").value,subCategory:$("#subCategory").value,merchant:$("#merchant").value.trim(),amount:Number($("#amount").value),payment:$("#payment").value,memo:$("#memo").value.trim()};
  evidenceDocs[obj.id]=workingEvidence.map(d=>({...d}));
  const req=evidenceDocs[obj.id].filter(d=>d.required!==false);obj.evidence=req.length&&req.every(d=>d.checked)?"done":"todo";
  const i=transactions.findIndex(x=>x.id===obj.id);if(i>=0)transactions[i]=obj;else transactions.push(obj);
  save();saveEvidence();closeDialog($("#txDialog"));renderAll();
});
$("#deleteTxBtn").onclick=()=>{const id=$("#editId").value;if(id&&confirm("이 사업비 내역을 삭제할까요?")){transactions=transactions.filter(x=>x.id!==id);delete evidenceDocs[id];save();saveEvidence();closeDialog($("#txDialog"));renderAll()}};

/* 문구사 */
/* 문구사 월별 결제 체크 */
function renderStationeryPayments(){
  document.querySelectorAll(".stationery-month-checks input[data-month]").forEach(c=>{
    c.checked=!!stationeryPayments[c.dataset.month];
  });
}
document.querySelectorAll(".stationery-month-checks input[data-month]").forEach(c=>{
  c.onchange=()=>{
    stationeryPayments[c.dataset.month]=c.checked;
    saveStationeryPayments();
    renderHome();
  };
});


function feeAmount(){
  if($("#stationeryPurchaseType").value!=="link")return 0;
  const amount=Number($("#stationeryAmount").value||0),mode=$("#stationeryFeeMode").value;
  if(mode==="percent")return Math.round(amount*Number($("#stationeryFeeRate").value||0)/100);
  if(mode==="fixed")return Number($("#stationeryFeeFixed").value||0);
  return 0;
}
function updateFeeUI(){
  const link=$("#stationeryPurchaseType").value==="link";$("#stationeryLinkLabel").classList.toggle("hidden",!link);$("#stationeryFeeFields").classList.toggle("hidden",!link);
  const mode=$("#stationeryFeeMode").value;$("#stationeryFeeRateLabel").classList.toggle("hidden",mode!=="percent");$("#stationeryFeeFixedLabel").classList.toggle("hidden",mode!=="fixed");
  const total=Number($("#stationeryAmount").value||0)+feeAmount()+(link?Number($("#stationeryShipping").value||0):0);
  $("#stationeryFeePreview").textContent=fmt(feeAmount());$("#stationeryTotalPreview").textContent=fmt(total);
}
["stationeryPurchaseType","stationeryFeeMode","stationeryAmount","stationeryFeeRate","stationeryFeeFixed","stationeryShipping"].forEach(id=>$("#"+id).addEventListener(id.includes("Type")||id.includes("Mode")?"change":"input",updateFeeUI));

function renderStationery(){
  const grandTotal=stationeryTransactions.reduce((a,t)=>a+Number(t.total??t.amount??0),0);
  $("#stationeryPageTotal").textContent=fmt(grandTotal);
  renderStationeryPayments();
  let rows=[...stationeryTransactions].sort((a,b)=>b.date.localeCompare(a.date));const m=$("#stationeryMonthFilter").value;if(m)rows=rows.filter(t=>monthKey(t.date)===m);
  $("#stationeryCaption").textContent=m?`${Number(m.slice(5))}월 내역`:"전체 내역";
  $("#stationeryList").innerHTML=rows.map(t=>{
    const isLink=(t.purchaseType||"store")==="link",fee=Number(t.fee||0),shipping=Number(t.shipping||0),total=Number(t.total??(Number(t.amount||0)+fee+shipping));
    const meta=[t.date,t.qty?escapeHtml(t.qty):"",isLink?"인터넷 대행구매":"직접구매",isLink&&fee?`수수료 ${fmt(fee)}`:"",isLink&&shipping?`택배 ${fmt(shipping)}`:""].filter(Boolean).join(" · ");
    return `<div class="tx" data-id="${t.id}"><div class="tx-title-row"><div class="tx-title">${escapeHtml(t.item)}</div><div class="tx-amount">${fmt(total)}</div></div><div class="tx-meta">${meta}</div>${t.memo?`<div class="tx-note">${escapeHtml(t.memo)}</div>`:""}</div>`;
  }).join("");
  $("#stationeryEmpty").style.display=rows.length?"none":"block";document.querySelectorAll("#stationeryList .tx").forEach(el=>el.onclick=()=>openStationeryEdit(el.dataset.id));
}
$("#stationeryMonthFilter").onchange=renderStationery;
function openStationeryNew(){
  $("#stationeryDialogTitle").textContent="여수문구사 내역 추가";$("#stationeryEditId").value="";$("#stationeryDate").value=new Date().toISOString().slice(0,10);$("#stationeryPurchaseType").value="store";$("#stationeryItem").value="";$("#stationeryLink").value="";
  $("#stationeryAmount").value="";$("#stationeryFeeMode").value="percent";$("#stationeryFeeRate").value="20";$("#stationeryFeeFixed").value="0";$("#stationeryShipping").value="0";$("#stationeryQty").value="";$("#stationeryMemo").value="";$("#deleteStationeryBtn").classList.add("hidden");updateFeeUI();openDialog($("#stationeryDialog"));
}
function openStationeryEdit(id){
  const t=stationeryTransactions.find(x=>x.id===id);if(!t)return;
  $("#stationeryDialogTitle").textContent="여수문구사 내역 수정";$("#stationeryEditId").value=id;$("#stationeryDate").value=t.date;$("#stationeryPurchaseType").value=t.purchaseType||"store";$("#stationeryItem").value=t.item;$("#stationeryLink").value=t.link||"";
  $("#stationeryAmount").value=t.amount;$("#stationeryFeeMode").value=t.feeMode||"percent";$("#stationeryFeeRate").value=t.feeRate??20;$("#stationeryFeeFixed").value=t.feeFixed??0;$("#stationeryShipping").value=t.shipping??0;$("#stationeryQty").value=t.qty||"";$("#stationeryMemo").value=t.memo||"";
  $("#deleteStationeryBtn").classList.remove("hidden");updateFeeUI();openDialog($("#stationeryDialog"));
}
$("#addStationeryBtn").onclick=openStationeryNew;$("#closeStationeryDialog").onclick=()=>closeDialog($("#stationeryDialog"));
$("#stationeryForm").addEventListener("submit",e=>{
  e.preventDefault();const purchaseType=$("#stationeryPurchaseType").value,amount=Number($("#stationeryAmount").value||0),fee=feeAmount(),shipping=purchaseType==="link"?Number($("#stationeryShipping").value||0):0;
  const obj={id:$("#stationeryEditId").value||uid(),date:$("#stationeryDate").value,purchaseType,item:$("#stationeryItem").value.trim(),link:purchaseType==="link"?$("#stationeryLink").value.trim():"",amount,feeMode:purchaseType==="link"?$("#stationeryFeeMode").value:"none",feeRate:purchaseType==="link"?Number($("#stationeryFeeRate").value||0):0,feeFixed:purchaseType==="link"?Number($("#stationeryFeeFixed").value||0):0,fee,shipping,total:amount+fee+shipping,qty:$("#stationeryQty").value.trim(),memo:$("#stationeryMemo").value.trim()};
  const i=stationeryTransactions.findIndex(x=>x.id===obj.id);if(i>=0)stationeryTransactions[i]=obj;else stationeryTransactions.push(obj);saveStationery();closeDialog($("#stationeryDialog"));renderAll();
});
$("#deleteStationeryBtn").onclick=()=>{const id=$("#stationeryEditId").value;if(id&&confirm("이 여수문구사 내역을 삭제할까요?")){stationeryTransactions=stationeryTransactions.filter(x=>x.id!==id);saveStationery();closeDialog($("#stationeryDialog"));renderAll()}};

/* 모임 */
function normalizeMeetingStatus(v,legacyBool){
  if(["needed","done","na"].includes(v))return v;
  if(legacyBool===true)return "done";
  return "needed";
}
function meetingStatusLabel(v){return v==="done"?"완료":v==="na"?"필요없음":"필요"}
function renderMeetings(){
  const rows=[...meetings].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  $("#meetingList").innerHTML=rows.map(m=>{
    const ps=normalizeMeetingStatus(m.photoStatus,m.photo),ms=normalizeMeetingStatus(m.minutesStatus,m.minutes);
    return `<div class="meeting-card" data-id="${m.id}">
      <div class="meeting-title-row"><div class="meeting-title">${escapeHtml(m.title)}</div><div class="meeting-date">${m.date||"날짜 확인 필요"}</div></div>
      <div class="meeting-checks">
        <span class="status-pill ${ps==='done'?'done':ps==='na'?'na':''}">사진 ${meetingStatusLabel(ps)}</span>
        <span class="status-pill ${ms==='done'?'done':ms==='na'?'na':''}">회의록 ${meetingStatusLabel(ms)}</span>
      </div>
      ${m.memo?`<div class="meeting-memo">${escapeHtml(m.memo)}</div>`:""}
    </div>`;
  }).join("");
  $("#meetingEmpty").style.display=rows.length?"none":"block";document.querySelectorAll(".meeting-card").forEach(el=>el.onclick=()=>openMeetingEdit(el.dataset.id));
}
function openMeetingNew(){
  $("#meetingDialogTitle").textContent="모임 추가";$("#meetingEditId").value="";$("#meetingDate").value=new Date().toISOString().slice(0,10);$("#meetingTitle").value="";
  $("#meetingPhotoStatus").value="needed";$("#meetingMinutesStatus").value="needed";$("#meetingMemo").value="";$("#deleteMeetingBtn").classList.add("hidden");openDialog($("#meetingDialog"));
}
function openMeetingEdit(id){
  const m=meetings.find(x=>x.id===id);if(!m)return;$("#meetingDialogTitle").textContent="모임 수정";$("#meetingEditId").value=id;$("#meetingDate").value=m.date||"";$("#meetingTitle").value=m.title;
  $("#meetingPhotoStatus").value=normalizeMeetingStatus(m.photoStatus,m.photo);$("#meetingMinutesStatus").value=normalizeMeetingStatus(m.minutesStatus,m.minutes);$("#meetingMemo").value=m.memo||"";$("#deleteMeetingBtn").classList.remove("hidden");openDialog($("#meetingDialog"));
}
$("#addMeetingBtn").onclick=openMeetingNew;$("#closeMeetingDialog").onclick=()=>closeDialog($("#meetingDialog"));
$("#meetingForm").addEventListener("submit",e=>{e.preventDefault();const obj={id:$("#meetingEditId").value||uid(),date:$("#meetingDate").value,title:$("#meetingTitle").value.trim(),photoStatus:$("#meetingPhotoStatus").value,minutesStatus:$("#meetingMinutesStatus").value,memo:$("#meetingMemo").value.trim()};const i=meetings.findIndex(x=>x.id===obj.id);if(i>=0)meetings[i]=obj;else meetings.push(obj);saveMeetings();closeDialog($("#meetingDialog"));renderMeetings()});
$("#deleteMeetingBtn").onclick=()=>{const id=$("#meetingEditId").value;if(id&&confirm("이 모임 기록을 삭제할까요?")){meetings=meetings.filter(x=>x.id!==id);saveMeetings();closeDialog($("#meetingDialog"));renderMeetings()}};

/* CSV/백업 */
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function parseCsv(text){
  text=String(text||"").replace(/^\uFEFF/,"");const rows=[];let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(q){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}else if(ch==='"')q=false;else cell+=ch}else{if(ch==='"')q=true;else if(ch===','){row.push(cell);cell=""}else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell=""}else if(ch!=='\r')cell+=ch}}
  if(cell.length||row.length){row.push(cell);rows.push(row)}return rows.filter(r=>r.some(v=>String(v).trim()!==""));
}
const norm=s=>String(s||"").trim().replace(/\s+/g,"");
function first(o,names){for(const n of names){if(o[norm(n)]!==undefined&&o[norm(n)]!=="")return o[norm(n)]}return ""}
function dateNorm(v){const s=String(v||"").trim(),m=s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);return m?`${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`:""}
function bool(v){return ["1","true","완료","체크","예","y","yes"].includes(String(v||"").trim().toLowerCase())}

$("#csvExportBtn").onclick=()=>{
  const h=["구분","내역ID","날짜","예산항목","세부항목","사용처","품목","수량","금액","상품금액","결제수단","증빙상태","구매유형","인터넷링크","수수료방식","수수료율","수수료금액","택배비","증빙서류명","체크여부","필수여부","사용자추가","모임제목","사진상태","회의록상태","메모"];
  const rows=[h];
  transactions.forEach(t=>{rows.push(["사업비",t.id,t.date,catById(t.category)?.name||"",t.subCategory,t.merchant,"","",t.amount,"",t.payment||"",t.evidence||"todo","","","","","","","","","","","","","",t.memo||""]);(evidenceDocs[t.id]||[]).forEach(d=>rows.push(["증빙서류",t.id,"","","","","","","","","","","","","","","","",d.name,d.checked?"체크":"미체크",d.required===false?"조건부":"필수",d.custom?"예":"아니오","","","", ""]))});
  stationeryTransactions.forEach(t=>rows.push(["여수문구사",t.id,t.date,"사무관리비","소모성물품구입비","",t.item,t.qty||"",Number(t.total??t.amount??0),Number(t.amount||0),"","","인터넷 대행구매"===((t.purchaseType||"store")==="link"?"인터넷 대행구매":"직접구매")?"인터넷 대행구매":"직접구매",t.link||"",t.feeMode||"",t.feeRate||0,t.fee||0,t.shipping||0,"","","","","","","",t.memo||""]));
  meetings.forEach(m=>rows.push(["모임",m.id,m.date,"","","","","","","","","","","","","","","","","","","",m.title,meetingStatusLabel(normalizeMeetingStatus(m.photoStatus,m.photo)),meetingStatusLabel(normalizeMeetingStatus(m.minutesStatus,m.minutes)),m.memo||""]));
  const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");download(`무지개반사_통합백업_${new Date().toISOString().slice(0,10)}.csv`,csv,"text/csv;charset=utf-8");
};

$("#csvImportInput").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const rows=parseCsv(await f.text());if(rows.length<2)throw new Error("데이터 없음");const headers=rows[0].map(norm),objs=rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??"").trim()])));
    const evRows=[];
    for(const o of objs){
      const type=first(o,["구분"]),id=first(o,["내역ID"])||uid();
      if(type==="증빙서류"){evRows.push(o);continue}
      if(type==="모임"||type==="회의"){
        const parseStatus=v=>{const s=String(v||"").trim();if(s==="완료")return "done";if(s==="필요없음")return "na";return "needed"};
        meetings.push({id,date:dateNorm(first(o,["날짜"])),title:first(o,["모임제목","회의제목"])||"모임",photoStatus:parseStatus(first(o,["사진상태","사진완료"])),minutesStatus:parseStatus(first(o,["회의록상태","회의록완료"])),memo:first(o,["메모"])});continue}
      if(type==="여수문구사"){
        const amount=Number(first(o,["상품금액"])||first(o,["금액"])||0),fee=Number(first(o,["수수료금액"])||0),shipping=Number(first(o,["택배비"])||0);
        stationeryTransactions.push({id,date:dateNorm(first(o,["날짜"])),purchaseType:first(o,["구매유형"]).includes("인터넷")?"link":"store",item:first(o,["품목"])||"품목",qty:first(o,["수량"]),amount,link:first(o,["인터넷링크"]),feeMode:first(o,["수수료방식"])||"none",feeRate:Number(first(o,["수수료율"])||0),fee,shipping,total:Number(first(o,["금액"])||amount+fee+shipping),memo:first(o,["메모"])});continue}
      if(type==="사업비"){
        const catName=first(o,["예산항목"]),cat=BUDGETS.find(b=>b.name===catName)?.id||"";const t={id,date:dateNorm(first(o,["날짜"])),category:cat,subCategory:first(o,["세부항목"]),merchant:first(o,["사용처"]),amount:Number(first(o,["금액"])||0),payment:first(o,["결제수단"])||"전용카드",evidence:first(o,["증빙상태"])||"todo",memo:first(o,["메모"])};transactions.push(t);ensureEvidence(t)}
    }
    evRows.forEach(o=>{const id=first(o,["내역ID"]),name=first(o,["증빙서류명"]);if(!id||!name)return;if(!evidenceDocs[id])evidenceDocs[id]=[];evidenceDocs[id].push({name,checked:bool(first(o,["체크여부"])),required:first(o,["필수여부"])!=="조건부",custom:bool(first(o,["사용자추가"]))})});
    transactions.forEach(syncEvidence);save();saveStationery();saveEvidence();saveMeetings();renderAll();$("#csvImportResult").className="import-result";$("#csvImportResult").textContent="통합 CSV 가져오기가 완료됐어요.";
  }catch(err){$("#csvImportResult").className="import-result error";$("#csvImportResult").textContent="CSV 가져오기에 실패했어요. 파일 형식을 확인해 주세요."}
  e.target.value="";
};

$("#backupBtn").onclick=()=>download(`무지개반사_전체백업_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({version:"2.7",transactions,stationeryTransactions,evidenceDocs,todos,meetings,meetingTodos,stationeryPayments},null,2),"application/json");
$("#restoreInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await f.text());if(!Array.isArray(o.transactions))throw new Error();if(confirm("현재 데이터를 백업 내용으로 바꿀까요?")){transactions=o.transactions||[];stationeryTransactions=o.stationeryTransactions||[];evidenceDocs=o.evidenceDocs||{};todos=o.todos||[];meetings=o.meetings||[];meetingTodos=o.meetingTodos||[];stationeryPayments=o.stationeryPayments||{"8":false,"9":false,"10":false};save();saveStationery();saveEvidence();saveTodos();saveMeetings();saveMeetingTodos();saveStationeryPayments();renderAll()}}catch{alert("올바른 백업 파일이 아닙니다.")}e.target.value=""};
$("#resetBtn").onclick=()=>{if(confirm("모든 데이터를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")){transactions=[];stationeryTransactions=[];evidenceDocs={};todos=[];meetings=[];meetingTodos=[];stationeryPayments={"8":false,"9":false,"10":false};save();saveStationery();saveEvidence();saveTodos();saveMeetings();saveMeetingTodos();saveStationeryPayments();renderAll()}};

/* 전체 렌더 */
function renderAll(){renderTodos();renderMeetingTodos();renderHome();renderTransactions();renderStationery();renderMeetings()}
migrateRentSubs();transactions.forEach(t=>{mergeEvidence(t);syncEvidence(t)});save();saveEvidence();meetings=meetings.map(m=>({...m,photoStatus:normalizeMeetingStatus(m.photoStatus,m.photo),minutesStatus:normalizeMeetingStatus(m.minutesStatus,m.minutes)}));saveMeetings();initSelects();renderAll();

if("serviceWorker" in navigator){navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(r=>r.update()).catch(()=>{})}

/* v2.5 iOS/PWA 확대 제스처 방지 */
document.addEventListener("gesturestart",e=>e.preventDefault(),{passive:false});
document.addEventListener("gesturechange",e=>e.preventDefault(),{passive:false});
document.addEventListener("gestureend",e=>e.preventDefault(),{passive:false});
let lastTouchEnd=0;
document.addEventListener("touchend",e=>{
  const now=Date.now();
  if(now-lastTouchEnd<=300)e.preventDefault();
  lastTouchEnd=now;
},{passive:false});
