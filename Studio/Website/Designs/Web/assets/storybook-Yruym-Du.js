import{a as e,i as t,n,r,t as i}from"./chapters-CPBN6cwz.js";var a=e=>{let t=``;for(let n of e)n&&(t+=String.fromCharCode(n));return t};function o(e){let t=new DataView(e);if(a(new Uint8Array(e,0,4))!==`SBK1`)throw Error(`storybook: pieces.bin has the wrong format`);let n=t.getUint32(4,!0),r=t.getUint32(8,!0),i=12,o={};for(let n=0;n<r;n++)o[a(new Uint8Array(e,i,12))]=[t.getFloat32(i+12,!0),t.getFloat32(i+16,!0)],i+=20;let s={};for(let r=0;r<n;r++){let n=a(new Uint8Array(e,i,16));i+=16;let r=e=>t.getFloat32(i+e*4,!0),o=r(0),c=r(1),l=r(2),u=r(3),d=[r(4),r(5)],f=[r(6),r(7)],p=r(8);i+=36;let m=t.getUint16(i,!0),h=t.getUint16(i+2,!0),g=t.getUint16(i+4,!0);i+=8;let _=[];for(let e=0;e<h;e++)_.push(t.getUint16(i+e*2,!0));i+=h*2,i%4&&(i+=4-i%4);let v=new Int16Array(e.slice(i,i+m*4));i+=m*4;let y=new Uint16Array(e.slice(i,i+g*6));i+=g*6,i%4&&(i+=4-i%4);let b=1e9,x=-1e9,S=1e9,C=-1e9;for(let e=0;e<m;e++){let t=v[e*2]/8192,n=v[e*2+1]/8192;t<b&&(b=t),t>x&&(x=t),n<S&&(S=n),n>C&&(C=n)}s[n]={name:n,u0:o,v0:c,ku:l,kv:u,back:d,edge:f,crease:p,xy:v,loops:_,tris:y,minX:b,maxX:x,minY:S,maxY:C}}return{pieces:s,swatches:o}}var s={W:1,H:1.36,T:.19,Y0:.095,board:.02,over:.024,hinge:.04,dip:.024},c=function(e){return e[e.Front=0]=`Front`,e[e.Back=1]=`Back`,e[e.Edge=2]=`Edge`,e[e.Page=3]=`Page`,e[e.Block=4]=`Block`,e[e.Cover=5]=`Cover`,e[e.Cloth=6]=`Cloth`,e[e.Spine=7]=`Spine`,e[e.Ribbon=8]=`Ribbon`,e[e.Wire=9]=`Wire`,e[e.Leaf=10]=`Leaf`,e[e.TurnFront=11]=`TurnFront`,e[e.TurnBack=12]=`TurnBack`,e[e.TurnEdge=13]=`TurnEdge`,e[e.Window=14]=`Window`,e[e.DoorFront=15]=`DoorFront`,e[e.DoorBack=16]=`DoorBack`,e[e.ChapterTab=17]=`ChapterTab`,e[e.DoorEdge=18]=`DoorEdge`,e}({}),l={cx:.53,a:.36,c:.18,zs:-.04,zb:.46,layers:3,depth:.03,inset:.026};function u(e,t,n=0){let r=Math.abs(e-l.cx),i=t-l.zs,a=i<0?Math.hypot(r+l.c,i)-(l.a+l.c):r-l.a;return Math.max(a,i-(l.zb-l.zs))+n}var d={out:.11,w:.18,pitch:.2,z0:-.47},f=class{data=[];index=[];count=0;v(e,t,n,r,i,a,o,s,c,l){return this.data.push(e,t,n,r,i,a,o,s,c,l),this.count++}quad(e,t,n,r){this.index.push(e,t,n,e,n,r)}tri(e,t,n){this.index.push(e,t,n)}build(){let e=new ArrayBuffer(this.count*24),t=new Float32Array(e),n=new Int8Array(e),r=new Uint16Array(e),i=new Uint8Array(e),a=this.data;for(let e=0,o=0;e<this.count;e++,o+=10){let s=e*24;t[s/4]=a[o],t[s/4+1]=a[o+1],t[s/4+2]=a[o+2],n[s+12]=Math.round(a[o+3]*127),n[s+13]=Math.round(a[o+4]*127),n[s+14]=Math.round(a[o+5]*127),r[(s+16)/2]=Math.round(Math.max(0,Math.min(1,a[o+6]))*65535),r[(s+18)/2]=Math.round(Math.max(0,Math.min(1,a[o+7]))*65535),i[s+20]=a[o+8],i[s+21]=a[o+9]}return{vertices:new Uint8Array(e),indices:new Uint32Array(this.index),stride:24}}},p=.0052;function m(e,t,n,r=!1){let{xy:i,tris:a,loops:o}=t,s=i.length/2,c=r?-1:1,l=e=>c*i[e*2]/8192,u=e=>i[e*2+1]/8192,d=e=>t.u0+i[e*2]/8192*t.ku,f=e=>t.v0-i[e*2+1]/8192*t.kv,m=e.count;for(let t=0;t<s;t++)e.v(l(t),u(t),p/2,0,0,1,d(t),f(t),n,0);let h=e.count;for(let r=0;r<s;r++)e.v(l(r),u(r),-.0052/2,0,0,-1,t.back[0],t.back[1],n,1);for(let t=0;t<a.length;t+=3)e.tri(m+a[t],m+a[t+1],m+a[t+2]),e.tri(h+a[t],h+a[t+2],h+a[t+1]);let g=0;for(let i of o){for(let a=0;a<i;a++){let o=g+a,s=g+(a+1)%i,c=l(s)-l(o),d=u(s)-u(o),f=Math.hypot(c,d)||1,m=d/f*(r?-1:1),h=-c/f*(r?-1:1),_=t.edge,v=e.v(l(o),u(o),p/2,m,h,0,_[0],_[1],n,2),y=e.v(l(s),u(s),p/2,m,h,0,_[0],_[1],n,2),b=e.v(l(s),u(s),-.0052/2,m,h,0,_[0],_[1],n,2),x=e.v(l(o),u(o),-.0052/2,m,h,0,_[0],_[1],n,2);e.quad(v,y,b,x)}g+=i}}function h(e,t,n,r,i=9){let a=p*.45;for(let[o,,s]of[[0,0,1],[0,0,-1],[1,0,0],[-1,0,0]]){let c=s?-t/2:o*t/2,l=s?s*a/2:-.00234/2,u=s?t/2:o*t/2,d=s?s*a/2:a/2,f=e.v(c,0,l,o,0,s,n[0],n[1],r,i),p=e.v(u,0,d,o,0,s,n[0],n[1],r,i),m=e.v(u,1,d,o,0,s,n[0],n[1],r,i),h=e.v(c,1,l,o,0,s,n[0],n[1],r,i);e.quad(f,p,m,h)}}function g(e,t,n,r,i,a){let{W:o,H:c,over:l,hinge:u}=s,d=u,f=o+l,p=-c/2-l,m=c/2+l,h=.016,g=.004,_=.0032,v=[],y=(e,t,n,r)=>{let i=r>.01?8:2;for(let a=0;a<=i;a++){let o=n+Math.PI/2*a/i;v.push({x:e+r*Math.cos(o),z:t+r*Math.sin(o),nx:Math.cos(o),nz:Math.sin(o)})}};y(f-h,m-h,0,h),y(d+g,m-g,Math.PI/2,g),y(d+g,p+g,Math.PI,g),y(f-h,p+h,-Math.PI/2,h);let b=v.length,x=(e,t)=>{let n=(e-d)/(f-d);return[a>0?n:1-n,(t-p)/(m-p)]},S={x:(d+f)/2,z:(p+m)/2},C=[{off:-.0032,y:r,ny:1,ns:0,mat:i===1?5:6},{off:-96e-5,y:r-_*.3,ny:.72,ns:.72,mat:6},{off:0,y:r-_,ny:0,ns:1,mat:6},{off:0,y:n+_,ny:0,ns:1,mat:6},{off:-96e-5,y:n+_*.3,ny:-.72,ns:.72,mat:6},{off:-.0032,y:n,ny:-1,ns:0,mat:i===-1?5:6}],w=[];for(let n of C){w.push(e.count);for(let r=0;r<b;r++){let i=v[r],a=i.x+i.nx*n.off,o=i.z+i.nz*n.off,[s,c]=x(a,o);e.v(a,n.y,o,i.nx*n.ns,n.ny,i.nz*n.ns,s,c,t,n.mat)}}for(let t=0;t<C.length-1;t++)for(let n=0;n<b;n++){let r=(n+1)%b;e.quad(w[t]+n,w[t]+r,w[t+1]+r,w[t+1]+n)}for(let[n,r]of[[0,1],[C.length-1,-1]]){let[i,a]=x(S.x,S.z),o=C[n].mat,s=e.v(S.x,C[n].y,S.z,0,r,0,i,a,t,o),c=e.count;for(let i=0;i<b;i++){let a=v[i],s=a.x-a.nx*_,c=a.z-a.nz*_,[l,u]=x(s,c);e.v(s,C[n].y,c,0,r,0,l,u,t,o)}for(let t=0;t<b;t++){let n=(t+1)%b;e.tri(s,c+t,c+n)}}}var _=e=>s.Y0-s.dip*Math.exp(-e/.03)-.0025*Math.exp(-(1-e)/.02);function v(e,t,n){let{W:r,H:i,Y0:a,board:o,hinge:c}=s,l=e=>n?2*a-e:e,u=n?-1:1,d=-i/2,f=i/2,p=[0];for(let e=1;e<=12;e++)p.push(.14*(e/12)**1.7);for(let e=1;e<=6;e++)p.push(.14+(r-.14-.03)*e/6);for(let e=1;e<=4;e++)p.push(r-.03+.03*e/4);let m=e=>n?.5+(1-e/r)*.5:e/r*.5,h=[];for(let n of p){let r=.002,i=(_(n+r)-_(Math.max(0,n-r)))/(n+r-Math.max(0,n-r)),a=Math.hypot(i,1),o=e.v(n,l(_(n)),d,-i/a,u*1/a,0,m(n),0,t,3),s=e.v(n,l(_(n)),f,-i/a,u*1/a,0,m(n),1,t,3);h.push(o,s)}for(let t=0;t+1<p.length;t++)e.quad(h[t*2],h[t*2+1],h[t*2+3],h[t*2+2]);((n,r,i,a,o,s,c,u,d,f,p,m)=>{let h=e.v(n,l(r),i,c,0,u,d,p,t,4),g=e.v(a,l(o),s,c,0,u,f,m,t,4),_=e.v(a,l(r),s,c,0,u,f,p,t,4),v=e.v(n,l(o),i,c,0,u,d,m,t,4);e.quad(h,_,g,v)})(r,o,f,r,_(r),d,1,0,0,1.36,0,1);for(let[n,r]of[[d,-1],[f,1]])for(let i=0;i+1<p.length;i++){let a=p[i],s=p[i+1],u=e=>e<c?_(0)+(o-_(0))*(e/c):o,d=e.v(a,l(u(a)),n,0,0,r,a,0,t,4),f=e.v(s,l(u(s)),n,0,0,r,s,0,t,4),m=e.v(s,l(_(s)),n,0,0,r,s,1,t,4),h=e.v(a,l(_(a)),n,0,0,r,a,1,t,4);e.quad(d,f,m,h)}}function y(e,t){let{H:n,T:r,over:i}=s;g(e,0,0,s.board,-1,t),g(e,1,r-s.board,r,1,t),v(e,0,!1),v(e,1,!0);let a=e.count;for(let t=0;t<=18;t++){let r=t/18;e.v(r,0,-n/2-i,0,0,0,r,0,2,7),e.v(r,0,n/2+i,0,0,0,r,1,2,7)}for(let t=0;t<18;t++)e.quad(a+t*2,a+t*2+1,a+t*2+3,a+t*2+2);let o=e.count;for(let t=0;t<=36;t++){let n=t/36;e.v(n,0,-.5,0,0,0,n,0,3,8),e.v(n,0,.5,0,0,0,n,1,3,8)}for(let t=0;t<36;t++)e.quad(o+t*2,o+t*2+1,o+t*2+3,o+t*2+2);let{W:c}=s,l=.005,u=n,d=(t,n,r,i,a,o,s,c)=>e.v(t,n,r,i,a,o,s,c,4,10);((t,n,r,i,a,o,s)=>{let c=d(t,a,n,0,o,0,.5,0),l=d(r,a,n,0,o,0,1,0),u=d(r,a,i,0,o,0,1,1),f=d(t,a,i,0,o,0,.5,1);e.quad(c,l,u,f)})(0,0,c,-u,-.005/2,-1,!1);for(let[t,n,r]of[[0,0,-1],[c,c,1]]){let i=d(t,-.005/2,0,r,0,0,.75,.02),a=d(t,-.005/2,-u,r,0,0,.75,.02),o=d(n,l/2,-u,r,0,0,.75,.02),s=d(n,l/2,0,r,0,0,.75,.02);e.quad(i,a,o,s)}let f=d(0,-.005/2,-u,0,0,-1,.75,.02),p=d(c,-.005/2,-u,0,0,-1,.75,.02),m=d(c,l/2,-u,0,0,-1,.75,.02),h=d(0,l/2,-u,0,0,-1,.75,.02);e.quad(f,p,m,h);let _=d(0,l/2,0,0,1,0,0,0),y=d(c,l/2,0,0,1,0,.45,0),b=d(c,l/2,-u,0,1,0,.45,1),x=d(0,l/2,-u,0,1,0,0,1);e.quad(_,y,b,x)}var b=()=>{let{W:e}=s,t=[0];for(let e=1;e<=12;e++)t.push(.14*(e/12)**1.7);for(let n=1;n<=6;n++)t.push(.14+(e-.14-.03)*n/6);for(let n=1;n<=4;n++)t.push(e-.03+.03*n/4);return t},x=e=>{let t=.002,n=(_(e+t)-_(Math.max(0,e-t)))/(e+t-Math.max(0,e-t)),r=Math.hypot(n,1);return[-n/r,1/r]};function S(e,t){let{W:n,H:r,Y0:i}=s,a=b(),o=.0016,c=-.0014,l=-r/2,u=r/2,d=(n,r,o,s)=>{let c=[];for(let d of a){let[a,f]=x(d),p=_(d)-i+n;c.push(e.v(d,p,l,a*r,f*r,0,s(d),0,t,o),e.v(d,p,u,a*r,f*r,0,s(d),1,t,o))}for(let t=0;t+1<a.length;t++)e.quad(c[t*2],c[t*2+1],c[t*2+3],c[t*2+2])};d(o,1,11,e=>e/n*.5),d(c,-1,12,e=>e/n);let f=(n,r,a,s,l,u)=>{let d=_(n)-i,f=_(a)-i,p=e.v(n,d+o,r,l,0,u,0,0,t,13),m=e.v(a,f+o,s,l,0,u,0,0,t,13),h=e.v(a,f+c,s,l,0,u,0,0,t,13),g=e.v(n,d+c,r,l,0,u,0,0,t,13);e.quad(p,m,h,g)};f(n,l,n,u,1,0);for(let e=0;e+1<a.length;e++)f(a[e],l,a[e+1],l,0,-1),f(a[e],u,a[e+1],u,0,1)}function C(e,t){let{W:n,H:r}=s,i=b(),a=-r/2,o=r/2,c=[];for(let r of i){let[i,s]=x(r),l=_(r)+8e-4;c.push(e.v(r,l,a,i,s,0,r/n,0,t,14),e.v(r,l,o,i,s,0,r/n,1,t,14))}for(let t=0;t+1<i.length;t++)e.quad(c[t*2],c[t*2+1],c[t*2+3],c[t*2+2])}function w(e,t,n){let{W:r,H:i}=s,{cx:a,a:o,c,zs:u,zb:d}=l,f=o+c,p=Math.sqrt(f*f-c*c),m=-7e-4,h=[[a+n*o,d]],g=Math.PI,_=Math.PI-Math.atan2(p,c);for(let e=0;e<=24;e++){let t=g+(_-g)*e/24,r=Math.cos(t),i=Math.sin(t);h.push([a-n*c-n*r*f,u-Math.abs(i)*f])}h.push([a+n*m,u-p],[a+n*m,d]);let v=a+n*o,y=.0052,b=(e,t)=>[e/r,(t+i/2)/i],x=(n,r,i)=>{let a=e.count;for(let[a,o]of h){let[s,c]=b(a,o);e.v(a-v,n,o,0,r,0,s,c,t,i)}for(let t=1;t+1<h.length;t++)e.tri(a,a+t,a+t+1)};x(y/2,1,15),x(-.0052/2,-1,16);for(let r=0;r<h.length;r++){let[i,a]=h[r],[o,s]=h[(r+1)%h.length],c=o-i,l=s-a,u=Math.hypot(c,l)||1,d=l/u*n,f=-c/u*n,p=e.v(i-v,y/2,a,d,0,f,0,0,t,18),m=e.v(o-v,y/2,s,d,0,f,0,0,t,18),g=e.v(o-v,-.0052/2,s,d,0,f,0,0,t,18),_=e.v(i-v,-.0052/2,a,d,0,f,0,0,t,18);e.quad(p,m,g,_)}}function T(e,t,n,r){let{out:i,w:a}=d,o=.1,s=.03,c=.0058,l=[[-.1,-a/2]],u=(e,t,n)=>{for(let r=0;r<=8;r++){let i=n+Math.PI/2*(r/8);l.push([e+s*Math.cos(i),t+s*Math.sin(i)])}};u(i-s,-a/2+s,-Math.PI/2),u(i-s,a/2-s,0),l.push([-.1,a/2]);let f=(e,t)=>{let o=Math.max(0,Math.min(1,e/i));return[(n+(r>0?o:1-o))/5,(t+a/2)/a]},p=(n,r)=>{let a=f(i/2-o/2,0),s=e.v(i/2-o/2,n,0,0,r,0,a[0],a[1],t,17),c=e.count;for(let[i,a]of l){let[o,s]=r>0?f(i,a):[0,0];e.v(i,n,a,0,r,0,o,s,t,17)}for(let t=0;t<l.length;t++)e.tri(s,c+t,c+(t+1)%l.length)};p(c/2,1),p(-.0058/2,-1);for(let n=0;n<l.length;n++){let[r,i]=l[n],[a,o]=l[(n+1)%l.length],s=a-r,u=o-i,d=Math.hypot(s,u)||1,f=u/d,p=-s/d,m=e.v(r,c/2,i,f,0,p,0,0,t,17),h=e.v(a,c/2,o,f,0,p,0,0,t,17),g=e.v(a,-.0058/2,o,f,0,p,0,0,t,17),_=e.v(r,-.0058/2,i,f,0,p,0,0,t,17);e.quad(m,h,g,_)}}function E(e,t){for(let t=0;t<3;t++)S(e,5+t);C(e,8),w(e,9,-1),w(e,10,1);for(let n=0;n<5;n++)T(e,11+n,n,t)}var D=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);function O(e,t,n=new Float32Array(16)){let r=n===e||n===t?new Float32Array(16):n;for(let n=0;n<4;n++){let i=t[n*4],a=t[n*4+1],o=t[n*4+2],s=t[n*4+3];r[n*4]=e[0]*i+e[4]*a+e[8]*o+e[12]*s,r[n*4+1]=e[1]*i+e[5]*a+e[9]*o+e[13]*s,r[n*4+2]=e[2]*i+e[6]*a+e[10]*o+e[14]*s,r[n*4+3]=e[3]*i+e[7]*a+e[11]*o+e[15]*s}return r!==n&&n.set(r),n}function k(e,t,n,r){let i=1/Math.tan(e/2),a=new Float32Array(16);return a[0]=i/t,a[5]=i,a[10]=(r+n)/(n-r),a[11]=-1,a[14]=2*r*n/(n-r),a}function A(e,t,n,r,i,a){let o=new Float32Array(16);return o[0]=2/(t-e),o[5]=2/(r-n),o[10]=-2/(a-i),o[12]=-(t+e)/(t-e),o[13]=-(r+n)/(r-n),o[14]=-(a+i)/(a-i),o[15]=1,o}function j(e,t,n){let r=ee([e[0]-t[0],e[1]-t[1],e[2]-t[2]]),i=ee(te([n[0],n[1],n[2]],r)),a=te(r,i),o=new Float32Array(16);return o[0]=i[0],o[1]=a[0],o[2]=r[0],o[4]=i[1],o[5]=a[1],o[6]=r[1],o[8]=i[2],o[9]=a[2],o[10]=r[2],o[12]=-(i[0]*e[0]+i[1]*e[1]+i[2]*e[2]),o[13]=-(a[0]*e[0]+a[1]*e[1]+a[2]*e[2]),o[14]=-(r[0]*e[0]+r[1]*e[1]+r[2]*e[2]),o[15]=1,o}var ee=e=>{let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},te=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]];function ne(e,t,n,r){return[e[0]*t+e[4]*n+e[8]*r+e[12],e[1]*t+e[5]*n+e[9]*r+e[13],e[2]*t+e[6]*n+e[10]*r+e[14],e[3]*t+e[7]*n+e[11]*r+e[15]]}function re(e,t,n,r,i,a,o,s,c,l){let u=Math.cos(i),d=Math.sin(i),f=Math.cos(a),p=Math.sin(a),m=Math.cos(o),h=Math.sin(o),g=u*m+d*p*h,_=-u*h+d*p*m,v=d*f,y=f*h,b=f*m,x=-p,S=-d*m+u*p*h,C=d*h+u*p*m,w=u*f;return e[0]=g*s,e[1]=y*s,e[2]=S*s,e[3]=0,e[4]=_*c,e[5]=b*c,e[6]=C*c,e[7]=0,e[8]=v*l,e[9]=x*l,e[10]=w*l,e[11]=0,e[12]=t,e[13]=n,e[14]=r,e[15]=1,e}var ie=e=>e<0?0:e>1?1:e,M=(e,t,n)=>e+(t-e)*n,N=(e,t,n)=>{let r=ie((n-e)/(t-e));return r*r*(3-2*r)},ae=(e,t,n)=>{let r=ie((n-e)/(t-e));return r*r*r*(r*(6*r-15)+10)},P=Math.PI/180,F=2,I=1.36,L=Math.PI*2,R=7,z=()=>(R=R*16807%2147483647)/2147483647;function B(e,t,n,r=.012){let i=e.getTransform().d;e.save(),e.shadowColor=`rgb(0 22 28 / 0.42)`,e.shadowBlur=r*i,e.shadowOffsetY=r*.5*i,e.fillStyle=t,e.beginPath(),n(),e.fill(`evenodd`),e.restore()}var oe=(e,t,n,r)=>{let i=e.createLinearGradient(0,t,0,n);for(let[e,t]of r)i.addColorStop(e,t);return i},se=(e,t,n,r,i,a=1)=>{let o=e.createRadialGradient(t,n,0,t,n,r);o.addColorStop(0,i),o.addColorStop(1,i.replace(/\/ [\d.]+\)/,`/ 0)`)),e.save(),e.globalAlpha=a,e.fillStyle=o,e.fillRect(t-r,n-r,r*2,r*2),e.restore()};function ce(e,t,n,r,i){e.save(),e.globalCompositeOperation=`screen`,se(e,t,n,r,i),e.restore()}function le(e,t,n,r,i=8,a=.6){for(let o=0;o<i*2;o++){let s=o*Math.PI/i-Math.PI/2,c=o%2?r*a:r;o?e.lineTo(t+Math.cos(s)*c,n+Math.sin(s)*c):e.moveTo(t+Math.cos(s)*c,n+Math.sin(s)*c)}e.closePath()}function ue(e,t,n,r,i,a,o=0,s=1){e.save(),e.translate(n,r),e.rotate(o),e.scale(i/100*s,i/100),e.translate(-50,-50),e.fillStyle=a,e.fill(new Path2D(t),`evenodd`),e.restore()}function de(e,t,n,r,i){let a=2.1/r;e.lineTo(-.05,t);for(let o=0;o<r;o++){let r=-.05+o*a,s=n*(.72+.4*Math.sin(o*2.13+i)),c=r+a*.74;e.bezierCurveTo(r+a*.3,t+n*.3,r+a*.56,t-s*.5,c,t-s),e.bezierCurveTo(c+a*.03,t-s*.42,r+a*.86,t+n*.14,r+a,t)}}function V(e,t,n,r,i,a,o){B(e,t,()=>{e.moveTo(-.05,1.4100000000000001),de(e,r,i,a,o),e.lineTo(2.05,1.4100000000000001),e.closePath()}),e.strokeStyle=n,e.lineWidth=.0042,e.lineJoin=`round`,e.beginPath(),e.moveTo(-.05,r),de(e,r,i,a,o),e.stroke()}function fe(e,t,n,r,i,a,o=i,s){e.save(),e.translate(t,n),e.scale(r,r),e.strokeStyle=o,e.lineWidth=.012,e.beginPath(),e.moveTo(.02,0),e.lineTo(-.02,-.56),e.stroke();let c=()=>{e.moveTo(-.08,-.62),e.bezierCurveTo(.2,-.5,.34,-.26,.36,-.05),e.lineTo(-.2,-.05),e.bezierCurveTo(-.13,-.24,-.08,-.44,-.08,-.62),e.closePath()};B(e,a,c,.008),s&&(e.save(),e.beginPath(),c(),e.clip(),e.fillStyle=s,e.fillRect(-.3,-.17,.8,.035),e.fillRect(-.3,-.115,.8,.018),e.restore()),B(e,i,()=>{e.moveTo(-.42,-.05),e.bezierCurveTo(-.2,0,.26,0,.46,-.1),e.bezierCurveTo(.4,.06,.22,.1,.02,.1),e.bezierCurveTo(-.2,.1,-.36,.06,-.42,-.05),e.closePath()},.008),e.restore()}function pe(e,t,n,r,i,a=1){e.save(),e.translate(t,n),e.scale(r*a,r),e.fillStyle=i,e.beginPath(),e.moveTo(-.018,0),e.bezierCurveTo(-.01,-.2,.03,-.38,.09,-.52),e.lineTo(.112,-.51),e.bezierCurveTo(.06,-.36,.03,-.2,.024,0),e.closePath(),e.fill();for(let[t,n]of[[-2.9,.26],[-2.45,.3],[-1.95,.27],[-1.4,.28],[-.9,.31],[-.4,.3],[.05,.25]]){let r=.1+Math.cos(t)*n,i=-.52+Math.sin(t)*n*.74+n*.3;e.beginPath(),e.moveTo(.1,-.52),e.quadraticCurveTo(.1+Math.cos(t)*n*.55,-.52+Math.sin(t)*n*.8-.035,r,i),e.quadraticCurveTo(.1+Math.cos(t)*n*.5,-.52+Math.sin(t)*n*.5+.03,.1,-.52),e.fill()}e.restore()}function me(e,t,n,r,i,a,o=1.4100000000000001){B(e,t,()=>{e.rect(i-.05,n,a-i+.1,o-n);let t=(a-i)/r;for(let a=0;a<r;a++){let r=i+t*(a+.5),s=t*.33,c=o-.06,l=n+s*2.3;e.moveTo(r-s,c),e.lineTo(r-s,l),e.bezierCurveTo(r-s,l-s*.9,r-s*.25,l-s*1.45,r,l-s*1.75),e.bezierCurveTo(r+s*.25,l-s*1.45,r+s,l-s*.9,r+s,l),e.lineTo(r+s,c),e.closePath()}})}function H(e,t,n,r,i,a=.68){for(let o=0;o<=64;o++){let s=o/64*L,c=1+.17*Math.sin(s*3+i)+.09*Math.sin(s*5+i*2.3)+.05*Math.sin(s*9+i*1.1),l=t+Math.cos(s)*r*c,u=n+Math.sin(s)*r*c*a;o?e.lineTo(l,u):e.moveTo(l,u)}e.closePath()}function U(e,t,n,r,i,a){e.save(),e.translate(t,n),e.strokeStyle=i,e.lineWidth=.003;for(let t of[1,.84])e.beginPath(),e.arc(0,0,r*t,0,L),e.stroke();for(let t=0;t<8;t++){let n=t%2==0,o=n?r*1.14:r*.68,s=r*(n?.11:.08);e.save(),e.rotate(t*L/8),e.fillStyle=i,e.beginPath(),e.moveTo(0,-o),e.lineTo(s,-s),e.lineTo(0,0),e.closePath(),e.fill(),e.fillStyle=a,e.beginPath(),e.moveTo(0,-o),e.lineTo(-s,-s),e.lineTo(0,0),e.closePath(),e.fill(),e.restore()}e.restore()}function he(e){e.fillStyle=`#134567`,e.fillRect(0,0,F,I);let t=(t,n)=>{e.strokeStyle=`rgb(214 236 248 / ${n})`,e.lineWidth=.0016,e.beginPath();for(let n=0;n<=F;n+=t)e.moveTo(n,0),e.lineTo(n,I);for(let n=0;n<=I;n+=t)e.moveTo(0,n),e.lineTo(F,n);e.stroke()};t(.05,.08),t(.25,.2);let n=[[.42,.42,.26,1.1],[1.5,.34,.2,2.6],[1.3,.98,.3,4.2],[.5,1.06,.17,5.4],[.98,.66,.1,.4]];for(let[t,r,i,a]of n){B(e,`rgb(214 236 248 / 0.1)`,()=>H(e,t,r,i,a),.004),e.strokeStyle=`#d9eef8`;for(let n=0;n<6;n++)e.lineWidth=n===0?.0044:.0022,e.globalAlpha=1-n*.1,e.beginPath(),H(e,t,r,i*(1-n*.15),a+n*.1),e.stroke();e.globalAlpha=1}R=311,e.strokeStyle=`#f4c869`,e.lineWidth=.004,e.setLineDash([.012,.012]);for(let t=0;t<9;t++){let r=n[t%n.length],i=n[(t*2+1)%n.length];e.beginPath(),e.moveTo(r[0],r[1]),e.bezierCurveTo(r[0]+(z()-.5)*.7,r[1]+(z()-.5)*.6,i[0]+(z()-.5)*.7,i[1]+(z()-.5)*.6,i[0],i[1]),e.stroke()}e.setLineDash([]);for(let[t,r]of n)e.fillStyle=`#fa2a6f`,e.beginPath(),e.arc(t,r,.012,0,L),e.fill();let r=1.38,i=.62,a=.27;e.save(),e.beginPath(),e.arc(r,i,a,0,L),e.clip(),e.fillStyle=`rgb(236 248 252 / 0.2)`,e.fillRect(1.1099999999999999,.35,a*2,a*2),e.restore(),B(e,`#e9c063`,()=>{e.arc(r,i,.29200000000000004,0,L),e.arc(r,i,a,0,L,!0)},.016),e.save(),e.translate(r,i),e.rotate(.82),B(e,`#0a2d45`,()=>e.roundRect(.29000000000000004,-.024,.34,.048,.024),.014),e.restore()}function ge(e){e.fillStyle=`#123f60`,e.fillRect(0,0,F,I),e.strokeStyle=`rgb(214 236 248 / 0.1)`,e.lineWidth=.0016,e.beginPath();for(let t=0;t<=F;t+=.08)e.moveTo(t,0),e.lineTo(t,I);for(let t=0;t<=I;t+=.08)e.moveTo(0,t),e.lineTo(F,t);e.stroke();let t=e=>t=>.56+e-.22*Math.exp(-((t-1.02)**2)/.24)*(1-e*1.2)+.018*Math.sin(t*9+e*14);[`#7fb7cf`,`#5a9bb9`,`#3f83a5`,`#2c6c8f`,`#1e5777`,`#144764`].forEach((n,r)=>{let i=t(r*.095);B(e,n,()=>{e.moveTo(-.05,1.4100000000000001);for(let t=-.05;t<=2.05;t+=.02)e.lineTo(t,i(t));e.lineTo(2.05,1.4100000000000001),e.closePath()},.006),e.strokeStyle=`#d9eef8`,e.lineWidth=r===0?.005:.0024,e.beginPath();for(let t=-.05;t<=2.05;t+=.02)e.lineTo(t,i(t));e.stroke()}),R=73;for(let n=0;n<46;n++){let r=.1+z()*1.8,i=t(.1+z()*.42);e.fillStyle=n%7==0?`#fa2a6f`:`#f4c869`,e.beginPath(),e.arc(r,i(r)+.03,.006+z()*.006,0,L),e.fill()}e.strokeStyle=`#d9eef8`,e.lineWidth=.003,e.setLineDash([.02,.014]),e.beginPath(),e.moveTo(0,.62),e.lineTo(F,.62),e.stroke(),e.setLineDash([]),fe(e,1.56,.6,.62,`#d9eef8`,`rgb(217 238 248 / 0.22)`,`#d9eef8`,`#f4c869`),fe(e,.34,.61,.36,`#d9eef8`,`rgb(217 238 248 / 0.22)`,`#d9eef8`),pe(e,1.02,.36,.4,`#d9eef8`)}function W(e){e.fillStyle=`#0d3b3d`,e.fillRect(0,0,F,I);let t=e.createRadialGradient(1,.74,0,1,.74,1.2);for(let[e,n]of[[0,`#ffe2a4`],[.2,`#f8bb68`],[.42,`#c9713b`],[.66,`#6a3f38`],[.88,`#1f3d41`],[1,`#0d3b3d`]])t.addColorStop(e,n);e.fillStyle=t,e.fillRect(0,0,F,I),R=41,e.fillStyle=`#f4c273`;for(let t=0;t<46;t++){let n=z()*F,r=z()*.62,i=.008+z()*z()*.034;e.fillStyle=t%9==0?`#fa2a6f`:`#0d3b3d`,e.beginPath(),le(e,n,r,i),e.fill()}e.fillStyle=`#0d3b3d`,e.beginPath(),e.arc(.3,.2,.1,1.008,-1.008),e.arc(.345,.2,.085,-1.473,1.473,!0),e.closePath(),e.fill(),me(e,`#0c3234`,.72,8,0,F),pe(e,.36,.86,.72,`#082628`),pe(e,1.66,.88,.84,`#082628`,-1),pe(e,1.42,.86,.48,`#0c3234`,-1),fe(e,1.02,1.1,.72,`#051c1e`,`#082628`,`#051c1e`),V(e,`#062224`,`rgb(244 194 115 / 0.65)`,1.12,.05,10,1.2),V(e,`#041a1c`,`rgb(244 194 115 / 0.4)`,1.25,.04,8,3.1)}function _e(e){e.fillStyle=`#0b3436`,e.fillRect(0,0,F,I);let t=[[.17,.46,.21],[.46,.76,.27],[.74,.4,.18],[1.03,.68,.34],[1.31,.34,.17],[1.58,.8,.27],[1.85,.5,.21]];R=19;for(let t=0;t<70;t++)e.fillStyle=`rgb(244 194 115 / ${.2+z()*.5})`,e.beginPath(),le(e,z()*F,z()*I,.004+z()*z()*.016),e.fill();for(let[n,i,a]of t)ce(e,n,i+a*.12,a*1.5,`rgb(226 112 40 / 0.85)`),ce(e,n,i+a*.14,a*.62,`rgb(255 190 96 / 0.75)`),e.strokeStyle=`#d29a45`,e.lineWidth=.004,e.setLineDash([.012,.007]),e.beginPath(),e.moveTo(n,-.02),e.lineTo(n,i-a*.46),e.stroke(),e.setLineDash([]),e.fillStyle=`#ffd98f`,e.beginPath(),e.moveTo(n-a*.26,i+a*.03),e.lineTo(n+a*.26,i+a*.03),e.lineTo(n+a*.18,i+a*.36),e.lineTo(n-a*.18,i+a*.36),e.closePath(),e.fill(),e.save(),e.shadowColor=`rgb(0 16 18 / 0.5)`,e.shadowBlur=.01*e.getTransform().d,ue(e,r.lantern,n,i,a,`#b9772a`),e.restore();V(e,`#072628`,`rgb(244 194 115 / 0.55)`,1.2,.04,11,2.2)}function ve(e){e.fillStyle=oe(e,0,.9,[[0,`#cfe9ee`],[1,`#f6e6c6`]]),e.fillRect(0,0,F,I),se(e,1.48,.34,.56,`rgb(255 214 130 / 0.85)`),B(e,`#f2b64f`,()=>{e.arc(1.48,.34,.13,0,L)},.01),B(e,`#f7f3e7`,()=>{H(e,.42,.24,.13,1,.34),H(e,.58,.27,.1,2.4,.3)},.01),B(e,`#f7f3e7`,()=>H(e,1.04,.15,.1,4,.32),.01),V(e,`#7fcfc6`,`#f4f9f2`,.6,.05,12,.5),fe(e,.74,.68,.66,`#7c4a24`,`#f6efdd`,`#5d3618`,`#e0175f`),V(e,`#47b4ab`,`#f4f9f2`,.74,.06,10,1.9),V(e,`#1f9a94`,`#f4f9f2`,.88,.07,9,3.3),V(e,`#0f807d`,`#f4f9f2`,1.02,.075,8,4.8),V(e,`#086764`,`#f4f9f2`,1.16,.08,7,.9),V(e,`#054f4e`,`#f4f9f2`,1.28,.06,7,2.7)}function ye(e){e.fillStyle=`#0a4a4a`,e.fillRect(0,0,F,I),R=53;for(let t=0;t<60;t++)e.fillStyle=`rgb(230 245 240 / ${.15+z()*.45})`,e.beginPath(),le(e,z()*F,z()*.9,.003+z()*z()*.012,4,.4),e.fill();e.save(),e.translate(1,.58),e.rotate(-.09),B(e,`#13211f`,()=>e.roundRect(-.36,-.54,.72,1.3,.07),.04),e.fillStyle=oe(e,-.46,.5,[[0,`#f6b679`],[.55,`#f7dca9`],[1,`#7fcfc6`]]),e.beginPath(),e.roundRect(-.32,-.46,.64,1,.018),e.fill(),e.save(),e.beginPath(),e.roundRect(-.32,-.46,.64,1,.018),e.clip(),e.fillStyle=`#fbe39c`,e.beginPath(),e.arc(.06,-.1,.1,0,L),e.fill(),e.restore(),e.fillStyle=`#20312f`;for(let t=0;t<4;t++)e.fillRect(.17+t*.024,-.42-t*.012,.014,.018+t*.012);e.strokeStyle=`#e0175f`,e.lineWidth=.008,e.beginPath(),e.moveTo(.16,-.39),e.lineTo(.27,-.46),e.stroke(),e.restore(),fe(e,1.04,.86,.5,`#7c4a24`,`#f6efdd`,`#5d3618`,`#e0175f`),V(e,`#47b4ab`,`#f4f9f2`,.88,.07,9,1),V(e,`#1f9a94`,`#f4f9f2`,1.02,.08,8,2.6),V(e,`#0f807d`,`#f4f9f2`,1.15,.08,7,4.2),V(e,`#075b59`,`#f4f9f2`,1.27,.06,7,.4)}function be(e,t,n,r){let i=`#1c1713`,a=`#f6e8cc`;e.save(),e.translate(t,n),e.scale(r,r),e.strokeStyle=`#3a2618`,e.lineWidth=.022,e.lineCap=`round`,e.beginPath(),e.moveTo(.02,.28),e.lineTo(.01,.46),e.lineTo(-.06,.47),e.moveTo(.12,.28),e.lineTo(.13,.46),e.lineTo(.06,.47),e.stroke(),e.lineCap=`butt`,e.save(),e.translate(.42,.16),e.rotate(.52),B(e,i,()=>{e.moveTo(-.08,-.07),e.lineTo(.46,-.085),e.quadraticCurveTo(.49,0,.46,.085),e.lineTo(-.08,.07),e.closePath()},.01),e.fillStyle=a,e.fillRect(.2,-.09,.07,.18),e.restore();for(let t=0;t<8;t++){let n=t/7,r=1.42-n*2.12,o=.3+.06*Math.sin(n*Math.PI);e.save(),e.translate(-.2+n*-.03+.03,-.3),e.rotate(r);let s=(t,n,r,i)=>B(e,r,()=>{e.moveTo(-n*.35,.04),e.bezierCurveTo(-n,-t*.45,-n*.95,-t*.86,0,-t),e.bezierCurveTo(n*.95,-t*.86,n,-t*.45,n*.35,.04),e.closePath()},i);s(o,.042,i,.008),s(o-.05,.04,a,0),s(o-.085,.038,`#e6a361`,0),e.restore()}B(e,`#d9843f`,()=>{e.moveTo(-.27,-.14),e.bezierCurveTo(-.3,.1,-.12,.33,.1,.33),e.bezierCurveTo(.28,.33,.44,.27,.54,.2),e.bezierCurveTo(.42,.02,.22,-.12,.02,-.16),e.bezierCurveTo(-.03,-.17,-.07,-.2,-.08,-.25),e.bezierCurveTo(-.09,-.36,-.3,-.38,-.32,-.25),e.bezierCurveTo(-.325,-.21,-.28,-.18,-.27,-.14),e.closePath()},.014),e.fillStyle=`#e29a57`,e.beginPath(),e.moveTo(-.27,-.14),e.bezierCurveTo(-.3,.02,-.22,.16,-.1,.25),e.bezierCurveTo(-.12,.08,-.06,-.08,-.08,-.25),e.bezierCurveTo(-.09,-.36,-.3,-.38,-.32,-.25),e.bezierCurveTo(-.325,-.21,-.28,-.18,-.27,-.14),e.closePath(),e.fill(),B(e,i,()=>{e.moveTo(-.305,-.285),e.quadraticCurveTo(-.52,-.27,-.71,-.12),e.quadraticCurveTo(-.5,-.2,-.31,-.2),e.closePath()},.006),e.fillStyle=i,e.beginPath(),e.arc(-.235,-.265,.02,0,L),e.fill(),e.fillStyle=a,e.beginPath(),e.arc(-.241,-.272,.006,0,L),e.fill();let o=()=>{e.moveTo(-.08,-.02),e.bezierCurveTo(.08,-.12,.34,-.02,.62,.27),e.bezierCurveTo(.4,.33,.12,.3,0,.2),e.bezierCurveTo(-.07,.14,-.11,.05,-.08,-.02),e.closePath()};B(e,i,o,.012),e.save(),e.beginPath(),o(),e.clip(),e.strokeStyle=a,e.lineWidth=.034;for(let t=0;t<6;t++){let n=.03+t*.094;e.beginPath(),e.moveTo(n+.02,-.14),e.quadraticCurveTo(n+.11,.08,n-.05,.38),e.stroke()}e.restore(),e.restore()}function xe(e){e.fillStyle=oe(e,0,.95,[[0,`#f3a56f`],[.55,`#f8cf97`],[1,`#fbe9c3`]]),e.fillRect(0,0,F,I),se(e,.66,.5,.74,`rgb(255 240 190 / 0.9)`),B(e,`#fff0c4`,()=>e.arc(.66,.5,.29,0,L),.008);let t=(t,n,r,i,a)=>B(e,t,()=>{e.moveTo(-.05,1.4100000000000001);for(let t=-.05;t<=2.05;t+=.02)e.lineTo(t,n+r*Math.sin(t*i+a)+r*.4*Math.sin(t*i*2.3+a*2));e.lineTo(2.05,1.4100000000000001),e.closePath()});t(`#e9a76c`,.76,.05,3.1,.6),pe(e,1.5,.92,.94,`#6b3b1c`,-1),pe(e,1.78,.94,.62,`#7f4924`,-1),be(e,.68,.585,.68),t(`#d98a4b`,.87,.06,2.6,2.2),t(`#c4581e`,1,.055,2.2,3.9),t(`#96421c`,1.15,.05,2.9,5.2),R=29;for(let t=0;t<7;t++){let t=.2+z()*1.6,n=.1+z()*.3,r=.012+z()*.016;e.strokeStyle=`#6b3b1c`,e.lineWidth=.004,e.beginPath(),e.moveTo(t-r,n),e.quadraticCurveTo(t-r*.4,n-r*.7,t,n),e.quadraticCurveTo(t+r*.4,n-r*.7,t+r,n),e.stroke()}}function Se(e){e.fillStyle=`#d3813f`,e.fillRect(0,0,F,I);for(let t=0;t<=9;t++){let n=-.06+t/9*1.42,r=t=>{e.moveTo(-.1,n+t+.22),e.bezierCurveTo(.5,n+t-.16,1.3,n+t-.1,2.1,n+t+.42)};B(e,t%2?`#1c1713`:`#f6e8cc`,()=>{r(0),e.lineTo(2.1,1.96),e.lineTo(-.1,1.96),e.closePath()},.012)}e.save(),e.translate(1,1.5);for(let t=0;t<9;t++){let n=-.86+t/8*1.72;e.save(),e.rotate(n);let r=(t,n,r)=>B(e,r,()=>{e.moveTo(-n*.3,0),e.bezierCurveTo(-n,-t*.5,-n*.9,-t*.9,0,-t),e.bezierCurveTo(n*.9,-t*.9,n,-t*.5,n*.3,0),e.closePath()},.012),i=.92+.12*Math.cos(n*1.7);r(i,.082,`#1c1713`),r(i-.075,.074,`#f6e8cc`),r(i-.14,.07,`#e39a55`),e.restore()}e.restore()}function G(e){e.fillStyle=`#ebe3cc`,e.fillRect(0,0,F,I),e.strokeStyle=`rgb(11 77 76 / 0.2)`,e.lineWidth=.002;for(let[t,n]of[[.5,.68],[1.54,.68]])for(let r=0;r<32;r++){let i=r/32*L;e.beginPath(),e.moveTo(t,n),e.lineTo(t+Math.cos(i)*2.4,n+Math.sin(i)*2.4),e.stroke()}for(let[t,n,r,i]of[[.26,.26,.15,1.4],[.82,1.08,.2,3],[1.28,.3,.17,4.6],[1.76,1.02,.14,.2]])e.fillStyle=`#c0dfda`,e.beginPath(),H(e,t,n,r*1.42,i),e.fill(),e.strokeStyle=`rgb(11 77 76 / 0.35)`,e.lineWidth=.002,e.setLineDash([.008,.008]),e.beginPath(),H(e,t,n,r*1.2,i),e.stroke(),e.setLineDash([]),B(e,`#d7b777`,()=>H(e,t,n,r,i),.008),e.fillStyle=`#0a7a78`,e.beginPath(),H(e,t,n,r*.5,i+.5),e.fill();e.strokeStyle=`#d81f63`,e.lineWidth=.006,e.lineCap=`round`,e.setLineDash([.001,.02]),e.beginPath(),e.moveTo(.3,.42),e.bezierCurveTo(.6,.82,.9,.5,1.14,.46),e.bezierCurveTo(1.5,.42,1.28,.82,1.6,.92),e.stroke(),e.setLineDash([]),e.lineCap=`butt`,U(e,.5,.68,.16,`#0b4d4c`,`#c49a4a`),U(e,1.54,.68,.11,`#0b4d4c`,`#c49a4a`),fe(e,1.12,.47,.24,`#7c4a24`,`#f8f2e2`,`#5d3618`,`#d81f63`),R=67,e.strokeStyle=`rgb(11 77 76 / 0.42)`,e.lineWidth=.003;for(let t=0;t<26;t++){let t=z()*F,n=z()*I,r=.016;e.beginPath(),e.moveTo(t-r,n),e.quadraticCurveTo(t-r*.5,n-r*.7,t,n),e.quadraticCurveTo(t+r*.5,n-r*.7,t+r,n),e.stroke()}}function K(e){e.fillStyle=oe(e,0,.92,[[0,`#a9dbe2`],[.65,`#e1eddc`],[1,`#fbdcae`]]),e.fillRect(0,0,F,I),se(e,1.6,.76,.44,`rgb(255 214 130 / 0.9)`),B(e,`#f6ba58`,()=>e.arc(1.6,.76,.1,0,L),.006),B(e,`#f9f6ec`,()=>{H(e,.32,.2,.15,1.2,.3),H(e,.5,.23,.1,2.2,.28)},.01),B(e,`#f9f6ec`,()=>H(e,1.62,.2,.13,3.8,.3),.01);for(let[t,n,r]of[[.24,.17,`#5e9c94`],[.52,.1,`#4b8a84`],[1.8,.14,`#4b8a84`]])B(e,r,()=>{e.moveTo(t-n,.86),e.bezierCurveTo(t-n*.5,.72,t+n*.3,.72,t+n,.86),e.closePath()},.006);V(e,`#6cc4bb`,`#f7fbf4`,.86,.03,13,.9),fe(e,.98,.97,1.42,`#7c4a24`,`#fbf5e4`,`#5d3618`,`#d81f63`),V(e,`#2ea49c`,`#f7fbf4`,1.06,.05,10,2.4),V(e,`#0f807d`,`#f7fbf4`,1.17,.06,8,4),V(e,`#075b59`,`#f7fbf4`,1.28,.05,7,5.4)}var Ce={xray:[he,ge],lantern:[W,_e],phone:[ve,ye],hoopoe:[xe,Se],sail:[G,K]},we={xray:[`#cfe6f2`,`#5a9bb9`,`#1e5777`],lantern:[`#f4c273`,`#c9713b`,`#0f3f41`],phone:[`#9fdcd2`,`#1f9a94`,`#0a5f5c`],hoopoe:[`#f6e8cc`,`#e39a55`,`#96421c`],sail:[`#f1e7cc`,`#6cc4bb`,`#0f807d`]};function Te(e,t){let n=e.getContext(`2d`),r=e.width/F;Ce[t].forEach((t,i)=>{n.save(),n.setTransform(r,0,0,r,0,i*e.height/2),n.beginPath(),n.rect(0,0,F,I),n.clip(),t(n),n.restore()})}var Ee=`#0b4d4c`,De=`#083e3d`,Oe=`#efe3c8`,ke=e=>getComputedStyle(document.querySelector(`.design-a`)??document.documentElement).getPropertyValue(e).trim()||`sans-serif`;function q(e,t,n,r){e.beginPath();for(let i=0;i<16;i++){let a=i*Math.PI/8-Math.PI/2,o=i%2?r*.66:r,s=t+Math.cos(a)*o,c=n+Math.sin(a)*o;i?e.lineTo(s,c):e.moveTo(s,c)}e.closePath()}function J(e,t,n,r,i){let{a,c:o,zs:c,zb:u}=l,d=e=>t+e*n,f=e=>(e+s.H/2)*n,p=a+o-i,m=Math.sqrt(Math.max(0,p*p-o*o)),h=Math.atan2(m,o);e.beginPath(),e.moveTo(d(r-(a-i)),f(u-i)),e.lineTo(d(r-(a-i)),f(c)),e.arc(d(r+o),f(c),p*n,Math.PI,Math.PI+h),e.arc(d(r-o),f(c),p*n,-h,0),e.lineTo(d(r+(a-i)),f(u-i)),e.closePath()}function Y(e,t,n,r,i,a,o,s){e.lineWidth=o,e.strokeStyle=s;for(let o=0,s=n;s<i+a;o++,s+=a)for(let n=t;n<r+a;n+=a)q(e,n,s,a*.5),e.stroke()}function Ae(e,t,n,r,i){e.save(),e.translate(n-i/2,r-i/2),e.scale(i/100,i/100),e.fill(new Path2D(t),`evenodd`),e.restore()}function je(e,t,n,r){let i=.05*n,a=.066*n,o=n;e.strokeStyle=`#fff`,e.lineWidth=.0042*n,e.strokeRect(t+i,i,o-2*i,r-2*i),e.lineWidth=.0016*n,e.strokeRect(t+a,a,o-2*a,r-2*a),e.fillStyle=`#fff`;for(let a of[t+i,t+o-i])for(let t of[i,r-i])q(e,a,t,.024*n),e.fill()}function Me(e,t,n,r,i,a){e.font=`${n} ${r}px ${i}`;let o=e.measureText(t).width;return o>a&&(r*=a/o,e.font=`${n} ${r}px ${i}`),r}function Ne(e,t,n,r,i,a){let o=e.getContext(`2d`),c=t.getContext(`2d`),u=e.width,d=e.height,f=u/2,p=n[r],m=ke(`--a-heading`),h=ke(`--a-body`);o.setTransform(1,0,0,1,0,0),c.setTransform(1,0,0,1,0,0),o.fillStyle=Ee,o.fillRect(0,0,u,d),c.fillStyle=`#000`,c.fillRect(0,0,u,d),o.save(),Y(o,0,0,u,d,.13*f,Math.max(1,.0018*f),`rgb(255 255 255 / 0.05)`),o.restore(),je(c,0,f,d),je(c,f,f,d);let g=f/2;o.textAlign=c.textAlign=`center`,o.textBaseline=c.textBaseline=`alphabetic`,o.direction=c.direction=r===`ar`?`rtl`:`ltr`,c.fillStyle=`#fff`,Ae(c,n.icon,g,d*.3,.26*f),c.font=`600 ${.042*f}px ${h}`,c.fillText(p.nth,g,d*.445),Me(c,p.title,700,.15*f,m,.72*f),c.fillText(p.title,g,d*.56),c.fillRect(g-.06*f,d*.595,.12*f,Math.max(2,.004*f)),o.fillStyle=Oe,o.font=`500 ${.044*f}px ${h}`;let _=p.note.split(` `),v=``,y=d*.655;for(let e of _){let t=v?`${v} ${e}`:e;o.measureText(t).width>.68*f&&v?(o.fillText(v,g,y),y+=.062*f,v=e):v=t}v&&o.fillText(v,g,y);let b=i>0?l.cx:1-l.cx;o.save(),J(o,f,f,b,-.03),o.fillStyle=De,o.fill(),o.restore(),c.strokeStyle=`#fff`,c.lineWidth=.004*f,J(c,f,f,b,-.03),c.stroke(),c.lineWidth=.0016*f,J(c,f,f,b,-.018),c.stroke();let x=e=>f+e*f,S=e=>(e+s.H/2)*f;o.save(),J(o,f,f,b,0),o.clip(),o.fillStyle=n.color,o.globalAlpha=.34,o.fillRect(f,0,f,d),o.globalAlpha=1,o.restore(),c.save(),J(c,f,f,b,.012),c.clip(),Y(c,x(b)-.07*f*6,S(l.zs)-.07*f*9-.07*f*.5,x(b)+.07*f*6,S(l.zb),.07*f,Math.max(1,.0024*f),`#fff`),c.restore(),c.strokeStyle=`#fff`,c.lineWidth=.003*f,J(c,f,f,b,.012),c.stroke();let C=S(.1),w=.135*f;for(let e of[o,c])e.beginPath(),e.arc(x(b),C,w,0,Math.PI*2);o.fillStyle=De,o.fill(),c.fillStyle=`#000`,c.fill(),c.beginPath(),c.arc(x(b),C,w,0,Math.PI*2),c.lineWidth=.005*f,c.strokeStyle=`#fff`,c.stroke(),c.fillStyle=`#fff`,Ae(c,n.icon,x(b),C,w*1.3),o.fillStyle=`#04201f`,o.fillRect(x(b)-Math.max(1,.0013*f),S(l.zs)-Math.sqrt((l.a+l.c)**2-l.c**2)*f,Math.max(2,.0026*f),(l.zb-l.zs+Math.sqrt((l.a+l.c)**2-l.c**2))*f),a&&(c.fillStyle=`#fff`,Me(c,p.title,700,.09*f,m,.7*f),c.fillText(p.title,x(b),S(.585)))}function Pe(e){let t=n.length,r=e.width/t,i=e.height,a=e.getContext(`2d`);a.fillStyle=`#000`,a.fillRect(0,0,e.width,i),a.fillStyle=`#fff`;let o=Math.min(r,i*(d.out/d.w))*.66;n.forEach((e,t)=>{a.save(),a.translate(r*t+r*.46,i/2),a.scale(o/100*(r/(i*(d.out/d.w))),o/100),a.translate(-50,-50),a.fill(new Path2D(e.icon),`evenodd`),a.restore()})}var Fe=[{id:`sun`,mesh:`strip`,w:.46,x:.3,z:-.6,slit:.66,start:.61,dur:.15,hz:1.9,zeta:.42},{id:`sun_rays`,mesh:`sun_rays`,parent:`sun`,x:0,y:.46,z:.004,s:.8,lean:-34,start:0,dur:0,move:`spin`},{id:`sun_disc`,mesh:`sun_disc`,parent:`sun`,x:0,y:.46,z:.008,s:.8,lean:-34,start:0,dur:0},{id:`coast_left`,mesh:`coast_left`,parent:`upper`,x:-.49,s:.96,z:-.6,lean:-10,start:.13,dur:.11,hz:1.7},{id:`coast_far`,mesh:`coast_far`,x:.5,z:-.58,lean:-10,start:.22,dur:.14,v:.05,hz:1.7},{id:`coast_town`,mesh:`coast_town`,x:.5,z:-.5,lean:-12,start:.25,dur:.13,v:-.04,hz:1.8},{id:`isle`,mesh:`isle`,x:.23,z:-.42,lean:-14,s:.8,start:.29,dur:.1},{id:`palm_far`,mesh:`palm_far`,x:.15,z:-.415,lean:-14,s:.86,start:.32,dur:.1,move:`palm`,phase:2},{id:`sea1`,mesh:`sea1`,x:.5,z:-.36,lean:-16,start:.3,dur:.1,v:.1,flex:1,move:`wave`,phase:0},{id:`light`,mesh:`light`,x:.77,z:-.3,lean:-16,s:.92,start:.34,dur:.11,hz:2.2},{id:`sea2`,mesh:`sea2`,x:.5,z:-.24,lean:-18,start:.35,dur:.1,v:-.1,flex:1,move:`wave`,phase:1},{id:`fort`,mesh:`fort`,x:.3,z:-.17,lean:-18,s:.86,start:.38,dur:.11,hz:2.2},{id:`palm_fort`,mesh:`palm_short`,x:.56,z:-.165,lean:-18,s:.8,start:.42,dur:.09,move:`palm`,phase:1},{id:`sea3`,mesh:`sea3`,x:.5,z:-.09,lean:-20,start:.4,dur:.1,v:.11,flex:1,move:`wave`,phase:2},{id:`hull`,mesh:`hull`,x:.62,y:.05,z:-.015,lean:-20,s:.86,start:.43,dur:.11,hz:2.2,zeta:.42,move:`hullbob`,flex:.4},{id:`sail`,mesh:`sail`,parent:`hull`,x:0,y:.1,z:-.012,lean:0,fold:86,start:.48,dur:.1,belly:.55,hz:1.8,zeta:.36,move:`sail`,flex:.5},{id:`flag`,mesh:`flag`,parent:`sail`,x:-.022,y:.455,z:.002,lean:0,fold:0,start:.55,dur:.05,move:`flag`,flex:.5},{id:`dolphin`,mesh:`dolphin`,x:.34,z:.045,lean:-22,s:.9,start:0,dur:0,move:`dolphin`},{id:`sea4`,mesh:`sea4`,x:.5,z:.08,lean:-22,start:.45,dur:.1,v:-.12,flex:1,move:`wave`,phase:3},{id:`sea5`,mesh:`sea5`,x:.5,z:.23,lean:-24,start:.5,dur:.1,v:.12,flex:1,move:`wave`,phase:4},{id:`palm_tall`,mesh:`palm_tall`,x:.08,z:.29,lean:-24,s:.88,start:.55,dur:.1,move:`palm`,phase:3,hz:2},{id:`yas`,mesh:`yasmina`,x:.285,z:.33,lean:-26,s:.96,start:.57,dur:.1,hz:2.3,zeta:.4,move:`yas`},{id:`yas_arm`,mesh:`yas_arm`,parent:`yas`,x:.026,y:.186,z:.004,lean:0,fold:0,start:.6,dur:.05,move:`arm`},{id:`hoopoe_wire`,mesh:`strip`,w:.2,x:.5,z:.335,lean:-26,start:.6,dur:.1,hz:2,zeta:.38},{id:`hoopoe`,mesh:`hoopoe`,parent:`hoopoe_wire`,x:0,y:.2,z:.004,s:.8,start:0,dur:0,move:`hoopoe`},{id:`hoopoe_crest`,mesh:`hoopoe_crest`,parent:`hoopoe`,x:-.05,y:.115,z:-.002,start:0,dur:0,move:`crest`},{id:`wing_far`,mesh:`hoopoe_wing`,parent:`hoopoe`,x:.005,y:.085,z:-.004,start:0,dur:0,move:`wingF`},{id:`wing_near`,mesh:`hoopoe_wing`,parent:`hoopoe`,x:.002,y:.082,z:.006,start:0,dur:0,move:`wingN`},{id:`shore`,mesh:`shore`,x:.37,z:.395,lean:-28,start:.53,dur:.1,v:.06,flex:.6},{id:`sea6`,mesh:`sea6`,x:.5,z:.48,lean:-28,start:.61,dur:.1,v:-.12,flex:1,move:`wave`,phase:5},{id:`cw_a`,mesh:`strip`,w:.42,x:.62,z:-.635,slit:.59,start:.51,dur:.13,hz:1.5,zeta:.35,move:`cloud`,phase:1},{id:`cloud_a`,mesh:`cloud_a`,parent:`cw_a`,x:0,y:.42,z:.004,s:.96,lean:-34,start:0,dur:0},{id:`cw_b`,mesh:`strip`,w:.3,x:.87,z:-.62,slit:.3+.15,start:.55,dur:.12,hz:1.7,zeta:.35,move:`cloud`,phase:2},{id:`cloud_b`,mesh:`cloud_b`,parent:`cw_b`,x:0,y:.3,z:.004,s:.9,lean:-34,start:0,dur:0},{id:`cw_c`,mesh:`strip`,w:.34,x:.06,z:-.635,slit:.49,start:.58,dur:.12,hz:1.6,zeta:.35,move:`cloud`,phase:3},{id:`cloud_c`,mesh:`cloud_c`,parent:`cw_c`,x:0,y:.34,z:.004,s:.82,lean:-34,start:0,dur:0},{id:`cw_d`,mesh:`strip`,w:.3,parent:`upper`,x:-.42,z:-.635,slit:.3+.15,start:.45,dur:.14,hz:1.5,zeta:.35,move:`cloud`,phase:4},{id:`cloud_d`,mesh:`cloud_a`,parent:`cw_d`,x:0,y:.3,z:.004,s:.8,lean:-34,flip:!0,start:0,dur:0},{id:`cw_e`,mesh:`strip`,w:.2,parent:`upper`,x:-.82,z:-.635,slit:.33,start:.52,dur:.14,hz:1.7,zeta:.35,move:`cloud`,phase:5},{id:`cloud_e`,mesh:`cloud_b`,parent:`cw_e`,x:0,y:.2,z:.004,s:.72,lean:-34,start:0,dur:0},{id:`gw_a`,mesh:`strip`,w:.36,x:.5,z:-.2,slit:.42,start:.63,dur:.1,hz:2,zeta:.4,move:`gull`,phase:1},{id:`gull_a`,mesh:`gull`,parent:`gw_a`,x:0,y:.36,z:.004,s:.5,lean:-30,start:0,dur:0},{id:`gw_b`,mesh:`strip`,w:.3,x:.92,z:-.05,slit:.35,start:.65,dur:.1,hz:2,zeta:.4,move:`gull`,phase:2},{id:`gull_b`,mesh:`gull`,parent:`gw_b`,x:0,y:.3,z:.004,s:.38,lean:-30,start:0,dur:0},{id:`tab`,mesh:`tab`,x:1.075,y:-.012,z:.6,s:1,start:.67,dur:.06,move:`tab`}],Ie={coast_left:{start:.15},sun:{x:.8,start:.57},cw_a:{x:.44},cw_b:{x:.14},cw_c:{x:.64},hull:{start:.37,x:.58},sail:{start:.42},flag:{start:.5},sea3:{start:.33},sea4:{start:.39},coast_far:{start:.28},coast_town:{start:.31},fort:{x:.68,start:.45},palm_fort:{x:.42,start:.48},light:{x:.2,start:.41},isle:{x:.8,start:.47},palm_far:{x:.88,start:.5},yas:{start:.53},yas_arm:{start:.56},hoopoe_wire:{start:.55},shore:{start:.49},sea5:{start:.45}},Le=e=>Fe.map(t=>e&&Ie[t.id]?{...t,...Ie[t.id]}:t),Re=e=>{if(e<=0)return 0;if(e>=1)return 1;let t=e**1.5-1;return 1+2.3*t*t*t+1.3*t*t},ze=.62,Be=e=>e>=ze?Math.PI:(.05*N(0,.3,e)+.53*ae(.14,ze,e)**1.1)*Math.PI,Ve=class{partOf;worldP=1;chapterShown=!1;up=[];turns=[{phi:0,v:0,k:0,go:0,t:0,lift:.5,curl:.05},{phi:0,v:0,k:0,go:0,t:0,lift:.34,curl:.13},{phi:0,v:0,k:0,go:0,t:0,lift:.34,curl:.1}];doors=0;doorsV=0;doorsTarget=0;chapterOut=[,,,,,].fill(0);chapterV=[,,,,,].fill(0);chapterTarget=[,,,,,].fill(0);tints=[];pageFrame=D();specs;parts;index=new Map;state;world;root;upper=D();lower=D();upperFrame=D();theta=0;thetaV=0;jolt=0;time=0;p=0;tab=0;tabV=0;tabTarget=0;get tabTravel(){return this.tall?.055:.12}rock=0;rockV=0;flap=0;flapPhase=0;leap=-3;armWave=0;wind=0;primed=!1;tall=!1;leaf=0;leafV=0;leafM=D();dir;cover;thump=0;constructor(e,t){this.partOf=t,this.dir=e?-1:1,this.cover=e?[.04,.26]:[.03,.24],this.specs=Le(e),this.root=D(),this.root[0]=this.dir,this.parts=new Float32Array(1920),this.specs.forEach((e,t)=>this.index.set(e.id,t)),this.state=this.specs.map(()=>({r:0,v:0,rt:0})),this.world=this.specs.map(()=>D())}upperPoint(e,t,n){let r=this.upper;return[r[0]*e+r[4]*t+r[8]*n+r[12],r[1]*e+r[5]*t+r[9]*n+r[13],r[2]*e+r[6]*t+r[10]*n+r[14]]}leafPoint(e,t,n){let r=this.leafM;return[r[0]*e+r[4]*t+r[8]*n+r[12],r[1]*e+r[5]*t+r[9]*n+r[13],r[2]*e+r[6]*t+r[10]*n+r[14]]}lowerPoint(e,t,n){let r=this.lower;return[r[0]*e+r[4]*t+r[8]*n+r[12],r[1]*e+r[5]*t+r[9]*n+r[13],r[2]*e+r[6]*t+r[10]*n+r[14]]}worldOf(e){let t=this.index.get(e);return t===void 0?null:this.world[t]}pageEdge(e){let t=e.phi+e.k;return Math.abs(e.k)<.001?[Math.cos(e.phi),Math.sin(e.phi)]:[(Math.sin(t)-Math.sin(e.phi))/e.k,(Math.cos(e.phi)-Math.cos(t))/e.k]}turn(e,t){let n=this.turns[e];n.go=t,n.t=0}turnsSettled(e){let t=e>0?Math.PI:0;return this.turns.every(e=>Math.abs(e.phi-t)<.002&&Math.abs(e.v)<.3)}stepTurns(e){let t=1/240;this.turns.forEach((n,r)=>{if(n.go){n.t+=e;for(let r=0;r<e;r+=t){let e=n.go>0?n.phi:Math.PI-n.phi,r=n.go>0?n.v:-n.v;if(e>Math.PI*.44){let i=n.go<0;r+=((i?1.2:2.2)+(i?6:15)*Math.max(0,-Math.cos(e))-(i?1.5:.55)*r)*t}else{let i=Math.PI*.5*N(0,n.lift,n.t);r+=(90*(i-e)-13*r)*t}e+=r*t,e>=Math.PI&&(r>1.2&&(this.jolt=Math.min(1,this.jolt+r*(n===this.turns[0]?.1:.04))),e=Math.PI,r*=-.14,Math.abs(r)<.3&&(r=0)),e<0&&(e=0,r=0),n.phi=n.go>0?e:Math.PI-e,n.v=n.go>0?r:-r}}let i=Math.max(-.75,Math.min(.75,-n.curl*n.v));n.k+=(i-n.k)*Math.min(1,e*14),n.k=Math.max(-2*n.phi,Math.min(2*(Math.PI-n.phi),n.k));let a=this.turns[r-1];a&&n.phi>a.phi&&(n.phi=a.phi,n.v=Math.min(n.v,a.v))})}update(e,t){this.time+=t;let n=!this.primed||Math.abs(e-this.p)>.14;this.p=e,this.primed=!0;let r=Math.min(e,this.worldP);this.stepTurns(t);let i=Be(ie((e-this.cover[0])/(this.cover[1]-this.cover[0])));if(n)this.theta=i,this.thetaV=0;else{let e=1/240;for(let n=0;n<t;n+=e)i>=Math.PI&&this.theta>Math.PI*.45?this.thetaV+=(2.4+15*Math.max(0,-Math.cos(this.theta))-.35*this.thetaV)*e:this.thetaV+=(58*(i-this.theta)-11*this.thetaV)*e,this.theta+=this.thetaV*e,this.theta>=Math.PI&&(this.thetaV>1.2&&(this.jolt=Math.min(1,this.jolt+this.thetaV*.26),this.thump=Math.min(1,this.thetaV/4.5)),this.theta=Math.PI,this.thetaV*=-.2),this.theta<=0&&(this.theta=0,this.thetaV*=-.2)}this.jolt*=Math.exp(-t*7);let{Y0:a}=s,o=Math.cos(this.theta),c=Math.sin(this.theta),l=D();l[0]=o,l[1]=c,l[4]=-c,l[5]=o,l[12]=a*c,l[13]=a-a*o,O(this.root,D(),this.lower),O(this.root,l,this.upper);let u=D();u[0]=-1,u[5]=-1,u[13]=2*a,O(this.upper,u,this.upperFrame);let d=this.turns[0],f=d.phi+d.k*.25,p=Math.cos(f),m=Math.sin(f),h=D();if(h[0]=p,h[1]=m,h[4]=-m,h[5]=p,h[12]=a*m,h[13]=a-a*p,O(this.lower,h,this.pageFrame),this.tall){let e=Math.PI*.975*ae(.2,.37,r)**1.1;if(n)this.leaf=e,this.leafV=0;else{let n=1/240;for(let r=0;r<t;r+=n)this.leafV+=(70*(e-this.leaf)-12*this.leafV)*n,this.leaf+=this.leafV*n,this.leaf>Math.PI*.975&&(this.leaf=Math.PI*.975,this.leafV*=-.25),this.leaf<0&&(this.leaf=0,this.leafV=0)}}let g=D(),_=Math.cos(this.leaf),v=Math.sin(this.leaf);g[5]=_,g[6]=v,g[9]=-v,g[10]=_,g[12]=0,g[13]=a+.012,g[14]=s.H/2+0,O(this.pageFrame,g,this.leafM);let y=Math.min(t,1/30);this.tabV+=(90*(this.tabTarget-this.tab)-15*this.tabV)*y,this.tab+=this.tabV*y,this.tab<0&&(this.tab=0,this.tabV*=-.3),this.rockV+=(26*(this.tab*.2-this.rock)-1.8*this.rockV)*y,this.rockV+=this.tabV*1.1*y,this.rock+=this.rockV*y;let b=Math.sin(this.time*.61)*Math.sin(this.time*.23+1)>.62?.5:0,x=Math.max(b,Math.min(1,Math.abs(this.tabV)*1.8+this.tab*.7));this.flap+=(x-this.flap)*Math.min(1,t*(x>this.flap?12:1.6)),this.flapPhase+=t*(6+22*this.flap),this.leap>=0&&this.leap<1?this.leap+=t/1.25:(this.leap>=1&&(this.leap=-6-5*Math.abs(Math.sin(this.time*12.9))),this.leap+=t,this.tab>.3&&this.leap<0&&(this.leap=0));let S=this.time;this.wind=.6+.4*Math.sin(S*.37)*Math.sin(S*.13+1);let C=N(.56,.8,r),w=D();for(let i=0;i<this.specs.length;i++){let a=this.specs[i],o=this.state[i],c=this.partOf(a.id),l=this.pageFrame,u=-1;a.parent===`upper`?l=this.upperFrame:a.parent&&(u=this.index.get(a.parent),l=this.world[u]);let f=a.parent===`upper`,p=a.dur>0?Re(((f?e:r)-a.start)/a.dur)*(f?1-N(1.75,2.7,d.phi):1):1;if(n)o.r=p,o.v=0;else{let e=this.chapterShown&&p<o.r,n=(a.hz??2.4)*6.283*(e?2:1),r=e?Math.max(1,a.zeta??.5):a.zeta??.5,s=Math.min(t,1/60)/2;for(let e=0;e<Math.max(1,Math.round(t/s));e++)o.v+=(n*n*(p-o.r)-2*r*n*o.v)*s,o.r+=o.v*s;this.thump>0&&o.r<.08&&a.dur>0&&!a.slit&&(o.v+=this.thump*(1.1+1.6*(i*.618%1))),p<=0&&o.r<0&&(o.r=0,o.v=Math.abs(o.v)*.3)}let m=o.r,h=a.x,g=a.y??0,_=a.z,v=a.dur>0?ie(m):u>=0?this.up[u]:1;this.up[i]=v;let y=0,b=(a.yaw??0)*P*v,x=0,T=(a.lean??0)*P,E=(this.chapterShown&&u>=0?0:a.fold??88)*P,D=a.s??1,k=1;a.slit?(g=(a.y??0)-a.slit*(1-m),y=T):y=a.dur>0?E+(T-E)*m:T*(u>=0?ie(this.state[u].r):1),a.parent&&a.parent!==`upper`||(g+=s.Y0+.002+9e-4*(this.specs.length-i));let A=C,j=(a.phase??0)*1.3;switch(a.move){case`wave`:{let e=a.phase??0;y+=A*(.028*Math.sin(S*1.25+j)+.012*Math.sin(S*2.1+j*2)+.012*this.jolt),h+=A*.008*Math.sin(S*.8+j*1.7)+this.tab*(e%2?.032:-.032)*(.6+e*.1);break}case`hullbob`:{let e=this.wind;x+=A*(.042*Math.sin(S*1.15)*e+.016*Math.sin(S*2.3+1))-Math.max(-.2,Math.min(.2,this.rock*.9)),g+=A*(.012*Math.sin(S*1.5+.4)+.004*Math.sin(S*3.3))+Math.abs(this.rock)*.02,h+=A*.008*Math.sin(S*.55)+Math.max(-.03,Math.min(.03,this.rock*.1)),y+=A*.018*Math.sin(S*.9+1.1);break}case`sail`:b+=A*(.09*Math.sin(S*.7)*this.wind+.03*Math.sin(S*1.7))+Math.max(-.25,Math.min(.25,this.rock*.8));break;case`flag`:b+=A*(.5*Math.sin(S*5.1)+.3*Math.sin(S*7.7));break;case`palm`:x+=A*(.018*Math.sin(S*.95+j)*this.wind+.008*Math.sin(S*2.3+j)),y+=A*.01*Math.sin(S*.7+j);break;case`cloud`:h+=A*.012*Math.sin(S*.33+j),x+=A*.018*Math.sin(S*.5+j),b+=A*.05*Math.sin(S*.42+j);break;case`spin`:x+=S*.12;break;case`gull`:x+=A*.06*Math.sin(S*.8+j),b+=A*.3*Math.sin(S*.5+j);break;case`wingN`:y+=v*(-.25-.95*(this.flap*.9+.06)*(.5+.5*Math.sin(this.flapPhase)));break;case`wingF`:y+=v*(.25+.95*(this.flap*.9+.06)*(.5+.5*Math.sin(this.flapPhase)));break;case`crest`:x+=.08*Math.sin(S*1.3)+this.flap*.5;break;case`arm`:x+=-.55+A*(.24*Math.sin(S*2.4)*(.4+.6*N(.2,.9,Math.sin(S*.31+1)*.5+.5))+this.tab*.5);break;case`yas`:x+=A*.008*Math.sin(S*1.1),y+=A*.006*Math.sin(S*.8)-this.tab*.03;break;case`hoopoe`:g+=A*.01*Math.sin(S*2.1)+this.flap*.02*Math.sin(this.flapPhase),x+=A*.03*Math.sin(S*1.4);break;case`dolphin`:{let e=this.leap;k=e<=0||e>=1?0:N(.7,.97,C),h+=(e-.5)*.42,g+=-.18+Math.sin(Math.PI*e)*.58,x+=1.05-2.1*e;break}case`tab`:h+=this.tab*this.tabTravel,y=-Math.PI/2+.03*(1-m),k=m}(a.slit&&m<.002||this.theta<.012)&&(k=0),(!a.parent&&d.phi>1.8||f&&d.phi>2.8)&&(k=0);let ee=a.flex?-o.v*.05*a.flex:0,te=D,ne=Math.max(D*k,1e-5);re(w,h,g,_,b,y,x,ne,ne,k===0?1e-5:te);let M=O(l,w,this.world[i]),ae=a.mesh===`strip`?a.w??1:1,F=c*20,I=this.parts;I[F]=M[0],I[F+1]=M[4]*ae,I[F+2]=M[8],I[F+3]=M[12],I[F+4]=M[1],I[F+5]=M[5]*ae,I[F+6]=M[9],I[F+7]=M[13],I[F+8]=M[2],I[F+9]=M[6]*ae,I[F+10]=M[10],I[F+11]=M[14];let L=(a.v??0)*Math.min(1,m*1.2);I[F+12]=l[8],I[F+13]=l[9],I[F+14]=l[10],I[F+15]=L,I[F+16]=0,I[F+17]=(a.belly??0)*ie(m),I[F+18]=ee,I[F+19]=He(M)<0?-1:1}return this.thump=0,this.stepChapters(t,n),this.writeBook(),n}stepChapters(e,t){let n=Math.min(e,1/60)/2;for(let t=0;t<Math.max(1,Math.round(e/n));t++)this.doorsV+=(70*(this.doorsTarget-this.doors)-8.5*this.doorsV)*n,this.doors+=this.doorsV*n,this.doors<0&&(this.doors=0,this.doorsV*=-.2);for(let r=0;r<5;r++)if(t)this.chapterOut[r]=this.chapterTarget[r],this.chapterV[r]=0;else for(let t=0;t<Math.max(1,Math.round(e/n));t++)this.chapterV[r]+=(150*(this.chapterTarget[r]-this.chapterOut[r])-15*this.chapterV[r])*n,this.chapterOut[r]+=this.chapterV[r]*n}writeBook(){let e=this.parts,t=(t,r)=>{let i=t*20;e[i]=r[0],e[i+1]=r[4],e[i+2]=r[8],e[i+3]=r[12],e[i+4]=r[1],e[i+5]=r[5],e[i+6]=r[9],e[i+7]=r[13],e[i+8]=r[2],e[i+9]=r[6],e[i+10]=r[10],e[i+11]=r[14],e[i+12]=0,e[i+13]=0,e[i+14]=0,e[i+15]=0,e[i+16]=n,e[i+17]=0,e[i+18]=t===1?-1:1,e[i+19]=He(r)<0?-1:1},n=1-N(0,.55,this.theta/Math.PI);if(t(0,this.lower),t(1,this.upper),this.tall&&this.theta>.012)t(4,this.leafM);else{let e=D();e[0]=e[5]=e[10]=1e-5,e[13]=-1,t(4,e)}this.writeChapters(t);let{T:r,hinge:i,H:a,over:o}=s,c=[i,0,0],l=Math.cos(this.theta),u=Math.sin(this.theta),d=i,f=r-s.Y0,p=[d*l-f*u,s.Y0+d*u+f*l,0],m=p[0]-c[0],h=p[1]-c[1],g=Math.hypot(m,h)||1,_=.115*(1-this.theta/Math.PI)**.7,v=[(c[0]+p[0])/2+-h/g*_,(c[1]+p[1])/2+m/g*_,0];v[1]<.001&&(v[1]=.001);let y=this.dir;e[40]=c[0]*y,e[41]=c[1],e[42]=c[2],e[43]=0,e[44]=v[0]*y,e[45]=v[1],e[46]=v[2],e[47]=0,e[48]=p[0]*y,e[49]=Math.max(.001,p[1]),e[50]=p[2],e[51]=0,e[52]=0,e[53]=0,e[54]=1,e[55]=0,e[56]=0,e[57]=0,e[58]=0,e[59]=y;let b=N(.3,1,this.theta/Math.PI),x=.16*(1-b)+.012*b,S=s.Y0-.016,C=this.time,w=.008*Math.sin(C*.9),T=M(x-.07,x+.1,b)+w,E=a/2+M(.25,.075,b);e[60]=x*y,e[61]=S,e[62]=a/2-.03,e[63]=0,e[64]=x*y,e[65]=S,e[66]=a/2+.012,e[67]=0,e[68]=(x+.006)*y,e[69]=.0025,e[70]=a/2+.05,e[71]=0,e[72]=T*y,e[73]=.0025,e[74]=E,e[75]=0,e[76]=.027,e[77]=0,e[78]=0,e[79]=y}writeChapters(e){let t=this.parts,n=D();n[0]=n[5]=n[10]=1e-5,n[13]=-1;let{Y0:r,W:i}=s;this.turns.forEach((r,i)=>{let a=5+i;if(!this.chapterShown)return e(a,n);e(a,this.root);let o=a*20;t[o+12]=r.phi,t[o+13]=r.k,t[o+14]=(2-i)*7e-4+2e-4,t[o+15]=0,t[o+16]=2*ae(.4,2.7,r.phi),t[o+17]=i,t[o+18]=i<2?i+1:0}),e(8,this.chapterShown?this.lower:n);let a=(t,i)=>{if(!this.chapterShown)return e(t,n);let a=-i*Math.min(1.12,this.doors)*1.78,o=Math.cos(a),s=Math.sin(a),c=D();c[0]=o,c[1]=s,c[4]=-s,c[5]=o,c[12]=l.cx+i*l.a,c[13]=r-.0014,e(t,O(this.lower,c))};a(9,-1),a(10,1);for(let n=0;n<5;n++){let a=D();a[12]=i+(this.chapterOut[n]-1)*(d.out+.02),a[13]=r-.0072-n*.0026,a[14]=d.z0+n*d.pitch,e(11+n,O(this.lower,a));let o=(11+n)*20,s=this.tints[n]??[.5,.5,.5];t[o+16]=s[0],t[o+17]=s[1],t[o+18]=s[2]}}},He=e=>e[0]*(e[5]*e[10]-e[6]*e[9])-e[4]*(e[1]*e[10]-e[2]*e[9])+e[8]*(e[1]*e[6]-e[2]*e[5]),X=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler2DShadow;
`,Ue=`
layout(std140) uniform Parts { vec4 PARTS[480]; };
layout(location=0) in vec3 a_p;
layout(location=1) in vec3 a_n;
layout(location=2) in vec2 a_uv;
layout(location=3) in uvec2 a_id;
struct Rigged { vec3 w, n, tx, ty, sh; float lx, flip; };
Rigged rig() {
  Rigged o;
  int b = int(a_id.x) * 5;
  int mat = int(a_id.y);
  vec4 r0 = PARTS[b], r1 = PARTS[b + 1], r2 = PARTS[b + 2], s = PARTS[b + 3], d = PARTS[b + 4];
  o.flip = d.w;
  o.sh = vec3(0.);
  o.lx = 0.;
  if (mat == ${c.Spine}) {
    float t = a_p.x;
    vec3 A = r0.xyz, C = r1.xyz, B = r2.xyz, Z = s.xyz;
    float u = 1. - t;
    o.w = u * u * A + 2. * u * t * C + t * t * B + Z * a_p.z;
    vec3 tg = normalize(2. * u * (C - A) + 2. * t * (B - C) + vec3(1e-5, 0., 0.));
    o.n = normalize(cross(tg, Z)) * -d.w;
    o.tx = tg; o.ty = Z;
    return o;
  }
  if (mat == ${c.Ribbon}) {
    float t = a_p.x, u = 1. - t;
    vec3 P0 = r0.xyz, P1 = r1.xyz, P2 = r2.xyz, P3 = s.xyz;
    vec3 c = u * u * u * P0 + 3. * u * u * t * P1 + 3. * u * t * t * P2 + t * t * t * P3;
    vec3 tg = normalize(3. * u * u * (P1 - P0) + 6. * u * t * (P2 - P1) + 3. * t * t * (P3 - P2) + vec3(0., 0., 1e-5));
    vec3 across = normalize(cross(tg, vec3(0., 1., 0.)) + vec3(1e-4, 0., 0.));
    o.w = c + across * a_p.z * d.x;
    o.n = normalize(cross(across, tg));
    if (o.n.y < 0.) o.n = -o.n;
    o.tx = tg; o.ty = across;
    return o;
  }
  mat3 RM = mat3(r0.x, r1.x, r2.x, r0.y, r1.y, r2.y, r0.z, r1.z, r2.z);
  if (mat >= ${c.TurnFront} && mat <= ${c.TurnEdge}) {
    // A bowed sheet: its angle grows evenly from the gutter to the fore-edge, so its position has a closed form.
    float phi = s.x, k = s.y, x = a_p.x;
    float b = phi + k * x;
    vec2 c = abs(k) > 1e-3 ? vec2(sin(b) - sin(phi), cos(phi) - cos(b)) / k : x * vec2(cos(phi), sin(phi));
    vec2 nr = vec2(-sin(b), cos(b)), tn = vec2(cos(b), sin(b));
    float e = exp(-x / .03) * ${s.dip.toFixed(4)} * d.x;
    float off = a_p.y + e + s.z;
    vec3 q = vec3(c + nr * off + vec2(0., ${s.Y0.toFixed(4)}), a_p.z);
    o.w = vec3(dot(r0, vec4(q, 1.)), dot(r1, vec4(q, 1.)), dot(r2, vec4(q, 1.)));
    o.n = RM * vec3(tn * a_n.x + nr * a_n.y, a_n.z);
    o.tx = RM * vec3(tn, 0.);
    o.ty = RM * vec3(0., 0., 1.);
    o.sh = vec3(d.y, d.z, 0.);
    return o;
  }
  vec3 lp = a_p;
  vec3 ltx = vec3(1., 0., 0.), lty = vec3(0., 1., 0.);
  float f = d.z;
  if (abs(f) > 1e-3 && mat <= ${c.Edge}) {
    float ang = f * lp.y, sa = sin(ang), ca = cos(ang);
    lp = vec3(lp.x, sa / f - lp.z * sa, (1. - ca) / f + lp.z * ca);
    lty = vec3(0., ca, sa);
  }
  if (d.x > 0. && (mat == ${c.Page} || mat == ${c.Block})) {
    float e = exp(-a_p.x / .03) * ${s.dip.toFixed(4)} * d.x;
    lp.y += (mat == ${c.Page} ? 1. : a_uv.y) * e * d.z;
  }
  if (d.y != 0. && mat <= ${c.Edge}) {
    lp.z += d.y * lp.x * lp.x;
    ltx = vec3(1., 0., 2. * d.y * a_p.x);
  }
  vec4 h = vec4(lp, 1.);
  o.w = vec3(dot(r0, h), dot(r1, h), dot(r2, h));
  mat3 M = mat3(r0.x, r1.x, r2.x, r0.y, r1.y, r2.y, r0.z, r1.z, r2.z);
  o.tx = M * ltx;
  o.ty = M * lty;
  o.n = M * a_n;
  if (mat == ${c.ChapterTab}) o.sh = d.xyz;
  if (s.w != 0.) {
    o.lx = a_p.x - d.x;
    float sg = s.w;
    o.w += s.xyz * sg * abs(o.lx);
    o.sh = s.xyz * sg;
  }
  return o;
}`,Z=`${X}${Ue}
uniform mat4 u_svp;
void main() {
  Rigged r = rig();
  gl_Position = u_svp * vec4(r.w, 1.);
}`,We=`${X}
out vec4 o; void main() { o = vec4(1.); }`,Ge=`${X}${Ue}
uniform vec4 u_occ; out float v_h; flat out int v_book;
void main() {
  Rigged r = rig();
  v_h = r.w.y;
  int m = int(a_id.y);
  v_book = (m >= ${c.Page} && m <= ${c.Spine}) || m == ${c.Leaf} || m == ${c.Window} || m == ${c.ChapterTab} ? 1 : 0;
  if ((m >= ${c.TurnFront} && m <= ${c.TurnEdge}) || m == ${c.DoorFront} || m == ${c.DoorBack} || m == ${c.DoorEdge}) v_book = 2;
  gl_Position = vec4((r.w.xz - u_occ.xy) * u_occ.zw * vec2(1., -1.), .5, 1.);
}`,Ke=`${X}
in float v_h; flat in int v_book; out vec4 o;
void main() {
  if (v_book == 2) {
    // A page or a door only shades what's under it once it has lifted off.
    float h = max(v_h - ${s.Y0.toFixed(3)}, 0.);
    o = vec4(exp(-h * 3.) * smoothstep(.012, .07, h), 0., 0., 1.);
  } else if (v_book == 1) o = vec4(0., exp(-max(v_h, 0.) * 6.), 0., 1.);
  else o = vec4(exp(-max(v_h - ${s.Y0.toFixed(3)}, 0.) * 8.), 0., 0., 1.);
}`,qe=`${X}
out vec2 v_uv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.);
  v_uv = p * .5 + .5;
  gl_Position = vec4(p, 0., 1.);
}`,Je=`${X}
in vec2 v_uv; uniform sampler2D u_t; uniform vec2 u_d; out vec4 o;
void main() {
  vec4 c = texture(u_t, v_uv) * .1964;
  c += (texture(u_t, v_uv + u_d * 1.41) + texture(u_t, v_uv - u_d * 1.41)) * .2969;
  c += (texture(u_t, v_uv + u_d * 3.29) + texture(u_t, v_uv - u_d * 3.29)) * .0945;
  c += (texture(u_t, v_uv + u_d * 5.17) + texture(u_t, v_uv - u_d * 5.17)) * .0104;
  o = c;
}`,Ye=e=>`
uniform sampler2DShadow u_sh;
uniform sampler2D u_shd;
uniform mat4 u_svp;
uniform vec4 u_sp; // search radius, penumbra scale, smallest and largest radius
uniform float u_fade; // how fast a shadow thins with distance from what casts it
const vec2 DISK[16] = vec2[16](
  vec2(.1250,.0000),vec2(-.2024,.1854),vec2(.0413,-.3513),vec2(.2982,.3024),vec2(-.4802,-.0882),vec2(.4212,-.3481),
  vec2(-.1274,.5789),vec2(-.3772,-.5228),vec2(.6620,.1830),vec2(-.6390,.3584),vec2(.2460,-.7248),vec2(.3180,.7420),
  vec2(-.7825,-.3097),vec2(.8230,-.2780),vec2(-.3760,.8330),vec2(-.2570,-.9150));
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }
float shadow(vec3 w, vec3 n) {
  vec4 q = u_svp * vec4(w + n * .0045, 1.);
  vec3 c = q.xyz * .5 + .5;
  if (c.x < .002 || c.x > .998 || c.y < .002 || c.y > .998) return 1.;
  float phi = ign(gl_FragCoord.xy) * 6.2832;
  float cs = cos(phi), sn = sin(phi);
  mat2 R = mat2(cs, sn, -sn, cs);
  float sum = 0., cnt = 0.;
  for (int i = 0; i < 8; i++) {
    float d = texture(u_shd, c.xy + R * DISK[i * 2] * u_sp.x).r;
    if (d < c.z - .0004) { sum += d; cnt += 1.; }
  }
  if (cnt < .5) return 1.;
  float rad = clamp((c.z - sum / cnt) * u_sp.y, u_sp.z, u_sp.w);
  float s = 0.;
  for (int i = 0; i < ${e}; i++) s += texture(u_sh, vec3(c.xy + R * DISK[i * ${16/e}] * rad, c.z - .0004));
  float avg = (c.z - sum / cnt);
  return 1. - (1. - s / ${e}.) * exp(-avg * u_fade);
}
vec3 finish(vec3 c) {
  // A gentle shoulder, then sRGB, then dither so soft gradients don't band.
  c = mix(c, 1. - (1. - .82) * exp(-(c - .82) / (1. - .82)), step(.82, c));
  c = pow(max(c, vec3(0.)), vec3(1. / 2.2));
  float n = ign(gl_FragCoord.xy + 17.3) - .5;
  return c + n / 255.;
}
`,Xe=`${X}${Ue}
uniform mat4 u_vp;
out vec3 v_w, v_n, v_tx, v_ty, v_sh; out vec2 v_uv, v_lp; out float v_lx; flat out float v_flip, v_part; flat out int v_mat;
void main() {
  Rigged r = rig();
  v_w = r.w; v_n = r.n; v_tx = r.tx; v_ty = r.ty; v_sh = r.sh; v_lx = r.lx; v_flip = r.flip; v_part = float(a_id.x);
  v_uv = a_uv; v_lp = a_p.xy; v_mat = int(a_id.y);
  gl_Position = u_vp * vec4(r.w, 1.);
}`,Ze=e=>`${X}
in vec3 v_w, v_n, v_tx, v_ty, v_sh; in vec2 v_uv, v_lp; in float v_lx; flat in float v_flip, v_part; flat in int v_mat;
out vec4 o;
uniform sampler2D u_atlas, u_pages, u_cover, u_blind, u_fibre, u_weave, u_occt;
uniform vec3 u_cam, u_L, u_key, u_sky, u_gnd;
uniform vec4 u_occ;
uniform float u_dir;
uniform vec4 u_sun; // where the paper sun is, and how far it has risen
uniform sampler2D u_plate, u_plateFoil, u_tabs, u_leaves;
uniform vec3 u_accent;
uniform vec3 u_back0, u_back1, u_back2;
uniform float u_backArt, u_rim;
${Ye(e)}
// The arch cut through a chapter's page. Negative inside. p is across the page from the gutter, then along it.
float archD(vec2 p) {
  vec2 q = p - vec2(${l.cx.toFixed(4)}, ${l.zs.toFixed(4)});
  float ax = abs(q.x);
  float d = q.y < 0. ? length(vec2(ax + ${l.c.toFixed(4)}, q.y)) - ${(l.a+l.c).toFixed(4)} : ax - ${l.a.toFixed(4)};
  return max(d, q.y - ${(l.zb-l.zs).toFixed(4)});
}
vec3 bump(vec3 N, vec3 p, float h) {
  vec3 dx = dFdx(p), dy = dFdy(p);
  float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dy, N), r2 = cross(N, dx);
  float det = dot(dx, r1);
  return normalize(abs(det) * N - sign(det) * (hx * r1 + hy * r2));
}
vec3 gold(vec3 R, vec3 w, float n, float grain) {
  // A little room for the foil to reflect: pale all round, darker low down, and soft boxes overhead whose edges slide across
  // the cover as it turns. Offsetting by position is what makes the light travel over the stamping instead of flashing all at once.
  vec3 D = normalize(R + w * .3);
  D.x *= u_dir;
  float room = smoothstep(-.3, .75, D.y);
  float a = smoothstep(.962, .996, dot(D, normalize(vec3(-.30, .60, -.74))));
  float b = smoothstep(.88, .985, dot(D, normalize(vec3(.32, .74, .58))));
  float c = smoothstep(.86, .985, dot(D, normalize(vec3(-.72, .62, .3))));
  float e = .25 + .3 * room + .62 * a + .8 * b + .6 * c + (n - .5) * .34;
  e *= .9 + .24 * grain;
  vec3 deep = vec3(.34, .16, .03), mid = vec3(.84, .53, .13), hi = vec3(1.14, .88, .44);
  vec3 f = mix(deep, mid, clamp(e * 1.75, 0., 1.));
  return mix(f, hi, smoothstep(.62, 1.15, e));
}
void main() {
  int mat = v_mat;
  vec3 V = normalize(u_cam - v_w);
  vec3 N;
  if (mat <= ${c.Back}) {
    vec3 T = v_tx + v_sh * (v_lx < 0. ? -1. : 1.);
    N = normalize(cross(T, v_ty)) * v_flip;
    if (mat == ${c.Back}) N = -N;
  } else {
    N = normalize(v_n);
  }
  vec3 G = N;
  vec3 alb;
  float spec = .025, sheen = 0., trans = 0.;
  vec3 extra = vec3(0.);
  float ao = 1.;
  bool metal = false;
  vec3 foilCol = vec3(0.);
  float foil = 0.;

  if (mat <= ${c.Edge}) {
    alb = texture(u_atlas, v_uv).rgb;
    if (mat == ${c.Back} && u_backArt > 0.) {
      // Each piece a different sheet from the world's colours, so the folded pile reads as layers of cut paper.
      float t = fract(v_part * .618034);
      alb = mix(alb, t < .5 ? mix(u_back0, u_back1, t * 2.) : mix(u_back1, u_back2, t * 2. - 1.), u_backArt);
    }
    N = bump(N, v_w, (texture(u_fibre, v_lp * 3.1).r - .5) * .0011);
    alb *= 1. + (texture(u_fibre, v_lp * .4, 2.).r - .5) * .06;
    trans = mat == ${c.Edge} ? 0. : .42;
    if (mat == ${c.Edge}) alb *= 1.06;
    // Paper darkens toward where it meets the page.
    float h = v_w.y - ${s.Y0.toFixed(3)};
    ao *= mix(.74, 1., smoothstep(0., .17, h));
  } else if (mat == ${c.Wire}) {
    alb = texture(u_atlas, v_uv).rgb;
    spec = .1;
  } else if (mat == ${c.Leaf}) {
    bool top = v_uv.x < .47;
    alb = texture(u_pages, top ? vec2(.75, .02) : v_uv).rgb;
    if (top && u_backArt > 0.) alb = mix(alb, texture(u_leaves, vec2(.5 + .5 * (v_uv.x / .45) * u_dir, (2. - clamp(v_uv.y, .002, .998)) * .5)).rgb, u_backArt);
    N = bump(N, v_w, (texture(u_fibre, v_uv * vec2(6.2, 4.2)).r - .5) * .0008);
    alb *= 1. + (texture(u_fibre, v_uv * .8, 2.).r - .5) * .03;
    trans = .25;
  } else if (mat == ${c.TurnBack} || mat == ${c.DoorFront} || mat == ${c.Window}) {
    float x01 = v_uv.x;
    bool illustrated = mat == ${c.TurnBack} && v_sh.y > .5;
    // The printed sheet is two pages wide: the title page on its left half, the arch's page on its right. In Arabic the mesh is
    // mirrored, so the print is read the other way across it and its words stay the right way round.
    vec2 puv = mat == ${c.TurnBack} ? vec2(.5 * (u_dir > 0. ? 1. - x01 : x01), v_uv.y) : vec2(.5 + .5 * (u_dir > 0. ? x01 : 1. - x01), v_uv.y);
    vec2 buv = vec2(x01, v_uv.y * ${s.H.toFixed(3)});
    // A spread runs across two facing pages, so it's read by where the sheet lands in the world, which also keeps it the right way round in Arabic.
    alb = illustrated ? texture(u_leaves, vec2(.5 - .5 * x01 * u_dir, (clamp(v_uv.y, .002, .998) + v_sh.y - 1.) * .5)).rgb : texture(u_plate, puv).rgb;
    N = bump(N, v_w, (texture(u_fibre, buv * 3.1).r - .5) * .0008);
    alb *= 1. + (texture(u_fibre, buv * .4, 2.).r - .5) * .05;
    if (mat != ${c.DoorFront}) ao *= mix(.55, 1., smoothstep(0., .1, x01));
    spec = .03;
    sheen = .02;
    if (!illustrated) {
      float cf = texture(u_plateFoil, puv).r;
      float wf = fwidth(cf) * .7 + .002;
      foil = smoothstep(.5 - wf, .5 + wf, cf);
      if (foil > 0.) {
        vec3 Nf = bump(normalize(v_n), v_w, -foil * .002);
        float n0 = texture(u_fibre, buv * vec2(.5, .7), 3.).r, n1 = texture(u_fibre, buv.yx * vec2(.6, .45) + .3, 3.).r;
        Nf = normalize(Nf + vec3(n0 - .5, 0., n1 - .5) * .3);
        foilCol = gold(reflect(-V, Nf), v_w, n0, texture(u_fibre, buv * 3.1).r);
        foilCol *= mix(.72, 1., smoothstep(.5, .75, cf));
      }
    }
  } else if (mat == ${c.DoorBack}) {
    alb = u_accent;
    N = bump(N, v_w, (texture(u_fibre, v_uv * 3.1).r - .5) * .0008);
    alb *= 1. + (texture(u_fibre, v_uv * .4, 2.).r - .5) * .06;
    trans = .15;
  } else if (mat == ${c.TurnEdge} || mat == ${c.DoorEdge}) {
    alb = vec3(.86, .78, .63);
  } else if (mat == ${c.ChapterTab}) {
    // Card in the chapter's colour with its emblem printed on it. The sides are the same card, seen on its edge.
    float m = texture(u_tabs, v_uv).r;
    float wm = fwidth(m) * .7 + .002;
    m = smoothstep(.5 - wm, .5 + wm, m);
    float nap = texture(u_fibre, v_w.xz * 3.1).r;
    N = bump(N, v_w, (nap - .5) * .0009);
    alb = mix(v_sh, vec3(.93, .80, .55), m);
    alb *= 1. + (texture(u_fibre, v_w.xz * .4, 2.).r - .5) * .08;
    spec = .05;
    sheen = .05;
    if (abs(v_n.y) < .5) alb *= .78;
  } else if (mat == ${c.Page} || mat == ${c.TurnFront}) {
    alb = mat == ${c.TurnFront} && v_sh.x > .5 ? texture(u_leaves, vec2(.5 + v_uv.x * u_dir, (clamp(v_uv.y, .002, .998) + v_sh.x - 1.) * .5)).rgb : texture(u_pages, v_uv).rgb;
    vec2 uv = vec2(v_uv.x * 2., v_uv.y * ${s.H.toFixed(3)});
    N = bump(N, v_w, (texture(u_fibre, uv * 3.1).r - .5) * .0008);
    alb *= 1. + (texture(u_fibre, uv * .4, 2.).r - .5) * .03;
    float x = v_uv.x < .5 ? v_uv.x * 2. : (1. - v_uv.x) * 2.;
    // The curve into the gutter holds a soft shadow, and the sprayed edge bleeds a little pink into the sheet.
    ao *= mix(.6, 1., smoothstep(0., .1, x));
    float e = min(1. - x, min(v_uv.y, 1. - v_uv.y) * ${s.H.toFixed(3)});
    alb = mix(alb, vec3(.95, .46, .55), .32 * exp(-e / .0045));
  } else if (mat == ${c.Block}) {
    // The sprayed page edge: seven thick boards to a half.
    float n = 7.;
    float f = fract(v_uv.y * n);
    float w = fwidth(v_uv.y * n) * 1.2;
    float gap = 1. - smoothstep(.0, .12 + w, min(f, 1. - f));
    float noise = texture(u_fibre, vec2(v_uv.x, v_uv.y * .12) * 1.4, 1.).r;
    alb = mix(vec3(.90, .055, .23), vec3(.98, .12, .30), smoothstep(.3, .7, noise)) * mix(1., .46, gap * (1. - min(w * 2., 1.)));
    ao *= mix(.58, 1., smoothstep(0., .22, v_uv.y) * smoothstep(1.02, .86, v_uv.y));
    spec = .02;
  } else if (mat == ${c.Cover} || mat == ${c.Cloth} || mat == ${c.Spine}) {
    alb = vec3(.0042, .060, .066);
    vec2 cuv = v_uv * vec2(1.05, 1.41);
    if (mat == ${c.Spine}) cuv = v_uv * vec2(.22, 1.41);
    float weave = texture(u_weave, cuv * 7.).r;
    N = bump(N, v_w, (weave - .5) * .0026);
    alb *= .74 + .6 * weave;
    float clothNoise = texture(u_fibre, cuv * .5, 2.).r;
    alb *= 1. + (clothNoise - .5) * .3;
    sheen = .045;
    spec = .035;
    if (mat == ${c.Cover}) {
      float cf = texture(u_cover, v_uv).r, cb = texture(u_blind, v_uv).r;
      // The hinge groove by the spine.
      float gx = u_dir > 0. ? v_uv.x : 1. - v_uv.x;
      float gr = smoothstep(.0, .022, gx - .012) * smoothstep(.062, .036, gx);
      N = normalize(N + normalize(cross(vec3(0., 0., 1.), N)) * 0.0);
      ao *= 1. - .34 * gr;
      // Blind stamping: pressed into the cloth with no colour.
      float wb = fwidth(cb) * .7 + .004;
      float blind = smoothstep(.5 - wb, .5 + wb, cb);
      // Pressed cloth is flatter, darker and takes a slight shine.
      N = normalize(mix(N, normalize(v_n), blind * .75));
      alb *= 1. - .34 * blind;
      spec += .05 * blind;
      sheen += .02 * blind;
      // The foil, pressed in too, with a slightly burnished surface.
      float wf = fwidth(cf) * .7 + .002;
      foil = smoothstep(.5 - wf, .5 + wf, cf);
      if (foil > 0.) {
        vec3 Nf = bump(normalize(v_n), v_w, -foil * .003);
        // Foil never lies quite flat: slow dents make its light wander, and the cloth shows through as a fine texture.
        float n0 = texture(u_fibre, v_uv * vec2(.5, .7), 3.).r, n1 = texture(u_fibre, v_uv.yx * vec2(.6, .45) + .3, 3.).r;
        Nf = normalize(Nf + vec3(n0 - .5, 0., n1 - .5) * .32 + (weave - .5) * .05);
        float grain = texture(u_fibre, cuv * 7.).r;
        foilCol = gold(reflect(-V, Nf), v_w, n0, grain);
        // The stamp bites into the cloth, so the foil is a touch darker just inside its edge.
        foilCol *= mix(.7, 1., smoothstep(.5, .72, cf));
      }
    }
    if (mat == ${c.Spine}) {
      // Foil bands across the spine.
      float z = abs(v_uv.y - .5) * 2.;
      float aa = fwidth(z) + .001;
      float bands = 0.;
      for (int i = 0; i < 3; i++) {
        float c = i == 0 ? .92 : (i == 1 ? .86 : .06);
        float hw = i == 2 ? .006 : .009;
        bands = max(bands, 1. - smoothstep(hw - aa, hw + aa, abs(z - c)));
      }
      foil = bands;
      if (foil > 0.) foilCol = gold(reflect(-V, N), v_w, .5, .5);
    }
  } else if (mat == ${c.Ribbon}) {
    vec2 w = v_uv * vec2(90., 6.);
    alb = vec3(.92, .035, .17) * (.86 + .28 * sin(v_uv.y * 3.14159));
    alb *= 1. - .1 * smoothstep(.0, .04, abs(sin(w.x * 3.1415)) - .9);
    spec = .1; sheen = .2;
  } else {
    alb = vec3(.8);
  }

  // Light
  float ndl = dot(N, u_L);
  float gdl = dot(G, u_L);
  float vis = shadow(v_w, G);
  vec3 c = alb * u_key * max(ndl, 0.) * vis;
  // Thin paper glows when the light is behind it.
  if (trans > 0. && gdl < 0.) {
    float bv = shadow(v_w - G * .012, -G);
    c += alb * sqrt(max(alb, vec3(.001))) * u_key * trans * (-gdl) * bv;
  }
  // Soft light from the room, with the warm paper bouncing up from below.
  vec2 ouv = (v_w.xz - u_occ.xy) * u_occ.zw * vec2(.5, -.5) + .5;
  vec2 occ = texture(u_occt, ouv).rg;
  float up = clamp(N.y, 0., 1.);
  float above = exp(-max(v_w.y - ${s.Y0.toFixed(3)}, 0.) * 9.);
  if (mat <= ${c.Edge}) ao *= 1. - .45 * occ.r * above * (1. - up);
  else if (mat == ${c.Page} || mat == ${c.TurnFront} || mat == ${c.TurnBack} || mat == ${c.Window}) ao *= 1. - .62 * occ.r * above;
  vec3 amb = mix(u_gnd, u_sky, N.y * .5 + .5);
  c += alb * amb * ao;
  // The paper sun is a light of its own: a warm glow on what faces it, and through thin card that doesn't.
  if (u_sun.w > 0. && (mat <= ${c.Edge})) {
    vec3 sv = u_sun.xyz - v_w;
    float d2 = dot(sv, sv);
    vec3 sl = sv / sqrt(d2);
    float nl = dot(G, sl);
    float glow = max(nl, 0.) * .85 + max(-nl, 0.) * .85 * (trans / .42);
    c += alb * vec3(1., .72, .38) * glow * u_sun.w / (1. + d2 * 3.2) * .95;
  }
  // Cloth nap and a little gloss.
  float ndv = max(dot(N, V), 0.);
  vec3 H = normalize(u_L + V);
  float nh = max(dot(N, H), 0.);
  c += u_key * vis * spec * pow(nh, 22.) * step(0., ndl);
  c += (u_sky + u_key * .3) * sheen * pow(1. - ndv, 3.) * (.35 + .65 * vis);
  if (foil > 0.) {
    vec3 fc = foilCol * (.5 + .5 * vis);
    c = mix(c, fc, foil);
  }
  vec3 col = finish(c);
  float alpha = 1.;
  if (mat == ${c.Window}) {
    // Inside the arch the sheet is gone. Nested arches step down through the page block, each seen through the one above it with
    // its own parallax, and what's left at the bottom is transparent: the chapter itself, alive behind the book.
    vec2 lp = vec2(v_w.x * u_dir, v_w.z);
    vec3 Vl = vec3(V.x * u_dir, V.y, V.z);
    vec2 sl = Vl.xz / max(Vl.y, .2);
    float d0 = archD(lp);
    float w0 = fwidth(d0);
    float in0 = smoothstep(w0, -w0, d0);
    if (in0 > 0.) {
      float dn = archD(lp - sl * ${(l.depth*l.layers).toFixed(4)}) + ${(l.inset*l.layers).toFixed(4)};
      vec3 hc = vec3(0.);
      float ha = .6 * exp(min(dn, 0.) / .03) * u_rim;
      vec3 room = u_key * .62 + u_sky * .62;
      for (int i = ${l.layers}; i >= 1; i--) {
        float fi = float(i);
        vec2 q = lp - sl * ${l.depth.toFixed(4)} * fi;
        float di = archD(q) + ${l.inset.toFixed(4)} * fi;
        float wi = fwidth(di);
        float open = smoothstep(wi, -wi, di);
        // The card above throws a soft shadow on this one, deepest right under its edge.
        float dUp = archD(q + vec2(-.012, .018)) + ${l.inset.toFixed(4)} * (fi - 1.);
        float sh = smoothstep(-.05, .008, dUp);
        vec3 la = i == 1 ? vec3(.010, .075, .076) : (i == 2 ? u_accent : mix(u_accent, vec3(.82, .66, .42), .62));
        vec3 lc = finish(la * room * (1. - .68 * sh));
        float lip = 1. - smoothstep(.0012, .0034 + wi, abs(di));
        lc = mix(lc, finish(vec3(.86, .56, .17) * (.65 + .55 * room)), lip * step(di, .006));
        hc = mix(lc, hc, open);
        ha = mix(1., ha, open);
      }
      // A gilt lip on the cut through the page itself.
      float lip0 = smoothstep(.0052 + w0, .0016, -d0);
      hc = mix(hc, finish(vec3(.9, .6, .2) * (.7 + .5 * room)), lip0);
      ha = mix(ha, 1., lip0);
      col = mix(col, hc, in0);
      alpha = mix(1., ha, in0);
    }
  }
  o = vec4(col, alpha);
}`,Qe=`${X}
uniform mat4 u_vp; layout(location=0) in vec2 a_p; out vec3 v_w;
void main() {
  v_w = vec3(a_p.x, 0., a_p.y);
  gl_Position = u_vp * vec4(v_w, 1.);
}`,$e=e=>`${X}
in vec3 v_w; out vec4 o;
uniform vec4 u_occ;
uniform sampler2D u_occt, u_weave;
uniform vec2 u_res;
uniform vec3 u_shadow, u_pool;
uniform float u_poolA;
${Ye(e)}
void main() {
  float vis = shadow(v_w, vec3(0., 1., 0.));
  vis = mix(1., vis, smoothstep(2.5, 1.35, length(v_w.xz * vec2(.82, 1.))));
  vec2 ouv = (v_w.xz - u_occ.xy) * u_occ.zw * vec2(.5, -.5) + .5;
  vec2 occ = (ouv.x > 0. && ouv.x < 1. && ouv.y > 0. && ouv.y < 1.) ? texture(u_occt, ouv).rg : vec2(0.);
  // Soft linen. The table is exactly the page's white where nothing falls on it, so the section's edges don't show.
  float wv = texture(u_weave, v_w.xz * 5.).r;
  float near = smoothstep(1.7, .55, length(v_w.xz * vec2(.56, .8)));
  vec3 c = mix(u_shadow, vec3(1.), vis);
  c *= mix(vec3(.30, .42, .46), vec3(1.), 1. - .9 * occ.g);
  c *= 1. - .16 * occ.r;
  // A pool of colour under the book, as if the sea were showing through.
  c *= mix(vec3(1.), u_pool, u_poolA * near);
  c *= 1. - .022 * near * (wv - .5) * 2.;
  float sy = gl_FragCoord.y / u_res.y;
  float e = smoothstep(0., .1, sy) * smoothstep(1., .9, sy);
  c = mix(vec3(1.), c, e);
  c = pow(max(c, vec3(0.)), vec3(1. / 2.2));
  o = vec4(c + (ign(gl_FragCoord.xy + 5.1) - .5) / 255., 1.);
}`;function et(e,t,n){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r);throw Error(`storybook shader: ${t}`)}return r}function tt(e,t,n){let r=e.createProgram();if(e.attachShader(r,et(e,e.VERTEX_SHADER,t)),e.attachShader(r,et(e,e.FRAGMENT_SHADER,n)),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw Error(`storybook link: ${e.getProgramInfoLog(r)}`);let i={},a=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<a;t++){let n=e.getActiveUniform(r,t);i[n.name]=e.getUniformLocation(r,n.name)}let o=e.getUniformBlockIndex(r,`Parts`);return o!==e.INVALID_INDEX&&e.uniformBlockBinding(r,o,0),{p:r,u:i}}var nt=2.3,Q={x:0,z:0,hx:2.6,hz:1.7};function rt(e,t,n,r){let i=tt(e,Xe,Ze(n.taps)),a=tt(e,Qe,$e(n.taps)),o=tt(e,Z,We),s=tt(e,Ge,Ke),c=tt(e,qe,Je),l=e.createVertexArray();e.bindVertexArray(l);let u=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,u),e.bufferData(e.ARRAY_BUFFER,t.vertices,e.STATIC_DRAW);let d=e.createBuffer();e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,d),e.bufferData(e.ELEMENT_ARRAY_BUFFER,t.indices,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,t.stride,0),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,3,e.BYTE,!0,t.stride,12),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,2,e.UNSIGNED_SHORT,!0,t.stride,16),e.enableVertexAttribArray(3),e.vertexAttribIPointer(3,2,e.UNSIGNED_BYTE,t.stride,20);let f=t.indices.length,p=e.createVertexArray();e.bindVertexArray(p);let m=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,m),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-40,-40,40,-40,40,40,-40,-40,40,40,-40,40]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let h=e.createVertexArray();e.bindVertexArray(null);let g=e.createBuffer();e.bindBuffer(e.UNIFORM_BUFFER,g),e.bufferData(e.UNIFORM_BUFFER,7680,e.DYNAMIC_DRAW),e.bindBufferBase(e.UNIFORM_BUFFER,0,g);let _=e.createTexture();e.bindTexture(e.TEXTURE_2D,_),e.texStorage2D(e.TEXTURE_2D,1,e.DEPTH_COMPONENT24,n.shadow,n.shadow),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let v=e.createFramebuffer();e.bindFramebuffer(e.FRAMEBUFFER,v),e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,_,0),e.drawBuffers([e.NONE]),e.readBuffer(e.NONE);let y=e.createSampler();e.samplerParameteri(y,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.samplerParameteri(y,e.TEXTURE_COMPARE_FUNC,e.LEQUAL),e.samplerParameteri(y,e.TEXTURE_MIN_FILTER,e.LINEAR),e.samplerParameteri(y,e.TEXTURE_MAG_FILTER,e.LINEAR),e.samplerParameteri(y,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.samplerParameteri(y,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let b=e.createSampler();e.samplerParameteri(b,e.TEXTURE_MIN_FILTER,e.NEAREST),e.samplerParameteri(b,e.TEXTURE_MAG_FILTER,e.NEAREST),e.samplerParameteri(b,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.samplerParameteri(b,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let x=()=>{let t=e.createTexture();e.bindTexture(e.TEXTURE_2D,t),e.texStorage2D(e.TEXTURE_2D,1,e.RG8,n.occW,n.occH),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let r=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,r),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0),{t,f:r}},S=x(),C=x();e.bindFramebuffer(e.FRAMEBUFFER,null);let w=e.getExtension(`EXT_texture_filter_anisotropic`),T=w?e.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT):1,E={},D=(t,n,r)=>{let i=e.createTexture();return e.bindTexture(e.TEXTURE_2D,i),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([t,n,r,255])),i};E.atlas=D(200,200,200),E.pages=D(244,236,220),E.cover=D(0,0,0),E.blind=D(0,0,0),E.fibre=D(128,128,128),E.weave=D(128,128,128),E.plate=D(11,74,73),E.plateFoil=D(0,0,0),E.tabs=D(0,0,0),E.leaves=D(232,222,200);let k=(t,n,r,i=8)=>{let a=e.createTexture();e.bindTexture(e.TEXTURE_2D,a),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.NONE),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.texImage2D(e.TEXTURE_2D,0,r?e.SRGB8_ALPHA8:e.RGBA8,e.RGBA,e.UNSIGNED_BYTE,n),e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);let o=t===`fibre`||t===`weave`?e.REPEAT:e.CLAMP_TO_EDGE;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,o),w&&e.texParameterf(e.TEXTURE_2D,w.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(i,T)),e.deleteTexture(E[t]),E[t]=a},te=(t,n,i,a,o)=>{let s=t.u;e.uniformMatrix4fv(s.u_vp,!1,n.vp),e.uniformMatrix4fv(s.u_svp,!1,i),e.uniform4fv(s.u_sp,a),e.uniform4f(s.u_occ,Q.x,Q.z,1/Q.hx,1/Q.hz),e.uniform1i(s.u_sh,0),e.uniform1i(s.u_shd,1),e.uniform1i(s.u_occt,2),e.uniform1i(s.u_fibre,3),e.uniform1i(s.u_atlas,4),e.uniform1i(s.u_pages,5),e.uniform1i(s.u_cover,6),e.uniform1i(s.u_blind,7),e.uniform1i(s.u_weave,8),e.uniform1i(s.u_plate,9),e.uniform1i(s.u_plateFoil,10),e.uniform1i(s.u_tabs,11),e.uniform1i(s.u_leaves,12),e.uniform1f(s.u_dir,r),e.uniform1f(s.u_fade,o)};return{draw:(t,r)=>{e.bindBuffer(e.UNIFORM_BUFFER,g),e.bufferSubData(e.UNIFORM_BUFFER,0,t);let u=ee(r.light),d=O(A(-2.3,nt,-2.3,nt,.5,11),j([u[0]*6,u[1]*6+.1,u[2]*6],[0,.1,0],[0,1,0]));e.bindFramebuffer(e.FRAMEBUFFER,v),e.viewport(0,0,n.shadow,n.shadow),e.clear(e.DEPTH_BUFFER_BIT),e.enable(e.DEPTH_TEST),e.disable(e.BLEND),e.disable(e.CULL_FACE),e.enable(e.POLYGON_OFFSET_FILL),e.polygonOffset(1.6,2.2),e.useProgram(o.p),e.uniformMatrix4fv(o.u.u_svp,!1,d),e.bindVertexArray(l),e.drawElements(e.TRIANGLES,f,e.UNSIGNED_INT,0),e.disable(e.POLYGON_OFFSET_FILL),e.bindFramebuffer(e.FRAMEBUFFER,S.f),e.viewport(0,0,n.occW,n.occH),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.disable(e.DEPTH_TEST),e.enable(e.BLEND),e.blendEquation(e.MAX),e.useProgram(s.p),e.uniform4f(s.u.u_occ,Q.x,Q.z,1/Q.hx,1/Q.hz),e.drawElements(e.TRIANGLES,f,e.UNSIGNED_INT,0),e.disable(e.BLEND),e.blendEquation(e.FUNC_ADD),e.useProgram(c.p),e.uniform1i(c.u.u_t,0),e.bindVertexArray(h),e.activeTexture(e.TEXTURE0),e.bindSampler(0,null),e.bindFramebuffer(e.FRAMEBUFFER,C.f),e.bindTexture(e.TEXTURE_2D,S.t),e.uniform2f(c.u.u_d,1/n.occW,0),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,S.f),e.bindTexture(e.TEXTURE_2D,C.t),e.uniform2f(c.u.u_d,0,1/n.occH),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,r.res[0],r.res[1]),e.clearColor(1,1,1,1),e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT),e.enable(e.DEPTH_TEST);let m=(t,n,r=null)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,n),e.bindSampler(t,r)};m(0,_,y),m(1,_,b),m(2,S.t),m(3,E.fibre),m(4,E.atlas),m(5,E.pages),m(6,E.cover),m(7,E.blind),m(8,E.weave),m(9,E.plate),m(10,E.plateFoil),m(11,E.tabs),m(12,E.leaves);let x=[.012,10.5*.14/(2*nt),.6/n.shadow,.013];e.useProgram(a.p),te(a,r,d,x,26),e.uniform2f(a.u.u_res,r.res[0],r.res[1]),e.uniform3fv(a.u.u_shadow,r.shadowTint),e.uniform3fv(a.u.u_pool,r.pool),e.uniform1f(a.u.u_poolA,r.poolA),e.bindVertexArray(p),e.drawArrays(e.TRIANGLES,0,6),e.useProgram(i.p),te(i,r,d,x,.3),e.uniform3fv(i.u.u_cam,r.cam),e.uniform3fv(i.u.u_L,u),e.uniform3fv(i.u.u_key,r.key),e.uniform3fv(i.u.u_sky,r.sky),e.uniform3fv(i.u.u_gnd,r.gnd),e.uniform4fv(i.u.u_sun,r.sun),e.uniform3fv(i.u.u_accent,r.accent),e.uniform3fv(i.u.u_back0,r.backs[0]),e.uniform3fv(i.u.u_back1,r.backs[1]),e.uniform3fv(i.u.u_back2,r.backs[2]),e.uniform1f(i.u.u_backArt,r.backArt),e.uniform1f(i.u.u_rim,r.rim),e.bindVertexArray(l),e.drawElements(e.TRIANGLES,f,e.UNSIGNED_INT,0),e.bindVertexArray(null)},setTexture:k,dispose:()=>{e.getExtension(`WEBGL_lose_context`)?.loseContext()}}}var it={en:{pull:`Pull`,tab:`Pull-tab: rocks the boat and makes the hoopoe fly`,art:`A cloth-bound storybook lying open. A paper sea, islands, a dhow, Yasmina and her hoopoe stand up out of its pages.`},ar:{pull:`اسحب`,tab:`لسان السحب: يهزّ المركب ويجعل الهدهد يطير`,art:`كتاب حكايات مجلّد بالقماش مفتوح، يقوم من صفحاته بحر من الورق وجزر ومركب شراعي وياسمينة وهدهدها.`}},at=(e,t,n)=>({at:[M(e.at[0],t.at[0],n),M(e.at[1],t.at[1],n),M(e.at[2],t.at[2],n)],az:M(e.az,t.az,n),el:M(e.el,t.el,n),dist:M(e.dist,t.dist,n),fov:M(e.fov,t.fov,n),sx:M(e.sx,t.sx,n)});function ot(e,t){let n=Math.cos(e.el),r=Math.sin(e.el),i=Math.cos(e.az),a=Math.sin(e.az),o=[e.at[0]+e.sx+e.dist*n*a,e.at[1]+e.dist*r,e.at[2]+e.dist*n*i],s=j(o,[e.at[0]+e.sx,e.at[1],e.at[2]],[-r*a,n,-r*i]),c=k(e.fov,t,.2,30);return c[8]=-c[0]*e.sx/e.dist,{eye:o,vp:O(c,s),view:s}}function st(e,t,n,r){let i={...t,at:[...t.at]},a=r[2]-r[0],o=r[3]-r[1];for(let t=0;t<40;t++){let{vp:t,view:s}=ot(i,n),c=1e9,l=-1e9,u=1e9,d=-1e9;for(let n of e){let e=ne(t,n[0],n[1],n[2]),r=e[0]/e[3]*.5+.5,i=.5-e[1]/e[3]*.5;r<c&&(c=r),r>l&&(l=r),i<u&&(u=i),i>d&&(d=i)}let f=Math.max((l-c)/a,(d-u)/o);i.dist*=f**.7;let p=(c+l)/2-(r[0]+r[2])/2,m=(u+d)/2-(r[1]+r[3])/2,h=2*i.dist*Math.tan(i.fov/2),g=[s[0],s[4],s[8]],_=[s[1],s[5],s[9]],v=p*h*n*.8,y=-m*h*.8;for(let e=0;e<3;e++)i.at[e]+=g[e]*v+_[e]*y}return i}var ct=`sindibad-storybook-place`,lt=!1;function ut(e,t){if(addEventListener(`pagehide`,()=>{try{sessionStorage.setItem(ct,String(scrollY))}catch{}},{signal:t}),lt)return;lt=!0;let n=performance.getEntriesByType(`navigation`)[0];if(!n||n.type!==`reload`&&n.type!==`back_forward`)return;let r=NaN;try{r=Number(sessionStorage.getItem(ct)??NaN),sessionStorage.removeItem(ct)}catch{}if(!Number.isFinite(r))return;let i=!1;for(let e of[`wheel`,`touchstart`,`keydown`,`pointerdown`])addEventListener(e,()=>i=!0,{signal:t,passive:!0,once:!0});let a=()=>{if(i||t.aborted)return;let n=e.getBoundingClientRect(),a=n.top+scrollY;r>=a-innerHeight&&r<=a+n.height&&window.scrollTo({top:r,behavior:`instant`})};a(),requestAnimationFrame(a),document.readyState!==`complete`&&addEventListener(`load`,()=>setTimeout(a,60),{signal:t,once:!0}),setTimeout(a,500)}var dt=async r=>{let{stage:a,section:c,copy:p,signal:g}=r,_=!r.chapters?.parked,v=it[r.lang],b=r.rtl?-1:1,x=e=>`${r.base}about/storybook/${e}`,S=document.createElement(`div`);S.className=`sb`,r.rtl&&S.classList.add(`is-rtl`),a.append(S);let C=document.createElement(`canvas`);C.className=`sb-canvas`,C.setAttribute(`role`,`img`),C.setAttribute(`aria-label`,v.art),S.append(C);let w=document.createElement(`div`);w.className=`sb-ink`,_&&w.append(p),S.append(w);let T=null,D=null;g.addEventListener(`abort`,()=>D?.disconnect());let O=()=>{if(T)return;let e=innerWidth/innerHeight>=1.02,t=document.createElement(`div`);t.className=`sb-still ${e?`is-wide`:`is-tall`}`;let n=document.createElement(`img`);n.src=x(`still-${e?`wide`:`tall`}-${r.rtl?`ar`:`en`}.webp`),n.alt=v.art,n.decoding=`async`,t.append(n),_&&t.append(p),S.append(t),T=t;let i=()=>{let e=.3,n=1.8;for(let r=0;r<12;r++){let r=(e+n)/2;t.style.setProperty(`--k`,String(r)),p.scrollHeight>p.clientHeight||p.scrollWidth>p.clientWidth+1?n=r:e=r}t.style.setProperty(`--k`,String(e))};i(),D=new ResizeObserver(i),D.observe(t),document.fonts?.ready.then(()=>T===t&&i()),w.remove(),C.style.display=`none`,S.classList.add(`is-still`)},k=C.getContext(`webgl2`,{antialias:!0,alpha:!0,premultipliedAlpha:!0,depth:!0,stencil:!1,powerPreference:`high-performance`});if(!k)return O(),te(),r.chapters?.register(re()),()=>S.remove();let A=()=>{k.getExtension(`WEBGL_lose_context`)?.loseContext(),S.remove()};r.reduce||(r.pin(3),ut(c,g));let j=_?window.setTimeout(O,900):0;function te(){let e=document.createElement(`nav`);e.className=`sb-chapters is-flat`,e.setAttribute(`aria-label`,i[r.lang].nav);for(let t of n){let n=document.createElement(`button`);n.type=`button`,n.className=`sb-ch`,n.dataset.chapter=t.id,n.style.setProperty(`--ch`,t.color),n.textContent=t[r.lang].short,n.addEventListener(`click`,()=>r.chapters?.go(t.id),{signal:g}),e.append(n)}S.append(e)}function re(){let e=()=>{_=!0,(T??w).append(p),p.insertBefore(r.mark.el,r.headline)};return{lend(){_=!1},depart(e,t){return t.opening(),t.ready.then(()=>{})},back(t,n,r){return r(1),e(),Promise.resolve()},hop(e,t,n,r){let i=r();return i.opening(),i.ready.then(()=>{})},park(){_=!1}}}let F=async e=>(await fetch(x(e),{signal:g})).arrayBuffer(),I=async(e,t)=>{let n=await(await fetch(x(e),{signal:g})).blob();try{return await createImageBitmap(n,{colorSpaceConversion:`none`,premultiplyAlpha:`none`,...t})}catch{return createImageBitmap(n)}},L=e=>I(e),R=r.rtl?`ar`:`en`,z=await Promise.all([F(`pieces.bin`),I(`atlas.webp`,r.touch?{resizeWidth:1536,resizeHeight:1536,resizeQuality:`high`}:void 0),L(`pages.webp`),L(`foil-${R}.webp`),L(`blind-${R}.webp`),L(`fibre.webp`),L(`weave.webp`)]).catch(e=>(g.aborted||console.warn(`[storybook] art failed to load`,e),null));if(!z)return clearTimeout(j),g.aborted?(A(),()=>{}):(O(),()=>S.remove());let[B,oe,se,ce,le,ue,de]=z;if(g.aborted)return clearTimeout(j),A(),()=>{};let{pieces:V,swatches:fe}=o(B),pe=new Map,me=16,H=e=>{let t=pe.get(e);return t===void 0&&(t=me++,pe.set(e,t)),t},U=new Ve(r.rtl,H);U.tints=n.map(t=>e(t.color));let he=new f;y(he,b),E(he,b);for(let e of U.specs){let t=H(e.id);if(e.mesh===`strip`)h(he,.0042,fe.wire??[0,0],t);else{let n=V[e.mesh];m(he,n,t,e.flip)}}if(me>96)throw Error(`storybook: too many parts`);let ge=r.touch,W=rt(k,he.build(),ge?{shadow:1024,taps:8,occW:256,occH:170}:{shadow:2048,taps:16,occW:512,occH:340},b);W.setTexture(`atlas`,oe,!0,8),W.setTexture(`pages`,se,!0,16),W.setTexture(`cover`,ce,!1,16),W.setTexture(`blind`,le,!1,16),W.setTexture(`fibre`,ue,!1,4),W.setTexture(`weave`,de,!1,4);for(let e of[oe,se,ce,le,ue,de])e.close();let _e=document.createElement(`canvas`);_e.width=1100,_e.height=360,Pe(_e),W.setTexture(`tabs`,_e,!1,8);let ve=document.createElement(`canvas`),ye=document.createElement(`canvas`);ve.width=ye.width=ge?1400:2048,ve.height=ye.height=Math.round(ve.width/2*s.H);let be=document.createElement(`canvas`);be.width=ge?1400:2048,be.height=Math.round(be.width/2*s.H)*2;let xe=``,Se=t=>{let n=`${t.id}/${q}`;n!==xe&&(xe=n,Ne(ve,ye,t,r.lang,b,q),W.setTexture(`plate`,ve,!0,8),W.setTexture(`plateFoil`,ye,!1,8),Te(be,t.id),W.setTexture(`leaves`,be,!0,8),X.accent=e(t.color),X.backs=we[t.id].map(e))},G=1,K=1,Ce,Ee,De,Oe,ke,q=!1,J={xa:.115,xb:.905,za:-.555,zb:.555,w:400,h:500},Y={xa:.09,xb:.84,d0:.075,d1:s.H-.075},Ae=ge?Math.min(devicePixelRatio||1,1.6):Math.min(2,Math.max(devicePixelRatio||1,1.5)),je=()=>{C.width=Math.round(G*Ae),C.height=Math.round(K*Ae)},Me=0,Fe=0,Ie=e=>{e<=0||(Fe++,Me=Me*.97+e*.03,Fe>60&&Me>1/42&&Ae>1&&(Ae=Math.max(1,Ae-.25),je(),Fe=0,Me=1/60))},Le=()=>{let e=S.getBoundingClientRect();G=Math.max(1,e.width),K=Math.max(1,e.height),je();let t=G/K,{W:n,H:r,T:i,over:a}=s;q=t<1.02,U.tall=q,S.classList.toggle(`is-tall`,q);let o=[],c=[];for(let e of[0,n+a])for(let t of[-r/2-a,r/2+a])for(let n of[0,i])o.push([e*b,n,t]);for(let e of[-n-a,n+a])for(let t of[-r/2-a,r/2+a])c.push([e,0,t]);Ce=st(o,{at:[.5*b,.1,0],az:26*P*b,el:38*P,dist:6,fov:18*P,sx:0},t,q?[.1,.24,.9,.76]:[.22,.14,.78,.9]);let d=s.W+s.over+s.Y0+.12;if(Ee=st([[(n+a)*b,0,-r/2-a],[(n+a)*b,0,r/2+a],[-.12*b,0,r/2+a],[-.12*b,d,r/2+a],[-.12*b,d,-r/2-a],[-.12*b,0,-r/2-a]],{at:[.3*b,.4,0],az:21*P*b,el:34*P,dist:7,fov:18*P,sx:0},t,q?[.06,.18,.94,.8]:[.2,.04,.8,.95]),q){let e=[];for(let t of[0,n])e.push([t*b,s.Y0,-r/2]),e.push([t*b,0,r/2+r]);De=st(e,{at:[.5*b,.05,.7],az:0,el:57*P,dist:6,fov:24*P,sx:0},t,[.015,.2,.985,.985])}else De=st(c,{at:[0,.1,0],az:0,el:50*P,dist:6,fov:15*P,sx:-.4*b},t,[.08,.31,.92,.95]);if(Oe=De,q){let e=[];for(let t of[0,n])for(let n of[-r/2,r/2])e.push([t*b,s.Y0,n]);Oe=st(e,{at:[.5*b,.1,0],az:0,el:62*P,dist:6,fov:20*P,sx:0},t,[.09,.15,.85,.88])}let f=34*P,p=l.inset*l.layers+.012,m=q?.06:.05,h=.02,g=.7;for(let e=0;e<24;e++){let e=(h+g)/2,n=e*t;[-1,1].every(t=>[-1,1].every(r=>u(l.cx+t*n,m+r*e,p)<0))?h=e:g=e}ke={at:[l.cx*b,s.Y0,m],az:0,el:Math.PI/2,dist:Math.max(.3,h/Math.tan(f/2)-l.depth*l.layers),fov:f,sx:0},Re()},Re=()=>{let{vp:e}=ot(De,G/K),t=(t,n,r)=>{let i=ne(e,t,n,r);return[(i[0]/i[3]*.5+.5)*G,(.5-i[1]/i[3]*.5)*K]},n,r,i,a;if(q){let e=s.Y0+.012,o=s.H/2,c=Math.PI*.975,l=Math.sin(c),u=-Math.cos(c),d=t=>[e+t*l,o+t*u],[f,p]=d(Y.d0),[m,h]=d(Y.d1),g=Y.xa*b,_=Y.xb*b,v=Math.min(g,_),y=Math.max(g,_);n=t(v,f,p),r=t(y,f,p),i=t(v,m,h),a=t(y,m,h)}else{let e=b>0?-J.xb:J.xa,o=b>0?-J.xa:J.xb;n=t(e,s.Y0,J.za),r=t(o,s.Y0,J.za),i=t(e,s.Y0,J.zb),a=t(o,s.Y0,J.zb)}if(J.w=Math.round((r[0]-n[0]+a[0]-i[0])/2),J.h=Math.round((i[1]-n[1]+a[1]-r[1])/2),w.style.width=`${J.w}px`,w.style.height=`${J.h}px`,!_)return;let o=Math.min(J.w/440,J.h/560),c=.5,l=1.6;for(let e=0;e<12;e++){let e=(c+l)/2;w.style.setProperty(`--k`,String(o*e)),p.scrollHeight>J.h||p.scrollWidth>J.w+1?l=e:c=e}w.style.setProperty(`--k`,String(o*c))},ze=new ResizeObserver(()=>{Le(),Ft=!0});ze.observe(S),Le(),document.fonts?.ready&&document.fonts.ready.then(()=>!g.aborted&&Re());let Be=U.parts,He=0,X={vp:new Float32Array(16),cam:[0,0,0],res:[1,1],light:[-.42*b,.62,.66],sun:[0,0,0,0],key:[1,1,1],sky:[.4,.42,.44],gnd:[.3,.27,.24],shadowTint:[.55,.63,.67],pool:[1,1,1],poolA:0,accent:[.05,.3,.3],backs:[[.8,.75,.65],[.8,.75,.65],[.8,.75,.65]],backArt:0,rim:1},Ue=``,Z=document.createElement(`div`);Z.className=`sb-tab`,Z.setAttribute(`role`,`slider`),Z.setAttribute(`aria-label`,v.tab),Z.setAttribute(`aria-valuemin`,`0`),Z.setAttribute(`aria-valuemax`,`100`),Z.setAttribute(`aria-valuenow`,`0`),Z.tabIndex=-1;let We=document.createElement(`span`);We.className=`sb-tab-word`,We.textContent=v.pull,Z.append(We),S.append(Z);let Ge=!1,Ke=300,qe=!1,Je=!1,Ye=0,Xe=0,Ze=0,Qe=0,$e=e=>{U.tabTarget=ie(e),Z.setAttribute(`aria-valuenow`,String(Math.round(U.tabTarget*100)))};Z.addEventListener(`pointerdown`,e=>{Ge&&(qe=!0,Je=!0,Ye=0,Xe=e.clientX,Ze=U.tabTarget,Z.setPointerCapture(e.pointerId),Z.classList.add(`is-held`))},{signal:g}),Z.addEventListener(`pointermove`,e=>{qe&&$e(Ze+b*(e.clientX-Xe)/(Ke*U.tabTravel))},{signal:g});let et=()=>{qe&&(qe=!1,Z.classList.remove(`is-held`),$e(0))};Z.addEventListener(`pointerup`,et,{signal:g}),Z.addEventListener(`pointercancel`,et,{signal:g}),Z.addEventListener(`lostpointercapture`,et,{signal:g}),Z.addEventListener(`keydown`,e=>{let t=b>0?`ArrowRight`:`ArrowLeft`,n=b>0?`ArrowLeft`:`ArrowRight`;if(e.key===t||e.key===`ArrowUp`)$e(U.tabTarget+.25);else if(e.key===n||e.key===`ArrowDown`)$e(U.tabTarget-.25);else if(e.key===`End`)$e(1);else if(e.key===`Home`)$e(0);else return;e.preventDefault(),Je=!0,Ye=0,clearTimeout(Qe),Qe=window.setTimeout(()=>$e(0),700)},{signal:g}),w.style.opacity=`0`;let tt=i[r.lang],nt=document.createElement(`nav`);nt.className=`sb-chapters`,nt.setAttribute(`aria-label`,tt.nav);let Q=-1,ct=n.map((e,t)=>{let n=document.createElement(`button`);n.type=`button`,n.className=`sb-ch`,n.dataset.chapter=e.id,n.tabIndex=-1,n.setAttribute(`aria-label`,e[r.lang].title);let i=document.createElement(`span`);i.className=`sb-ch-label`,i.textContent=e[r.lang].short,n.append(i);let a=()=>{Q=t,Ft=!0,r.chapters?.preload(e.id)},o=()=>{Q===t&&(Q=-1),Ft=!0};return n.addEventListener(`pointerenter`,a,{signal:g}),n.addEventListener(`pointerleave`,o,{signal:g}),n.addEventListener(`focus`,a,{signal:g}),n.addEventListener(`blur`,o,{signal:g}),n.addEventListener(`click`,()=>r.chapters?.go(e.id),{signal:g}),nt.append(n),n});S.append(nt);let lt=!1,dt=0,$=null,ft=!1,pt=1,mt=1,ht=0,gt=0,_t=0,vt=null,yt=[.34,.66,.82],bt=[.56,.28,0],xt=e=>e*e*e*(e*(6*e-15)+10),St=e=>{a.classList.toggle(`is-flying`,e),S.classList.toggle(`is-flying`,e)},Ct=()=>{vt?.remove(),vt=null},wt=(e,t,n)=>{if(!e)return;if(t>=1){e.style.removeProperty(`transform`),e.style.removeProperty(`transform-origin`),e.style.removeProperty(`will-change`);return}let r=xt(t),i=1+.24*(1-r),a=ne(n,l.cx*b,s.Y0,.05),o=(a[0]/a[3]*.5+.5)*G,c=(.5-a[1]/a[3]*.5)*K,u=(i-1)*G/2,d=(i-1)*K/2,f=Math.max(-u,Math.min(u,(o-G/2)*.5*(1-r))),p=Math.max(-d,Math.min(d,(c-K/2)*.5*(1-r)));e.style.willChange=`transform`,e.style.transformOrigin=`50% ${K/2}px`,e.style.transform=`translate(${f.toFixed(1)}px, ${p.toFixed(1)}px) scale(${i.toFixed(4)})`},Tt=e=>{e.phase=`doors`,e.since=0,U.doorsTarget=1,e.trip?.opening()},Et=()=>{_=!0,(T??w).append(p),p.insertBefore(r.mark.el,r.headline),Re()},Dt=(e,t)=>{switch(e.t+=t,e.since+=t,e.phase){case`fold`:U.worldP=M(pt,.08,N(0,.72,e.t)),yt.forEach((t,n)=>{!e.started[n]&&e.t>=t&&(e.started[n]=!0,U.turn(n,1))}),U.turnsSettled(1)&&(Ct(),e.since=e.landed?e.since:0,e.landed=!0,e.ready&&e.since>.24&&Tt(e));break;case`doors`:e.since>.2&&(e.phase=`through`,e.since=0);break;case`through`:ht=ie(e.since/1.25),ht>=1&&($=null,ft=!0,wt(e.stage,1,X.vp),e.resolve());break;case`pull`:ht=1-ie(e.since/1.1),e.since>.56&&(U.doorsTarget=0),e.since>=1.1&&U.doors<.05&&(U.doors=0,U.doorsV=0,wt(e.stage,1,X.vp),e.stage=null,e.kind===`hop`?(e.trip=e.swap(),e.stage=e.trip.stage,e.trip.ready.then(()=>e.ready=!0),e.phase=`hopBack`):(e.release(pt),Et(),e.phase=`leaves`),e.since=0,e.started=[!1,!1,!1]);break;case`hopBack`:e.started[2]||(e.started[2]=!0,U.turn(2,-1)),!e.started[1]&&e.since>.12&&(e.started[1]=!0,U.turn(1,-1)),U.turns[1].phi<.002&&U.turns[2].phi<.002&&(Se(e.to),e.phase=`hopForward`,e.since=0,e.started=[!1,!1,!1]);break;case`hopForward`:e.started[1]||(e.started[1]=!0,U.turn(1,1)),!e.started[2]&&e.since>.14&&(e.started[2]=!0,U.turn(2,1)),U.turnsSettled(1)&&(e.since=e.landed?e.since:0,e.landed=!0,e.ready&&e.since>.24&&Tt(e));break;case`leaves`:bt.forEach((t,n)=>{!e.started[n]&&e.since>=t&&(e.started[n]=!0,U.turn(n,-1))}),U.turns[0].phi<1.25&&(gt=Math.min(1,gt+t/1.05)),U.worldP=M(.08,pt,N(0,1,gt)),gt>=1&&_t<=0&&U.turnsSettled(-1)&&($=null,U.chapterShown=!1,U.worldP=1,St(!1),e.resolve())}};r.chapters?.register({lend(){_=!1,!r.reduce&&(vt=p.cloneNode(!0),vt.className=`sb-ghost`,vt.setAttribute(`aria-hidden`,`true`),vt.querySelectorAll(`a, button`).forEach(e=>e.setAttribute(`tabindex`,`-1`)),w.append(vt))},depart(e,n){let i=t(e);return new Promise(e=>{if(r.reduce){n.opening(),n.ready.then(()=>e());return}Se(i),pt=Math.max(mt,.72),U.chapterShown=!0,gt=0,ht=0,_t=0,St(!0);let t={kind:`out`,t:0,since:0,phase:`fold`,stage:n.stage,trip:n,ready:!1,resolve:e,started:[!1,!1,!1]};n.ready.then(()=>t.ready=!0),$=t})},back(e,n,i){let a=t(e);return new Promise(e=>{r.reduce?(i(1),Et(),e()):(Se(a),ft=!1,St(!0),gt=0,ht=1,$={kind:`back`,t:0,since:0,phase:`pull`,stage:n,trip:null,ready:!0,resolve:e,release:i,started:[!1,!1,!1]})})},hop(e,n,i,a){let o=t(e),s=t(i);return new Promise(e=>{r.reduce?a().ready.then(()=>e()):(Se(o),ft=!1,St(!0),ht=1,$={kind:`hop`,t:0,since:0,phase:`pull`,stage:n,trip:null,ready:!1,resolve:e,swap:a,started:[!1,!1,!1],to:s})})},park(e){ft=!0,_=!1,pt=1,U.chapterShown=!0,U.worldP=.08,U.doors=U.doorsTarget=1;for(let e of U.turns)e.phi=Math.PI;ht=1,_t=1,S.classList.add(`is-ready`)}});let Ot=0,kt=0,At=0,jt=0,Mt=!1,Nt=1;!ge&&!r.reduce&&window.addEventListener(`pointermove`,e=>{if(e.pointerType===`touch`)return;At=e.clientX/innerWidth*2-1,jt=e.clientY/innerHeight*2-1;let t=r.cta.getBoundingClientRect();Mt=e.clientX>t.left-56&&e.clientX<t.right+56&&e.clientY>t.top-56&&e.clientY<t.bottom+56},{signal:g,passive:!0});let Pt=[],Ft=!0,It=(e,t)=>{if(r.reduce){if(!Ft)return;Ft=!1,e=1,t=0}else Ie(t);$||ft?e=pt:mt=e,$&&Dt($,t);let i=c.getBoundingClientRect();He=r.reduce||$?0:ie(i.top/K),U.update(e,t);let a=at(at(Ce,Ee,ae(.02,.16,e)),De,ae(.12,.38,e));r.reduce&&(a=De),Nt+=(+!Mt-Nt)*(1-Math.exp(-t*9));let o=(1-Math.exp(-t*3.2))*Nt;if(Ot+=(At-Ot)*o,kt+=(jt-kt)*o,a.az+=Ot*2.1*P,a.el-=kt*1.3*P,a.az+=He*8*P*b,a.el-=He*6*P,a.dist*=1+He*.08,a.dist*=1-.018*N(.4,1,e),a.at=[a.at[0],a.at[1]+U.jolt*.006*Math.sin(U.time*40),a.at[2]],U.chapterShown){let e=$?.phase===`leaves`,n=$?.phase===`fold`&&$.t<.5;_t=ie(_t+(e?-t/1.3:n?-t:t)),a=at(a,Oe,N(0,1,_t));let r=a.fov,i=a.sx,o=xt(ie(ht/.72)),s=xt(ht),c=Math.exp(M(Math.log(a.dist),Math.log(ke.dist),s));a=at(a,ke,o),a.dist=c,a.fov=M(r,ke.fov,s),a.sx=M(i,0,o)}let{eye:l,vp:u}=ot(a,G/K);$?.stage&&wt($.stage,ht,u);let f=Math.min(e,U.worldP),p=N(.58,.8,f);X.backArt=U.chapterShown?1-N(.55,1,f/Math.max(.01,pt)):0,X.rim=1-N(.6,.96,ht),X.vp=u,X.cam=l,X.res=[C.width,C.height],X.light=ee([(-.42-.12*p)*b,.64-.1*p,.66+.02*p]);let m=N(.2,.4,f)*(1-p);X.key=[M(M(.93,.88,m),1.08,p),M(M(.88,.87,m),.96,p),M(M(.8,.85,m),.76,p)];let h=U.worldOf(`sun_disc`);X.sun=h?[h[12],h[13],h[14],p*1.1]:[0,0,0,0],X.sky=[.44,M(.45,.45,p),M(.46,.5,p)],X.gnd=[M(.3,.36,p),M(.27,.3,p),M(.24,.24,p)],X.pool=[M(1,.9,p),M(1,.97,p),1],X.poolA=N(.25,.7,f),W.draw(Be,X);let g,v,y;if(q){let e=b>0?Y.xa:Y.xb,t=b>0?Y.xb:Y.xa;g=U.leafPoint(e,-.004,-Y.d0),v=U.leafPoint(t,-.004,-Y.d0),y=U.leafPoint(e,-.004,-Y.d1)}else{let e=b>0?J.xb:J.xa,t=b>0?J.xa:J.xb,n=s.Y0;g=U.upperPoint(e,n,J.za),v=U.upperPoint(t,n,J.za),y=U.upperPoint(e,n,J.zb)}let x=J.w,S=J.h,T=[(v[0]-g[0])/x,(v[1]-g[1])/x,(v[2]-g[2])/x],E=[(y[0]-g[0])/S,(y[1]-g[1])/S,(y[2]-g[2])/S],D=[u[0]*T[0]+u[4]*T[1]+u[8]*T[2],u[1]*T[0]+u[5]*T[1]+u[9]*T[2],u[3]*T[0]+u[7]*T[1]+u[11]*T[2]],O=[u[0]*E[0]+u[4]*E[1]+u[8]*E[2],u[1]*E[0]+u[5]*E[1]+u[9]*E[2],u[3]*E[0]+u[7]*E[1]+u[11]*E[2]],k=ne(u,g[0],g[1],g[2]),A=e=>[(e[0]+e[2])*(G/2),(e[2]-e[1])*(K/2),e[2]],j=A(D),te=A(O),re=A([k[0],k[1],k[3]]),F=`matrix3d(${j[0]},${j[1]},0,${j[2]},${te[0]},${te[1]},0,${te[2]},0,0,1,0,${re[0]},${re[1]},0,${re[2]})`;F!==Ue&&(w.style.transform=F,Ue=F);let I=q?U.leafM:U.upper,L=ee([I[4]*-1,I[5]*-1,I[6]*-1]),R=ee([l[0]-g[0],l[1]-g[1],l[2]-g[2]]),z=N(.05,.22,L[0]*R[0]+L[1]*R[1]+L[2]*R[2])*+(U.theta>.3);if(w.style.opacity=z.toFixed(3),w.style.pointerEvents=z>.5&&!$?`auto`:`none`,!q&&U.chapterShown){let e=1/0,t=(e,t)=>{let[n,r]=U.pageEdge(e),i=[n*b,s.Y0+r,t],a=(s.Y0-l[1])/(i[1]-l[1]);return l[0]+(i[0]-l[0])*a},n=0,r=0,i=g[2],a=y[2];for(let o of U.turns){if(o.phi<.3)continue;let s=t(o,i)*b,c=t(o,a)*b;s+c<e&&(e=s+c,n=s,r=c)}if(e===1/0)w.style.removeProperty(`clip-path`);else{let e=v[0]-g[0],t=t=>(t*b-g[0])/e*x,i=t(n),a=t(r),o=b>0?-60:x+60;w.style.clipPath=`polygon(${o}px -60px, ${i.toFixed(1)}px -60px, ${a.toFixed(1)}px ${S+60}px, ${o}px ${S+60}px)`}}else w.style.clipPath&&w.style.removeProperty(`clip-path`);!r.reduce&&_&&r.mark.set(N(.43,.6,e));let B=U.worldOf(`tab`),oe=e>.7&&!r.reduce&&!$&&!ft;if(B&&oe!==Ge&&(Ge=oe,Z.classList.toggle(`is-on`,oe),Z.tabIndex=oe?0:-1,oe||Z.blur()),B){let e=ne(u,B[12]+.04*b,B[13],B[14]),t=(e[0]/e[3]*.5+.5)*G,n=(.5-e[1]/e[3]*.5)*K,r=ne(u,B[12]+.04*b+.1*b,B[13],B[14]);Ke=Math.abs((r[0]/r[3]*.5+.5)*G-t)*10,Z.style.transform=`translate(${t.toFixed(1)}px, ${n.toFixed(1)}px)`}let se=(e>.72||r.reduce)&&!$&&!ft;if(se!==lt){lt=se,dt=0,nt.classList.toggle(`is-on`,se);for(let e of ct)e.tabIndex=se?0:-1;se||(nt.contains(document.activeElement)&&document.activeElement.blur(),Q=-1)}dt+=t;for(let e=0;e<n.length;e++){let t=lt&&(r.reduce||dt>.16+e*.075);U.chapterTarget[e]=(t||$||ft?1:0)+(Q===e?.26:0);let n=d.z0+e*d.pitch,i=s.W+d.out*.62,a=ne(u,i*b,s.Y0,n),o=(a[0]/a[3]*.5+.5)*G,c=(.5-a[1]/a[3]*.5)*K,l=ne(u,i*b,s.Y0,n-d.w/2),f=ne(u,i*b,s.Y0,n+d.w/2),p=Math.abs((f[1]/f[3]-l[1]/l[3])*.5*K),m=ct[e];m.style.transform=`translate(${o.toFixed(1)}px, ${c.toFixed(1)}px)`;let h=Math.round(Math.max(30,p)/4)*4;!$&&!ft&&h!==Pt[e]&&(Pt[e]=h,m.style.height=`${h}px`,m.style.marginBlockStart=`${-h/2}px`)}e>.8&&!Je&&!r.reduce&&(Je=!0,Ye=.55),Ye>0&&!qe&&(Ye-=t,U.tabTarget=Ye>.2?.34:0)},Lt=!0;return r.frame((e,t)=>{if(It(e,t),Lt){if(Lt=!1,clearTimeout(j),T){let e=T;D?.disconnect(),_&&w.append(p),S.append(w),C.style.display=``,e.classList.add(`is-leaving`),setTimeout(()=>e.remove(),500),T=null,S.classList.remove(`is-still`),Re()}S.classList.add(`is-ready`)}}),r.reduce&&(Z.style.display=`none`,_&&r.mark.set(1)),p.addEventListener(`focusin`,()=>{if(!_)return;let e=c.getBoundingClientRect(),t=Math.max(1,e.height-innerHeight);-e.top/t<.42&&!r.reduce&&window.scrollTo({top:e.top+scrollY+t*.44,behavior:`instant`})},{signal:g}),()=>{ze.disconnect(),clearTimeout(Qe),clearTimeout(j),W.dispose(),S.remove()}};export{dt as default};