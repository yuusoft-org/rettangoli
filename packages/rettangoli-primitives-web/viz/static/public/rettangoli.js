var rettangoli=(()=>{var{isArray:nt}=Array,{getPrototypeOf:Rt,getOwnPropertyDescriptor:Wt}=Object,y=[],it=()=>document.createRange(),M=(e,t,o)=>(e.set(t,o),o),Ot=(e,t)=>t.reduceRight(Mt,e),Mt=(e,t)=>e.childNodes[t],{setPrototypeOf:Et}=Object,k,at=(e,t,o)=>(k||(k=it()),o?k.setStartAfter(e):k.setStartBefore(e),k.setEndAfter(t),k.deleteContents(),e),J=({firstChild:e,lastChild:t},o)=>at(e,t,o),lt=!1,Q=(e,t)=>lt&&e.nodeType===11?1/t<0?t?J(e,!0):e.lastChild:t?e.valueOf():e.firstChild:e,et=e=>document.createComment(e),X=class extends(t=>{function o(n){return Et(n,new.target.prototype)}return o.prototype=t.prototype,o})(DocumentFragment){#e=et("<>");#o=et("</>");#t=y;constructor(t){super(t),this.replaceChildren(this.#e,...t.childNodes,this.#o),lt=!0}get firstChild(){return this.#e}get lastChild(){return this.#o}get parentNode(){return this.#e.parentNode}remove(){J(this,!1)}replaceWith(t){J(this,!0).replaceWith(t)}valueOf(){let{parentNode:t}=this;if(t===this)this.#t===y&&(this.#t=[...this.childNodes]);else{if(t){let{firstChild:o,lastChild:n}=this;for(this.#t=[o];o!==n;)this.#t.push(o=o.nextSibling)}this.replaceChildren(...this.#t)}return this}},ht=(e,t,o)=>e.setAttribute(t,o),L=(e,t)=>e.removeAttribute(t),T,Nt=(e,t,o)=>{o=o.slice(1),T||(T=new WeakMap);let n=T.get(e)||M(T,e,{}),s=n[o];return s&&s[0]&&e.removeEventListener(o,...s),s=nt(t)?t:[t,!1],n[o]=s,s[0]&&e.addEventListener(o,...s),t},E=(e,t)=>{let{t:o,n}=e,s=!1;switch(typeof t){case"object":if(t!==null){(n||o).replaceWith(e.n=t.valueOf());break}case"undefined":s=!0;default:o.data=s?"":t,n&&(e.n=null,n.replaceWith(o))}return t},H=(e,t,o)=>e[o]=t,Tt=(e,t,o)=>H(e,t,o.slice(1)),Y=(e,t,o)=>t==null?(L(e,o),t):H(e,t,o),ct=(e,t)=>(typeof t=="function"?t(e):t.current=e,t),G=(e,t,o)=>(t==null?L(e,o):ht(e,o,t),t),Bt=(e,t,o)=>(e.toggleAttribute(o.slice(1),t),t),V=(e,t,o)=>{let{length:n}=t;if(e.data=`[${n}]`,n)return((s,i,l,r,g)=>{let p=l.length,d=i.length,h=p,a=0,c=0,f=null;for(;a<d||c<h;)if(d===a){let v=h<p?c?r(l[c-1],-0).nextSibling:r(l[h],0):g;for(;c<h;)s.insertBefore(r(l[c++],1),v)}else if(h===c)for(;a<d;)f&&f.has(i[a])||s.removeChild(r(i[a],-1)),a++;else if(i[a]===l[c])a++,c++;else if(i[d-1]===l[h-1])d--,h--;else if(i[a]===l[h-1]&&l[c]===i[d-1]){let v=r(i[--d],-0).nextSibling;s.insertBefore(r(l[c++],1),r(i[a++],-0).nextSibling),s.insertBefore(r(l[--h],1),v),i[d]=l[h]}else{if(!f){f=new Map;let v=c;for(;v<h;)f.set(l[v],v++)}if(f.has(i[a])){let v=f.get(i[a]);if(c<v&&v<h){let w=a,R=1;for(;++w<d&&w<h&&f.get(i[w])===v+R;)R++;if(R>v-c){let F=r(i[a],0);for(;c<v;)s.insertBefore(r(l[c++],1),F)}else s.replaceChild(r(l[c++],1),r(i[a++],-1))}else a++}else s.removeChild(r(i[a++],-1))}return l})(e.parentNode,o,t,Q,e);switch(o.length){case 1:o[0].remove();case 0:break;default:at(Q(o[0],0),Q(o.at(-1),-0),!1)}return y},Vt=new Map([["aria",(e,t)=>{for(let o in t){let n=t[o],s=o==="role"?o:`aria-${o}`;n==null?L(e,s):ht(e,s,n)}return t}],["class",(e,t)=>Y(e,t,t==null?"class":"className")],["data",(e,t)=>{let{dataset:o}=e;for(let n in t)t[n]==null?delete o[n]:o[n]=t[n];return t}],["ref",ct],["style",(e,t)=>t==null?Y(e,t,"style"):H(e.style,t,"cssText")]]),Lt=(e,t,o)=>{switch(t[0]){case".":return Tt;case"?":return Bt;case"@":return Nt;default:return o||"ownerSVGElement"in e?t==="ref"?ct:G:Vt.get(t)||(t in e?t.startsWith("on")?H:((n,s)=>{let i;do i=Wt(n,s);while(!i&&(n=Rt(n)));return i})(e,t)?.set?Y:G:G)}},Ht=(e,t)=>(e.textContent=t??"",t),O=(e,t,o)=>({a:e,b:t,c:o}),C=()=>O(null,null,y),dt=e=>(t,o)=>{let{a:n,b:s,c:i}=e(t,o),l=document.importNode(n,!0),r=y;if(s!==y){r=[];for(let a,c,f=0;f<s.length;f++){let{a:v,b:w,c:R}=s[f],F=v===c?a:a=Ot(l,c=v);r[f]=(g=w,p=F,d=R,h=w===V?[]:w===E?C():null,{v:y,u:g,t:p,n:d,c:h})}}var g,p,d,h;return((a,c)=>({b:a,c}))(i?l.firstChild:new X(l),r)},Dt=/^(?:plaintext|script|style|textarea|title|xmp)$/i,It=/^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i,Pt=/<([a-zA-Z0-9]+[a-zA-Z0-9:._-]*)([^>]*?)(\/?)>/g,Ut=/([^\s\\>"'=]+)\s*=\s*(['"]?)\x01/g,Ft=/[\x01\x02]/g,K,Z,B=document.createElement("template"),Qt=(e,t)=>{if(t)return K||(K=document.createElementNS("http://www.w3.org/2000/svg","svg"),Z=it(),Z.selectNodeContents(K)),Z.createContextualFragment(e);B.innerHTML=e;let{content:o}=B;return B=B.cloneNode(!1),o},q=e=>{let t=[],o;for(;o=e.parentNode;)t.push(t.indexOf.call(o.childNodes,e)),e=o;return t},ot=()=>document.createTextNode(""),Gt=(e,t,o)=>{let n=Qt(((g,p,d)=>{let h=0;return g.join("").trim().replace(Pt,(a,c,f,v)=>`<${c}${f.replace(Ut,"=$2$1").trimEnd()}${v?d||It.test(c)?" /":`></${c}`:""}>`).replace(Ft,a=>a===""?`<!--${p+h++}-->`:p+h++)})(e,W,o),o),{length:s}=e,i=y;if(s>1){let g=[],p=document.createTreeWalker(n,129),d=0,h=`${W}${d++}`;for(i=[];d<s;){let a=p.nextNode();if(a.nodeType===8){if(a.data===h){let c=nt(t[d-1])?V:E;c===E&&g.push(a),i.push(O(q(a),c,null)),h=`${W}${d++}`}}else{let c;for(;a.hasAttribute(h);){c||(c=q(a));let f=a.getAttribute(h);i.push(O(c,Lt(a,f,o),f)),L(a,h),h=`${W}${d++}`}!o&&Dt.test(a.localName)&&a.textContent.trim()===`<!--${h}-->`&&(i.push(O(c||q(a),Ht,null)),h=`${W}${d++}`)}}for(d=0;d<g.length;d++)g[d].replaceWith(ot())}let{childNodes:l}=n,{length:r}=l;return r<1?(r=1,n.appendChild(ot())):r===1&&s!==1&&l[0].nodeType!==1&&(r=0),M(gt,e,O(n,i,r===1))},gt=new WeakMap,W="is\xB5",pt=e=>(t,o)=>gt.get(t)||Gt(t,o,e),Kt=dt(pt(!1)),Zt=dt(pt(!0)),tt=(e,{s:t,t:o,v:n})=>{if(e.a!==o){let{b:s,c:i}=(t?Zt:Kt)(o,n);e.a=o,e.b=s,e.c=i}for(let{c:s}=e,i=0;i<s.length;i++){let l=n[i],r=s[i];switch(r.u){case V:r.v=V(r.t,qt(r.c,l),r.v);break;case E:let g=l instanceof $?tt(r.c||(r.c=C()),l):(r.c=null,l);g!==r.v&&(r.v=E(r,g));break;default:l!==r.v&&(r.v=r.u(r.t,l,r.n,r.v))}}return e.b},qt=(e,t)=>{let o=0,{length:n}=t;for(n<e.length&&e.splice(n);o<n;o++){let s=t[o];s instanceof $?t[o]=tt(e[o]||(e[o]=C()),s):e[o]=null}return t},$=class{constructor(t,o,n){this.s=t,this.t=o,this.v=n}toDOM(t=C()){return tt(t,this)}};var ut=e=>(t,...o)=>new $(e,t,o),A=ut(!1),ae=ut(!0),rt=new WeakMap,_=(e,t)=>((o,n)=>{let s=rt.get(o)||M(rt,o,C()),{b:i}=s,l=typeof n=="function"?n():n,r=l instanceof $?l.toDOM(s):l;return i!==r&&o.replaceChildren((s.b=r).valueOf()),o})(e,t),st=new WeakMap,ft=e=>(t,o)=>{let n=st.get(t)||M(st,t,new Map);return n.get(o)||M(n,o,function(s,...i){return new $(e,s,i).toDOM(this)}.bind(C()))},le=ft(!1),he=ft(!0);function b(e,...t){let o="";return e.forEach((n,s)=>{o+=n+(t[s]||"")}),o}var Jt=["xs","sm","md","lg","xl"],vt={mt:"margin-top",mr:"margin-right",mb:"margin-bottom",ml:"margin-left",m:"margin",mh:"margin-left margin-right",mv:"margin-top margin-bottom",pt:"padding-top",pr:"padding-right",pb:"padding-bottom",pl:"padding-left",p:"padding",ph:"padding-left padding-right",pv:"padding-top padding-bottom",g:"gap",gv:"row-gap",gh:"column-gap",bw:"border-width",bwt:"border-top-width",bwr:"border-right-width",bwb:"border-bottom-width",bwl:"border-left-width",bc:"border-color",br:"border-radius",pos:"position",shadow:"box-shadow",ta:"text-align",c:"color",cur:"cursor"},bt=Object.keys(vt),mt=e=>e.concat(Jt.flatMap(t=>e.map(o=>`${t}-${o}`))),xt={default:void 0,xl:"@media only screen and (max-width: 1280px)",lg:"@media only screen and (max-width: 1024px)",md:"@media only screen and (max-width: 768px)",sm:"@media only screen and (max-width: 640px)"},x=(e,t={})=>{let o="";for(let[n,s]of Object.entries(xt)){n!=="default"&&(o+=`${s} {`);for(let[i,l]of Object.entries(e)){let r=t[i]?` ${t[i]} `:" ";for(let[g,p]of Object.entries(l)){let d=vt[i],h=p.startsWith("--")?`var(${p})`:p,a=n==="default"?i:`${n}-${i}`,c=n==="default"?`h-${i}`:`${n}-h-${i}`;if(d){let v=d.split(" ").map(w=>`${w}: ${h};`).join(" ");o+=`
            :host([${a}="${g}"])${r}{
              ${v}
            }
            :host([${c}="${g}"]:hover)${r}{
              ${v}
            }
          `}else o+=`
            :host([${a}="${g}"])${r}{
              ${p}
            }
            :host([${c}="${g}"]:hover)${r}{
              ${p}
            }
          `}}n!=="default"&&(o+="}")}return o};function Xt(e){if(e===null||e.includes("/"))return!1;let t=String(e);return/[0-9]$/.test(t)}var Yt=e=>/%$/.test(e),m=e=>{if(e!==void 0)return Yt(e)?e:Xt(e)?`${e}px`:Object.keys(u).includes(e)?`var(${u[e]})`:e},u={xs:"--spacing-xs",s:"--spacing-s",m:"--spacing-m",l:"--spacing-l",xl:"--spacing-xl"};function D(e){let t="";for(let[o,n]of Object.entries(xt)){o!=="default"&&(t+=`${n} {
`);let s="";for(let[i,l]of Object.entries(e[o]))l!=null&&(s+=`${i}: ${l};
`);t+=`:host {
    ${s.trim()}
    }
`,o!=="default"&&(t+=`}
`)}return t}var j=b`
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
`;var te={mt:u,mr:u,mb:u,ml:u,m:u,mh:u,mv:u,s:{sm:`
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
    `}},ee={mt:"button",mr:"button",mb:"button",ml:"button",m:"button",mh:"button",mv:"button",s:"button",v:"button"},wt=x(te,ee);var yt=({render:e,html:t})=>{let o=new CSSStyleSheet;return o.replaceSync(b`
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
    ${j}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[o],e(this.shadow,this.render)}static get observedAttributes(){return["key","href","target","w","t"]}_buttonRef={};_assingRef=s=>{this._buttonRef.current=s;let i=m(this.getAttribute("w"));i==="f"?this._buttonRef.current.style.width="100%":i!=null&&(this._buttonRef.current.style.width=i)};attributeChangedCallback(s,i,l){if(!this._buttonRef.current)return;let r=m(this.getAttribute("w"));r==="f"?this._buttonRef.current.style.width="100%":r!=null&&(this._buttonRef.current.style.width=r,this._buttonRef.current.style.minWidth=r,this._buttonRef.current.style.maxWidth=r),e(this.shadow,this.render)}render=()=>this.getAttribute("href")?t`
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
      `}};var St=b`

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
`;var oe={cur:{p:"pointer",m:"move",grab:"grab",grabbing:"grabbing"}},S=x(oe);var $t=b`
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

`;var N={xs:"--border-width-xs",s:"--border-width-s",m:"--border-width-m",l:"--border-width-l",xl:"--border-width-xl"},re={bgc:{pr:`
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
        `},shadow:{s:"--shadow-s",m:"--shadow-m",l:"--shadow-l"},pt:u,pr:u,pb:u,pl:u,p:u,ph:u,pv:u,g:u,gv:u,gh:u,bw:N,bwt:N,bwr:N,bwb:N,bwl:N,bc:{p:"--color-primary",pc:"--color-primary-container",s:"--color-secondary",sc:"--color-secondary-container",e:"--color-error",ec:"--color-error-container",su:"--color-surface",sucl:"--color-surface-container-low",suc:"--color-surface-container",such:"--color-surface-container-high",isu:"--color-inverse-surface",o:"--color-outline",ov:"--color-outline-variant"},br:{xs:"--border-radius-xs",s:"--border-radius-s",m:"--border-radius-m",l:"--border-radius-l",xl:"--border-radius-xl",f:"--border-radius-f"}},I=x(re);var se={mt:u,mr:u,mb:u,ml:u,m:u,mh:u,mv:u},z=x(se);var kt=({render:e,html:t})=>{let o=new CSSStyleSheet;return o.replaceSync(b`
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

    ${j}
    ${$t}
  ${St}
  ${z}
  ${S}
  ${I}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[o],e(this.shadow,this.render)}static get observedAttributes(){return mt([...bt,"wh","w","h","hidden","sh","sv"])}_styles={default:{},sm:{},md:{},lg:{},xl:{}};attributeChangedCallback(s,i,l){["default","sm","md","lg","xl"].forEach(r=>{let g=f=>`${r==="default"?"":`${r}-`}${f}`,p=this.getAttribute(g("wh")),d=m(p===null?this.getAttribute(g("w")):p),h=m(p===null?this.getAttribute(g("h")):p),a=this.getAttribute(g("o")),c=this.getAttribute(g("z"));c!==null&&(this._styles[r]["z-index"]=c),a!==null&&(this._styles[r].opacity=a),d==="f"?this._styles[r].width="100%":d!==void 0&&(this._styles[r].width=d,this._styles[r]["min-width"]=d,this._styles[r]["max-width"]=d),h==="f"?this._styles[r].height="100%":h!==void 0&&(this._styles[r].height=h,this._styles[r]["min-height"]=h,this._styles[r]["max-height"]=h),this.hasAttribute(g("hidden"))&&(this._styles[r].display="none !important"),this.hasAttribute(g("visible"))&&(this._styles[r].display="flex !important")}),e(this.shadow,this.render)}render=()=>t`
        <style>
          ${D(this._styles)}
        </style>
        <slot></slot>
      `}};var ne={ta:{s:"start",c:"center",e:"end",j:"justify"},s:{h1:`
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
    `}},Ct=x(ne);var ie={c:{fg:"--foreground","pr-fg":"--primary-foreground","se-fg":"--secondary-foreground","de-fg":"--destructive-foreground","mu-fg":"--muted-foreground","ac-fg":"--accent-foreground"}},P=x(ie);var At=({render:e,html:t})=>{let o=new CSSStyleSheet;o.replaceSync(b`
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
    ${P}
${z}
${S}
  `);class n extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[o]}static get observedAttributes(){return["key","w","ellipsis"]}connectedCallback(){e(this.shadow,this.render)}attributeChangedCallback(i,l,r){let g=m(this.getAttribute("w"));this.hasAttribute("ellipsis")&&(this.style.overflow="hidden",this.style.textOverflow="ellipsis",this.style.whiteSpace="nowrap"),g==="f"?this.style.width="100%":g!==void 0&&(this.style.width=g),e(this.shadow,this.render)}render=()=>t` <slot></slot> `}return n};var _t=({render:e,html:t})=>{let o=new CSSStyleSheet;return o.replaceSync(b`
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
    ${z}
${S}
  `),class extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[o]}_styles={default:{},sm:{},md:{},lg:{},xl:{}};static get observedAttributes(){return["key","src","wh","w","h","hidden","height","width","s-wh","s-w","s-h"]}connectedCallback(){e(this.shadow,this.render)}attributeChangedCallback(s,i,l){["default","sm","md","lg","xl"].forEach(r=>{let g=f=>`${r==="default"?"":`${r}-`}${f}`,p=this.getAttribute(g("wh")),d=m(p===null?this.getAttribute(g("w")):p),h=m(p===null?this.getAttribute(g("h")):p),a=this.getAttribute(g("o")),c=this.getAttribute(g("z"));c!==null&&(this._styles[r].zIndex=c),a!==null&&(this._styles[r].opacity=a),d==="f"?this._styles[r].width="100%":d!==void 0&&(this._styles[r].width=d,this._styles[r]["min-width"]=d,this._styles[r]["max-width"]=d),h==="f"?this._styles[r].height="100%":h!==void 0&&(this._styles[r].height=h,this._styles[r]["min-height"]=h,this._styles[r]["max-height"]=h)}),e(this.shadow,this.render)}render=()=>t`
        <style>
          ${D(this._styles)}
        </style>
        <img
          src="${this.getAttribute("src")}"
          width="${this.getAttribute("width")}"
          height="${this.getAttribute("height")}"
        />
      `}};var jt=b`
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
`;var zt=({render:e,html:t})=>{let o=new CSSStyleSheet;return o.replaceSync(b`
    :host {
      color: var(--foreground);
    }
    ${P}
    ${jt}
${j}
${S}
  `),class U extends HTMLElement{constructor(){super(),this.shadow=this.attachShadow({mode:"closed"}),this.shadow.adoptedStyleSheets=[o]}static _icons={};static get observedAttributes(){return["key","svg","w","h","wh"]}static get icons(){return U._icons}static addIcon(s,i){U._icons[s]=i}connectedCallback(){this.render()}attributeChangedCallback(s,i,l){let r=this.getAttribute("wh"),g=m(r===null?this.getAttribute("w"):r),p=m(r===null?this.getAttribute("h"):r);g&&(this.style.width=g),p&&(this.style.height=p),this.render()}render=()=>{try{let s=this.getAttribute("svg"),i=U._icons[s]||(window.rtglIcons||{})[s];if(i){this.shadow.innerHTML=i;return}}catch(s){console.log("error in rtgl-svg render",s)}this.shadow.innerHTML=""}}};customElements.define("rtgl-button",yt({render:_,html:A}));customElements.define("rtgl-view",kt({render:_,html:A}));customElements.define("rtgl-text",At({render:_,html:A}));customElements.define("rtgl-image",_t({render:_,html:A}));customElements.define("rtgl-svg",zt({render:_,html:A}));})();
/*! (c) Andrea Giammarchi - MIT */
