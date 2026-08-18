
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
let transactions = JSON.parse(localStorage.getItem(KEY)||"[]");
let stationeryTransactions = JSON.parse(localStorage.getItem(ST_KEY)||"[]");
let evidenceDocs = JSON.parse(localStorage.getItem(EVIDENCE_KEY)||"{}");
let todos = JSON.parse(localStorage.getItem(TODO_KEY)||"[]");

const $=s=>document.querySelector(s);
const fmt=n=>Number(n||0).toLocaleString("ko-KR")+"원";
const save=()=>localStorage.setItem(KEY,JSON.stringify(transactions));
const saveStationery=()=>localStorage.setItem(ST_KEY,JSON.stringify(stationeryTransactions));
const saveEvidence=()=>localStorage.setItem(EVIDENCE_KEY,JSON.stringify(evidenceDocs));
const saveTodos=()=>localStorage.setItem(TODO_KEY,JSON.stringify(todos));
const catById=id=>BUDGETS.find(x=>x.id===id);
const monthKey=date=>String(date||"").slice(0,7);
const escapeHtml=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));


function renderTodos(){
  const list=$("#todoList");
  list.innerHTML=todos.map(t=>`
    <div class="todo-item ${t.done?'done':''}" data-id="${t.id}">
      <input type="checkbox" ${t.done?'checked':''} aria-label="완료 체크">
      <div class="todo-text">${escapeHtml(t.text)}</div>
      <button type="button" class="todo-delete" aria-label="삭제">✕</button>
    </div>
  `).join("");

  document.querySelectorAll(".todo-item").forEach(el=>{
    const id=el.dataset.id;
    el.querySelector('input[type="checkbox"]').onchange=e=>{
      const t=todos.find(x=>x.id===id);
      if(!t)return;
      t.done=e.target.checked;
      saveTodos();
      renderTodos();
    };
    el.querySelector(".todo-delete").onclick=()=>{
      todos=todos.filter(x=>x.id!==id);
      saveTodos();
      renderTodos();
    };
  });

  const full=todos.length>=3;
  $("#todoInput").disabled=full;
  $("#todoAddBtn").disabled=full;
  $("#todoLimitMsg").classList.toggle("hidden",!full);
  $(".todo-add-row").classList.toggle("disabled",full);
}
function addTodo(){
  const text=$("#todoInput").value.trim();
  if(!text || todos.length>=3)return;
  todos.push({id:crypto.randomUUID(),text,done:false});
  saveTodos();
  $("#todoInput").value="";
  renderTodos();
}
$("#todoAddBtn").onclick=addTodo;
$("#todoInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    addTodo();
  }
});

function migrateRentSubs(){
  let changed=false;
  transactions=transactions.map(t=>{
    if(t.category==="rent" && ["프로그램 공간 임대료","전시실 임대료"].includes(t.subCategory)){
      changed=true;
      return {...t,subCategory:"임차료"};
    }
    return t;
  });
  if(changed) save();
}

function evidenceTemplateForTransaction(t){
  const cardReceipt = {name:"지원금 전용 체크카드 영수증", checked:false, required:true, custom:false};
  const transferReceipt = {name:"계좌이체 확인증", checked:false, required:true, custom:false};

  // 홍보비: 현재 앱에서는 '플랜카드 제작'으로 사용
  if(t.category==="event" && t.subCategory==="플랜카드 제작"){
    const docs = [
      t.payment==="계좌이체" ? transferReceipt : cardReceipt,
      {name:"견적서",checked:false,required:true,custom:false},
      {name:"증빙사진",checked:false,required:true,custom:false}
    ];
    if(t.payment==="계좌이체"){
      docs.push(
        {name:"세금계산서",checked:false,required:true,custom:false},
        {name:"사업자등록증",checked:false,required:true,custom:false}
      );
    }
    return {
      title:"홍보비",
      rule:"현수막·인쇄물·영상물 등 제작",
      docs
    };
  }

  // 소모성물품구입비
  if(t.category==="office" && t.subCategory==="소모성물품구입비"){
    return {
      title:"소모성물품구입비",
      rule:"지원금 체크카드 결제 · 영수증에 품목명이 없으면 거래명세서 또는 견적서 필요",
      docs:[
        cardReceipt,
        {name:"거래명세표 또는 견적서",checked:false,required:true,custom:false},
        {name:"행사(강의) 결과보고서",checked:false,required:true,custom:false},
        {name:"참가자 서명부",checked:false,required:true,custom:false},
        {name:"증빙사진",checked:false,required:true,custom:false},
        {name:"비교견적서 (단일품목 20만원 이상인 경우)",checked:false,required:false,conditional:true,custom:false}
      ]
    };
  }

  // 임차료
  if(t.category==="rent"){
    const docs = [
      t.payment==="계좌이체" ? transferReceipt : cardReceipt,
      {name:"임차계약서",checked:false,required:true,custom:false},
      {name:"사업자등록증",checked:false,required:true,custom:false},
      {name:"행사(강의) 결과보고서",checked:false,required:true,custom:false},
      {name:"활동사진",checked:false,required:true,custom:false},
      {name:"참가자 서명부",checked:false,required:true,custom:false}
    ];
    if(t.payment==="계좌이체"){
      docs.push({name:"세금계산서",checked:false,required:true,custom:false});
    }
    return {
      title:"임차료",
      rule:"장소·기자재 등 임차 · 임차계약서에 사용기간 명시",
      docs
    };
  }

  // 운영수당 / 자문료
  if(t.category==="allowance"){
    return {
      title:"운영수당·자문료",
      rule:"계좌이체 원칙 · 동일인/동일단체 월 125,000원 초과 지급 시 원천징수 확인 필요",
      docs:[
        {name:"강사등급 확인 서류",checked:false,required:true,custom:false},
        {name:"강사/자문자 프로필",checked:false,required:true,custom:false},
        {name:"강의·자문 자료",checked:false,required:true,custom:false},
        {name:"강의·자문 사진",checked:false,required:true,custom:false},
        {name:"강의확인서 또는 자문확인서 (주소 명시)",checked:false,required:true,custom:false},
        {name:"강사/자문자 통장사본",checked:false,required:true,custom:false},
        {name:"행사(강의) 결과보고서 (강의시간 명시)",checked:false,required:true,custom:false},
        {name:"참가자 서명부",checked:false,required:true,custom:false},
        {name:"계좌이체 확인증",checked:false,required:true,custom:false},
        {name:"원천징수 납부 확인서 (월 125,000원 초과 지급 시)",checked:false,required:false,conditional:true,custom:false}
      ]
    };
  }

  // 행사운영비(재료비)
  if(t.category==="event" && t.subCategory==="행사운영비(재료비)"){
    return {
      title:"행사운영비",
      rule:"행사진행에 필요한 각종 물품·재료비 · 지원금 체크카드 결제",
      docs:[
        cardReceipt,
        {name:"구입물품 사진",checked:false,required:true,custom:false},
        {name:"활동사진",checked:false,required:true,custom:false},
        {name:"행사결과보고서",checked:false,required:true,custom:false},
        {name:"참가자 서명부",checked:false,required:true,custom:false}
      ]
    };
  }

  // 식비/다과비
  if(t.category==="office" && t.subCategory==="식비/다과비"){
    return {
      title:"식비·다과비",
      rule:"지원금 체크카드 결제 · 식비 9,000원, 다과 3,000원(1인 1식) · 주류 불가",
      docs:[
        cardReceipt,
        {name:"참가자 서명부",checked:false,required:true,custom:false},
        {name:"행사(강의) 결과보고서 또는 회의록",checked:false,required:true,custom:false}
      ]
    };
  }

  return {
    title:"기타 집행",
    rule:"등록된 예산 항목에 맞는 증빙을 확인하세요.",
    docs:[
      t.payment==="계좌이체" ? transferReceipt : cardReceipt
    ]
  };
}

function defaultEvidenceDocs(t){
  return evidenceTemplateForTransaction(t).docs;
}

function mergeEvidenceTemplate(t){
  const template=evidenceTemplateForTransaction(t);
  const old=Array.isArray(evidenceDocs[t.id])?evidenceDocs[t.id]:[];
  const oldByName=new Map(old.map(d=>[d.name,d]));
  const merged=template.docs.map(d=>{
    const prev=oldByName.get(d.name);
    return prev ? {...d,checked:!!prev.checked} : {...d};
  });
  old.filter(d=>d.custom).forEach(d=>{
    if(!merged.some(x=>x.name===d.name)) merged.push({...d,required:d.required!==false,custom:true});
  });
  evidenceDocs[t.id]=merged;
  saveEvidence();
}

function ensureEvidenceForTransaction(t){
  if(!Array.isArray(evidenceDocs[t.id]) || evidenceDocs[t.id].length===0){
    evidenceDocs[t.id]=defaultEvidenceDocs(t);
    if(t.evidence==="done"){
      evidenceDocs[t.id].forEach(d=>{if(d.required!==false)d.checked=true;});
    }
    saveEvidence();
  }else{
    mergeEvidenceTemplate(t);
  }
}
function syncEvidenceStatus(t){
  ensureEvidenceForTransaction(t);
  const docs=evidenceDocs[t.id]||[];
  const requiredDocs=docs.filter(d=>d.required!==false);
  const done=requiredDocs.length>0 && requiredDocs.every(d=>d.checked);
  t.evidence=done?"done":"todo";
  return done;
}
function syncAllEvidenceStatuses(){
  let changed=false;
  transactions.forEach(t=>{
    ensureEvidenceForTransaction(t);
    const prev=t.evidence;
    syncEvidenceStatus(t);
    if(prev!==t.evidence)changed=true;
  });
  if(changed)save();
}

function initSelects(){
  $("#category").innerHTML="";
  BUDGETS.forEach(b=>{
    const o1=document.createElement("option");o1.value=b.id;o1.textContent=b.name;$("#category").appendChild(o1);
    const o2=document.createElement("option");o2.value=b.id;o2.textContent=b.name;$("#filterCategory").appendChild(o2);
  });
  updateSubcats();
}
function updateSubcats(){
  const b=catById($("#category").value)||BUDGETS[0];
  $("#subCategory").innerHTML=b.subs.map(s=>`<option>${s.name}</option>`).join("");
}
function spentFor(id){return transactions.filter(t=>t.category===id).reduce((a,b)=>a+Number(b.amount),0)}
function spentSub(id,name){return transactions.filter(t=>t.category===id&&t.subCategory===name).reduce((a,b)=>a+Number(b.amount),0)}

function render(){
  const total=BUDGETS.reduce((a,b)=>a+b.budget,0);
  const spent=transactions.reduce((a,b)=>a+Number(b.amount),0);
  const stSpent=stationeryTransactions.reduce((sum,t)=>sum+Number(t.total ?? t.amount ?? 0),0);

  $("#totalBudget").textContent=fmt(total);
  $("#spentTotal").textContent=fmt(spent);
  $("#remainingTotal").textContent=fmt(total-spent);
  $("#spentRate").textContent=(spent/total*100).toFixed(1)+"% 집행";
  $("#remainingRate").textContent=Math.max(0,(total-spent)/total*100).toFixed(1)+"% 남음";
  $("#stationerySpentTop").textContent=fmt(stSpent);
  $("#stationeryTopCaption").textContent=`여수문구사 상세 내역 합계`;

  $("#budgetCards").innerHTML=BUDGETS.map(b=>{
    const s=spentFor(b.id),rem=b.budget-s,rate=Math.min(100,s/b.budget*100);
    const subs=b.subs.map(sub=>{
      const ss=spentSub(b.id,sub.name),sr=sub.budget-ss;
      return `<div class="subbudget ${sr<0?'over':''}">
        <b>${escapeHtml(sub.name)}</b>
        <span>${fmt(ss)} / ${fmt(sub.budget)} · ${sr>=0?'잔액 ':'초과 '}${fmt(Math.abs(sr))}</span>
      </div>`;
    }).join("");
    return `<div class="budget-item ${rem<0?'over':''}" data-cat="${b.id}">
      <div class="budget-row">
        <div><div class="budget-name">${b.name}</div><div class="budget-sub">예산 ${fmt(b.budget)}</div></div>
        <div class="budget-num">${fmt(s)}<div class="budget-sub">${rem>=0?'잔액 '+fmt(rem):'초과 '+fmt(-rem)}</div></div>
      </div>
      <div class="progress"><i style="width:${rate}%"></i></div>
      <div class="subbudget-list">${subs}</div>
    </div>`;
  }).join("");

  document.querySelectorAll(".budget-item").forEach(el=>el.onclick=()=>{
    $("#filterCategory").value=el.dataset.cat;
    $("#filterEvidence").value="";
    renderTx();

    document.querySelectorAll(".budget-item").forEach(card=>{
      card.classList.toggle("selected",card===el);
    });

    const target=$("#budgetTransactionsSection");
    if(target){
      setTimeout(()=>target.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }
  });
  renderTx();
  renderStationery();
  renderEvidence();
}
function renderTx(){
  const cat=$("#filterCategory").value,ev=$("#filterEvidence").value;
  let rows=[...transactions].sort((a,b)=>b.date.localeCompare(a.date));
  if(cat)rows=rows.filter(t=>t.category===cat);
  if(ev)rows=rows.filter(t=>t.evidence===ev);
  $("#listCaption").textContent=cat?`${catById(cat).name} 내역`:"전체 내역";
  $("#txList").innerHTML=rows.map(t=>{
    const b=catById(t.category);
    return `<div class="tx" data-id="${t.id}">
      <div><div class="tx-title">${escapeHtml(t.merchant)}</div>
      <div class="tx-meta">${t.date} · ${b?.name||""} › ${escapeHtml(t.subCategory||"")} · ${escapeHtml(t.payment||"")}
      <span class="badge ${t.evidence==='todo'?'todo':''}">${t.evidence==='todo'?'증빙 필요':'증빙 완료'}</span>
      ${t.memo?`<br>${escapeHtml(t.memo)}`:""}</div></div>
      <div class="tx-amount">${fmt(t.amount)}</div>
    </div>`;
  }).join("");
  $("#emptyState").style.display=rows.length?"none":"block";
  document.querySelectorAll("#txList .tx").forEach(el=>el.onclick=()=>openEdit(el.dataset.id));
}
function renderStationery(){

  const mf=$("#stationeryMonthFilter").value,ef=$("#stationeryEvidenceFilter").value;
  let rows=[...stationeryTransactions].sort((a,b)=>b.date.localeCompare(a.date));
  if(mf)rows=rows.filter(t=>monthKey(t.date)===mf);
  if(ef)rows=rows.filter(t=>t.evidence===ef);

  const cap=[];
  if(mf) cap.push(`${Number(mf.slice(5))}월`);
  if(ef) cap.push(ef==="done"?"증빙 완료":"증빙 필요");
  $("#stationeryListCaption").textContent=cap.length?cap.join(" · ")+" 내역":"전체 내역";

  $("#stationeryList").innerHTML=rows.map(t=>{
    const isLink=(t.purchaseType||"store")==="link";
    const fee=Number(t.fee||0);
    const shipping=Number(t.shipping||0);
    const total=Number(t.total ?? (Number(t.amount||0)+fee+shipping));
    const purchaseMeta=isLink
      ? `인터넷 대행구매 · 상품 ${fmt(t.amount)}${fee?` · 수수료 ${fmt(fee)}`:""}${shipping?` · 택배 ${fmt(shipping)}`:""}`
      : `여수문구사 직접구매`;
    return `
    <div class="tx" data-id="${t.id}">
      <div>
        <div class="tx-title">${escapeHtml(t.item)}</div>
        <div class="tx-meta">${t.date}${t.qty?` · 수량 ${escapeHtml(t.qty)}`:""} · ${purchaseMeta}
          <span class="badge ${t.evidence==='todo'?'todo':''}">${t.evidence==='todo'?'증빙 필요':'증빙 완료'}</span>
          ${t.link?`<br>${escapeHtml(t.link)}`:""}
          ${t.memo?`<br>${escapeHtml(t.memo)}`:""}
        </div>
      </div>
      <div class="tx-amount">${fmt(total)}</div>
    </div>`;
  }).join("");
  $("#stationeryEmpty").style.display=rows.length?"none":"block";
  document.querySelectorAll("#stationeryList .tx").forEach(el=>el.onclick=()=>openStationeryEdit(el.dataset.id));
}

function openNew(){
  $("#dialogTitle").textContent="내역 추가";$("#editId").value="";
  $("#date").value=new Date().toISOString().slice(0,10);
  $("#category").value=BUDGETS[0].id;updateSubcats();
  $("#merchant").value="";$("#amount").value="";$("#payment").value="전용카드";$("#evidence").value="done";$("#memo").value="";
  $("#deleteBtn").classList.add("hidden");$("#txDialog").showModal();
}
function openEdit(id){
  const t=transactions.find(x=>x.id===id);if(!t)return;
  $("#dialogTitle").textContent="내역 수정";$("#editId").value=t.id;$("#date").value=t.date;
  $("#category").value=t.category;updateSubcats();$("#subCategory").value=t.subCategory;
  $("#merchant").value=t.merchant;$("#amount").value=t.amount;$("#payment").value=t.payment;$("#evidence").value=t.evidence;$("#memo").value=t.memo||"";
  $("#deleteBtn").classList.remove("hidden");$("#txDialog").showModal();
}
function validateSubBudget(obj){
  const b=catById(obj.category),sub=b?.subs.find(s=>s.name===obj.subCategory);
  if(!sub)return true;
  const other=transactions.filter(t=>t.category===obj.category&&t.subCategory===obj.subCategory&&t.id!==obj.id).reduce((a,t)=>a+Number(t.amount),0);
  const projected=other+Number(obj.amount);
  return projected<=sub.budget || confirm(`${obj.subCategory} 예산 ${fmt(sub.budget)}을 ${fmt(projected-sub.budget)} 초과합니다.\n그래도 저장할까요?`);
}
$("#txForm").addEventListener("submit",e=>{
  e.preventDefault();
  const obj={id:$("#editId").value||crypto.randomUUID(),date:$("#date").value,category:$("#category").value,subCategory:$("#subCategory").value,
    merchant:$("#merchant").value.trim(),amount:Number($("#amount").value),payment:$("#payment").value,evidence:$("#evidence").value,memo:$("#memo").value.trim()};
  if(!validateSubBudget(obj))return;
  const i=transactions.findIndex(x=>x.id===obj.id);
  const isNew=i<0;
  if(i>=0)transactions[i]=obj;else transactions.push(obj);
  if(isNew || !evidenceDocs[obj.id]){
    evidenceDocs[obj.id]=defaultEvidenceDocs(obj);
    if(obj.evidence==="done") evidenceDocs[obj.id].forEach(d=>{if(d.required!==false)d.checked=true;});
    saveEvidence();
  } else {
    mergeEvidenceTemplate(obj);
    syncEvidenceStatus(obj);
  }
  save();$("#txDialog").close();render();
});
$("#deleteBtn").onclick=()=>{
  const id=$("#editId").value;if(id&&confirm("이 내역을 삭제할까요?")){transactions=transactions.filter(x=>x.id!==id);delete evidenceDocs[id];saveEvidence();save();$("#txDialog").close();render();}
};


function stationeryFeeAmount(){
  const type=$("#stationeryPurchaseType").value;
  if(type!=="link") return 0;
  const amount=Number($("#stationeryAmount").value||0);
  const mode=$("#stationeryFeeMode").value;
  if(mode==="percent"){
    return Math.round(amount * Number($("#stationeryFeeRate").value||0) / 100);
  }
  if(mode==="fixed"){
    return Number($("#stationeryFeeFixed").value||0);
  }
  return 0;
}
function stationeryTotalAmount(){
  const amount=Number($("#stationeryAmount").value||0);
  const shipping=$("#stationeryPurchaseType").value==="link" ? Number($("#stationeryShipping").value||0) : 0;
  return amount + stationeryFeeAmount() + shipping;
}
function updateStationeryFeeUI(){
  const isLink=$("#stationeryPurchaseType").value==="link";
  $("#stationeryLinkLabel").classList.toggle("hidden",!isLink);
  $("#stationeryFeeFields").classList.toggle("hidden",!isLink);

  const mode=$("#stationeryFeeMode").value;
  $("#stationeryFeeRateLabel").classList.toggle("hidden",mode!=="percent");
  $("#stationeryFeeFixedLabel").classList.toggle("hidden",mode!=="fixed");

  $("#stationeryFeePreview").textContent=fmt(stationeryFeeAmount());
  $("#stationeryTotalPreview").textContent=fmt(stationeryTotalAmount());
}
function openStationeryNew(){
  $("#stationeryDialogTitle").textContent="여수문구사 사용 내역 추가";
  $("#stationeryEditId").value="";
  $("#stationeryDate").value=new Date().toISOString().slice(0,10);
  $("#stationeryPurchaseType").value="store";
  $("#stationeryItem").value="";
  $("#stationeryLink").value="";
  $("#stationeryAmount").value="";
  $("#stationeryFeeMode").value="percent";
  $("#stationeryFeeRate").value="20";
  $("#stationeryFeeFixed").value="0";
  $("#stationeryShipping").value="0";
  $("#stationeryQty").value="";
  $("#stationeryEvidence").value="done";
  $("#stationeryMemo").value="";
  $("#deleteStationeryBtn").classList.add("hidden");
  updateStationeryFeeUI();
  $("#stationeryDialog").showModal();
}
function openStationeryEdit(id){
  const t=stationeryTransactions.find(x=>x.id===id);if(!t)return;
  $("#stationeryDialogTitle").textContent="여수문구사 사용 내역 수정";
  $("#stationeryEditId").value=t.id;
  $("#stationeryDate").value=t.date;
  $("#stationeryPurchaseType").value=t.purchaseType||"store";
  $("#stationeryItem").value=t.item;
  $("#stationeryLink").value=t.link||"";
  $("#stationeryAmount").value=t.amount;
  $("#stationeryFeeMode").value=t.feeMode||"percent";
  $("#stationeryFeeRate").value=t.feeRate ?? 20;
  $("#stationeryFeeFixed").value=t.feeFixed ?? 0;
  $("#stationeryShipping").value=t.shipping ?? 0;
  $("#stationeryQty").value=t.qty||"";
  $("#stationeryEvidence").value=t.evidence;
  $("#stationeryMemo").value=t.memo||"";
  $("#deleteStationeryBtn").classList.remove("hidden");
  updateStationeryFeeUI();
  $("#stationeryDialog").showModal();
}
$("#stationeryForm").addEventListener("submit",e=>{
  e.preventDefault();
  const purchaseType=$("#stationeryPurchaseType").value;
  const feeMode=$("#stationeryFeeMode").value;
  const feeRate=Number($("#stationeryFeeRate").value||0);
  const feeFixed=Number($("#stationeryFeeFixed").value||0);
  const shipping=purchaseType==="link"?Number($("#stationeryShipping").value||0):0;
  const amount=Number($("#stationeryAmount").value||0);
  const fee=purchaseType==="link"
    ? (feeMode==="percent" ? Math.round(amount*feeRate/100) : feeMode==="fixed" ? feeFixed : 0)
    : 0;
  const total=amount+fee+shipping;

  const obj={
    id:$("#stationeryEditId").value||crypto.randomUUID(),
    date:$("#stationeryDate").value,
    purchaseType,
    item:$("#stationeryItem").value.trim(),
    link:purchaseType==="link"?$("#stationeryLink").value.trim():"",
    amount,
    feeMode:purchaseType==="link"?feeMode:"none",
    feeRate:purchaseType==="link"&&feeMode==="percent"?feeRate:0,
    feeFixed:purchaseType==="link"&&feeMode==="fixed"?feeFixed:0,
    fee,
    shipping,
    total,
    qty:$("#stationeryQty").value.trim(),
    evidence:$("#stationeryEvidence").value,
    memo:$("#stationeryMemo").value.trim()
  };

  const i=stationeryTransactions.findIndex(x=>x.id===obj.id);
  if(i>=0)stationeryTransactions[i]=obj;else stationeryTransactions.push(obj);
  saveStationery();$("#stationeryDialog").close();render();
});
$("#deleteStationeryBtn").onclick=()=>{
  const id=$("#stationeryEditId").value;if(id&&confirm("이 여수문구사 내역을 삭제할까요?")){
    stationeryTransactions=stationeryTransactions.filter(x=>x.id!==id);saveStationery();$("#stationeryDialog").close();render();
  }
};



function renderEvidence(){
  syncAllEvidenceStatuses();

  const select=$("#evidenceTxFilter");
  const keep=select.value;
  select.innerHTML='<option value="">전체 집행 건</option>'+
    [...transactions].sort((a,b)=>b.date.localeCompare(a.date)).map(t=>
      `<option value="${t.id}">${t.date} · ${escapeHtml(t.merchant)}</option>`
    ).join("");
  if([...select.options].some(o=>o.value===keep))select.value=keep;

  let rows=[...transactions].sort((a,b)=>b.date.localeCompare(a.date));
  const txFilter=select.value;
  const status=$("#evidenceStatusFilter").value;
  if(txFilter)rows=rows.filter(t=>t.id===txFilter);
  if(status)rows=rows.filter(t=>t.evidence===status);

  $("#evidenceList").innerHTML=rows.map(t=>{
    ensureEvidenceForTransaction(t);
    const docs=evidenceDocs[t.id]||[];
    const requiredDocs=docs.filter(d=>d.required!==false);
    const checked=requiredDocs.filter(d=>d.checked).length;
    const b=catById(t.category);
    const tpl=evidenceTemplateForTransaction(t);
    return `<div class="evidence-card ${t.evidence==='done'?'done':''}" data-id="${t.id}">
      <div class="evidence-card-head">
        <div>
          <div class="evidence-card-title">${escapeHtml(t.merchant)}</div>
          <div class="evidence-card-meta">${t.date} · ${b?.name||""} › ${escapeHtml(t.subCategory||"")} · ${fmt(t.amount)}</div>
          <div class="evidence-detail">${escapeHtml(tpl.title)}</div>
        </div>
        <span class="badge ${t.evidence==='todo'?'todo':''}">${t.evidence==='done'?'증빙 완료':'증빙 필요'}</span>
      </div>
      <div class="evidence-progress">필수서류 ${checked}/${requiredDocs.length} 확인</div>
    </div>`;
  }).join("");

  $("#evidenceEmpty").style.display=rows.length?"none":"block";
  document.querySelectorAll(".evidence-card").forEach(el=>el.onclick=()=>openEvidenceDialog(el.dataset.id));

  renderTx();
}

function openEvidenceDialog(id){
  const t=transactions.find(x=>x.id===id);if(!t)return;
  ensureEvidenceForTransaction(t);
  $("#evidenceTxId").value=id;
  $("#evidenceDialogTitle").textContent="증빙서류 관리";
  $("#evidenceTxInfo").innerHTML=`<b>${escapeHtml(t.merchant)}</b><br>${t.date} · ${fmt(t.amount)} · ${escapeHtml(catById(t.category)?.name||"")} › ${escapeHtml(t.subCategory||"")}`;
  const tpl=evidenceTemplateForTransaction(t);
  const ruleInfo=$("#evidenceRuleInfo");
  if(ruleInfo) ruleInfo.innerHTML=`<b>${escapeHtml(tpl.title)}</b><br>${escapeHtml(tpl.rule)}`;
  renderEvidenceChecklist(id);
  $("#newEvidenceDoc").value="";
  const dlg=$("#evidenceDialog");
  if(typeof dlg.showModal==="function") dlg.showModal();
  else dlg.setAttribute("open","");
}
function renderEvidenceChecklist(id){
  const docs=evidenceDocs[id]||[];
  $("#evidenceChecklist").innerHTML=docs.map((d,i)=>`
    <label class="evidence-doc">
      <input type="checkbox" data-index="${i}" ${d.checked?"checked":""}>
      <span class="doc-main">
        <span class="doc-title">${escapeHtml(d.name)}</span>
        <span class="doc-tag ${d.required===false?'conditional':'required'}">${d.required===false?'조건부':'필수'}</span>
      </span>
      ${d.custom?`<button type="button" data-delete="${i}" aria-label="삭제">✕</button>`:""}
    </label>`).join("");
  document.querySelectorAll('#evidenceChecklist input[type="checkbox"]').forEach(ch=>{
    ch.onchange=()=>{
      const idx=Number(ch.dataset.index);
      evidenceDocs[id][idx].checked=ch.checked;
    };
  });
  document.querySelectorAll('#evidenceChecklist button[data-delete]').forEach(btn=>{
    btn.onclick=()=>{
      const idx=Number(btn.dataset.delete);
      evidenceDocs[id].splice(idx,1);
      renderEvidenceChecklist(id);
    };
  });
}
$("#addEvidenceDocBtn").onclick=()=>{
  const id=$("#evidenceTxId").value;
  const name=$("#newEvidenceDoc").value.trim();
  if(!id||!name)return;
  evidenceDocs[id].push({name,checked:false,required:true,custom:true});
  $("#newEvidenceDoc").value="";
  renderEvidenceChecklist(id);
};
$("#resetEvidenceBtn").onclick=()=>{
  const id=$("#evidenceTxId").value;
  const t=transactions.find(x=>x.id===id);
  if(!t)return;
  if(confirm("이 건의 증빙 목록을 기본 항목으로 되돌릴까요?")){
    evidenceDocs[id]=defaultEvidenceDocs(t);
    renderEvidenceChecklist(id);
  }
};
$("#saveEvidenceBtn").onclick=()=>{
  const id=$("#evidenceTxId").value;
  const t=transactions.find(x=>x.id===id);
  if(!t)return;
  saveEvidence();
  syncEvidenceStatus(t);
  save();
  $("#evidenceDialog").close();
  render();
};
$("#closeEvidenceDialog").onclick=()=>{const d=$("#evidenceDialog"); if(typeof d.close==="function") d.close(); else d.removeAttribute("open");};
$("#evidenceTxFilter").onchange=renderEvidence;
$("#evidenceStatusFilter").onchange=renderEvidence;


document.querySelectorAll(".main-tab").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".main-tab").forEach(b=>b.classList.toggle("active",b===btn));
  $("#budgetTab").classList.toggle("active",btn.dataset.tab==="budget");
  $("#stationeryTab").classList.toggle("active",btn.dataset.tab==="stationery");
  $("#evidenceTab").classList.toggle("active",btn.dataset.tab==="evidence");
});

$("#addBtn").onclick=openNew;
$("#closeDialog").onclick=()=>$("#txDialog").close();
$("#category").onchange=updateSubcats;
$("#filterCategory").onchange=()=>{
  const cat=$("#filterCategory").value;
  document.querySelectorAll(".budget-item").forEach(card=>{
    card.classList.toggle("selected",!!cat && card.dataset.cat===cat);
  });
  renderTx();
};
$("#filterEvidence").onchange=renderTx;
$("#showAllBtn").onclick=()=>{
  $("#filterCategory").value="";
  $("#filterEvidence").value="";
  document.querySelectorAll(".budget-item").forEach(card=>card.classList.remove("selected"));
  renderTx();
};


$("#stationeryPurchaseType").onchange=updateStationeryFeeUI;
$("#stationeryFeeMode").onchange=updateStationeryFeeUI;
$("#stationeryAmount").oninput=updateStationeryFeeUI;
$("#stationeryFeeRate").oninput=updateStationeryFeeUI;
$("#stationeryFeeFixed").oninput=updateStationeryFeeUI;
$("#stationeryShipping").oninput=updateStationeryFeeUI;
$("#addStationeryBtn").onclick=openStationeryNew;
$("#closeStationeryDialog").onclick=()=>$("#stationeryDialog").close();
$("#stationeryMonthFilter").onchange=renderStationery;
$("#stationeryEvidenceFilter").onchange=renderStationery;



function parseCsv(text){
  text=String(text||"").replace(/^\uFEFF/,"");
  const rows=[];
  let row=[],cell="",inQuotes=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQuotes){
      if(ch==='"' && text[i+1]==='"'){cell+='"';i++;}
      else if(ch==='"'){inQuotes=false;}
      else cell+=ch;
    }else{
      if(ch==='"') inQuotes=true;
      else if(ch===','){row.push(cell);cell="";}
      else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell="";}
      else if(ch!=='\r') cell+=ch;
    }
  }
  if(cell.length || row.length){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(v=>String(v).trim()!==""));
}
function normalizeHeader(v){
  return String(v||"").trim().replace(/\s+/g,"").replace(/[()]/g,"");
}
function normalizeDate(v){
  const s=String(v||"").trim();
  let m=s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if(m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
  m=s.match(/^(\d{2})[-./](\d{1,2})[-./](\d{1,2})$/);
  if(m) return `20${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
  return "";
}
function parseAmount(v){
  const n=Number(String(v||"").replace(/[^\d.-]/g,""));
  return Number.isFinite(n)?n:NaN;
}
function categoryIdFromName(name){
  const s=String(name||"").trim();
  const aliases={
    "운영수당":"allowance","자문료":"allowance",
    "행사운영비":"event",
    "임차료":"rent",
    "사무관리비":"office",
    "소모성물품구입비":"office",
    "식비/다과비":"office","식비·다과비":"office","식비다과비":"office"
  };
  return aliases[s] || BUDGETS.find(b=>b.name===s)?.id || "";
}
function normalizeSubcategory(catId,sub){
  const s=String(sub||"").trim();
  if(!catId)return "";
  const b=catById(catId);
  if(!b)return "";
  const direct=b.subs.find(x=>x.name===s);
  if(direct)return direct.name;

  const aliases={
    "재료비":"행사운영비(재료비)",
    "행사운영비재료비":"행사운영비(재료비)",
    "플랜카드":"플랜카드 제작",
    "현수막":"플랜카드 제작",
    "소모성물품":"소모성물품구입비",
    "식비다과비":"식비/다과비",
    "식비·다과비":"식비/다과비"
  };
  const a=aliases[s.replace(/\s+/g,"")];
  if(a && b.subs.some(x=>x.name===a))return a;
  return "";
}
function rowObj(headers,row){
  const obj={};
  headers.forEach((h,i)=>obj[normalizeHeader(h)]=String(row[i]??"").trim());
  return obj;
}
function firstVal(obj,names){
  for(const n of names){
    const k=normalizeHeader(n);
    if(obj[k]!==undefined && obj[k]!=="")return obj[k];
  }
  return "";
}
function showImportResult(message,type="success"){
  const el=$("#csvImportResult");
  el.className=`import-result ${type}`;
  el.innerHTML=message;
}
function importCsvText(text){
  const rows=parseCsv(text);
  if(rows.length<2) throw new Error("CSV에 데이터 행이 없습니다.");

  const headers=rows[0];
  let addedBudget=0,addedStationery=0,duplicates=0,skipped=[];
  const existingKeys=new Set(transactions.map(t=>`${t.date}|${t.merchant}|${Number(t.amount)}`));

  rows.slice(1).forEach((row,idx)=>{
    const o=rowObj(headers,row);
    const line=idx+2;
    const type=firstVal(o,["구분","유형","type"]) || "사업비";
    const date=normalizeDate(firstVal(o,["날짜","일자","date"]));
    const amount=parseAmount(firstVal(o,["금액","결제금액","amount"]));

    if(!date || !Number.isFinite(amount) || amount<0){
      skipped.push(`${line}행: 날짜 또는 금액 확인 필요`);
      return;
    }

    if(type.includes("여수문구사")){
      // "여수문구사 결제" summary rows are not imported as detail rows.
      if(type.includes("결제")){
        skipped.push(`${line}행: 여수문구사 결제 요약 행은 제외`);
        return;
      }
      const item=firstVal(o,["세부항목/품목","품목","사용처/수량","사용처","내용"]);
      if(!item){
        skipped.push(`${line}행: 여수문구사 품목이 비어 있음`);
        return;
      }
      stationeryTransactions.push({
        id:crypto.randomUUID(),
        date,
        item,
        amount,
        qty:firstVal(o,["수량","사용처/수량"]),
        evidence:(firstVal(o,["증빙상태"])||"필요").includes("완료")?"done":"todo",
        memo:firstVal(o,["메모","비고"])
      });
      addedStationery++;
      return;
    }

    const categoryName=firstVal(o,["예산항목","비목","카테고리"]);
    const subName=firstVal(o,["세부항목/품목","세부항목","사용처"]);
    const merchant=firstVal(o,["사용처/수량","사용처","거래처","내용"]);
    const category=categoryIdFromName(categoryName);
    const subCategory=normalizeSubcategory(category,subName);

    if(!category || !subCategory || !merchant){
      skipped.push(`${line}행: 예산항목·세부항목·사용처 확인 필요`);
      return;
    }

    const dupKey=`${date}|${merchant}|${amount}`;
    if(existingKeys.has(dupKey)){duplicates++;return;}

    const evidence=(firstVal(o,["증빙상태"])||"필요").includes("완료")?"done":"todo";
    const tx={
      id:crypto.randomUUID(),
      date,
      category,
      subCategory,
      merchant,
      amount,
      payment:firstVal(o,["결제수단"]) || "전용카드",
      evidence,
      memo:firstVal(o,["메모","비고"])
    };
    transactions.push(tx);
    existingKeys.add(dupKey);

    evidenceDocs[tx.id]=defaultEvidenceDocs(tx);
    if(evidence==="done"){
      evidenceDocs[tx.id].forEach(d=>{if(d.required!==false)d.checked=true;});
    }
    addedBudget++;
  });

  save();saveStationery();saveEvidence();render();

  const parts=[
    `사업비 <b>${addedBudget}건</b>`,
    `여수문구사 <b>${addedStationery}건</b>`
  ];
  if(duplicates)parts.push(`중복 제외 <b>${duplicates}건</b>`);
  let html=`CSV 가져오기 완료: ${parts.join(" · ")}`;
  if(skipped.length){
    html+=`<br>확인 필요한 행 ${skipped.length}건: ${skipped.slice(0,6).map(escapeHtml).join(" / ")}${skipped.length>6?" 외":""}`;
  }
  showImportResult(html,skipped.length?"warn":"success");
}
async function handleCsvFile(file,input){
  if(!file)return;
  try{
    const text=await file.text();
    importCsvText(text);
  }catch(err){
    showImportResult(`CSV 가져오기 실패: ${escapeHtml(err.message||"파일 형식을 확인해 주세요.")}`,"error");
  }finally{
    input.value="";
  }
}
if($("#csvImportInput")) if($("#csvImportInput")) $("#csvImportInput").onchange=e=>handleCsvFile(e.target.files[0],e.target);
if($("#csvImportTopInput")) function download(name,text,type){
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
$("#backupBtn").onclick=()=>download(
  `무지개반사_예산백업_${new Date().toISOString().slice(0,10)}.json`,
  JSON.stringify({version:17,transactions,stationeryTransactions,evidenceDocs},null,2),"application/json"
);
$("#csvBtn").onclick=()=>{
  const rows=[["구분","날짜","예산항목","세부항목/품목","사용처/수량","금액","결제수단","증빙상태","증빙체크","메모"]];
  [...transactions].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>rows.push([
    "사업비",t.date,catById(t.category)?.name||"",t.subCategory,t.merchant,t.amount,t.payment||"전용카드",t.evidence==="done"?"완료":"필요",
    `${(evidenceDocs[t.id]||[]).filter(d=>d.checked).length}/${(evidenceDocs[t.id]||[]).length}`,t.memo||""
  ]));
  [...stationeryTransactions].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>rows.push([
    "여수문구사",t.date,"사무관리비","소모성물품구입비",
      `${t.item}${t.qty?` / ${t.qty}`:""}${(t.purchaseType||"store")==="link"?` / 인터넷대행 / 수수료 ${Number(t.fee||0).toLocaleString("ko-KR")}원 / 택배 ${Number(t.shipping||0).toLocaleString("ko-KR")}원`:""}`,
      Number(t.total ?? t.amount ?? 0),"여수문구사",t.evidence==="done"?"완료":"필요","",
      `${t.memo||""}${t.link?`${t.memo?" / ":""}링크: ${t.link}`:""}`
  ]));
  const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n");
  download(`무지개반사_집행내역_${new Date().toISOString().slice(0,10)}.csv`,csv,"text/csv;charset=utf-8");
};
$("#restoreInput").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const obj=JSON.parse(await f.text());
    if(!Array.isArray(obj.transactions))throw new Error();
    if(confirm("현재 데이터를 백업 파일 내용으로 바꿀까요?")){
      transactions=obj.transactions;
      stationeryTransactions=Array.isArray(obj.stationeryTransactions)?obj.stationeryTransactions:[];
      evidenceDocs=obj.evidenceDocs&&typeof obj.evidenceDocs==="object"?obj.evidenceDocs:{};
      save();saveStationery();saveEvidence();migrateRentSubs();syncAllEvidenceStatuses();render();
    }
  }catch{alert("올바른 백업 파일이 아닙니다.");}
  e.target.value="";
};
$("#resetBtn").onclick=()=>{
  if(confirm("사업비와 여수문구사 내역을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.")){
    transactions=[];stationeryTransactions=[];evidenceDocs={};
    save();saveStationery();saveEvidence();render();
  }
};


function removePreviouslyBundledEntriesOnce(){
  const MIGRATION_KEY="mujigaebansa_v10_removed_preloaded_entries";
  if(localStorage.getItem(MIGRATION_KEY)==="1") return;

  const bundledIds=new Set([
    "sms-2026-07-21-signneeds-44000",
    "sms-2026-07-22-seoulhaejangguk-90000",
    "sms-2026-07-23-badagimbap-88000",
    "sms-2026-07-23-paikdabang-19800",
    "sms-2026-07-24-sp-associates-28800",
    "sms-2026-07-24-golmokgil-89000",
    "sms-2026-07-27-palgyechon-72000",
    "sms-2026-07-28-ddungeon-63000",
    "sms-2026-07-29-sugungbanjeom-63000",
    "sms-2026-08-05-daejichanggo-28000",
    "manual-2026-07-29-startup-education-2000000"
  ]);

  let changed=false;
  transactions=transactions.filter(t=>{
    if(bundledIds.has(t.id)){
      delete evidenceDocs[t.id];
      changed=true;
      return false;
    }
    return true;
  });

  if(changed){
    save();
    saveEvidence();
  }
  localStorage.setItem(MIGRATION_KEY,"1");
}

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(reg=>reg.update()).catch(()=>{});
}
migrateRentSubs();
removePreviouslyBundledEntriesOnce();
syncAllEvidenceStatuses();
initSelects();
renderTodos();
render();
