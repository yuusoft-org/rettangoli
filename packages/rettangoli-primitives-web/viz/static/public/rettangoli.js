var rettangoli=(()=>{var{isArray:nt}=Array,{getPrototypeOf:_t,getOwnPropertyDescriptor:jt}=Object,x=[],it=()=>document.createRange(),z=(e,t,o)=>(e.set(t,o),o),Mt=(e,t)=>t.reduceRight(Rt,e),Rt=(e,t)=>e.childNodes[t],{setPrototypeOf:Wt}=Object,k,at=(e,t,o)=>(k||(k=it()),o?k.setStartAfter(e):k.setStartBefore(e),k.setEndAfter(t),k.deleteContents(),e),K=({firstChild:e,lastChild:t},o)=>at(e,t,o),lt=!1,Q=(e,t)=>lt&&e.nodeType===11?1/t<0?t?K(e,!0):e.lastChild:t?e.valueOf():e.firstChild:e,et=e=>document.createComment(e),X=class extends(t=>{function o(n){return Wt(n,new.target.prototype)}return o.prototype=t.prototype,o})(DocumentFragment){#e=et("<>");#o=et("</>");#t=x;constructor(t){super(t),this.replaceChildren(this.#e,...t.childNodes,this.#o),lt=!0}get firstChild(){return this.#e}get lastChild(){return this.#o}get parentNode(){return this.#e.parentNode}remove(){K(this,!1)}replaceWith(t){K(this,!0).replaceWith(t)}valueOf(){let{parentNode:t}=this;if(t===this)this.#t===x&&(this.#t=[...this.childNodes]);else{if(t){let{firstChild:o,lastChild:n}=this;for(this.#t=[o];o!==n;)this.#t.push(o=o.nextSibling)}this.replaceChildren(...this.#t)}return this}},ht=(e,t,o)=>e.setAttribute(t,o),B=(e,t)=>e.removeAttribute(t),T,Ot=(e,t,o)=>{o=o.slice(1),T||(T=new WeakMap);let n=T.get(e)||z(T,e,{}),s=n[o];return s&&s[0]&&e.removeEventListener(o,...s),s=nt(t)?t:[t,!1],n[o]=s,s[0]&&e.addEventListener(o,...s),t},E=(e,t)=>{let{t:o,n}=e,s=!1;switch(typeof t){case"object":if(t!==null){(n||o).replaceWith(e.n=t.valueOf());break}case"undefined":s=!0;default:o.data=s?"":t,n&&(e.n=null,n.replaceWith(o))}return t},H=(e,t,o)=>e[o]=t,zt=(e,t,o)=>H(e,t,o.slice(1)),Y=(e,t,o)=>t==null?(B(e,o),t):H(e,t,o),ct=(e,t)=>(typeof t=="function"?t(e):t.current=e,t),G=(e,t,o)=>(t==null?B(e,o):ht(e,o,t),t),Et=(e,t,o)=>(e.toggleAttribute(o.slice(1),t),t),L=(e,t,o)=>{let{length:n}=t;if(e.data=`[${n}]`,n)return((s,i,a,r,g)=>{let p=a.length,h=i.length,c=p,l=0,d=0,f=null;for(;l<h||d<c;)if(h===l){let m=c<p?d?r(a[d-1],-0).nextSibling:r(a[c],0):g;for(;d<c;)s.insertBefore(r(a[d++],1),m)}else if(c===d)for(;l<h;)f&&f.has(i[l])||s.removeChild(r(i[l],-1)),l++;else if(i[l]===a[d])l++,d++;else if(i[h-1]===a[c-1])h--,c--;else if(i[l]===a[c-1]&&a[d]===i[h-1]){let m=r(i[--h],-0).nextSibling;s.insertBefore(r(a[d++],1),r(i[l++],-0).nextSibling),s.insertBefore(r(a[--c],1),m),i[h]=a[c]}else{if(!f){f=new Map;let m=d;for(;m<c;)f.set(a[m],m++)}if(f.has(i[l])){let m=f.get(i[l]);if(d<m&&m<c){let w=l,$=1;for(;++w<h&&w<c&&f.get(i[w])===m+$;)$++;if($>m-d){let F=r(i[l],0);for(;d<m;)s.insertBefore(r(a[d++],1),F)}else s.replaceChild(r(a[d++],1),r(i[l++],-1))}else l++}else s.removeChild(r(i[l++],-1))}return a})(e.parentNode,o,t,Q,e);switch(o.length){case 1:o[0].remove();case 0:break;default:at(Q(o[0],0),Q(o.at(-1),-0),!1)}return x},Nt=new Map([["aria",(e,t)=>{for(let o in t){let n=t[o],s=o==="role"?o:`aria-${o}`;n==null?B(e,s):ht(e,s,n)}return t}],["class",(e,t)=>Y(e,t,t==null?"class":"className")],["data",(e,t)=>{let{dataset:o}=e;for(let n in t)t[n]==null?delete o[n]:o[n]=t[n];return t}],["ref",ct],["style",(e,t)=>t==null?Y(e,t,"style"):H(e.style,t,"cssText")]]),Tt=(e,t,o)=>{switch(t[0]){case".":return zt;case"?":return Et;case"@":return Ot;default:return o||"ownerSVGElement"in e?t==="ref"?ct:G:Nt.get(t)||(t in e?t.startsWith("on")?H:((n,s)=>{let i;do i=jt(n,s);while(!i&&(n=_t(n)));return i})(e,t)?.set?Y:G:G)}},Vt=(e,t)=>(e.textContent=t??"",t),O=(e,t,o)=>({a:e,b:t,c:o}),A=()=>O(null,null,x),dt=e=>(t,o)=>{let{a:n,b:s,c:i}=e(t,o),a=document.importNode(n,!0),r=x;if(s!==x){r=[];for(let l,d,f=0;f<s.length;f++){let{a:m,b:w,c:$}=s[f],F=m===d?l:l=Mt(a,d=m);r[f]=(g=w,p=F,h=$,c=w===L?[]:w===E?A():null,{v:x,u:g,t:p,n:h,c})}}var g,p,h,c;return((l,d)=>({b:l,c:d}))(i?a.firstChild:new X(a),r)},Lt=/^(?:plaintext|script|style|textarea|title|xmp)$/i,Bt=/^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i,Ht=/<([a-zA-Z0-9]+[a-zA-Z0-9:._-]*)([^>]*?)(\/?)>/g,Dt=/([^\s\\>"'=]+)\s*=\s*(['"]?)\x01/g,It=/[\x01\x02]/g,Z,q,V=document.createElement("template"),Pt=(e,t)=>{if(t)return Z||(Z=document.createElementNS("http://www.w3.org/2000/svg","svg"),q=it(),q.selectNodeContents(Z)),q.createContextualFragment(e);V.innerHTML=e;let{content:o}=V;return V=V.cloneNode(!1),o},J=e=>{let t=[],o;for(;o=e.parentNode;)t.push(t.indexOf.call(o.childNodes,e)),e=o;return t},ot=()=>document.createTextNode(""),Ut=(e,t,o)=>{let n=Pt(((g,p,h)=>{let c=0;return g.join("").trim().replace(Ht,(l,d,f,m)=>`<${d}${f.replace(Dt,"=$2$1").trimEnd()}${m?h||Bt.test(d)?" /":`></${d}`:""}>`).replace(It,l=>l===""?`<!--${p+c++}-->`:p+c++)})(e,W,o),o),{length:s}=e,i=x;if(s>1){let g=[],p=document.createTreeWalker(n,129),h=0,c=`${W}${h++}`;for(i=[];h<s;){let l=p.nextNode();if(l.nodeType===8){if(l.data===c){let d=nt(t[h-1])?L:E;d===E&&g.push(l),i.push(O(J(l),d,null)),c=`${W}${h++}`}}else{let d;for(;l.hasAttribute(c);){d||(d=J(l));let f=l.getAttribute(c);i.push(O(d,Tt(l,f,o),f)),B(l,c),c=`${W}${h++}`}!o&&Lt.test(l.localName)&&l.textContent.trim()===`<!--${c}-->`&&(i.push(O(d||J(l),Vt,null)),c=`${W}${h++}`)}}for(h=0;h<g.length;h++)g[h].replaceWith(ot())}let{childNodes:a}=n,{length:r}=a;return r<1?(r=1,n.appendChild(ot())):r===1&&s!==1&&a[0].nodeType!==1&&(r=0),z(gt,e,O(n,i,r===1))},gt=new WeakMap,W="is\xB5",pt=e=>(t,o)=>gt.get(t)||Ut(t,o,e),Ft=dt(pt(!1)),Qt=dt(pt(!0)),tt=(e,{s:t,t:o,v:n})=>{if(e.a!==o){let{b:s,c:i}=(t?Qt:Ft)(o,n);e.a=o,e.b=s,e.c=i}for(let{c:s}=e,i=0;i<s.length;i++){let a=n[i],r=s[i];switch(r.u){case L:r.v=L(r.t,Gt(r.c,a),r.v);break;case E:let g=a instanceof C?tt(r.c||(r.c=A()),a):(r.c=null,a);g!==r.v&&(r.v=E(r,g));break;default:a!==r.v&&(r.v=r.u(r.t,a,r.n,r.v))}}return e.b},Gt=(e,t)=>{let o=0,{length:n}=t;for(n<e.length&&e.splice(n);o<n;o++){let s=t[o];s instanceof C?t[o]=tt(e[o]||(e[o]=A()),s):e[o]=null}return t},C=class{constructor(t,o,n){this.s=t,this.t=o,this.v=n}toDOM(t=A()){return tt(t,this)}};var ut=e=>(t,...o)=>new C(e,t,o),_=ut(!1),he=ut(!0),rt=new WeakMap,j=(e,t)=>((o,n)=>{let s=rt.get(o)||z(rt,o,A()),{b:i}=s,a=typeof n=="function"?n():n,r=a instanceof C?a.toDOM(s):a;return i!==r&&o.replaceChildren((s.b=r).valueOf()),o})(e,t),st=new WeakMap,ft=e=>(t,o)=>{let n=st.get(t)||z(st,t,new Map);return n.get(o)||z(n,o,function(s,...i){return new C(e,s,i).toDOM(this)}.bind(A()))},ce=ft(!1),de=ft(!0);function v(e,...t){let o="";return e.forEach((n,s)=>{o+=n+(t[s]||"")}),o}var mt={default:void 0,xl:"@media only screen and (max-width: 1280px)",lg:"@media only screen and (max-width: 1024px)",md:"@media only screen and (max-width: 768px)",sm:"@media only screen and (max-width: 640px)"},y=(e,t,o={})=>{let n="";for(let[s,i]of Object.entries(mt)){s!=="default"&&(n+=`${i} {`);for(let[a,r]of Object.entries(t)){let g=o[a]?` ${o[a]} `:" ";for(let[p,h]of Object.entries(r)){let c=e[a],l=h.startsWith("--")?`var(${h})`:h,d=s==="default"?a:`${s}-${a}`,f=s==="default"?`h-${a}`:`${s}-h-${a}`;if(c){let w=c.split(" ").map($=>`${$}: ${l};`).join(" ");n+=`
            :host([${d}="${p}"])${g}{
              ${w}
            }
            :host([${f}="${p}"]:hover)${g}{
              ${w}
            }
          `}else n+=`
            :host([${d}="${p}"])${g}{
              ${h}
            }
            :host([${f}="${p}"]:hover)${g}{
              ${h}
            }
          `}}s!=="default"&&(n+="}")}return n};function Zt(e){if(e===null||e.includes("/"))return!1;let t=String(e);return/[0-9]$/.test(t)}var qt=e=>/%$/.test(e),b=e=>{if(e!==void 0)return qt(e)?e:Zt(e)?`${e}px`:e},u={xs:"--spacing-xs",s:"--spacing-s",m:"--spacing-m",l:"--spacing-l",xl:"--spacing-xl"};function D(e){let t="";for(let[o,n]of Object.entries(mt)){o!=="default"&&(t+=`${n} {
`);let s="";for(let[i,a]of Object.entries(e[o]))a!=null&&(s+=`${i}: ${a};
`);t+=`:host {
    ${s.trim()}
    }
`,o!=="default"&&(t+=`}
`)}return t}var M=v`
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
`;var Jt={mt:"margin-top",mr:"margin-right",mb:"margin-bottom",ml:"margin-left",m:"margin",mh:"margin-left margin-right",mv:"margin-top margin-bottom"},Kt={mt:u,mr:u,mb:u,ml:u,m:u,mh:u,mv:u},Xt={mt:"button",mr:"button",mb:"button",ml:"button",m:"button",mh:"button",mv:"button"},vt=y(Jt,Kt,Xt);var bt=({render:e,html:t})=>{let o=new CSSStyleSheet;return o.replaceSync(v`
    :host {
      display: contents;
    }
    slot {
      display: contents;
    }

    button {
      border-style: solid;
      padding: 0px;
      font-size: var(--typography-body-s-font-size);
      font-weight: var(--typography-body-s-font-weight);
      line-height: var(--typography-body-s-line-height);
      letter-spacing: var(--typography-body-s-letter-spacing);
    }

    button:hover {
      cursor: pointer;
    }

    :host([t="ps"]) button,
    :host([t="p"]) button,
    :host([t="pl"]) button {
      color: var(--color-on-primary);
      border-color: var(--color-primary);
      background-color: var(--color-primary);
    }

    :host([t="ps"]) button:hover,
    :host([t="p"]) button:hover,
    :host([t="pl"]) button:hover {
      border-color: var(--color-primary-hover);
      background-color: var(--color-primary-hover);
    }

    :host([t="ps"]) button:active,
    :host([t="p"]) button:active,
    :host([t="pl"]) button:active {
      border-color: var(--color-primary-active);
      background-color: var(--color-primary-active);
    }

    :host([t="ss"]) button,
    :host([t="s"]) button,
    :host([t="sl"]) button {
      color: var(--color-on-secondary);
      border-color: var(--color-secondary);
      background-color: var(--color-secondary);
    }

    :host([t="ss"]) button:hover,
    :host([t="s"]) button:hover,
    :host([t="sl"]) button:hover {
      background-color: var(--color-secondary-hover);
      border-color: var(--color-secondary-hover);
    }

    :host([t="ss"]) button:active,
    :host([t="s"]) button:active,
    :host([t="sl"]) button:active {
      background-color: var(--color-secondary-active);
      border-color: var(--color-secondary-active);
    }

    :host([t="es"]) button,
    :host([t="e"]) button,
    :host([t="el"]) button {
      color: var(--color-on-error);
      border-color: var(--color-error);
      background-color: var(--color-error);
    }

    :host([t="es"]) button:hover,
    :host([t="e"]) button:hover,
    :host([t="el"]) button:hover {
      background-color: var(--color-error-hover);
      border-color: var(--color-error-hover);
    }

    :host([t="es"]) button:active,
    :host([t="e"]) button:active,
    :host([t="el"]) button:active {
      background-color: var(--color-error-active);
      border-color: var(--color-error-active);
    }

    :host([t="ns"]) button,
    :host([t="n"]) button,
    :host([t="nl"]) button {
      color: var(--color-on-surface);
      border-color: var(--color-surface-container);
      background-color: var(--color-surface-container);
    }

    :host([t="ns"]) button:hover,
    :host([t="n"]) button:hover,
    :host([t="nl"]) button:hover {
      background-color: var(--color-surface-container-high);
      border-color: var(--color-surface-container-high);
    }

    :host([t="ns"]) button:active,
    :host([t="n"]) button:active,
    :host([t="nl"]) button:active {
      background-color: var(--color-surface-container-high);
      border-color: var(--color-surface-container-high);
    }

    :host([t="ps"]) button,
    :host([t="ss"]) button,
    :host([t="es"]) button,
    :host([t="ns"]) button {
      height: var(--button-height-s);
      padding-left: var(--button-padding-horizontal-s);
      padding-right: var(--button-padding-horizontal-s);
      border-radius: var(--button-border-radius-s);
    }

    :host([t="p"]) button,
    :host([t="s"]) button,
    :host([t="e"]) button,
    :host([t="n"]) button {
      height: var(--button-height-m);
      padding-left: var(--button-padding-horizontal-m);
      padding-right: var(--button-padding-horizontal-m);
      border-radius: var(--button-border-radius-m);
    }

    :host([t="pl"]) button,
    :host([t="sl"]) button,
    :host([t="el"]) button,
    :host([t="nl"]) button {
      height: var(--button-height-l);
      padding-left: var(--button-padding-horizontal-l);
      padding-right: var(--button-padding-horizontal-l);
      border-radius: var(--button-border-radius-l);
      font-size: var(--typography-label-l-font-size);
      font-weight: var(--typography-label-l-font-weight);
      line-height: var(--typography-label-l-line-height);
      letter-spacing: var(--typography-label-l-letter-spacing);
    }
    ${vt}
    ${M}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[o],e(this.shadow,this.render)}static get observedAttributes(){return["key","href","target","w","t"]}_buttonRef={};_assingRef=s=>{this._buttonRef.current=s;let i=b(this.getAttribute("w"));i==="f"?this._buttonRef.current.style.width="100%":i!=null&&(this._buttonRef.current.style.width=i)};attributeChangedCallback(s,i,a){if(!this._buttonRef.current)return;let r=b(this.getAttribute("w"));r==="f"?this._buttonRef.current.style.width="100%":r!=null&&(this._buttonRef.current.style.width=r,this._buttonRef.current.style.minWidth=r,this._buttonRef.current.style.maxWidth=r),e(this.shadow,this.render)}render=()=>this.getAttribute("href")?t`
          <a
            href=${this.getAttribute("href")}
            target=${this.getAttribute("target")}
          >
            <button>
              <slot></slot>
            </button>
          </a>
        `:t`
        <button ref=${this._assingRef}>
          <slot></slot>
        </button>
      `}};var yt=v`

  :host([d="h"]) {
    flex-direction: row;
  }
  :host(:not([d])) {
    flex-direction: column;
  }
  :host([d="h"]:not([ah])) {
    justify-content: flex-start;
  }
  :host([d="h"][ah="c"]) {
    justify-content: center;
    /* align-content: center; */
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
  :host(:not([d]):not([ah])) {
    align-items: flex-start;
  }
  :host(:not([d])[ah="c"]) {
    align-items: center;
    align-content: center;
  }
  :host(:not([d])[ah="e"]) {
    align-items: flex-end;
    align-content: flex-end;
  }
  :host(:not([d]):not([av])) {
    justify-content: flex-start;
  }
  :host(:not([d])[av="c"]) {
    justify-content: center;
  }
  :host(:not([d])[av="e"]) {
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
`;var Yt={cur:"cursor"},te={cur:{p:"pointer",m:"move",grab:"grab",grabbing:"grabbing"}},S=y(Yt,te);var wt=v`
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

`;var N={xs:"--border-width-xs",s:"--border-width-s",m:"--border-width-m",l:"--border-width-l",xl:"--border-width-xl"},ee={pos:"position",shadow:"box-shadow",pt:"padding-top",pr:"padding-right",pb:"padding-bottom",pl:"padding-left",p:"padding",ph:"padding-left padding-right",pv:"padding-top padding-bottom",g:"gap",gv:"row-gap",gh:"column-gap",bw:"border-width",bwt:"border-top-width",bwr:"border-right-width",bwb:"border-bottom-width",bwl:"border-left-width",bc:"border-color",br:"border-radius"},oe={bgc:{p:`
    background-color: var(--color-primary);
    color: var(--color-on-primary);
    `,pc:`
    background-color: var(--color-primary-container);
    color: var(--color-on-primary-container);
    `,s:`
    background-color: var(--color-secondary);
    color: var(--color-on-secondary);
    `,sc:`
    background-color: var(--color-secondary-container);
    color: var(--color-on-secondary-container);
    `,e:`
    background-color: var(--color-error);
    color: var(--color-on-error);
    `,ec:`
    background-color: var(--color-error-container);
    color: var(--color-on-error-container);
    `,su:`
    background-color: var(--color-surface);
    color: var(--color-on-surface);
    `,sucl:`
    background-color: var(--color-surface-container-low);
    color: var(--color-on-surface);
    `,suc:`
    background-color: var(--color-surface-container);
    color: var(--color-on-surface);
    `,such:`
    background-color: var(--color-surface-container-high);
    color: var(--color-on-surface);
    `,isu:`
    background-color: var(--color-inverse-surface);
    color: var(--color-inverse-on-surface);
    `,o:`
    background-color: var(--color-outline);
    `,ov:`
    background-color: var(--color-outline-variant);
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
        `},shadow:{s:"--shadow-s",m:"--shadow-m",l:"--shadow-l"},pt:u,pr:u,pb:u,pl:u,p:u,ph:u,pv:u,g:u,gv:u,gh:u,bw:N,bwt:N,bwr:N,bwb:N,bwl:N,bc:{p:"--color-primary",pc:"--color-primary-container",s:"--color-secondary",sc:"--color-secondary-container",e:"--color-error",ec:"--color-error-container",su:"--color-surface",sucl:"--color-surface-container-low",suc:"--color-surface-container",such:"--color-surface-container-high",isu:"--color-inverse-surface",o:"--color-outline",ov:"--color-outline-variant"},br:{xs:"--border-radius-xs",s:"--border-radius-s",m:"--border-radius-m",l:"--border-radius-l",xl:"--border-radius-xl",f:"50%"}},I=y(ee,oe);var re={mt:"margin-top",mr:"margin-right",mb:"margin-bottom",ml:"margin-left",m:"margin",mh:"margin-left margin-right",mv:"margin-top margin-bottom"},se={mt:u,mr:u,mb:u,ml:u,m:u,mh:u,mv:u},R=y(re,se);var xt=({render:e,html:t})=>{let o=new CSSStyleSheet;return o.replaceSync(v`
    slot {
      display: contents;
    }
    :host {
      display: flex;
      align-self: auto;
      align-content: flex-start;
      flex-wrap: wrap;
      border-style: solid;
      border-width: 0;
      box-sizing: border-box;
    }
    :host([stretch]) {
      align-self: stretch;
    }
    ${M}
    ${wt}
  ${yt}
  ${R}
  ${S}
  ${I}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[o],e(this.shadow,this.render)}static get observedAttributes(){return["key","wh","w","h","hidden","s-w","s-h","s-d"]}_styles={default:{},sm:{},md:{},lg:{},xl:{}};attributeChangedCallback(s,i,a){["default","sm","md","lg","xl"].forEach(r=>{let g=f=>`${r==="default"?"":`${r}-`}${f}`,p=this.getAttribute(g("wh")),h=b(p===null?this.getAttribute(g("w")):p),c=b(p===null?this.getAttribute(g("h")):p),l=this.getAttribute(g("o")),d=this.getAttribute(g("z"));d!==null&&(this._styles[r]["z-index"]=d),l!==null&&(this._styles[r].opacity=l),h==="f"?this._styles[r].width="100%":h!==void 0&&(this._styles[r].width=h,this._styles[r]["min-width"]=h,this._styles[r]["max-width"]=h),c==="f"?this._styles[r].height="100%":c!==void 0&&(this._styles[r].height=c,this._styles[r]["min-height"]=c,this._styles[r]["max-height"]=c),this.hasAttribute(g("hidden"))&&(this._styles[r].display="none")}),e(this.shadow,this.render)}render=()=>t`
        <style>
          ${D(this._styles)}
        </style>
        <slot></slot>
      `}};var ne={at:"text-align"},ie={at:{c:"center",e:"right",j:"justify"},s:{dm:`
        font-size: var(--typography-display-m-font-size);
        font-weight: var(--typography-display-m-font-weight);
        line-height: var(--typography-display-m-line-height);
        letter-spacing: var(--typography-display-m-letter-spacing);
      `,hm:`
        font-size: var(--typography-headline-m-font-size);
        font-weight: var(--typography-headline-m-font-weight);
        line-height: var(--typography-headline-m-line-height);
        letter-spacing: var(--typography-headline-m-letter-spacing);
      `,tl:`
        font-size: var(--typography-title-l-font-size);
        font-weight: var(--typography-title-l-font-weight);
        line-height: var(--typography-title-l-line-height);
        letter-spacing: var(--typography-title-l-letter-spacing);
      `,tm:`
        font-size: var(--typography-title-m-font-size);
        font-weight: var(--typography-title-m-font-weight);
        line-height: var(--typography-title-m-line-height);
        letter-spacing: var(--typography-title-m-letter-spacing);
      `,ts:`
        font-size: var(--typography-title-s-font-size);
        font-weight: var(--typography-title-s-font-weight);
        line-height: var(--typography-title-s-line-height);
        letter-spacing: var(--typography-title-s-letter-spacing);
      `,bl:`
        font-size: var(--typography-body-l-font-size);
        font-weight: var(--typography-body-l-font-weight);
        line-height: var(--typography-body-l-line-height);
        letter-spacing: var(--typography-body-l-letter-spacing);
      `,bm:`
        font-size: var(--typography-body-m-font-size);
        font-weight: var(--typography-body-m-font-weight);
        line-height: var(--typography-body-m-line-height);
        letter-spacing: var(--typography-body-m-letter-spacing);
      `,bs:`
        font-size: var(--typography-body-s-font-size);
        font-weight: var(--typography-body-s-font-weight);
        line-height: var(--typography-body-s-line-height);
        letter-spacing: var(--typography-body-s-letter-spacing);
      `,ll:`
        font-size: var(--typography-label-l-font-size);
        font-weight: var(--typography-label-l-font-weight);
        line-height: var(--typography-label-l-line-height);
        letter-spacing: var(--typography-label-l-letter-spacing);
      `,lm:`
        font-size: var(--typography-label-m-font-size);
        font-weight: var(--typography-label-m-font-weight);
        line-height: var(--typography-label-m-line-height);
        letter-spacing: var(--typography-label-m-letter-spacing);
      `}},St=y(ne,ie);var ae={c:"color"},le={c:{"on-p":"--color-on-primary","on-pc":"--color-on-primary-container","on-s":"--color-on-secondary","on-sc":"--color-on-secondary-container","on-su":"--color-on-surface","on-su-v":"--color-on-surface-variant","i-on-su":"--color-inverse-on-surface","on-e":"--color-on-error","on-ec":"--color-on-error-container"}},P=y(ae,le);var $t=({render:e,html:t})=>{let o=new CSSStyleSheet;o.replaceSync(v`
    :host {
      display: block;
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
    ${St}
    ${P}
${R}
${S}
  `);class n extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[o]}static get observedAttributes(){return["key","w","ellipsis"]}connectedCallback(){e(this.shadow,this.render)}attributeChangedCallback(i,a,r){let g=b(this.getAttribute("w"));this.hasAttribute("ellipsis")&&(this.style.overflow="hidden",this.style.textOverflow="ellipsis",this.style.whiteSpace="nowrap"),g==="f"?this.style.width="100%":g!==void 0&&(this.style.width=g),e(this.shadow,this.render)}render=()=>t` <slot></slot> `}return n};var Ct=({render:e,html:t})=>{let o=new CSSStyleSheet;return o.replaceSync(v`
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
    ${I}
    ${R}
${S}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[o]}_styles={default:{},sm:{},md:{},lg:{},xl:{}};static get observedAttributes(){return["key","src","wh","w","h","hidden","height","width","s-wh","s-w","s-h"]}connectedCallback(){e(this.shadow,this.render)}attributeChangedCallback(s,i,a){["default","sm","md","lg","xl"].forEach(r=>{let g=f=>`${r==="default"?"":`${r}-`}${f}`,p=this.getAttribute(g("wh")),h=b(p===null?this.getAttribute(g("w")):p),c=b(p===null?this.getAttribute(g("h")):p),l=this.getAttribute(g("o")),d=this.getAttribute(g("z"));d!==null&&(this._styles[r].zIndex=d),l!==null&&(this._styles[r].opacity=l),h==="f"?this._styles[r].width="100%":h!==void 0&&(this._styles[r].width=h,this._styles[r]["min-width"]=h,this._styles[r]["max-width"]=h),c==="f"?this._styles[r].height="100%":c!==void 0&&(this._styles[r].height=c,this._styles[r]["min-height"]=c,this._styles[r]["max-height"]=c)}),e(this.shadow,this.render)}render=()=>t`
        <style>
          ${D(this._styles)}
        </style>
        <img
          src="${this.getAttribute("src")}"
          width="${this.getAttribute("width")}"
          height="${this.getAttribute("height")}"
        />
      `}};var kt=v`
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
`;var At=({render:e,html:t})=>{let o=new CSSStyleSheet;return o.replaceSync(v`
    ${P}
    ${kt}
${M}
${S}
  `),class U extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[o]}static _icons={};static get observedAttributes(){return["key","svg","w","h","wh"]}static get icons(){return U._icons}static addIcon(s,i){U._icons[s]=i}connectedCallback(){this.render()}attributeChangedCallback(s,i,a){let r=this.getAttribute("wh"),g=b(r===null?this.getAttribute("w"):r),p=b(r===null?this.getAttribute("h"):r);g&&(this.style.width=g),p&&(this.style.height=p),this.render()}render=()=>{try{let s=this.getAttribute("svg"),i=U._icons[s]||(window.rtglIcons||{})[s];if(i){this.shadow.innerHTML=i;return}}catch(s){console.log("error in rtgl-svg render",s)}this.shadow.innerHTML=""}}};customElements.define("rtgl-button",bt({render:j,html:_}));customElements.define("rtgl-view",xt({render:j,html:_}));customElements.define("rtgl-text",$t({render:j,html:_}));customElements.define("rtgl-image",Ct({render:j,html:_}));customElements.define("rtgl-svg",At({render:j,html:_}));})();
/*! (c) Andrea Giammarchi - MIT */
