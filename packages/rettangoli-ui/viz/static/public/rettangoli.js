var rettangoli=(()=>{var{isArray:Ht}=Array,{getPrototypeOf:De,getOwnPropertyDescriptor:He}=Object,M=[],Nt=()=>document.createRange(),q=(t,e,n)=>(t.set(e,n),n),Ne=(t,e)=>e.reduceRight(ze,t),ze=(t,e)=>t.childNodes[e],{setPrototypeOf:Fe}=Object,F,zt=(t,e,n)=>(F||(F=Nt()),n?F.setStartAfter(t):F.setStartBefore(t),F.setEndAfter(e),F.deleteContents(),t),Rt=({firstChild:t,lastChild:e},n)=>zt(t,e,n),Ft=!1,yt=(t,e)=>Ft&&t.nodeType===11?1/e<0?e?Rt(t,!0):t.lastChild:e?t.valueOf():t.firstChild:t,Mt=t=>document.createComment(t),Ot=class extends(e=>{function n(o){return Fe(o,new.target.prototype)}return n.prototype=e.prototype,n})(DocumentFragment){#e=Mt("<>");#n=Mt("</>");#t=M;constructor(e){super(e),this.replaceChildren(this.#e,...e.childNodes,this.#n),Ft=!0}get firstChild(){return this.#e}get lastChild(){return this.#n}get parentNode(){return this.#e.parentNode}remove(){Rt(this,!1)}replaceWith(e){Rt(this,!0).replaceWith(e)}valueOf(){let{parentNode:e}=this;if(e===this)this.#t===M&&(this.#t=[...this.childNodes]);else{if(e){let{firstChild:n,lastChild:o}=this;for(this.#t=[n];n!==o;)this.#t.push(n=n.nextSibling)}this.replaceChildren(...this.#t)}return this}},jt=(t,e,n)=>t.setAttribute(e,n),it=(t,e)=>t.removeAttribute(e),ot,je=(t,e,n)=>{n=n.slice(1),ot||(ot=new WeakMap);let o=ot.get(t)||q(ot,t,{}),r=o[n];return r&&r[0]&&t.removeEventListener(n,...r),r=Ht(e)?e:[e,!1],o[n]=r,r[0]&&t.addEventListener(n,...r),e},X=(t,e)=>{let{t:n,n:o}=t,r=!1;switch(typeof e){case"object":if(e!==null){(o||n).replaceWith(t.n=e.valueOf());break}case"undefined":r=!0;default:n.data=r?"":e,o&&(t.n=null,o.replaceWith(n))}return e},lt=(t,e,n)=>t[n]=e,Ve=(t,e,n)=>lt(t,e,n.slice(1)),kt=(t,e,n)=>e==null?(it(t,n),e):lt(t,e,n),Vt=(t,e)=>(typeof e=="function"?e(t):e.current=t,e),St=(t,e,n)=>(e==null?it(t,n):jt(t,n,e),e),Ie=(t,e,n)=>(t.toggleAttribute(n.slice(1),e),e),st=(t,e,n)=>{let{length:o}=e;if(t.data=`[${o}]`,o)return((r,i,l,s,a)=>{let c=l.length,f=i.length,d=c,h=0,u=0,g=null;for(;h<f||u<d;)if(f===h){let p=d<c?u?s(l[u-1],-0).nextSibling:s(l[d],0):a;for(;u<d;)r.insertBefore(s(l[u++],1),p)}else if(d===u)for(;h<f;)g&&g.has(i[h])||r.removeChild(s(i[h],-1)),h++;else if(i[h]===l[u])h++,u++;else if(i[f-1]===l[d-1])f--,d--;else if(i[h]===l[d-1]&&l[u]===i[f-1]){let p=s(i[--f],-0).nextSibling;r.insertBefore(s(l[u++],1),s(i[h++],-0).nextSibling),r.insertBefore(s(l[--d],1),p),i[f]=l[d]}else{if(!g){g=new Map;let p=u;for(;p<d;)g.set(l[p],p++)}if(g.has(i[h])){let p=g.get(i[h]);if(u<p&&p<d){let b=h,T=1;for(;++b<f&&b<d&&g.get(i[b])===p+T;)T++;if(T>p-u){let L=s(i[h],0);for(;u<p;)r.insertBefore(s(l[u++],1),L)}else r.replaceChild(s(l[u++],1),s(i[h++],-1))}else h++}else r.removeChild(s(i[h++],-1))}return l})(t.parentNode,n,e,yt,t);switch(n.length){case 1:n[0].remove();case 0:break;default:zt(yt(n[0],0),yt(n.at(-1),-0),!1)}return M},Ue=new Map([["aria",(t,e)=>{for(let n in e){let o=e[n],r=n==="role"?n:`aria-${n}`;o==null?it(t,r):jt(t,r,o)}return e}],["class",(t,e)=>kt(t,e,e==null?"class":"className")],["data",(t,e)=>{let{dataset:n}=t;for(let o in e)e[o]==null?delete n[o]:n[o]=e[o];return e}],["ref",Vt],["style",(t,e)=>e==null?kt(t,e,"style"):lt(t.style,e,"cssText")]]),Ke=(t,e,n)=>{switch(e[0]){case".":return Ve;case"?":return Ie;case"@":return je;default:return n||"ownerSVGElement"in t?e==="ref"?Vt:St:Ue.get(e)||(e in t?e.startsWith("on")?lt:((o,r)=>{let i;do i=He(o,r);while(!i&&(o=De(o)));return i})(t,e)?.set?kt:St:St)}},Ye=(t,e)=>(t.textContent=e??"",e),Y=(t,e,n)=>({a:t,b:e,c:n}),j=()=>Y(null,null,M),It=t=>(e,n)=>{let{a:o,b:r,c:i}=t(e,n),l=document.importNode(o,!0),s=M;if(r!==M){s=[];for(let h,u,g=0;g<r.length;g++){let{a:p,b,c:T}=r[g],L=p===u?h:h=Ne(l,u=p);s[g]=(a=b,c=L,f=T,d=b===st?[]:b===X?j():null,{v:M,u:a,t:c,n:f,c:d})}}var a,c,f,d;return((h,u)=>({b:h,c:u}))(i?l.firstChild:new Ot(l),s)},qe=/^(?:plaintext|script|style|textarea|title|xmp)$/i,Xe=/^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i,Ge=/<([a-zA-Z0-9]+[a-zA-Z0-9:._-]*)([^>]*?)(\/?)>/g,Qe=/([^\s\\>"'=]+)\s*=\s*(['"]?)\x01/g,Ze=/[\x01\x02]/g,Ct,At,rt=document.createElement("template"),Je=(t,e)=>{if(e)return Ct||(Ct=document.createElementNS("http://www.w3.org/2000/svg","svg"),At=Nt(),At.selectNodeContents(Ct)),At.createContextualFragment(t);rt.innerHTML=t;let{content:n}=rt;return rt=rt.cloneNode(!1),n},$t=t=>{let e=[],n;for(;n=t.parentNode;)e.push(e.indexOf.call(n.childNodes,t)),t=n;return e},Wt=()=>document.createTextNode(""),tn=(t,e,n)=>{let o=Je(((a,c,f)=>{let d=0;return a.join("").trim().replace(Ge,(h,u,g,p)=>`<${u}${g.replace(Qe,"=$2$1").trimEnd()}${p?f||Xe.test(u)?" /":`></${u}`:""}>`).replace(Ze,h=>h===""?`<!--${c+d++}-->`:c+d++)})(t,K,n),n),{length:r}=t,i=M;if(r>1){let a=[],c=document.createTreeWalker(o,129),f=0,d=`${K}${f++}`;for(i=[];f<r;){let h=c.nextNode();if(h.nodeType===8){if(h.data===d){let u=Ht(e[f-1])?st:X;u===X&&a.push(h),i.push(Y($t(h),u,null)),d=`${K}${f++}`}}else{let u;for(;h.hasAttribute(d);){u||(u=$t(h));let g=h.getAttribute(d);i.push(Y(u,Ke(h,g,n),g)),it(h,d),d=`${K}${f++}`}!n&&qe.test(h.localName)&&h.textContent.trim()===`<!--${d}-->`&&(i.push(Y(u||$t(h),Ye,null)),d=`${K}${f++}`)}}for(f=0;f<a.length;f++)a[f].replaceWith(Wt())}let{childNodes:l}=o,{length:s}=l;return s<1?(s=1,o.appendChild(Wt())):s===1&&r!==1&&l[0].nodeType!==1&&(s=0),q(Ut,t,Y(o,i,s===1))},Ut=new WeakMap,K="is\xB5",Kt=t=>(e,n)=>Ut.get(e)||tn(e,n,t),en=It(Kt(!1)),nn=It(Kt(!0)),Et=(t,{s:e,t:n,v:o})=>{if(t.a!==n){let{b:r,c:i}=(e?nn:en)(n,o);t.a=n,t.b=r,t.c=i}for(let{c:r}=t,i=0;i<r.length;i++){let l=o[i],s=r[i];switch(s.u){case st:s.v=st(s.t,on(s.c,l),s.v);break;case X:let a=l instanceof D?Et(s.c||(s.c=j()),l):(s.c=null,l);a!==s.v&&(s.v=X(s,a));break;default:l!==s.v&&(s.v=s.u(s.t,l,s.n,s.v))}}return t.b},on=(t,e)=>{let n=0,{length:o}=e;for(o<t.length&&t.splice(o);n<o;n++){let r=e[n];r instanceof D?e[n]=Et(t[n]||(t[n]=j()),r):t[n]=null}return e},D=class{constructor(e,n,o){this.s=e,this.t=n,this.v=o}toDOM(e=j()){return Et(e,this)}};var Yt=t=>(e,...n)=>new D(t,e,n),C=Yt(!1),_n=Yt(!0),Bt=new WeakMap,A=(t,e)=>((n,o)=>{let r=Bt.get(n)||q(Bt,n,j()),{b:i}=r,l=typeof o=="function"?o():o,s=l instanceof D?l.toDOM(r):l;return i!==s&&n.replaceChildren((r.b=s).valueOf()),n})(t,e),Dt=new WeakMap,qt=t=>(e,n)=>{let o=Dt.get(e)||q(Dt,e,new Map);return o.get(n)||q(o,n,function(r,...i){return new D(t,r,i).toDOM(this)}.bind(j()))},Ln=qt(!1),Pn=qt(!0);function v(t,...e){let n="";return t.forEach((o,r)=>{n+=o+(e[r]||"")}),n}var rn=["xs","sm","md","lg","xl"],Xt={mt:"margin-top",mr:"margin-right",mb:"margin-bottom",ml:"margin-left",m:"margin",mh:"margin-left margin-right",mv:"margin-top margin-bottom",pt:"padding-top",pr:"padding-right",pb:"padding-bottom",pl:"padding-left",p:"padding",ph:"padding-left padding-right",pv:"padding-top padding-bottom",g:"gap",gv:"row-gap",gh:"column-gap",bw:"border-width",bwt:"border-top-width",bwr:"border-right-width",bwb:"border-bottom-width",bwl:"border-left-width",bc:"border-color",br:"border-radius",pos:"position",shadow:"box-shadow",ta:"text-align",c:"color",cur:"cursor"},Gt=Object.keys(Xt),Qt=t=>t.concat(rn.flatMap(e=>t.map(n=>`${e}-${n}`))),Zt={default:void 0,xl:"@media only screen and (max-width: 1280px)",lg:"@media only screen and (max-width: 1024px)",md:"@media only screen and (max-width: 768px)",sm:"@media only screen and (max-width: 640px)"},$=(t,e={})=>{let n="";for(let[o,r]of Object.entries(Zt)){o!=="default"&&(n+=`${r} {`);for(let[i,l]of Object.entries(t)){let s=e[i]?` ${e[i]} `:" ";for(let[a,c]of Object.entries(l)){let f=Xt[i],d=c.startsWith("--")?`var(${c})`:c,h=o==="default"?i:`${o}-${i}`,u=o==="default"?`h-${i}`:`${o}-h-${i}`;if(f){let p=f.split(" ").map(b=>`${b}: ${d};`).join(" ");n+=`
            :host([${h}="${a}"])${s}{
              ${p}
            }
            :host([${u}="${a}"]:hover)${s}{
              ${p}
            }
          `}else n+=`
            :host([${h}="${a}"])${s}{
              ${c}
            }
            :host([${u}="${a}"]:hover)${s}{
              ${c}
            }
          `}}o!=="default"&&(n+="}")}return n};function sn(t){if(t===null||t.includes("/"))return!1;let e=String(t);return/[0-9]$/.test(e)}var ln=t=>/%$/.test(t),w=t=>{if(t!==void 0)return ln(t)?t:sn(t)?`${t}px`:Object.keys(m).includes(t)?`var(${m[t]})`:t},m={xs:"--spacing-xs",s:"--spacing-s",m:"--spacing-m",l:"--spacing-l",xl:"--spacing-xl"};function at(t){let e="";for(let[n,o]of Object.entries(Zt)){n!=="default"&&(e+=`${o} {
`);let r="";for(let[i,l]of Object.entries(t[n]))l!=null&&(r+=`${i}: ${l};
`);e+=`:host {
    ${r.trim()}
    }
`,n!=="default"&&(e+=`}
`)}return e}var V=v`
:host([flex="0"]) {
  flex: 0;
}
:host([flex="1"]) {
  flex: 1;
}
:host([flex="2"]) {
  flex: 2;
}
:host([flex="3"]) {
  flex: 3;
}
:host([flex="4"]) {
  flex: 4;
}
:host([flex="5"]) {
  flex: 5;
}
:host([flex="6"]) {
  flex: 6;
}
:host([flex="7"]) {
  flex: 7;
}
:host([flex="8"]) {
  flex: 8;
}
:host([flex="9"]) {
  flex: 9;
}
:host([flex="10"]) {
  flex: 10;
}
:host([flex="11"]) {
  flex: 11;
}
:host([flex="12"]) {
  flex: 12;
}
`;var an={mt:m,mr:m,mb:m,ml:m,m,mh:m,mv:m,s:{sm:`
    height: 28px;
    padding-left: 12px;
    padding-right: 12px;
    border-radius: 4px;
    font-size: var(--xs-font-size);
    font-weight: var(--xs-font-weight);
    line-height: var(--xs-line-height);
    letter-spacing: var(--xs-letter-spacing);
    `,md:`
    height: 32px;
    padding-left: 16px;
    padding-right: 16px;
    border-radius: 4px;
    font-size: var(--sm-font-size);
    font-weight: var(--sm-font-weight);
    line-height: var(--sm-line-height);
    letter-spacing: var(--sm-letter-spacing);
    `,lg:`
    height: 40px;
    padding-left: 20px;
    padding-right: 20px;
    border-radius: 4px;
    font-size: var(--md-font-size);
    font-weight: var(--md-font-weight);
    line-height: var(--md-line-height);
    letter-spacing: var(--md-letter-spacing);
    `},v:{pr:`
      background-color: var(--primary);
      color: var(--primary-foreground);
    `,se:`
      background-color: var(--secondary);
      color: var(--secondary-foreground);
    `,de:`
      background-color: var(--destructive);
      color: var(--primary-foreground);
    `,ol:`
      background-color: transparent;
      color: var(--foreground);
      border-width: 1px;
    `,gh:`
      background-color: transparent;
      color: var(--foreground);
    `}},cn={mt:"button",mr:"button",mb:"button",ml:"button",m:"button",mh:"button",mv:"button",s:"button",v:"button"},Jt=$(an,cn);var te=({render:t,html:e})=>{let n=new CSSStyleSheet;return n.replaceSync(v`
    :host {
      display: contents;
    }
    slot {
      display: contents;
    }

    button {
      border-width: 0px;
      border-style: solid;
      border-color: var(--border);
      padding: 0px;
      height: 32px;
      padding-left: 16px;
      padding-right: 16px;
      border-radius: 4px;

      font-size: var(--sm-font-size);
      font-weight: var(--sm-font-weight);
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);

      background-color: var(--primary);
      color: var(--primary-foreground);
    }

    button:hover {
      cursor: pointer;
      background-color: color-mix(
        in srgb,
        var(--primary) 85%,
        white 15%
      );
    }

    button:active {
      cursor: pointer;
      background-color: color-mix(
        in srgb,
        var(--primary) 80%,
        white 20%
      );
    }

    :host([v="pr"]) button:hover {
      background-color: color-mix(
          in srgb,
          var(--primary) 85%,
          white 15%
        );
    }

    :host([v="pr"]) button:active {
      background-color: color-mix(
          in srgb,
          var(--primary) 80%,
          white 20%
        );
    }

    :host([v="se"]) button:hover {
      background-color: color-mix(
          in srgb,
          var(--secondary) 85%,
          white 15%
        );
    }

    :host([v="se"]) button:active {
      background-color: color-mix(
          in srgb,
          var(--secondary) 80%,
          white 20%
        );
    }

    :host([v="de"]) button:hover {
      background-color: color-mix(
          in srgb,
          var(--destructive) 85%,
          white 15%
        );
    }

    :host([v="de"]) button:active {
      background-color: color-mix(
          in srgb,
          var(--destructive) 80%,
          white 20%
        );
    }

    :host([v="ol"]) button:hover {
      background-color: var(--accent);
    }

    :host([v="gh"]) button:hover {
      background-color: var(--accent);
    }

    ${Jt}
    ${V}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[n],t(this.shadow,this.render)}static get observedAttributes(){return["key","href","target","w","t"]}_buttonRef={};_assingRef=r=>{this._buttonRef.current=r;let i=w(this.getAttribute("w"));i==="f"?this._buttonRef.current.style.width="100%":i!=null&&(this._buttonRef.current.style.width=i)};attributeChangedCallback(r,i,l){if(!this._buttonRef.current)return;let s=w(this.getAttribute("w"));s==="f"?this._buttonRef.current.style.width="100%":s!=null&&(this._buttonRef.current.style.width=s,this._buttonRef.current.style.minWidth=s,this._buttonRef.current.style.maxWidth=s),t(this.shadow,this.render)}render=()=>this.getAttribute("href")?e`
          <a
            href=${this.getAttribute("href")}
            target=${this.getAttribute("target")}
          >
            <button>
              <slot></slot>
            </button>
          </a>
        `:e`
        <button ref=${this._assingRef}>
          <slot></slot>
        </button>
      `}};var ee=v`

  :host([d="h"]) {
    flex-direction: row;
  }
  :host([d="v"]) {
    flex-direction: column;
  }
  :host([d="h"]:not([ah])) {
    justify-content: flex-start;
  }
  :host([d="h"][ah="c"]) {
    justify-content: center;
  }
  :host([d="h"][ah="e"]) {
    justify-content: flex-end;
  }
  :host([d="h"]:not([av])) {
    align-items: flex-start;
  }
  :host([d="h"][av="c"]) {
    align-items: center;
    align-content: center;
  }
  :host([d="h"][av="e"]) {
    align-items: flex-end;
    align-content: flex-end;
  }
  
  /* Default/vertical direction - horizontal alignment */
  :host(:not([d]):not([ah])),
  :host([d="v"]:not([ah])) {
    align-items: flex-start;
  }
  :host(:not([d])[ah="c"]),
  :host([d="v"][ah="c"]) {
    align-items: center;
  }
  :host(:not([d])[ah="e"]),
  :host([d="v"][ah="e"]) {
    align-items: flex-end;
  }
  
  :host(:not([d]):not([av])),
  :host([d="v"]:not([av])) {
    justify-content: flex-start;
  }
  :host(:not([d])[av="c"]),
  :host([d="v"][av="c"]) {
    justify-content: center;
  }
  :host(:not([d])[av="e"]),
  :host([d="v"][av="e"]) {
    justify-content: flex-end;
  }
  
  @media screen and (max-width: 640px) {
    :host([s-d="v"]) {
      flex-direction: column;
    }
    :host([s-d="h"]) {
      flex-direction: row;
    }
    :host([s-d="h"][s-av="c"]) {
      align-items: center;
      align-content: center;
    }
    :host([s-d="v"][s-av="c"]) {
      justify-content: center;
    }
  }
`;var dn={cur:{p:"pointer",m:"move",grab:"grab",grabbing:"grabbing"}},x=$(dn);var ne=v`
:host([sh]:not([sv])) {
    overflow-x: scroll;
    flex-wrap: nowrap;
}
:host([sv]:not([sh])) {
    overflow-y: scroll;
    flex-wrap: nowrap;
}
:host([sh][sv]) {
    overflow: scroll;
    flex-wrap: nowrap;
}
:host([overflow="hidden"]) {
    overflow: hidden;
    flex-wrap: nowrap;
}

`;var G={xs:"--border-width-xs",s:"--border-width-s",m:"--border-width-m",l:"--border-width-l",xl:"--border-width-xl"},fn={bgc:{pr:`
    background-color: var(--primary);
    `,se:`
    background-color: var(--secondary);
    `,de:`
    background-color: var(--destructive);
    `,bg:`
    background-color: var(--background);
    `,mu:`
    background-color: var(--muted);
    `,ac:`
    background-color: var(--accent);
    `,bo:`
    background-color: var(--border);
    `},pos:{rel:"relative",abs:"absolute",fix:"fixed"},cor:{full:`
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        height: 100%;
        `,top:`
        top: 0;
        right: 0;
        left: 0;
        `,right:`
        top: 0;
        right: 0;
        bottom: 0;
        height: 100%;
        `,bottom:`
        right: 0;
        bottom: 0;
        left: 0;
        `,left:`
        bottom: 0;
        left: 0;
        top: 0;
        height: 100%;
        `},shadow:{s:"--shadow-s",m:"--shadow-m",l:"--shadow-l"},pt:m,pr:m,pb:m,pl:m,p:m,ph:m,pv:m,g:m,gv:m,gh:m,bw:G,bwt:G,bwr:G,bwb:G,bwl:G,bc:{p:"--color-primary",pc:"--color-primary-container",s:"--color-secondary",sc:"--color-secondary-container",e:"--color-error",ec:"--color-error-container",su:"--color-surface",sucl:"--color-surface-container-low",suc:"--color-surface-container",such:"--color-surface-container-high",isu:"--color-inverse-surface",o:"--color-outline",ov:"--color-outline-variant"},br:{xs:"--border-radius-xs",s:"--border-radius-s",m:"--border-radius-m",l:"--border-radius-l",xl:"--border-radius-xl",f:"--border-radius-f"}},ct=$(fn);var hn={mt:m,mr:m,mb:m,ml:m,m,mh:m,mv:m},y=$(hn);var oe=({render:t,html:e})=>{let n=new CSSStyleSheet;return n.replaceSync(v`
    slot {
      display: contents;
    }
    :host {
      display: flex;
      flex-direction: column;
      align-self: auto;
      align-content: flex-start;
      border-style: solid;
      border-width: 0;
      box-sizing: border-box;
      border-color: var(--border);
    }

    :host([fw="w"]) {
      flex-wrap: wrap;
    }

    ${V}
    ${ne}
  ${ee}
  ${y}
  ${x}
  ${ct}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[n],t(this.shadow,this.render)}static get observedAttributes(){return Qt([...Gt,"wh","w","h","hidden","sh","sv"])}_styles={default:{},sm:{},md:{},lg:{},xl:{}};attributeChangedCallback(r,i,l){["default","sm","md","lg","xl"].forEach(s=>{let a=g=>`${s==="default"?"":`${s}-`}${g}`,c=this.getAttribute(a("wh")),f=w(c===null?this.getAttribute(a("w")):c),d=w(c===null?this.getAttribute(a("h")):c),h=this.getAttribute(a("o")),u=this.getAttribute(a("z"));u!==null&&(this._styles[s]["z-index"]=u),h!==null&&(this._styles[s].opacity=h),f==="f"?this._styles[s].width="100%":f!==void 0&&(this._styles[s].width=f,this._styles[s]["min-width"]=f,this._styles[s]["max-width"]=f),d==="f"?this._styles[s].height="100%":d!==void 0&&(this._styles[s].height=d,this._styles[s]["min-height"]=d,this._styles[s]["max-height"]=d),this.hasAttribute(a("hidden"))&&(this._styles[s].display="none !important"),this.hasAttribute(a("visible"))&&(this._styles[s].display="flex !important")}),t(this.shadow,this.render)}render=()=>e`
        <style>
          ${at(this._styles)}
        </style>
        <slot></slot>
      `}};var un={ta:{s:"start",c:"center",e:"end",j:"justify"},s:{h1:`
      font-size: var(--h1-font-size);
      font-weight: var(--h1-font-weight);
      line-height: var(--h1-line-height);
      letter-spacing: var(--h1-letter-spacing);
    `,h2:`
      font-size: var(--h2-font-size);
      font-weight: var(--h2-font-weight);
      line-height: var(--h2-line-height);
      letter-spacing: var(--h2-letter-spacing);
    `,h3:`
      font-size: var(--h3-font-size);
      font-weight: var(--h3-font-weight);
      line-height: var(--h3-line-height);
      letter-spacing: var(--h3-letter-spacing);
    `,h4:`
      font-size: var(--h4-font-size);
      font-weight: var(--h4-font-weight);
      line-height: var(--h4-line-height);
      letter-spacing: var(--h4-letter-spacing);
    `,lg:`
      font-size: var(--lg-font-size);
      font-weight: var(--lg-font-weight);
      line-height: var(--lg-line-height);
      letter-spacing: var(--lg-letter-spacing);
    `,md:`
      font-size: var(--md-font-size);
      font-weight: var(--md-font-weight);
      line-height: var(--md-line-height);
      letter-spacing: var(--md-letter-spacing);
    `,sm:`
      font-size: var(--sm-font-size);
      font-weight: var(--sm-font-weight);
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);
    `,xs:`
      font-size: var(--xs-font-size);
      font-weight: var(--xs-font-weight);
      line-height: var(--xs-line-height);
      letter-spacing: var(--xs-letter-spacing);
    `}},re=$(un);var gn={c:{fg:"--foreground","pr-fg":"--primary-foreground","se-fg":"--secondary-foreground","de-fg":"--destructive-foreground","mu-fg":"--muted-foreground","ac-fg":"--accent-foreground"}},dt=$(gn);var se=({render:t,html:e})=>{let n=new CSSStyleSheet;n.replaceSync(v`
    :host {
      display: block;
      font-size: var(--md-font-size);
      font-weight: var(--md-font-weight);
      line-height: var(--md-line-height);
      letter-spacing: var(--md-letter-spacing);
    }
    slot {
      display: contents;
    }
    :host ::slotted(a) {
      text-decoration: var(--anchor-text-decoration);
      color: var(--anchor-color);
    }
    :host ::slotted(a:hover) {
      text-decoration: var(--anchor-text-decoration-hover);
      color: var(--anchor-color-hover);
    }
    ${re}
    ${dt}
${y}
${x}
  `);class o extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[n]}static get observedAttributes(){return["key","w","ellipsis"]}connectedCallback(){t(this.shadow,this.render)}attributeChangedCallback(i,l,s){let a=w(this.getAttribute("w"));this.hasAttribute("ellipsis")&&(this.style.overflow="hidden",this.style.textOverflow="ellipsis",this.style.whiteSpace="nowrap"),a==="f"?this.style.width="100%":a!==void 0&&(this.style.width=a),t(this.shadow,this.render)}render=()=>e` <slot></slot> `}return o};var ie=({render:t,html:e})=>{let n=new CSSStyleSheet;return n.replaceSync(v`
    :host {
      border-style: solid;
      box-sizing: border-box;
      overflow: hidden;
      border-width: 0;
    }
    slot {
      display: contents;
    }
    :host([of="con"]) img {
      object-fit: contain;
    }
    :host([of="cov"]) img {
      object-fit: cover;
    }
    :host([of="none"]) img {
      object-fit: none;
    }
    img {
      height: 100%;
      width: 100%;
    }
    ${ct}
    ${y}
${x}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[n]}_styles={default:{},sm:{},md:{},lg:{},xl:{}};static get observedAttributes(){return["key","src","wh","w","h","hidden","height","width","s-wh","s-w","s-h"]}connectedCallback(){t(this.shadow,this.render)}attributeChangedCallback(r,i,l){["default","sm","md","lg","xl"].forEach(s=>{let a=g=>`${s==="default"?"":`${s}-`}${g}`,c=this.getAttribute(a("wh")),f=w(c===null?this.getAttribute(a("w")):c),d=w(c===null?this.getAttribute(a("h")):c),h=this.getAttribute(a("o")),u=this.getAttribute(a("z"));u!==null&&(this._styles[s].zIndex=u),h!==null&&(this._styles[s].opacity=h),f==="f"?this._styles[s].width="100%":f!==void 0&&(this._styles[s].width=f,this._styles[s]["min-width"]=f,this._styles[s]["max-width"]=f),d==="f"?this._styles[s].height="100%":d!==void 0&&(this._styles[s].height=d,this._styles[s]["min-height"]=d,this._styles[s]["max-height"]=d)}),t(this.shadow,this.render)}render=()=>e`
        <style>
          ${at(this._styles)}
        </style>
        <img
          src="${this.getAttribute("src")}"
          width="${this.getAttribute("width")}"
          height="${this.getAttribute("height")}"
        />
      `}};var le=v`
:host([pt="xs"]) svg {
  padding-top: var(--spacing-xs);
}
:host([pt="s"]) svg {
  padding-top: var(--spacing-s);
}
:host([pt="m"]) svg {
  padding-top: var(--spacing-m);
}
:host([pt="l"]) svg {
  padding-top: var(--spacing-l);
}
:host([pt="xl"]) svg {
  padding-top: var(--spacing-xl);
}
:host([pr="xs"]) svg {
  padding-right: var(--spacing-xs);
}
:host([pr="s"]) svg {
  padding-right: var(--spacing-s);
}
:host([pr="m"]) svg {
  padding-right: var(--spacing-m);
}
:host([pr="l"]) svg {
  padding-right: var(--spacing-l);
}
:host([pr="xl"]) svg {
  padding-right: var(--spacing-xl);
}
:host([pb="xs"]) svg {
  padding-bottom: var(--spacing-xs);
}
:host([pb="s"]) svg {
  padding-bottom: var(--spacing-s);
}
:host([pb="m"]) svg {
  padding-bottom: var(--spacing-m);
}
:host([pb="l"]) svg {
  padding-bottom: var(--spacing-l);
}
:host([pb="xl"]) svg {
  padding-bottom: var(--spacing-xl);
}
:host([pl="xs"]) svg {
  padding-left: var(--spacing-xs);
}
:host([pl="s"]) svg {
  padding-left: var(--spacing-s);
}
:host([pl="m"]) svg {
  padding-left: var(--spacing-m);
}
:host([pl="l"]) svg {
  padding-left: var(--spacing-l);
}
:host([pl="xl"]) svg {
  padding-left: var(--spacing-xl);
}
:host([p="xs"]) svg {
  padding: var(--spacing-xs);
}
:host([p="s"]) svg {
  padding: var(--spacing-s);
}
:host([p="m"]) svg {
  padding: var(--spacing-m);
}
:host([p="l"]) svg {
  padding: var(--spacing-l);
}
:host([p="xl"]) svg {
  padding: var(--spacing-xl);
}
:host([ph="xs"]) svg {
  padding-left: var(--spacing-xs);
  padding-right: var(--spacing-xs);
}
:host([ph="s"]) svg {
  padding-left: var(--spacing-s);
  padding-right: var(--spacing-s);
}
:host([ph="m"]) svg {
  padding-left: var(--spacing-m);
  padding-right: var(--spacing-m);
}
:host([ph="l"]) svg {
  padding-left: var(--spacing-l);
  padding-right: var(--spacing-l);
}
:host([ph="xl"]) svg {
  padding-left: var(--spacing-xl);
  padding-right: var(--spacing-xl);
}
:host([pv="xs"]) svg {
  padding-top: var(--spacing-xs);
  padding-bottom: var(--spacing-xs);
}
:host([pv="s"]) svg {
  padding-top: var(--spacing-s);
  padding-bottom: var(--spacing-s);
}
:host([pv="m"]) svg {
  padding-top: var(--spacing-m);
  padding-bottom: var(--spacing-m);
}
:host([pv="l"]) svg {
  padding-top: var(--spacing-l);
  padding-bottom: var(--spacing-l);
}
:host([pv="xl"]) svg {
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
}
`;var ae=({render:t,html:e})=>{let n=new CSSStyleSheet;return n.replaceSync(v`
    :host {
      color: var(--foreground);
    }
    ${dt}
    ${le}
${V}
${x}
  `),class ft extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[n]}static _icons={};static get observedAttributes(){return["key","svg","w","h","wh"]}static get icons(){return ft._icons}static addIcon(r,i){ft._icons[r]=i}connectedCallback(){this.render()}attributeChangedCallback(r,i,l){let s=this.getAttribute("wh"),a=w(s===null?this.getAttribute("w"):s),c=w(s===null?this.getAttribute("h"):s);a&&(this.style.width=a),c&&(this.style.height=c),this.render()}render=()=>{try{let r=this.getAttribute("svg"),i=ft._icons[r]||(window.rtglIcons||{})[r];if(i){this.shadow.innerHTML=i;return}}catch(r){console.log("error in rtgl-svg render",r)}this.shadow.innerHTML=""}}};var ce=({render:t,html:e})=>{let n=new CSSStyleSheet;n.replaceSync(v`
    :host {
      display: contents;
    }
    input {
      background-color: var(--background);
      font-size: var(--sm-font-size);
      font-weight: var(--sm-font-weight);
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);
      border: 1px solid var(--ring);
      border-radius: var(--border-radius-l);
      padding-left: var(--spacing-m);
      padding-right: var(--spacing-m);
      height: 32px;
      color: var(--foreground);
      outline: none;
    }
    input:focus {
      border-color: var(--foreground);
    }
${y}
${x}
  `);class o extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[n]}static get observedAttributes(){return["key","w","ellipsis"]}connectedCallback(){t(this.shadow,this.render)}attributeChangedCallback(i,l,s){t(this.shadow,this.render)}render=()=>e`
        <input type="text" />
      `}return o};var de=({render:t,html:e})=>{let n=new CSSStyleSheet;n.replaceSync(v`
    :host {
      display: contents;
    }
    textarea {
      background-color: var(--background);
      font-size: var(--sm-font-size);
      font-weight: var(--sm-font-weight);
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);
      border: 1px solid var(--ring);
      border-radius: var(--border-radius-l);
      padding-left: var(--spacing-m);
      padding-right: var(--spacing-m);
      color: var(--foreground);
      outline: none;
    }
    textarea:focus {
      border-color: var(--foreground);
    }
${y}
${x}
  `);class o extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[n]}static get observedAttributes(){return["key","w","ellipsis"]}connectedCallback(){t(this.shadow,this.render)}attributeChangedCallback(i,l,s){t(this.shadow,this.render)}render=()=>e`
        <textarea type="text" />
      `}return o};var Tt=t=>{let e=t.map(n=>n.subscribe());return()=>{for(let n of e)n&&typeof n.unsubscribe=="function"&&n.unsubscribe()}};var W=({render:t,styleSheet:e})=>{let n;return e?n=e:(n=new CSSStyleSheet,n.replaceSync(":host { display: contents; }")),class extends pn({BaseElement:HTMLElement,render:t,skipOnMount:!1}){static get observedAttributes(){return["key"]}constructor(){super(),this.renderTarget=this.attachShadow({mode:"closed"})}connectedCallback(){this.renderTarget.adoptedStyleSheets=[n],this.baseOnMount()}disconnectedCallback(){this.baseOnUnmount()}attributeChangedCallback(){setTimeout(()=>{this.reRender()},0)}}},pn=({BaseElement:t,render:e,skipOnMount:n=!1})=>{class o extends t{_renderKey=0;_unmountCallback;disableFirstAutomatedRender=!1;get renderKey(){return String(this._renderKey)}baseOnMount=()=>{!n&&this.onMount&&(this._unmountCallback=this.onMount()),this.disableFirstAutomatedRender||this.reRender(),this.attachedObservables?Array.isArray(this.attachedObservables)?this.unsubscribe=Tt(this.attachedObservables):this.unsubscribe=Tt(this.attachedObservables()):this.subscriptions&&(this.unsubscribe=Tt(this.subscriptions))};baseOnUnmount=()=>{this._unmountCallback&&this._unmountCallback(),this.onUnmount&&this.onUnmount(),this.unsubscribe&&this.unsubscribe()};triggerRender=()=>{this.reRender()};reRender=()=>{this._renderKey++,e(this.renderTarget,this.render())}}return o};var fe=({render:t,html:e})=>{let n=new CSSStyleSheet;n.replaceSync(v`
    :host {
      display: contents;
    }

    button {
      background-color: var(--background);
      font-size: var(--sm-font-size);
      font-weight: var(--sm-font-weight);
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);
      border: 1px solid var(--ring);
      border-radius: var(--border-radius-l);
      padding-left: var(--spacing-m);
      padding-right: var(--spacing-m);
      height: 32px;
      color: var(--foreground);
      outline: none;
      cursor: pointer;
    }
    button:focus {
      border-color: var(--foreground);
    }

    ${y}
    ${x}
  `);class o extends W({render:t,styleSheet:n}){_popoverRef={};_buttonRef={};options=[];close=()=>{this._popoverRef.current.close()};open=()=>{this._popoverRef.current.open(this._buttonRef.current)};select=i=>{this.onSelect&&this.onSelect(i),this.close()};render=()=>e`
        <!-- TODO style this button and use proper selected value -->
        <button ref=${this._buttonRef} onclick=${this.open}>Placeholder</button>

        <rtgl-popover ref=${this._popoverRef} placement="bottom-start">
          <rtgl-view wh="300" g="xs">
            ${this.options.map(({value:i,label:l})=>e`
                <rtgl-view
                  w="f"
                  h-bgc="mu"
                  ph="l"
                  pv="m"
                  cur="p"
                  br="m"
                  onclick=${()=>this.select(i)}
                >
                  <rtgl-text>${l}</rtgl-text>
                </rtgl-view>
              `)}
          </rtgl-view>
        </rtgl-popover>
      `}return o};var ht=Math.min,H=Math.max,Q=Math.round;var k=t=>({x:t,y:t});function he(t,e){return typeof t=="function"?t(e):t}function ut(t){return t.split("-")[0]}function _t(t){return t.split("-")[1]}function ue(t){return t==="x"?"y":"x"}function ge(t){return t==="y"?"height":"width"}function gt(t){return["top","bottom"].includes(ut(t))?"y":"x"}function pe(t){return ue(gt(t))}function Z(t){let{x:e,y:n,width:o,height:r}=t;return{width:o,height:r,top:n,left:e,right:e+o,bottom:n+r,x:e,y:n}}function me(t,e,n){let{reference:o,floating:r}=t,i=gt(e),l=pe(e),s=ge(l),a=ut(e),c=i==="y",f=o.x+o.width/2-r.width/2,d=o.y+o.height/2-r.height/2,h=o[s]/2-r[s]/2,u;switch(a){case"top":u={x:f,y:o.y-r.height};break;case"bottom":u={x:f,y:o.y+o.height};break;case"right":u={x:o.x+o.width,y:d};break;case"left":u={x:o.x-r.width,y:d};break;default:u={x:o.x,y:o.y}}switch(_t(e)){case"start":u[l]-=h*(n&&c?-1:1);break;case"end":u[l]+=h*(n&&c?-1:1);break}return u}var ve=async(t,e,n)=>{let{placement:o="bottom",strategy:r="absolute",middleware:i=[],platform:l}=n,s=i.filter(Boolean),a=await(l.isRTL==null?void 0:l.isRTL(e)),c=await l.getElementRects({reference:t,floating:e,strategy:r}),{x:f,y:d}=me(c,o,a),h=o,u={},g=0;for(let p=0;p<s.length;p++){let{name:b,fn:T}=s[p],{x:L,y:nt,data:wt,reset:B}=await T({x:f,y:d,initialPlacement:o,placement:h,strategy:r,middlewareData:u,rects:c,platform:l,elements:{reference:t,floating:e}});f=L??f,d=nt??d,u={...u,[b]:{...u[b],...wt}},B&&g<=50&&(g++,typeof B=="object"&&(B.placement&&(h=B.placement),B.rects&&(c=B.rects===!0?await l.getElementRects({reference:t,floating:e,strategy:r}):B.rects),{x:f,y:d}=me(c,h,a)),p=-1)}return{x:f,y:d,placement:h,strategy:r,middlewareData:u}};async function mn(t,e){let{placement:n,platform:o,elements:r}=t,i=await(o.isRTL==null?void 0:o.isRTL(r.floating)),l=ut(n),s=_t(n),a=gt(n)==="y",c=["left","top"].includes(l)?-1:1,f=i&&a?-1:1,d=he(e,t),{mainAxis:h,crossAxis:u,alignmentAxis:g}=typeof d=="number"?{mainAxis:d,crossAxis:0,alignmentAxis:null}:{mainAxis:d.mainAxis||0,crossAxis:d.crossAxis||0,alignmentAxis:d.alignmentAxis};return s&&typeof g=="number"&&(u=s==="end"?g*-1:g),a?{x:u*f,y:h*c}:{x:h*c,y:u*f}}var be=function(t){return t===void 0&&(t=0),{name:"offset",options:t,async fn(e){var n,o;let{x:r,y:i,placement:l,middlewareData:s}=e,a=await mn(e,t);return l===((n=s.offset)==null?void 0:n.placement)&&(o=s.arrow)!=null&&o.alignmentOffset?{}:{x:r+a.x,y:i+a.y,data:{...a,placement:l}}}}};function mt(){return typeof window<"u"}function N(t){return we(t)?(t.nodeName||"").toLowerCase():"#document"}function S(t){var e;return(t==null||(e=t.ownerDocument)==null?void 0:e.defaultView)||window}function _(t){var e;return(e=(we(t)?t.ownerDocument:t.document)||window.document)==null?void 0:e.documentElement}function we(t){return mt()?t instanceof Node||t instanceof S(t).Node:!1}function R(t){return mt()?t instanceof Element||t instanceof S(t).Element:!1}function E(t){return mt()?t instanceof HTMLElement||t instanceof S(t).HTMLElement:!1}function xe(t){return!mt()||typeof ShadowRoot>"u"?!1:t instanceof ShadowRoot||t instanceof S(t).ShadowRoot}function I(t){let{overflow:e,overflowX:n,overflowY:o,display:r}=O(t);return/auto|scroll|overlay|hidden|clip/.test(e+o+n)&&!["inline","contents"].includes(r)}function ye(t){return["table","td","th"].includes(N(t))}function J(t){return[":popover-open",":modal"].some(e=>{try{return t.matches(e)}catch{return!1}})}function vt(t){let e=bt(),n=R(t)?O(t):t;return["transform","translate","scale","rotate","perspective"].some(o=>n[o]?n[o]!=="none":!1)||(n.containerType?n.containerType!=="normal":!1)||!e&&(n.backdropFilter?n.backdropFilter!=="none":!1)||!e&&(n.filter?n.filter!=="none":!1)||["transform","translate","scale","rotate","perspective","filter"].some(o=>(n.willChange||"").includes(o))||["paint","layout","strict","content"].some(o=>(n.contain||"").includes(o))}function Se(t){let e=P(t);for(;E(e)&&!z(e);){if(vt(e))return e;if(J(e))return null;e=P(e)}return null}function bt(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}function z(t){return["html","body","#document"].includes(N(t))}function O(t){return S(t).getComputedStyle(t)}function tt(t){return R(t)?{scrollLeft:t.scrollLeft,scrollTop:t.scrollTop}:{scrollLeft:t.scrollX,scrollTop:t.scrollY}}function P(t){if(N(t)==="html")return t;let e=t.assignedSlot||t.parentNode||xe(t)&&t.host||_(t);return xe(e)?e.host:e}function Ce(t){let e=P(t);return z(e)?t.ownerDocument?t.ownerDocument.body:t.body:E(e)&&I(e)?e:Ce(e)}function pt(t,e,n){var o;e===void 0&&(e=[]),n===void 0&&(n=!0);let r=Ce(t),i=r===((o=t.ownerDocument)==null?void 0:o.body),l=S(r);if(i){let s=xt(l);return e.concat(l,l.visualViewport||[],I(r)?r:[],s&&n?pt(s):[])}return e.concat(r,pt(r,[],n))}function xt(t){return t.parent&&Object.getPrototypeOf(t.parent)?t.frameElement:null}function Re(t){let e=O(t),n=parseFloat(e.width)||0,o=parseFloat(e.height)||0,r=E(t),i=r?t.offsetWidth:n,l=r?t.offsetHeight:o,s=Q(n)!==i||Q(o)!==l;return s&&(n=i,o=l),{width:n,height:o,$:s}}function Oe(t){return R(t)?t:t.contextElement}function U(t){let e=Oe(t);if(!E(e))return k(1);let n=e.getBoundingClientRect(),{width:o,height:r,$:i}=Re(e),l=(i?Q(n.width):n.width)/o,s=(i?Q(n.height):n.height)/r;return(!l||!Number.isFinite(l))&&(l=1),(!s||!Number.isFinite(s))&&(s=1),{x:l,y:s}}var vn=k(0);function ke(t){let e=S(t);return!bt()||!e.visualViewport?vn:{x:e.visualViewport.offsetLeft,y:e.visualViewport.offsetTop}}function bn(t,e,n){return e===void 0&&(e=!1),!n||e&&n!==S(t)?!1:e}function et(t,e,n,o){e===void 0&&(e=!1),n===void 0&&(n=!1);let r=t.getBoundingClientRect(),i=Oe(t),l=k(1);e&&(o?R(o)&&(l=U(o)):l=U(t));let s=bn(i,n,o)?ke(i):k(0),a=(r.left+s.x)/l.x,c=(r.top+s.y)/l.y,f=r.width/l.x,d=r.height/l.y;if(i){let h=S(i),u=o&&R(o)?S(o):o,g=h,p=xt(g);for(;p&&o&&u!==g;){let b=U(p),T=p.getBoundingClientRect(),L=O(p),nt=T.left+(p.clientLeft+parseFloat(L.paddingLeft))*b.x,wt=T.top+(p.clientTop+parseFloat(L.paddingTop))*b.y;a*=b.x,c*=b.y,f*=b.x,d*=b.y,a+=nt,c+=wt,g=S(p),p=xt(g)}}return Z({width:f,height:d,x:a,y:c})}function Pt(t,e){let n=tt(t).scrollLeft;return e?e.left+n:et(_(t)).left+n}function Ee(t,e,n){n===void 0&&(n=!1);let o=t.getBoundingClientRect(),r=o.left+e.scrollLeft-(n?0:Pt(t,o)),i=o.top+e.scrollTop;return{x:r,y:i}}function xn(t){let{elements:e,rect:n,offsetParent:o,strategy:r}=t,i=r==="fixed",l=_(o),s=e?J(e.floating):!1;if(o===l||s&&i)return n;let a={scrollLeft:0,scrollTop:0},c=k(1),f=k(0),d=E(o);if((d||!d&&!i)&&((N(o)!=="body"||I(l))&&(a=tt(o)),E(o))){let u=et(o);c=U(o),f.x=u.x+o.clientLeft,f.y=u.y+o.clientTop}let h=l&&!d&&!i?Ee(l,a,!0):k(0);return{width:n.width*c.x,height:n.height*c.y,x:n.x*c.x-a.scrollLeft*c.x+f.x+h.x,y:n.y*c.y-a.scrollTop*c.y+f.y+h.y}}function wn(t){return Array.from(t.getClientRects())}function yn(t){let e=_(t),n=tt(t),o=t.ownerDocument.body,r=H(e.scrollWidth,e.clientWidth,o.scrollWidth,o.clientWidth),i=H(e.scrollHeight,e.clientHeight,o.scrollHeight,o.clientHeight),l=-n.scrollLeft+Pt(t),s=-n.scrollTop;return O(o).direction==="rtl"&&(l+=H(e.clientWidth,o.clientWidth)-r),{width:r,height:i,x:l,y:s}}function Sn(t,e){let n=S(t),o=_(t),r=n.visualViewport,i=o.clientWidth,l=o.clientHeight,s=0,a=0;if(r){i=r.width,l=r.height;let c=bt();(!c||c&&e==="fixed")&&(s=r.offsetLeft,a=r.offsetTop)}return{width:i,height:l,x:s,y:a}}function Cn(t,e){let n=et(t,!0,e==="fixed"),o=n.top+t.clientTop,r=n.left+t.clientLeft,i=E(t)?U(t):k(1),l=t.clientWidth*i.x,s=t.clientHeight*i.y,a=r*i.x,c=o*i.y;return{width:l,height:s,x:a,y:c}}function Ae(t,e,n){let o;if(e==="viewport")o=Sn(t,n);else if(e==="document")o=yn(_(t));else if(R(e))o=Cn(e,n);else{let r=ke(t);o={x:e.x-r.x,y:e.y-r.y,width:e.width,height:e.height}}return Z(o)}function Te(t,e){let n=P(t);return n===e||!R(n)||z(n)?!1:O(n).position==="fixed"||Te(n,e)}function An(t,e){let n=e.get(t);if(n)return n;let o=pt(t,[],!1).filter(s=>R(s)&&N(s)!=="body"),r=null,i=O(t).position==="fixed",l=i?P(t):t;for(;R(l)&&!z(l);){let s=O(l),a=vt(l);!a&&s.position==="fixed"&&(r=null),(i?!a&&!r:!a&&s.position==="static"&&!!r&&["absolute","fixed"].includes(r.position)||I(l)&&!a&&Te(t,l))?o=o.filter(f=>f!==l):r=s,l=P(l)}return e.set(t,o),o}function $n(t){let{element:e,boundary:n,rootBoundary:o,strategy:r}=t,l=[...n==="clippingAncestors"?J(e)?[]:An(e,this._c):[].concat(n),o],s=l[0],a=l.reduce((c,f)=>{let d=Ae(e,f,r);return c.top=H(d.top,c.top),c.right=ht(d.right,c.right),c.bottom=ht(d.bottom,c.bottom),c.left=H(d.left,c.left),c},Ae(e,s,r));return{width:a.right-a.left,height:a.bottom-a.top,x:a.left,y:a.top}}function Rn(t){let{width:e,height:n}=Re(t);return{width:e,height:n}}function On(t,e,n){let o=E(e),r=_(e),i=n==="fixed",l=et(t,!0,i,e),s={scrollLeft:0,scrollTop:0},a=k(0);if(o||!o&&!i)if((N(e)!=="body"||I(r))&&(s=tt(e)),o){let h=et(e,!0,i,e);a.x=h.x+e.clientLeft,a.y=h.y+e.clientTop}else r&&(a.x=Pt(r));let c=r&&!o&&!i?Ee(r,s):k(0),f=l.left+s.scrollLeft-a.x-c.x,d=l.top+s.scrollTop-a.y-c.y;return{x:f,y:d,width:l.width,height:l.height}}function Lt(t){return O(t).position==="static"}function $e(t,e){if(!E(t)||O(t).position==="fixed")return null;if(e)return e(t);let n=t.offsetParent;return _(t)===n&&(n=n.ownerDocument.body),n}function _e(t,e){let n=S(t);if(J(t))return n;if(!E(t)){let r=P(t);for(;r&&!z(r);){if(R(r)&&!Lt(r))return r;r=P(r)}return n}let o=$e(t,e);for(;o&&ye(o)&&Lt(o);)o=$e(o,e);return o&&z(o)&&Lt(o)&&!vt(o)?n:o||Se(t)||n}var kn=async function(t){let e=this.getOffsetParent||_e,n=this.getDimensions,o=await n(t.floating);return{reference:On(t.reference,await e(t.floating),t.strategy),floating:{x:0,y:0,width:o.width,height:o.height}}};function En(t){return O(t).direction==="rtl"}var Tn={convertOffsetParentRelativeRectToViewportRelativeRect:xn,getDocumentElement:_,getClippingRect:$n,getOffsetParent:_e,getElementRects:kn,getClientRects:wn,getDimensions:Rn,getScale:U,isElement:R,isRTL:En};var Le=be;var Pe=(t,e,n)=>{let o=new Map,r={platform:Tn,...n},i={...r.platform,_c:o};return ve(t,e,{...r,platform:i})};var Me=({render:t,html:e})=>{let n=new CSSStyleSheet;n.replaceSync(v`
    :host {
      display: contents;
    }
    slot {
      display: contents;
    }

    ${y}
    ${x}

    @keyframes popover-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .popover-content {
      animation: popover-in 150ms cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: top;
    }
  `);class o extends W({render:t,styleSheet:n}){_isOpen=!1;_refElement;_floatingElement;open=i=>{this._isOpen=!0,this._refElement=i,this.reRender(),Pe(this._refElement,this._floatingElement,{placement:this.getAttribute("placement")||"bottom",middleware:[Le(12)]}).then(({x:l,y:s})=>{Object.assign(this._floatingElement.style,{left:`${l}px`,top:`${s}px`,position:"fixed"})})};close=()=>{this._isOpen=!1,this.reRender()};render=()=>this._isOpen?e`
        <rtgl-view onclick=${this.close} pos="fix" cor="full">
          <rtgl-view
            ref=${i=>this._floatingElement=i}
            bw="xs"
            p="l"
            class="popover-content"
            onclick=${i=>i.stopPropagation()}
          >
            <slot></slot>
          </rtgl-view>
        </rtgl-view>
      `:e``}return o};var We=({render:t,html:e})=>class extends W({render:t}){items=[];getItems=()=>{let o=this.getAttribute("items");return o?JSON.parse(decodeURIComponent(o)):this.items};static get observedAttributes(){return["items"]}render=()=>e`
        <rtgl-view h="f" w="272" bwr="xs">
          <rtgl-view p="l">
            <rtgl-text s="h4" c="primary">Rettangoli test suite</rtgl-text>
          </rtgl-view>
          <rtgl-view w="f" p="l" g="xs">
            ${this.getItems().map(o=>e`
                <a
                  style="display: contents; text-decoration: none; color: inherit;"
                  href=${o.slug}
                >
                  <rtgl-view
                    h="36"
                    av="c"
                    ph="m"
                    w="f"
                    h-bgc="mu"
                    br="l"
                    bgc="${o.active?"mu":"bg"}"
                    cur="p"
                  >
                    <rtgl-text s="sm">${o.title}</rtgl-text>
                  </rtgl-view>
                </a>
              `)}
          </rtgl-view>
        </rtgl-view>
      `};var Be=({render:t,html:e})=>class extends W({render:t}){items=[];_contentContainer;_selectedSlug;onUnmount=()=>{this._contentContainer.removeEventListener("scroll",this.checkCurrentHeading),window.removeEventListener("scroll",this.checkCurrentHeading)};checkCurrentHeading=()=>{let o=this._contentContainer.querySelectorAll("rtgl-text[id]"),r=Array.from(o),i=null,l=null,s=-1/0;r.forEach(a=>{let c=a.getBoundingClientRect();c.top<=100&&c.top>s&&(s=c.top,l=a.id)}),l&&l!==i&&(i=l,this._selectedSlug=l,this.reRender())};startListening=o=>{this._contentContainer=o;let r=this._contentContainer.querySelectorAll("rtgl-text[id]"),i=Array.from(r);this.items=i.map(l=>({slug:l.id,title:l.textContent})),o&&o.addEventListener("scroll",this.checkCurrentHeading,{passive:!0}),window.addEventListener("scroll",this.checkCurrentHeading,{passive:!0}),this.checkCurrentHeading()};render=()=>e`
        <rtgl-view h="f" w="272">
          <rtgl-view w="f" g="s" mt="xl">
            ${this.items.map(o=>{let r=`${this._selectedSlug}`===o.slug?"fg":"mu-fg",i=`#${o.slug}`;return e`
                <a
                  style="display: contents; text-decoration: none; color: inherit;"
                  href=${i}
                >
                  <rtgl-text s="sm" c=${r}>${o.title}</rtgl-text>
                </a>
              `})}
          </rtgl-view>
        </rtgl-view>
      `};customElements.define("rtgl-button",te({render:A,html:C}));customElements.define("rtgl-view",oe({render:A,html:C}));customElements.define("rtgl-text",se({render:A,html:C}));customElements.define("rtgl-image",ie({render:A,html:C}));customElements.define("rtgl-svg",ae({render:A,html:C}));customElements.define("rtgl-input",ce({render:A,html:C}));customElements.define("rtgl-textarea",de({render:A,html:C}));customElements.define("rtgl-select",fe({render:A,html:C}));customElements.define("rtgl-popover",Me({render:A,html:C}));customElements.define("rtgl-sidebar",We({render:A,html:C}));customElements.define("rtgl-page-outline",Be({render:A,html:C}));})();
/*! (c) Andrea Giammarchi - MIT */
