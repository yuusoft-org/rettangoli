var rettangoli=(()=>{var{isArray:nt}=Array,{getPrototypeOf:zt,getOwnPropertyDescriptor:Mt}=Object,y=[],it=()=>document.createRange(),M=(e,t,r)=>(e.set(t,r),r),Wt=(e,t)=>t.reduceRight(It,e),It=(e,t)=>e.childNodes[t],{setPrototypeOf:Tt}=Object,A,at=(e,t,r)=>(A||(A=it()),r?A.setStartAfter(e):A.setStartBefore(e),A.setEndAfter(t),A.deleteContents(),e),Z=({firstChild:e,lastChild:t},r)=>at(e,t,r),lt=!1,Q=(e,t)=>lt&&e.nodeType===11?1/t<0?t?Z(e,!0):e.lastChild:t?e.valueOf():e.firstChild:e,et=e=>document.createComment(e),X=class extends(t=>{function r(i){return Tt(i,new.target.prototype)}return r.prototype=t.prototype,r})(DocumentFragment){#e=et("<>");#r=et("</>");#t=y;constructor(t){super(t),this.replaceChildren(this.#e,...t.childNodes,this.#r),lt=!0}get firstChild(){return this.#e}get lastChild(){return this.#r}get parentNode(){return this.#e.parentNode}remove(){Z(this,!1)}replaceWith(t){Z(this,!0).replaceWith(t)}valueOf(){let{parentNode:t}=this;if(t===this)this.#t===y&&(this.#t=[...this.childNodes]);else{if(t){let{firstChild:r,lastChild:i}=this;for(this.#t=[r];r!==i;)this.#t.push(r=r.nextSibling)}this.replaceChildren(...this.#t)}return this}},ht=(e,t,r)=>e.setAttribute(t,r),L=(e,t)=>e.removeAttribute(t),T,Nt=(e,t,r)=>{r=r.slice(1),T||(T=new WeakMap);let i=T.get(e)||M(T,e,{}),s=i[r];return s&&s[0]&&e.removeEventListener(r,...s),s=nt(t)?t:[t,!1],i[r]=s,s[0]&&e.addEventListener(r,...s),t},W=(e,t)=>{let{t:r,n:i}=e,s=!1;switch(typeof t){case"object":if(t!==null){(i||r).replaceWith(e.n=t.valueOf());break}case"undefined":s=!0;default:r.data=s?"":t,i&&(e.n=null,i.replaceWith(r))}return t},B=(e,t,r)=>e[r]=t,Ht=(e,t,r)=>B(e,t,r.slice(1)),Y=(e,t,r)=>t==null?(L(e,r),t):B(e,t,r),ct=(e,t)=>(typeof t=="function"?t(e):t.current=e,t),q=(e,t,r)=>(t==null?L(e,r):ht(e,r,t),t),Lt=(e,t,r)=>(e.toggleAttribute(r.slice(1),t),t),H=(e,t,r)=>{let{length:i}=t;if(e.data=`[${i}]`,i)return((s,n,a,o,c)=>{let u=a.length,h=n.length,d=u,l=0,g=0,f=null;for(;l<h||g<d;)if(h===l){let m=d<u?g?o(a[g-1],-0).nextSibling:o(a[d],0):c;for(;g<d;)s.insertBefore(o(a[g++],1),m)}else if(d===g)for(;l<h;)f&&f.has(n[l])||s.removeChild(o(n[l],-1)),l++;else if(n[l]===a[g])l++,g++;else if(n[h-1]===a[d-1])h--,d--;else if(n[l]===a[d-1]&&a[g]===n[h-1]){let m=o(n[--h],-0).nextSibling;s.insertBefore(o(a[g++],1),o(n[l++],-0).nextSibling),s.insertBefore(o(a[--d],1),m),n[h]=a[d]}else{if(!f){f=new Map;let m=g;for(;m<d;)f.set(a[m],m++)}if(f.has(n[l])){let m=f.get(n[l]);if(g<m&&m<d){let w=l,O=1;for(;++w<h&&w<d&&f.get(n[w])===m+O;)O++;if(O>m-g){let F=o(n[l],0);for(;g<m;)s.insertBefore(o(a[g++],1),F)}else s.replaceChild(o(a[g++],1),o(n[l++],-1))}else l++}else s.removeChild(o(n[l++],-1))}return a})(e.parentNode,r,t,Q,e);switch(r.length){case 1:r[0].remove();case 0:break;default:at(Q(r[0],0),Q(r.at(-1),-0),!1)}return y},Bt=new Map([["aria",(e,t)=>{for(let r in t){let i=t[r],s=r==="role"?r:`aria-${r}`;i==null?L(e,s):ht(e,s,i)}return t}],["class",(e,t)=>Y(e,t,t==null?"class":"className")],["data",(e,t)=>{let{dataset:r}=e;for(let i in t)t[i]==null?delete r[i]:r[i]=t[i];return t}],["ref",ct],["style",(e,t)=>t==null?Y(e,t,"style"):B(e.style,t,"cssText")]]),Vt=(e,t,r)=>{switch(t[0]){case".":return Ht;case"?":return Lt;case"@":return Nt;default:return r||"ownerSVGElement"in e?t==="ref"?ct:q:Bt.get(t)||(t in e?t.startsWith("on")?B:((i,s)=>{let n;do n=Mt(i,s);while(!n&&(i=zt(i)));return n})(e,t)?.set?Y:q:q)}},Pt=(e,t)=>(e.textContent=t??"",t),z=(e,t,r)=>({a:e,b:t,c:r}),_=()=>z(null,null,y),dt=e=>(t,r)=>{let{a:i,b:s,c:n}=e(t,r),a=document.importNode(i,!0),o=y;if(s!==y){o=[];for(let l,g,f=0;f<s.length;f++){let{a:m,b:w,c:O}=s[f],F=m===g?l:l=Wt(a,g=m);o[f]=(c=w,u=F,h=O,d=w===H?[]:w===W?_():null,{v:y,u:c,t:u,n:h,c:d})}}var c,u,h,d;return((l,g)=>({b:l,c:g}))(n?a.firstChild:new X(a),o)},Dt=/^(?:plaintext|script|style|textarea|title|xmp)$/i,Ut=/^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i,Ft=/<([a-zA-Z0-9]+[a-zA-Z0-9:._-]*)([^>]*?)(\/?)>/g,Qt=/([^\s\\>"'=]+)\s*=\s*(['"]?)\x01/g,qt=/[\x01\x02]/g,G,J,N=document.createElement("template"),Gt=(e,t)=>{if(t)return G||(G=document.createElementNS("http://www.w3.org/2000/svg","svg"),J=it(),J.selectNodeContents(G)),J.createContextualFragment(e);N.innerHTML=e;let{content:r}=N;return N=N.cloneNode(!1),r},K=e=>{let t=[],r;for(;r=e.parentNode;)t.push(t.indexOf.call(r.childNodes,e)),e=r;return t},rt=()=>document.createTextNode(""),Jt=(e,t,r)=>{let i=Gt(((c,u,h)=>{let d=0;return c.join("").trim().replace(Ft,(l,g,f,m)=>`<${g}${f.replace(Qt,"=$2$1").trimEnd()}${m?h||Ut.test(g)?" /":`></${g}`:""}>`).replace(qt,l=>l===""?`<!--${u+d++}-->`:u+d++)})(e,j,r),r),{length:s}=e,n=y;if(s>1){let c=[],u=document.createTreeWalker(i,129),h=0,d=`${j}${h++}`;for(n=[];h<s;){let l=u.nextNode();if(l.nodeType===8){if(l.data===d){let g=nt(t[h-1])?H:W;g===W&&c.push(l),n.push(z(K(l),g,null)),d=`${j}${h++}`}}else{let g;for(;l.hasAttribute(d);){g||(g=K(l));let f=l.getAttribute(d);n.push(z(g,Vt(l,f,r),f)),L(l,d),d=`${j}${h++}`}!r&&Dt.test(l.localName)&&l.textContent.trim()===`<!--${d}-->`&&(n.push(z(g||K(l),Pt,null)),d=`${j}${h++}`)}}for(h=0;h<c.length;h++)c[h].replaceWith(rt())}let{childNodes:a}=i,{length:o}=a;return o<1?(o=1,i.appendChild(rt())):o===1&&s!==1&&a[0].nodeType!==1&&(o=0),M(gt,e,z(i,n,o===1))},gt=new WeakMap,j="is\xB5",ut=e=>(t,r)=>gt.get(t)||Jt(t,r,e),Kt=dt(ut(!1)),Zt=dt(ut(!0)),tt=(e,{s:t,t:r,v:i})=>{if(e.a!==r){let{b:s,c:n}=(t?Zt:Kt)(r,i);e.a=r,e.b=s,e.c=n}for(let{c:s}=e,n=0;n<s.length;n++){let a=i[n],o=s[n];switch(o.u){case H:o.v=H(o.t,Xt(o.c,a),o.v);break;case W:let c=a instanceof C?tt(o.c||(o.c=_()),a):(o.c=null,a);c!==o.v&&(o.v=W(o,c));break;default:a!==o.v&&(o.v=o.u(o.t,a,o.n,o.v))}}return e.b},Xt=(e,t)=>{let r=0,{length:i}=t;for(i<e.length&&e.splice(i);r<i;r++){let s=t[r];s instanceof C?t[r]=tt(e[r]||(e[r]=_()),s):e[r]=null}return t},C=class{constructor(t,r,i){this.s=t,this.t=r,this.v=i}toDOM(t=_()){return tt(t,this)}};var pt=e=>(t,...r)=>new C(e,t,r),S=pt(!1),he=pt(!0),ot=new WeakMap,$=(e,t)=>((r,i)=>{let s=ot.get(r)||M(ot,r,_()),{b:n}=s,a=typeof i=="function"?i():i,o=a instanceof C?a.toDOM(s):a;return n!==o&&r.replaceChildren((s.b=o).valueOf()),r})(e,t),st=new WeakMap,ft=e=>(t,r)=>{let i=st.get(t)||M(st,t,new Map);return i.get(r)||M(i,r,function(s,...n){return new C(e,s,n).toDOM(this)}.bind(_()))},ce=ft(!1),de=ft(!0);function v(e,...t){let r="";return e.forEach((i,s)=>{r+=i+(t[s]||"")}),r}var Yt=["xs","sm","md","lg","xl"],vt={mt:"margin-top",mr:"margin-right",mb:"margin-bottom",ml:"margin-left",m:"margin",mh:"margin-left margin-right",mv:"margin-top margin-bottom",pt:"padding-top",pr:"padding-right",pb:"padding-bottom",pl:"padding-left",p:"padding",ph:"padding-left padding-right",pv:"padding-top padding-bottom",g:"gap",gv:"row-gap",gh:"column-gap",bw:"border-width",bwt:"border-top-width",bwr:"border-right-width",bwb:"border-bottom-width",bwl:"border-left-width",bc:"border-color",br:"border-radius",pos:"position",shadow:"box-shadow",ta:"text-align",c:"color",cur:"cursor"},mt=Object.keys(vt),bt=e=>e.concat(Yt.flatMap(t=>e.map(r=>`${t}-${r}`))),xt={default:void 0,xl:"@media only screen and (max-width: 1280px)",lg:"@media only screen and (max-width: 1024px)",md:"@media only screen and (max-width: 768px)",sm:"@media only screen and (max-width: 640px)"},x=(e,t={})=>{let r="";for(let[i,s]of Object.entries(xt)){i!=="default"&&(r+=`${s} {`);for(let[n,a]of Object.entries(e)){let o=t[n]?` ${t[n]} `:" ";for(let[c,u]of Object.entries(a)){let h=vt[n],d=u.startsWith("--")?`var(${u})`:u,l=i==="default"?n:`${i}-${n}`,g=i==="default"?`h-${n}`:`${i}-h-${n}`;if(h){let m=h.split(" ").map(w=>`${w}: ${d};`).join(" ");r+=`
            :host([${l}="${c}"])${o}{
              ${m}
            }
            :host([${g}="${c}"]:hover)${o}{
              ${m}
            }
          `}else r+=`
            :host([${l}="${c}"])${o}{
              ${u}
            }
            :host([${g}="${c}"]:hover)${o}{
              ${u}
            }
          `}}i!=="default"&&(r+="}")}return r};function te(e){if(e===null||e.includes("/"))return!1;let t=String(e);return/[0-9]$/.test(t)}var ee=e=>/%$/.test(e),b=e=>{if(e!==void 0)return ee(e)?e:te(e)?`${e}px`:Object.keys(p).includes(e)?`var(${p[e]})`:e},p={xs:"--spacing-xs",s:"--spacing-s",m:"--spacing-m",l:"--spacing-l",xl:"--spacing-xl"};function V(e){let t="";for(let[r,i]of Object.entries(xt)){r!=="default"&&(t+=`${i} {
`);let s="";for(let[n,a]of Object.entries(e[r]))a!=null&&(s+=`${n}: ${a};
`);t+=`:host {
    ${s.trim()}
    }
`,r!=="default"&&(t+=`}
`)}return t}var R=v`
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
`;var re={mt:p,mr:p,mb:p,ml:p,m:p,mh:p,mv:p,s:{sm:`
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
    `}},oe={mt:"button",mr:"button",mb:"button",ml:"button",m:"button",mh:"button",mv:"button",s:"button",v:"button"},wt=x(re,oe);var yt=({render:e,html:t})=>{let r=new CSSStyleSheet;return r.replaceSync(v`
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


    /* :host([t="ps"]) button,
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
    } */
    ${wt}
    ${R}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[r],e(this.shadow,this.render)}static get observedAttributes(){return["key","href","target","w","t"]}_buttonRef={};_assingRef=s=>{this._buttonRef.current=s;let n=b(this.getAttribute("w"));n==="f"?this._buttonRef.current.style.width="100%":n!=null&&(this._buttonRef.current.style.width=n)};attributeChangedCallback(s,n,a){if(!this._buttonRef.current)return;let o=b(this.getAttribute("w"));o==="f"?this._buttonRef.current.style.width="100%":o!=null&&(this._buttonRef.current.style.width=o,this._buttonRef.current.style.minWidth=o,this._buttonRef.current.style.maxWidth=o),e(this.shadow,this.render)}render=()=>this.getAttribute("href")?t`
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
      `}};var St=v`

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
`;var se={cur:{p:"pointer",m:"move",grab:"grab",grabbing:"grabbing"}},k=x(se);var $t=v`
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

`;var I={xs:"--border-width-xs",s:"--border-width-s",m:"--border-width-m",l:"--border-width-l",xl:"--border-width-xl"},ne={bgc:{pr:`
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
        `},shadow:{s:"--shadow-s",m:"--shadow-m",l:"--shadow-l"},pt:p,pr:p,pb:p,pl:p,p,ph:p,pv:p,g:p,gv:p,gh:p,bw:I,bwt:I,bwr:I,bwb:I,bwl:I,bc:{p:"--color-primary",pc:"--color-primary-container",s:"--color-secondary",sc:"--color-secondary-container",e:"--color-error",ec:"--color-error-container",su:"--color-surface",sucl:"--color-surface-container-low",suc:"--color-surface-container",such:"--color-surface-container-high",isu:"--color-inverse-surface",o:"--color-outline",ov:"--color-outline-variant"},br:{xs:"--border-radius-xs",s:"--border-radius-s",m:"--border-radius-m",l:"--border-radius-l",xl:"--border-radius-xl",f:"--border-radius-f"}},P=x(ne);var ie={mt:p,mr:p,mb:p,ml:p,m:p,mh:p,mv:p},E=x(ie);var kt=({render:e,html:t})=>{let r=new CSSStyleSheet;return r.replaceSync(v`
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

    ${R}
    ${$t}
  ${St}
  ${E}
  ${k}
  ${P}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[r],e(this.shadow,this.render)}static get observedAttributes(){return bt([...mt,"wh","w","h","hidden","sh","sv"])}_styles={default:{},sm:{},md:{},lg:{},xl:{}};attributeChangedCallback(s,n,a){["default","sm","md","lg","xl"].forEach(o=>{let c=f=>`${o==="default"?"":`${o}-`}${f}`,u=this.getAttribute(c("wh")),h=b(u===null?this.getAttribute(c("w")):u),d=b(u===null?this.getAttribute(c("h")):u),l=this.getAttribute(c("o")),g=this.getAttribute(c("z"));g!==null&&(this._styles[o]["z-index"]=g),l!==null&&(this._styles[o].opacity=l),h==="f"?this._styles[o].width="100%":h!==void 0&&(this._styles[o].width=h,this._styles[o]["min-width"]=h,this._styles[o]["max-width"]=h),d==="f"?this._styles[o].height="100%":d!==void 0&&(this._styles[o].height=d,this._styles[o]["min-height"]=d,this._styles[o]["max-height"]=d),this.hasAttribute(c("hidden"))&&(this._styles[o].display="none !important"),this.hasAttribute(c("visible"))&&(this._styles[o].display="flex !important")}),e(this.shadow,this.render)}render=()=>t`
        <style>
          ${V(this._styles)}
        </style>
        <slot></slot>
      `}};var ae={ta:{s:"start",c:"center",e:"end",j:"justify"},s:{h1:`
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
    `}},Ct=x(ae);var le={c:{fg:"--foreground","pr-fg":"--primary-foreground","se-fg":"--secondary-foreground","de-fg":"--destructive-foreground","mu-fg":"--muted-foreground","ac-fg":"--accent-foreground"}},D=x(le);var At=({render:e,html:t})=>{let r=new CSSStyleSheet;r.replaceSync(v`
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
    ${Ct}
    ${D}
${E}
${k}
  `);class i extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[r]}static get observedAttributes(){return["key","w","ellipsis"]}connectedCallback(){e(this.shadow,this.render)}attributeChangedCallback(n,a,o){let c=b(this.getAttribute("w"));this.hasAttribute("ellipsis")&&(this.style.overflow="hidden",this.style.textOverflow="ellipsis",this.style.whiteSpace="nowrap"),c==="f"?this.style.width="100%":c!==void 0&&(this.style.width=c),e(this.shadow,this.render)}render=()=>t` <slot></slot> `}return i};var _t=({render:e,html:t})=>{let r=new CSSStyleSheet;return r.replaceSync(v`
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
    ${P}
    ${E}
${k}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[r]}_styles={default:{},sm:{},md:{},lg:{},xl:{}};static get observedAttributes(){return["key","src","wh","w","h","hidden","height","width","s-wh","s-w","s-h"]}connectedCallback(){e(this.shadow,this.render)}attributeChangedCallback(s,n,a){["default","sm","md","lg","xl"].forEach(o=>{let c=f=>`${o==="default"?"":`${o}-`}${f}`,u=this.getAttribute(c("wh")),h=b(u===null?this.getAttribute(c("w")):u),d=b(u===null?this.getAttribute(c("h")):u),l=this.getAttribute(c("o")),g=this.getAttribute(c("z"));g!==null&&(this._styles[o].zIndex=g),l!==null&&(this._styles[o].opacity=l),h==="f"?this._styles[o].width="100%":h!==void 0&&(this._styles[o].width=h,this._styles[o]["min-width"]=h,this._styles[o]["max-width"]=h),d==="f"?this._styles[o].height="100%":d!==void 0&&(this._styles[o].height=d,this._styles[o]["min-height"]=d,this._styles[o]["max-height"]=d)}),e(this.shadow,this.render)}render=()=>t`
        <style>
          ${V(this._styles)}
        </style>
        <img
          src="${this.getAttribute("src")}"
          width="${this.getAttribute("width")}"
          height="${this.getAttribute("height")}"
        />
      `}};var Rt=v`
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
`;var Et=({render:e,html:t})=>{let r=new CSSStyleSheet;return r.replaceSync(v`
    :host {
      color: var(--foreground);
    }
    ${D}
    ${Rt}
${R}
${k}
  `),class U extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[r]}static _icons={};static get observedAttributes(){return["key","svg","w","h","wh"]}static get icons(){return U._icons}static addIcon(s,n){U._icons[s]=n}connectedCallback(){this.render()}attributeChangedCallback(s,n,a){let o=this.getAttribute("wh"),c=b(o===null?this.getAttribute("w"):o),u=b(o===null?this.getAttribute("h"):o);c&&(this.style.width=c),u&&(this.style.height=u),this.render()}render=()=>{try{let s=this.getAttribute("svg"),n=U._icons[s]||(window.rtglIcons||{})[s];if(n){this.shadow.innerHTML=n;return}}catch(s){console.log("error in rtgl-svg render",s)}this.shadow.innerHTML=""}}};var Ot=({render:e,html:t})=>{let r=new CSSStyleSheet;return r.replaceSync(v`
    :host {
      display: contents;
    }
  `),class extends HTMLElement{items=[];getItems=()=>{let s=this.getAttribute("items");return s?JSON.parse(decodeURIComponent(s)):this.items};constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[r],e(this.shadow,this.render)}connectedCallback(){e(this.shadow,this.render)}static get observedAttributes(){return["items"]}render=()=>t`
        <rtgl-view h="f" w="272" bwr="xs">
          <rtgl-view p="l">
            <rtgl-text s="h4" c="primary">Rettangoli test suite</rtgl-text>
          </rtgl-view>
          <rtgl-view w="f" p="l" g="xs">
            ${this.getItems().map(s=>t`
                <a
                  style="display: contents; text-decoration: none; color: inherit;"
                  href=${s.slug}
                >
                  <rtgl-view
                    h="36"
                    av="c"
                    ph="m"
                    w="f"
                    h-bgc="mu"
                    br="l"
                    bgc="${s.active?"mu":"bg"}"
                    cur="p"
                  >
                    <rtgl-text s="sm">${s.title}</rtgl-text>
                  </rtgl-view>
                </a>
              `)}
          </rtgl-view>
        </rtgl-view>
      `}};var jt=({render:e,html:t})=>{let r=new CSSStyleSheet;return r.replaceSync(v`
    :host {
      display: contents;
    }
  `),class extends HTMLElement{items=[];_contentContainer;_selectedSlug;getItems=()=>{let s=this.getAttribute("items");return s?JSON.parse(decodeURIComponent(s)):this.items};constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[r],e(this.shadow,this.render)}connectedCallback(){e(this.shadow,this.render)}disconnectedCallback(){this._contentContainer.removeEventListener("scroll",this.checkCurrentHeading),window.removeEventListener("scroll",this.checkCurrentHeading)}static get observedAttributes(){return["items"]}checkCurrentHeading=()=>{let s=this._contentContainer.querySelectorAll("rtgl-text[id]"),n=Array.from(s),a=null,o=null,c=-1/0;n.forEach(u=>{let h=u.getBoundingClientRect();h.top<=100&&h.top>c&&(c=h.top,o=u.id)}),o&&o!==a&&(console.log("checkCurrentHeading 2222222",o),a=o,this._selectedSlug=o,e(this.shadow,this.render))};startListening=s=>{this._contentContainer=s;let n=this._contentContainer.querySelectorAll("rtgl-text[id]"),a=Array.from(n);this.items=a.map(o=>({slug:o.id,title:o.textContent})),s&&s.addEventListener("scroll",this.checkCurrentHeading,{passive:!0}),window.addEventListener("scroll",this.checkCurrentHeading,{passive:!0}),this.checkCurrentHeading()};render=()=>t`
        <rtgl-view h="f" w="272">
          <rtgl-view w="f" g="s" mt="xl">
            ${this.getItems().map(s=>{console.log({selectedSlug:this._selectedSlug,itemSlug:s.slug});let n=`${this._selectedSlug}`===s.slug?"fg":"mu-fg",a=`#${s.slug}`;return t`
                <a
                  style="display: contents; text-decoration: none; color: inherit;"
                  href=${a}
                >
                  <rtgl-text s="sm" c=${n}>${s.title}</rtgl-text>
                </a>
              `})}
          </rtgl-view>
        </rtgl-view>
      `}};customElements.define("rtgl-button",yt({render:$,html:S}));customElements.define("rtgl-view",kt({render:$,html:S}));customElements.define("rtgl-text",At({render:$,html:S}));customElements.define("rtgl-image",_t({render:$,html:S}));customElements.define("rtgl-svg",Et({render:$,html:S}));customElements.define("rtgl-sidebar",Ot({render:$,html:S}));customElements.define("rtgl-page-outline",jt({render:$,html:S}));})();
/*! (c) Andrea Giammarchi - MIT */
