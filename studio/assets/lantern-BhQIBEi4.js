var e=class{c;constructor(e){this.c=e}fill(e,t=1){let n=this.c;n.globalCompositeOperation=`source-over`,n.fillStyle=`rgba(0,0,0,${t})`,n.fill(typeof e==`string`?new Path2D(e):e,`nonzero`)}cut(e){let t=this.c;t.globalCompositeOperation=`destination-out`,t.fillStyle=`#000`,t.fill(typeof e==`string`?new Path2D(e):e,`nonzero`),t.globalCompositeOperation=`source-over`}poly(e){return`M`+e.map(e=>`${e[0].toFixed(2)} ${e[1].toFixed(2)}`).join(`L`)+`Z`}dot(e,t,n){let r=.5523*n;return`M${e+n} ${t}C${e+n} ${t+r} ${e+r} ${t+n} ${e} ${t+n}C${e-r} ${t+n} ${e-n} ${t+r} ${e-n} ${t}C${e-n} ${t-r} ${e-r} ${t-n} ${e} ${t-n}C${e+r} ${t-n} ${e+n} ${t-r} ${e+n} ${t}Z`}star(e,t,n,r=8,i=.7654,a=0){let o=[];for(let s=0;s<r*2;s++){let c=a+s*Math.PI/r,l=s%2?n*i:n;o.push([e+l*Math.cos(c),t+l*Math.sin(c)])}return this.poly(o)}slit(e,t,n,r,i,a=0){let o=n-e,s=r-t,c=Math.hypot(o,s)||1,l=-s/c,u=o/c,d=(e+n)/2+l*a,f=(t+r)/2+u*a;return`M${e} ${t}Q${d+l*i} ${f+u*i} ${n} ${r}Q${d-l*i} ${f-u*i} ${e} ${t}Z`}drop(e,t,n,r,i=2.2){let a=Math.cos(r),o=Math.sin(r),s=e+a*n*i,c=t+o*n*i,l=-o*n,u=a*n,d=e-a*n,f=t-o*n;return`M${s} ${c}C${e+l*.5+a*n*.8} ${t+u*.5+o*n*.8} ${e+l*1.05} ${t+u*1.05} ${e+l-a*n*.55} ${t+u-o*n*.55}Q${d} ${f} ${e-l-a*n*.55} ${t-u-o*n*.55}C${e-l*1.05} ${t-u*1.05} ${e-l*.5+a*n*.8} ${t-u*.5+o*n*.8} ${s} ${c}Z`}bar(e,t,n,r,i,a=i){let o=n-e,s=r-t,c=Math.hypot(o,s)||1,l=-s/c,u=o/c;return this.poly([[e+l*i/2,t+u*i/2],[n+l*a/2,r+u*a/2],[n-l*a/2,r-u*a/2],[e-l*i/2,t-u*i/2]])}rivet(e,n,r=3.4){this.fill(this.dot(e,n,r+1.6)),this.cut(t(this,e,n,r,r-1.1))}},t=(e,t,n,r,i)=>{let a=``;for(let o=0;o<8;o++){let s=o/8*Math.PI*2+.1,c=(o+.78)/8*Math.PI*2+.1,l=(r+i)/2;a+=e.slit(t+l*Math.cos(s),n+l*Math.sin(s),t+l*Math.cos(c),n+l*Math.sin(c),(r-i)*.95,-l*.19)}return a},n=class{pts=[];lens=[0];constructor(e,t=24){for(let n=0;n+3<e.length;n+=3){let[r,i,a,o]=[e[n],e[n+1],e[n+2],e[n+3]];for(let e=n===0?0:1;e<=t;e++){let n=e/t,s=1-n,c=[s*s*s,3*s*s*n,3*s*n*n,n*n*n];this.pts.push([c[0]*r[0]+c[1]*i[0]+c[2]*a[0]+c[3]*o[0],c[0]*r[1]+c[1]*i[1]+c[2]*a[1]+c[3]*o[1]])}}for(let e=1;e<this.pts.length;e++)this.lens.push(this.lens[e-1]+Math.hypot(this.pts[e][0]-this.pts[e-1][0],this.pts[e][1]-this.pts[e-1][1]))}get length(){return this.lens[this.lens.length-1]}at(e,t=0){let n=Math.max(0,Math.min(1,e))*this.length,r=1;for(;r<this.lens.length-1&&this.lens[r]<n;)r++;let i=this.lens[r]-this.lens[r-1]||1,a=(n-this.lens[r-1])/i,o=this.pts[r-1],s=this.pts[r],c=Math.atan2(s[1]-o[1],s[0]-o[0]);return{x:o[0]+(s[0]-o[0])*a-Math.sin(c)*t,y:o[1]+(s[1]-o[1])*a+Math.cos(c)*t,a:c}}dashes(e,t,n,r,i=0,a=1,o=.12){let s=``;for(let c=0;c<t;c++){let l=i+(a-i)*(c+o/2)/t,u=i+(a-i)*(c+1-o/2)/t,d=this.at(l,n),f=this.at(u,n),p=this.at((l+u)/2,n),m=p.x-(d.x+f.x)/2,h=p.y-(d.y+f.y)/2,g=Math.hypot(f.x-d.x,f.y-d.y)||1,_=(m*-(f.y-d.y)+h*(f.x-d.x))/g;s+=e.slit(d.x,d.y,f.x,f.y,r,_)}return s}each(e,t,n,r=0,i=1){for(let a=0;a<e;a++){let o=e===1?(r+i)/2:r+(i-r)*a/(e-1),s=this.at(o,t);n(s.x,s.y,s.a,a)}}};async function r(t,n,r){let i=document.createElement(`canvas`),a=[...t].sort((e,t)=>t.h*t.res-e.h*e.res),o=e=>{let t=10,r=10,i=0;for(let o of a){let a=Math.ceil(o.w*o.res*e)+10,s=Math.ceil(o.h*o.res*e)+10;if(t+a>n&&(t=10,r+=i,i=0),r+s>n)return!1;t+=a,i=Math.max(i,s)}return!0},s=r;for(;!o(s)&&s>.2;)s*=.95;let c=0;{let e=10,t=10,r=0;for(let i of a){let a=Math.ceil(i.w*i.res*s)+10,o=Math.ceil(i.h*i.res*s)+10;e+a>n&&(e=10,t+=r,r=0),i.cx=e,i.cy=t,e+=a,r=Math.max(r,o),c=t+r}}let l=Math.min(n,c+10);i.width=n,i.height=l;let u=i.getContext(`2d`,{willReadFrequently:!1}),d=new e(u),f=performance.now();for(let e of a){performance.now()-f>6&&(await new Promise(e=>setTimeout(e)),f=performance.now());let{cx:t,cy:r}=e,i=e.res*s,a=e.w*i,o=e.h*i;u.save(),u.beginPath(),u.rect(t-1,r-1,a+2,o+2),u.clip(),u.setTransform(i,0,0,i,t-e.x*i,r-e.y*i),e.draw(d),u.restore(),u.setTransform(1,0,0,1,0,0),e.uv=[t/n,r/l,(t+a)/n,(r+o)/l]}return{canvas:i,used:c,scale:s}}var i=(e,t)=>[1,0,0,1,e,t],a=e=>{let t=Math.cos(e),n=Math.sin(e);return[t,-n,n,t,0,0]},o=(e,t=e)=>[e,0,0,t,0,0],s=(e,t)=>[e[0]*t[0]+e[1]*t[2],e[0]*t[1]+e[1]*t[3],e[2]*t[0]+e[3]*t[2],e[2]*t[1]+e[3]*t[3],e[0]*t[4]+e[1]*t[5]+e[4],e[2]*t[4]+e[3]*t[5]+e[5]],c=(e,t,n)=>s(s(i(e,t),a(n)),i(-e,-t)),l=(...e)=>e.reduce(s),u=Math.PI*2,d=1/240,f=class{w0;limit;ax=.03;az=-.012;vx=0;vz=.02;bx=0;bz=0;bvx=0;bvz=0;tx=0;tz=0;tvx=0;tvz=0;tw=0;tvw=0;time=Math.random()*40;leanX=0;leanZ=0;spare=0;constructor(e,t){this.w0=e,this.limit=t}step(e,t){this.spare+=e;let n=0;for(;this.spare>=d&&n<40;)this.spare-=d,n++,this.tick(d,t,n===1)}tick(e,t,n){let r=this.w0,i=r*r,a=.065;this.time+=e;let o=this.time;n&&(this.vx+=t.kickX,this.vz+=t.kickZ,this.tvw+=t.kickX*.5-t.kickZ*.35);let s=t.breeze,c=s*.016*(Math.sin(r*o)+.55*Math.sin(r*.63*o+1.7)+.35*Math.sin(r*1.37*o+4.1)),l=s*.012*(Math.sin(r*.93*o+.6)+.6*Math.sin(r*.57*o+3.1)),d=1-Math.exp(-e/.11);this.leanX+=((t.aimX??0)-this.leanX)*d,this.leanZ+=((t.aimZ??0)-this.leanZ)*d;let f=i*this.leanX,p=i*this.leanZ,m=(e,t,n)=>{let r=Math.abs(e)-n;if(r<=0)return 0;let a=e*t>0?t:0;return-Math.sign(e)*r*i*40-a*14},h=-i*Math.sin(this.ax)-2*a*r*this.vx+c+f+m(this.ax,this.vx,this.limit),g=-i*Math.sin(this.az)-2*a*r*this.vz+l+p+m(this.az,this.vz,this.limit*.55);this.vx+=h*e,this.vz+=g*e,this.ax+=this.vx*e,this.az+=this.vz*e;let _=u/.62,v=(e,t,n)=>-_*_*e-.32*_*t-n*1.2;this.bvx+=v(this.bx,this.bvx,h)*e,this.bvz+=v(this.bz,this.bvz,g)*e,this.bx+=this.bvx*e,this.bz+=this.bvz*e;let y=u/.98,b=(e,t,n)=>-y*y*e-.2*y*t-n*.55;this.tvx+=b(this.tx,this.tvx,h)*e,this.tvz+=b(this.tz,this.tvz,g)*e,this.tx+=this.tvx*e,this.tz+=this.tvz*e;let x=u/7.2,S=(this.vx*this.az-this.vz*this.ax)*2.8+.22*this.vz*Math.abs(this.vx)+s*.03*Math.sin(.29*o+2),C=Math.abs(this.tw)>.2?-Math.sign(this.tw)*(Math.abs(this.tw)-.2)*40:0;this.tvw+=(-x*x*this.tw-.15*x*this.tvw+S+C)*e,this.tw+=this.tvw*e}},p=e=>{let t=Math.sin(e*127.1)*43758.5453;return(t-Math.floor(t))*2-1},m=e=>{let t=Math.floor(e),n=e-t,r=n*n*(3-2*n);return p(t)*(1-r)+p(t+1)*r},h=class{power=1;size=1;jx=0;jy=0;t=Math.random()*100;gust=0;step(e,t){this.t+=e;let n=this.t,r=m(n*1.3),i=m(n*6.7+9)*.6+m(n*14.1+3)*.4;this.gust=m(n*.41+21)>.72?Math.min(1,this.gust+e*5):Math.max(0,this.gust-e*1.8);let a=Math.min(1,t);this.power=1+.055*r+.035*i-.11*this.gust-.04*a,this.size=1+.16*r+.12*i+.45*this.gust+.25*a,this.jx=m(n*3.1+40)*(.5+this.gust),this.jy=m(n*2.3+77)*(.5+this.gust)}},g=[],_=(e,t,n,r,i,a,o)=>{let s={name:e,x:t,y:n,w:r,h:i,res:a,draw:o};return g.push(s),s},v=new n([[-118,-14],[-60,-5],[40,-5],[100,-15],[130,-21],[160,-33],[192,-52]]),y=new n([[-146,22],[-120,44],[-60,52],[-10,52],[50,52],[100,40],[134,14]]),b=_(`hull`,-196,-112,440,190,3,e=>{e.fill(`M-178 -56 L-174 -68 L-150 -66 L-148 -56 C-140 -36 -128 -24 -106 -18 C-50 -8 40 -8 96 -19 C128 -26 164 -42 208 -70 L216 -66 C196 -30 170 2 134 26 C96 52 20 60 -50 58 C-100 56 -132 46 -152 26 C-166 8 -176 -24 -178 -56 Z`),e.fill(`M-180 -68 C-184 -78 -178 -86 -170 -84 C-174 -82 -175 -76 -172 -68 Z`),e.fill(`M-158 -68 L-158 -90 C-158 -96 -150 -96 -150 -90 L-150 -66 Z`),e.fill(`M210 -68 C214 -82 228 -86 232 -76 C234 -70 226 -66 222 -71 C225 -70 228 -72 227 -75 C224 -79 218 -76 218 -64 Z`),e.cut(v.dashes(e,9,7,1.7,.02,.98)),e.cut(y.dashes(e,8,-8,1.6,.02,.96)),v.each(11,20,(t,n,r,i)=>{if(e.cut(e.star(t,n,5.6)),i<10){let t=v.at(.08+(i+.5)*.08,20);e.cut(e.dot(t.x,t.y,1.5))}},.08,.88),v.each(16,33,(t,n,r)=>e.cut(e.drop(t,n,1.9,r+Math.PI/2,2.1)),.08,.72);for(let[t,n]of[[-166,-40],[-156,-38],[-146,-32]])e.cut(`M${t-3.4} ${n+9}L${t-3.4} ${n}C${t-3.4} ${n-5} ${t-.8} ${n-7} ${t} ${n-9}C${t+.8} ${n-7} ${t+3.4} ${n-5} ${t+3.4} ${n}L${t+3.4} ${n+9}Z`);e.cut(e.star(-158,-56,3.6)),e.cut(e.star(160,-16,7)),e.cut(e.drop(142,-12,2.6,.2,2.4)+e.drop(176,-30,2.2,-.6,2.3)),e.cut(e.dot(190,-42,1.8)+e.dot(198,-50,1.4)),e.rivet(-168,18,3.2),e.rivet(-20,42,4);for(let t=0;t<=19;t++){let n=v.at(.02+t*.05);e.fill(e.bar(n.x,n.y+2,n.x,n.y-9,1.5,1.2))}let t=[];for(let e=0;e<=28;e++){let n=v.at(.02+e/28*.95);t.push([n.x,n.y-9])}for(let n=0;n<t.length-1;n++)e.fill(e.bar(t[n][0],t[n][1],t[n+1][0],t[n+1][1],1.6))}),x=_(`mast`,-60,-340,300,340,3,e=>{e.fill(e.bar(-8,-6,18,-300,7,3.4)),e.fill(e.dot(18.4,-304,4.2)),e.fill(e.bar(17,-298,206,-70,1.15)),e.fill(e.bar(10,-210,-46,-14,1)),e.fill(e.bar(12,-240,70,-14,.95));for(let t=0;t<9;t++){let n=.14+t*.07,r=-8+26*n,i=-6-294*n;e.fill(e.bar(r-5,i,r+5,i-1,1.5))}}),S=new n([[122,-48],[40,-112],[-70,-240],[-168,-358]]),C=new n([[-168,-358],[-172,-280],[-168,-150],[-132,-56]]),w=new n([[-132,-56],[-74,-76],[50,-80],[122,-48]]),T=_(`sail`,-190,-376,330,340,3,e=>{e.fill(`M122 -48 C40 -112 -70 -240 -168 -358 C-172 -280 -168 -150 -132 -56 C-74 -76 50 -80 122 -48 Z`,.94),e.cut(S.dashes(e,14,8,.95,.03,.97,.1)),e.cut(C.dashes(e,11,8,.95,.05,.95,.1)),e.cut(w.dashes(e,12,7,.95,.05,.95,.1));for(let t=1;t<8;t++){let n=t/8,r=w.at(1-n,12),i=S.at(n*.94+.03,12),a=7+Math.round(n*5);for(let t=0;t<a;t++){let n=(t+.1)/a,o=(t+.9)/a;e.cut(e.slit(r.x+(i.x-r.x)*n,r.y+(i.y-r.y)*n,r.x+(i.x-r.x)*o,r.y+(i.y-r.y)*o,1.05))}}let t=-158;e.fill(e.dot(-82,t,36),1),e.cut(e.star(-82,t,24)),e.fill(e.star(-82,t,12.4),1),e.cut(e.star(-82,t,7));for(let n=0;n<16;n++){let r=n/16*Math.PI*2+Math.PI/16;e.cut(e.drop(-82+Math.cos(r)*30.6,t+Math.sin(r)*30.6,1.5,r,1.9))}for(let[t,n,r]of[[-132,-280,8],[-145,-232,9],[-122,-236,6],[-150,-180,7.6],[-138,-100,8],[-64,-90,6.4],[-26,-96,7.6],[24,-86,5],[-34,-148,5.6],[-112,-94,5],[-58,-215,5.6]])e.cut(e.star(t,n,r))}),E=_(`yard`,-196,-386,350,360,3,e=>{e.fill(e.bar(134,-32,-24,-196,5.6,7.8)),e.fill(e.bar(-24,-196,-182,-372,7.6,3));for(let t=0;t<5;t++){let n=t*.012,r=-24-n*150,i=-196-n*170;e.cut(e.slit(r-3.4,i+2,r+3.4,i-2.5,.6))}e.fill(e.dot(-182,-372,3.4)),e.rivet(4,-224,5)}),D=_(`pennant1`,-2,-18,44,34,3,e=>{e.fill(`M0 -8 C10 -11 24 -7 36 -3 C24 0 12 6 0 8 Z`),e.cut(e.star(11,-.5,3.8))}),O=_(`pennant2`,-2,-8,44,16,3,e=>{e.fill(`M0 -4 C12 -5 22 -2 40 0 C22 2 12 3 0 3.4 Z`)}),ee=_(`oar`,-8,-8,130,40,3,e=>{e.fill(e.bar(0,0,112,20,3.4,2.6)),e.fill(`M100 16 C112 16 126 22 128 30 C118 32 104 28 98 22 Z`),e.cut(e.slit(106,21,122,27,1.2)),e.rivet(0,0,2.8)}),k=_(`rudder`,-30,-10,56,96,3,e=>{e.fill(`M4 -4 L8 2 C6 18 12 36 14 52 C4 76 -12 80 -24 74 C-24 56 -16 30 -4 2 Z`),e.cut(e.slit(-10,40,-6,66,1.3)+e.slit(0,30,2,60,1.3)),e.cut(e.star(-5,18,3)),e.rivet(2,0,3)}),A=_(`yasmina`,-44,-66,76,72,4,e=>{e.fill(`M0 -41 C4 -41 7 -38 7.6 -33 C9 -24 11 -14 14 -5 C8 -3 -8 -3 -14 -5 C-11 -14 -8.6 -24 -7.6 -33 C-7 -38 -4 -41 0 -41 Z`),e.fill(`M-6 -5 L-6.4 0 L-1 0 L-2 -5 Z`),e.fill(`M3 -5 L2.6 0 L9 0 L6 -5 Z`),e.fill(`M-1 -41 L-2 -44 C-7 -46 -8.6 -51 -6.6 -55 C-4.4 -59.6 3 -60 5.8 -55.6 C6.6 -54.2 6.8 -53 7 -52 L9 -49.6 L7 -48.8 C7 -46.6 5.6 -44.8 3 -44.4 L3 -41 Z`),e.fill(`M-5 -57 C-11 -57 -15 -52 -13.6 -46 C-20 -42 -30 -49 -41 -43 C-33 -40 -24 -35 -14 -38 C-9.6 -39.6 -6.4 -43 -5.6 -46 Z`),e.fill(`M-13 -44 C-20 -38 -26 -35 -35 -32 C-27 -30 -18 -33 -11 -39 Z`),e.cut(e.star(-8.4,-51.4,2.5,5,.46));for(let t=0;t<5;t++)e.cut(e.drop(-9.4+t*4.7,-9.6,1,-Math.PI/2,2));e.cut(e.star(0,-27,2.5))}),j=_(`yasArm`,-4,-6,36,12,4,e=>{e.fill(e.bar(0,0,14,-1,3.8,3)),e.fill(e.bar(14,-1,28,-4,3,2)),e.fill(e.dot(28.6,-4.2,1.6)),e.rivet(0,0,1.2)}),M=_(`rod`,-3,0,6,900,1.6,e=>{e.fill(e.bar(0,0,0,900,3,4))}),te=_(`rodTop`,-6,-6,12,132,3,e=>{e.fill(e.bar(0,0,0,120,2.6,3)),e.rivet(0,120,3.4)}),N=_(`wire`,-2,0,4,800,1.6,e=>{e.fill(e.bar(0,0,0,800,1.5,2.4))}),P=_(`hoopoeBody`,-110,-60,222,96,4,e=>{e.fill(`M38 -18 C46 -19 52 -13 52 -7 C52 -3 49 -0.5 45 1.5 C38 8 28 18 8 19 C-10 20 -26 13 -38 4 L-42 -6 C-30 -15 -14 -19 2 -18 C14 -17 26 -20 38 -18 Z`),e.fill(`M49 -9 C60 -8 74 -4 90 6 C76 1 60 -1 49 -3 Z`),e.fill(`M-34 -7 C-54 -11 -78 -12 -100 -11 C-105 -7 -106 3 -102 7 C-80 8 -56 7 -36 4 Z`),e.cut(e.slit(-76,-7.8,-76.6,4.6,2.2)),e.cut(e.slit(-68,-7.6,-68.6,4.2,.8));for(let t of[-6,-1.4,3])e.cut(e.slit(-98,t,-80,t,.55)+e.slit(-64,t,-44,t*.6,.55));e.cut(e.dot(42,-9.4,1.5));for(let t=0;t<7;t++){let n=t/6;e.cut(e.drop(28-n*48,8-n*5+Math.sin(n*3.14)*2.6,1.4,1.8,2.1))}e.cut(e.star(8,-4,4)),e.fill(`M4 17 L9 25 L13 24 L10 26 L6 26 L1 18 Z`),e.rivet(-6,13,2.6)}),ne=(e,t,n,r)=>{let i=Math.cos(t),a=Math.sin(t),o=(e,t)=>`${e*i-t*a} ${e*a+t*i}`;e.fill(`M${o(0,0)}C${o(n*.3,-r*.5)} ${o(n*.8,-r)} ${o(n,-r*.1)}C${o(n*.85,r*.8)} ${o(n*.35,r*.5)} ${o(0,0)}Z`);let s=n*.72*i,c=n*.72*a;e.cut(e.dot(s,c,r*.28))},F=_(`hoopoeCrest`,-44,-46,84,56,4,e=>{for(let t=0;t<7;t++){let n=t/6;ne(e,-Math.PI*(.2+.72*n),33-Math.abs(n-.42)*12,6)}});new n([[0,0],[-22,-14],[-46,-32],[-70,-46]]);var I=_(`wingInner`,-50,-60,72,72,4,e=>{e.fill(`M4 4 C-6 -14 -24 -38 -40 -44 C-44 -30 -40 -10 -28 8 C-16 14 -4 12 4 4 Z`);for(let t=0;t<4;t++){let n=.15+t*.22,r=2-n*42,i=2-n*46,a=-18-n*30,o=12-n*20;e.cut(e.slit(r,i,a,o,1.9,1.6))}e.rivet(0,0,2.6)}),re=_(`wingOuter`,-60,-66,86,84,4,e=>{e.fill(`M6 6 C-6 -6 -20 -28 -36 -48 C-42 -56 -50 -60 -56 -58 C-58 -40 -54 -24 -46 -8 C-42 2 -36 8 -26 10 C-14 12 -2 12 6 6 Z`);for(let t=0;t<5;t++){let n=.1+t*.18,r=0-n*42,i=0-n*52,a=-24-n*24,o=10-n*30;e.cut(e.slit(r,i,a,o,1.8,1.8))}e.cut(e.slit(-56,-58,-40,-40,1)+e.slit(-58,-44,-44,-30,.9)+e.slit(-54,-26,-40,-16,.9)),e.rivet(0,0,2.2)}),L=(e,t,r,i)=>_(e,-10,-t*.35,t+20,t*(.5+r)+20,i,e=>{let i=new n([[0,0],[t*.3,-t*.2],[t*.7,-t*.04+r*t*.4],[t,r*t]]),a=i.at(0);for(let t=1;t<=16;t++){let n=i.at(t/16);e.fill(e.bar(a.x,a.y,n.x,n.y,3.2-t/16*2.4,3-t/16*2.4)),a=n}for(let n=0;n<34;n++){let r=.08+.92*n/33,a=i.at(r),o=t*.36*Math.sin(Math.PI*Math.min(1,r*.86+.12))**.7*(1-r*.2),s=.95-r*.55;for(let t of[-1,1]){let r=t>0?1.1:.82,i=a.a+t*s,c=a.x+Math.cos(i)*o*r,l=a.y+Math.sin(i)*o*r+o*.16,u=n*7%3*.5;e.fill(e.slit(a.x,a.y,c,l+u,1.35,-t*o*.1))}}}),R=L(`frondA`,118,.42,3),z=L(`frondB`,96,.62,3),B=L(`frondNear`,420,.5,1),V=(e,t,r,i)=>_(e,-20-Math.abs(r),-t-8,40+2*Math.abs(r),t+16,i,e=>{let i=new n([[0,0],[r*.15,-t*.35],[r*.55,-t*.72],[r,-t]]);for(let t=0;t<26;t++){let n=i.at(t/26),r=i.at((t+1)/26),a=11.5-t/26*6.5,o=11.5-(t+1)/26*6.5;e.fill(e.bar(n.x,n.y,r.x,r.y,a+2,o-.4)),t%2&&e.cut(e.slit(n.x-a*.28,n.y,n.x+a*.28,n.y-.6,.7))}let a=i.at(1);for(let t of[-1,1]){let n=a.x+t*8,r=a.y+5;e.fill(`M${n} ${r-3}C${n+t*7} ${r-2} ${n+t*9} ${r+8} ${n+t*5} ${r+13}C${n+t*1} ${r+11} ${n-t*2} ${r+4} ${n} ${r-3}Z`);for(let[i,a]of[[3,2],[5.4,6],[3,8],[5,10.4]])e.cut(e.dot(n+t*i,r+a,.75))}}),H=V(`trunkA`,120,26,3),U=V(`trunkB`,78,-22,3),ie=_(`islandA`,-220,-150,460,190,2.4,e=>{e.fill(`M-214 34 C-190 16 -160 12 -130 0 C-110 -8 -96 -28 -70 -30 C-52 -32 -40 -14 -14 -14 C10 -14 22 -24 48 -22 C72 -20 92 -8 120 0 C160 10 196 18 232 34 Z`),e.fill(`M-40 -14 L-40 -66 L-34 -66 L-34 -120 L0 -120 L0 -66 L30 -66 L30 -14 Z`),e.fill(`M-38 -120 L-38 -128 L-30 -128 L-30 -122 L-24 -122 L-24 -128 L-16 -128 L-16 -122 L-10 -122 L-10 -128 L-2 -128 L-2 -122 L4 -122 L4 -120 Z`);for(let t of[-27.4,-17,-6.6])e.cut(`M${t-3.2} -76L${t-3.2} -106C${t-3.2} -110 ${t} -112 ${t} -114C${t} -112 ${t+3.2} -110 ${t+3.2} -106L${t+3.2} -76Z`);e.cut(e.star(-17,-67,4));for(let t of[-24,-6,12])e.cut(`M${t-4} -22L${t-4} -42C${t-4} -47 ${t} -49 ${t} -52C${t} -49 ${t+4} -47 ${t+4} -42L${t+4} -22Z`);for(let t=0;t<4;t++)e.fill(`M${2+t*7} -66L${2+t*7} -72L${6+t*7} -72L${6+t*7} -66Z`);let t=new n([[-180,22],[-130,8],[-80,-14],[-60,-12],[-20,-4],[40,-2],[96,10],[130,12],[170,18],[206,30]]);e.cut(t.dashes(e,16,6,.9,.02,.98,.2));for(let[t,n,r]of[[-126,18,2.6],[-98,6,2.2],[-74,-14,3],[72,8,2.8],[106,20,2.2],[150,24,1.8]])e.cut(e.star(t,n,r))}),ae=_(`islandB`,-130,-96,260,130,2.4,e=>{e.fill(`M-124 30 C-90 14 -70 2 -44 -10 C-20 -22 12 -20 34 -10 C60 2 90 14 124 30 Z`),e.fill(`M-26 -14 L-26 -44 L-18 -44 L-18 -38 L-10 -38 L-10 -44 L-2 -44 L-2 -38 L6 -38 L6 -44 L14 -44 L14 -14 Z`),e.fill(`M14 -14 L14 -68 L18 -68 L18 -74 L22 -74 L22 -68 L26 -68 L26 -74 L30 -74 L30 -68 L34 -68 L34 -14 Z`),e.cut(e.star(24,-52,4)+`M21 -36L21 -26L27 -26L27 -36C27 -38 24 -40 24 -41C24 -40 21 -38 21 -36Z`);for(let t of[-16,-6,4])e.cut(`M${t-2.4} -18L${t-2.4} -30C${t-2.4} -32 ${t} -33 ${t} -34C${t} -33 ${t+2.4} -32 ${t+2.4} -30L${t+2.4} -18Z`);let t=new n([[-100,22],[-60,6],[-40,-4],[0,-8],[30,-6],[70,12],[100,22]]);e.cut(t.dashes(e,10,5,.8))}),oe=_(`islandC`,-90,-50,180,80,2.4,e=>{e.fill(`M-86 26 C-60 12 -40 4 -22 -4 C-6 -12 12 -12 28 -2 C48 8 66 14 86 26 Z`),e.fill(`M-4 -8 L-1 -38 L9 -38 L12 -8 Z`),e.fill(`M-3 -38 L-3 -41 L13 -41 L13 -38 Z`),e.fill(`M0 -41 L0 -46 C2 -50 8 -50 10 -46 L10 -41 Z`),e.cut(e.dot(5,-45,2)+e.slit(1,-26,9,-26,1)+e.slit(0,-16,10,-16,1))}),se=_(`farDhow`,-74,-110,150,130,3,e=>{e.fill(`M-52 -6 C-30 0 20 0 38 -6 C46 -10 58 -18 66 -24 C60 -8 48 8 30 14 C4 20 -26 18 -42 8 C-48 4 -52 -2 -52 -6 Z`),e.fill(`M46 -14 C22 -30 -14 -66 -44 -102 C-46 -74 -44 -36 -36 -12 C-14 -18 20 -20 46 -14 Z`,.94),e.fill(e.bar(-2,-2,6,-82,2.4,1.2)),e.cut(e.star(-22,-38,6));for(let t=0;t<4;t++)e.cut(e.slit(-14+t*10,-20,-36+t*12,-60+t*10,.5))}),ce=_(`gull`,-16,-8,32,14,3,e=>{e.fill(`M0 0 C-4 -5 -10 -6 -15 -3 C-9 -4 -4 -2 -1 2 L1 2 C4 -2 9 -4 15 -3 C10 -6 4 -5 0 0 Z`)}),W=(e,t,r,i,a,o,s)=>_(e,-2,-r-6,t+4,r+i+12,a,e=>{let a=r,c=i,l=s===0?`M-2 ${a*.1} L0 ${a*.1} C${t*.14} ${a*.1} ${t*.26} ${-a*.2} ${t*.4} ${-a*.7} C${t*.47} ${-a*1.02} ${t*.56} ${-a*1.02} ${t*.62} ${-a*.72} C${t*.655} ${-a*.48} ${t*.635} ${-a*.28} ${t*.6} ${-a*.34} C${t*.585} ${-a*.38} ${t*.59} ${-a*.52} ${t*.605} ${-a*.5} C${t*.575} ${-a*.72} ${t*.53} ${-a*.42} ${t*.58} ${-a*.16} C${t*.63} ${a*.1} ${t*.84} ${a*.16} ${t} ${a*.1}`:`M-2 ${a*.1} L0 ${a*.1} C${t*.2} ${a*.1} ${t*.3} ${-a*.9} ${t*.5} ${-a*.9} C${t*.7} ${-a*.9} ${t*.8} ${a*.1} ${t} ${a*.1}`,u=`L${t+2} ${a*.1} L${t+2} ${c} L${t} ${c} C${t*.86} ${c+a*.16} ${t*.72} ${c+a*.16} ${t*.5} ${c-a*.04} C${t*.32} ${c-a*.2} ${t*.16} ${c-a*.18} 0 ${c} L-2 ${c} Z`;if(e.fill(l+u),o){let r=new n([[t*.02,a*.34],[t*.18,a*.3],[t*.32,-a*.1],[t*.45,-a*.46],[t*.5,-a*.6],[t*.54,-a*.6],[t*.56,-a*.46]]);e.cut(r.dashes(e,5,0,Math.max(.7,a*.03),.04,.96)),r.each(7,a*.3,(t,n)=>e.cut(e.dot(t,n,Math.max(.6,a*.03))),.2,.96);let i=new n([[t*.62,a*.42],[t*.72,a*.5],[t*.86,a*.5],[t*.98,a*.44]]);e.cut(i.dashes(e,3,0,Math.max(.6,a*.026)))}}),le=W(`waveFar`,128,6,7,3,!1,1),ue=W(`waveMidA`,176,15,13,3,!0,0),G=W(`waveMidB`,214,19,15,3,!0,0),de=W(`waveFore`,310,30,22,2,!0,0),fe=W(`waveNear`,620,54,150,1,!1,0),pe=()=>g,K=0,q=1,me=2,he=3,J=(e,t,n,r,i,a,o,s=0)=>{let c=(t.w-4)*o,l=(i%c+c)%c,u=Math.cos(s),d=Math.sin(s);for(let i=l-c*2;i<a+c*2;i+=c){let s=i-a*.5;e(t,n,[o*u,-o*d,o*d,o*u,a*.5+s*u,r+s*d])}};function ge(e,t,n,r,s){let{w:u,k:d}=t,f=-s,p=u+s*2,m=t.sea;J(e,le,K,m+1*d,Math.sin(n*.19)*18*d,p+s,d*1.05,.0012*Math.sin(n*.21)),J(e,le,K,m+10*d,-Math.sin(n*.23+2)*22*d+60,p+s,d*1.2,-.0012*Math.sin(n*.17));let h=(e,t,r)=>e*Math.sin(n*t+r);{let r=[t.islandAK,0,0,t.islandAK,t.islandAX,t.islandAY+h(.8,.31,0)];e(ie,K,r),_e(e,K,l(r,i(-140,-6)),H,n,.2,1.05),_e(e,K,l(r,i(92,-10)),U,n,1.4,.9),_e(e,K,l(r,i(138,2),o(.82)),H,n,2.7,.8),e(ae,K,[t.islandBK,0,0,t.islandBK,t.islandBX,t.islandBY+h(.6,.27,1)]),e(oe,K,[t.islandBK*.86,0,0,t.islandBK*.86,t.islandCX,t.islandCY+h(.5,.23,2)])}{let s=u*.42,c=(n*.008+r*.1)%1,f=t.farX+(c<.5?c:1-c)*s,p=Math.sin(n*.6)*.03;e(se,K,l(i(f,t.farY+Math.sin(n*.7)*1.6*d),a(p),o(d*.62)))}for(let[r,i,a]of[[0,.72,-92],[1,.76,-78]]){let o=.55+.45*Math.sin(n*(3.2+r*.5)+r*2),s=((t.farX*.6+n*(9+r*2)*d+u*i)%(u+200)+u+200)%(u+200)-100;e(ce,K,[d*.9,0,0,d*.9*(.5+.7*o),s,m+a*d+Math.sin(n*.6+r)*6])}J(e,ue,q,m+44*d,Math.sin(n*.31)*34*d,p,d,.002*Math.sin(n*.33));let g=Math.sin(n*.72)*.024+Math.sin(n*.31+1)*.012,_=Math.sin(n*.72+.8)*2.4*d+Math.sin(n*.43)*1.2*d,v=t.dhowX+Math.sin(n*.06)*26*d+r*50*d,y=t.dhowK,S=l(i(v,t.dhowY+_),a(g),o(y));{let t=l(S,i(-20,42),a(.16+g*.8));e(te,q,t),e(M,q,l(t,i(0,120),a(-.26-g*.5)),1)}let C=l(S,c(-6,-6,Math.sin(n*.72+.4)*.012));e(x,q,C);let w=l(C,c(4,-224,Math.sin(n*.44+.7)*.012+Math.sin(n*1.3)*.003)),ne=1+Math.sin(n*.52+1.4)*.012;e(T,q,l(w,i(120,-48),[ne,0,Math.sin(n*.52+1.4)*.006,1,0,0],i(-120,48)),1),e(E,q,w);let L=Math.sin(n*2.3)*.18-.12,R=Math.sin(n*2.3-.9)*.34-.04,z=l(C,i(19,-306),a(L));e(D,q,z),e(O,q,l(z,i(34,-3),a(R)));let V=n*1.05;for(let t=0;t<3;t++){let n=.72+Math.sin(V+t*.18)*.17,r=Math.cos(V+t*.18);e(ee,q,l(S,i(-60+t*58,8+(t===1?3:0)),a(n+r*.03)))}e(k,q,l(S,i(-168,18),a(Math.sin(n*.5)*.09))),e(b,q,S);let W=l(S,i(-92,-13),o(.92),c(0,0,-g*1.4+Math.sin(n*.72+.4)*.018));e(A,q,W),e(j,q,l(W,i(2.2,-35),a(-.1+Math.sin(n*.5)*.07))),J(e,G,q,m+80*d,-Math.sin(n*.37+1)*42*d+40,p,d,-.0024*Math.sin(n*.29+1)),J(e,G,q,m+118*d,Math.sin(n*.29+2.4)*30*d+90,p,d*1.12,.0026*Math.sin(n*.25+2));{let r=(n-19+11.18)%26/26,s=u+420*d,c=-210*d+s*r,f=Math.sin(r*Math.PI*2*5.5),p=(e,t,n)=>{let r=Math.max(0,Math.min(1,(n-e)/(t-e)));return r*r*(3-2*r)},m=t.hoopSky+(t.hoopY-t.hoopSky)*p(.2,.31,r)+(t.hoopY2-t.hoopY)*p(.31,.43,r)+f*9*d,h=Math.cos(r*Math.PI*2*5.5)*.14,g=t.hoopK,_=l(i(c,m),a(-h*.9),o(g)),v=Math.sin(n*13),y=.25+.75*(.5+.5*Math.sin(r*Math.PI*2*5.5+1)),b=v*.62*y+.12,x=Math.sin(n*13-.9)*.72*y+.1,S=l(_,i(10,-9),a(b*.9+.34),o(.88,.88));e(I,q,S),e(re,q,l(S,i(-30,-30),a(x*.9))),e(P,q,_),e(F,q,l(_,i(36,-16),a(Math.sin(n*2.2)*.07+f*.05))),e(N,q,l(_,i(-6,13),a(-h*.2+.03)),.95);let C=l(_,i(6,-8),a(b));e(I,q,C),e(re,q,l(C,i(-30,-30),a(x)))}if(J(e,de,me,m+167*d,-Math.sin(n*.26+.4)*60*d+130,p,d,-.003*Math.sin(n*.21)),J(e,de,me,m+228*d,Math.sin(n*.21+2)*74*d+20,p,d*1.22,.003*Math.sin(n*.19+1)),t.phone){let r=t.bottom;J(e,G,q,r-118*d,Math.sin(n*.33)*30*d,p,d*1.3,.003*Math.sin(n*.3)),J(e,de,me,r-68*d,-Math.sin(n*.27+1)*46*d+80,p,d*1.1,-.004*Math.sin(n*.21))}J(e,fe,he,t.bottom-16*d,Math.sin(n*.16)*110*d,p+s,d);let pe=Math.sin(n*.5)*.02+Math.sin(n*1.21)*.006;e(B,he,l(i(f+s*.34,t.bottom-170*d),a(-.72+pe),o(d*1.02))),e(B,he,l(i(f+s*.2,t.bottom-110*d),a(-.2+pe*1.3),o(d*.86)))}function _e(e,t,n,r,c,u,d){let f=s(n,o(d));e(r,t,f);let p=r===H?[26,-120]:[-22,-78];[-2.9,-2.4,-1.95,-1.3,-.82,-.3,.12].forEach((n,r)=>{let s=Math.sin(c*.8+u+r*.7)*.025+Math.sin(c*1.9+u*2+r)*.009,d=r%2?R:z,m=Math.cos(n)<0;e(d,t,l(f,i(p[0],p[1]),a(n+s),m?o(1,-1):o(1,1)))})}var ve=`#version 300 es
in vec2 aPos;
out vec2 vPos;
void main() { vPos = aPos; gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0); }`,ye=`#version 300 es
precision highp float;
in vec2 vPos;
out vec4 fragColor;

uniform vec2 uStage;       // the canvas in wall pixels (CSS px)
uniform float uCamY;       // how far down the wall the camera is
uniform vec3 uFlame;       // flame position: x, y along the wall, z off the wall
uniform mat3 uToLamp;      // world direction -> the lantern's own frame
uniform vec2 uMaskRange;   // half range of the baked panorama, in radians (longitude, latitude)
uniform float uMaskLod;    // how soft the piercing is, from the size of the flame
uniform vec2 uMaskTexel;
uniform float uPower;
uniform float uR0;         // falloff radius
uniform vec4 uLayer[4];    // for each puppet plane: scale, offset x, offset y, lod
uniform vec2 uOrg;         // the puppet map's origin and extent, in rest wall pixels
uniform vec2 uExt;
uniform float uFlip;       // 1 mirrors the world, for right to left pages
uniform vec4 uCopyBox;     // the words: x0, y0, x1, y1 in wall px
uniform vec4 uCopyFeather; // how far the calm reaches beyond each side
uniform vec4 uCtaBox;      // the button, which sits lower than the words and doesn't need the calm to run the full width
uniform vec4 uCtaFeather;
uniform float uCalmWob;
uniform float uLumaCap;    // the brightest the wall may get behind the text
uniform float uSeaY;       // on phones, the far end of the long wall, where the water throws back a low glow
uniform float uExposure;
uniform vec3 uAmbient;
uniform vec3 uLightCol;
uniform vec3 uPinkCol;
uniform vec3 uAlbedo;
uniform float uLeak;
uniform float uFogGain;    // beams in the air
uniform float uHalo;       // the size of the glow in the air around the lantern
uniform float uTime;
uniform sampler2D uMask;
uniform sampler2D uShadow;
uniform sampler2D uPlaster;

const float PI = 3.14159265;

vec2 maskUv(vec3 d) {
  // d is the direction from the flame in the world. The lantern's own frame has x right, y up and -z towards the wall.
  vec3 l = uToLamp * d;
  float lon = atan(l.x, -l.z) * (uFlip > 0.5 ? -1.0 : 1.0);
  float lat = asin(clamp(l.y, -1.0, 1.0));
  return vec2(0.5 + lon / (2.0 * uMaskRange.x), 0.5 - lat / (2.0 * uMaskRange.y));
}

vec3 sampleMask(vec3 d, float lod) {
  vec2 uv = maskUv(d);
  // Four taps a step up the mip chain, so the blur stays round and never shows the texels.
  vec2 o = uMaskTexel * pow(2.0, lod) * 0.5;
  float l1 = max(lod - 1.0, 0.0);
  vec3 c = textureLod(uMask, uv + o * vec2(0.92, 0.38), l1).rgb
         + textureLod(uMask, uv + o * vec2(-0.38, 0.92), l1).rgb
         + textureLod(uMask, uv + o * vec2(-0.92, -0.38), l1).rgb
         + textureLod(uMask, uv + o * vec2(0.38, -0.92), l1).rgb;
  return c * 0.25;
}

float layerShadow(vec2 P, int k, vec2 tx) {
  vec4 L = uLayer[k];
  vec2 rest = P * L.x + L.yz;
  vec2 uv = (rest - uOrg) / uExt;
  if (uFlip > 0.5) uv.x = 1.0 - uv.x;
  float lod = L.w;
  if (lod < 1.2) return textureLod(uShadow, uv, lod)[k];
  vec2 o = tx * pow(2.0, lod) * 0.5;
  float l1 = lod - 1.0;
  return 0.25 * (textureLod(uShadow, uv + o * vec2(0.92, 0.38), l1)[k]
               + textureLod(uShadow, uv + o * vec2(-0.38, 0.92), l1)[k]
               + textureLod(uShadow, uv + o * vec2(-0.92, -0.38), l1)[k]
               + textureLod(uShadow, uv + o * vec2(0.38, -0.92), l1)[k]);
}

float calm(vec2 P, vec4 box, vec4 f, float low) {
  return smoothstep(box.x - f.x, box.x, P.x) * (1.0 - smoothstep(box.z, box.z + f.z, P.x))
       * smoothstep(box.y - f.y, box.y, P.y) * (1.0 - smoothstep(box.w + low, box.w + low + f.w, P.y));
}

float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }

vec3 toSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(1e-5)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 fromSrgb(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  // Wall position in CSS px, y down
  vec2 P = vec2(vPos.x, 1.0 - vPos.y) * uStage + vec2(0.0, uCamY);
  vec3 W = vec3(P, 0.0);

  vec3 toF = uFlame - W;
  float r = length(toF);
  vec3 L = toF / r;

  // The plaster's relief, raked by the light
  vec2 tileUv = P / 620.0;
  vec3 pl = texture(uPlaster, tileUv).rgb;
  vec3 pl2 = texture(uPlaster, tileUv * 0.37 + 0.31).rgb;
  vec2 slope = (pl.rg - 0.5) * 0.7 + (pl2.rg - 0.5) * 0.45;
  vec3 N = normalize(vec3(-slope * 0.3, 1.0));
  float ndl = max(dot(N, L), 0.0);
  float flat_ndl = max(L.z, 0.0);
  float raking = ndl / max(flat_ndl, 0.08);

  // The text sits in a calmer patch of the wall.
  // The calm's lower edge is an uneven line, like a bank of cloud, so the light never looks boxed. It only ever reaches
  // further down than the words, never up into them.
  float low = uCalmWob * (0.5 + 0.31 * sin(P.x * 0.0061 + 1.3) + 0.19 * sin(P.x * 0.0173 + 0.4));
  float zone = max(calm(P, uCopyBox, uCopyFeather, low), calm(P, uCtaBox, uCtaFeather, low * 0.6));

  // What the flame sees in this direction
  vec3 M = sampleMask(-L, uMaskLod);
  // The pierced pattern's softening in the zone: pattern evens out to its own average there
  if (zone > 0.002) M = mix(M, sampleMask(-L, uMaskLod + 2.4) * 0.8 + 0.06, zone * 0.72);

  // Puppets: test the ray against each plane
  vec2 tx = 1.0 / vec2(textureSize(uShadow, 0));
  float s0 = layerShadow(P, 0, tx);
  float s1 = layerShadow(P, 1, tx);
  float s2 = layerShadow(P, 2, tx);
  float s3 = layerShadow(P, 3, tx);
  float S = (1.0 - s0) * (1.0 - s1) * (1.0 - s2) * (1.0 - s3);
  S = mix(S, 1.0, zone * 0.72);

  // Art-directed inverse square: it reaches further across the wall than real falloff would.
  float att = 1.0 / (1.0 + pow(r / uR0, 1.95));
  float wallCos = pow(flat_ndl, 0.45) * clamp(raking, 0.6, 1.6);

  // White in the mask is the open flame. Red in the mask is the pink glass, which throws its own colour.
  float open_ = min(M.g, M.b);
  float glass = max(M.r - open_, 0.0);
  vec3 thrown = uLightCol * open_ + uPinkCol * glass;
  vec3 direct = thrown * S * att * wallCos * uPower * (1.0 - zone * 0.9);
  float dy = direct.r * 0.5 + direct.g * 0.5;
  direct *= dy / (dy + 0.07);
  // A little light always leaks and bounces, so silhouettes read even where the piercing misses. It carries the shadows faintly.
  float bounce = 1.0 / (1.0 + pow(r / (uR0 * 1.25), 1.8));
  vec3 leak = uLightCol * uLeak * bounce * (0.3 + 0.7 * S) * uPower * (0.92 + 0.08 * raking) * (1.0 - zone * 0.8);

  float wash = (pl.b - 0.5) + (pl2.b - 0.5) * 0.8;
  vec3 albedo = uAlbedo * (1.0 + wash * 0.14);
  vec3 ambient = uAmbient * (1.0 + wash * 0.3) * (1.0 + slope.y * 0.3);
  // Phones: the wall runs long, past where the lamp can reach. The water at its far end holds the last of the light.
  float seaGlow = smoothstep(uSeaY - 230.0, uSeaY - 20.0, P.y);
  vec3 lit = albedo * (ambient + direct + leak + uLightCol * 0.26 * seaGlow * seaGlow * S * uPower * (1.0 - zone * 0.9));

  // Beams in the air: integrate along the view ray in front of the wall, through the same mask.
  float fogReach = 1.0 - smoothstep(1.0, 1.7, length(P - uFlame.xy) / uR0);
  if (uFogGain > 0.0 && fogReach > 0.0) {
    float j = ign(gl_FragCoord.xy + fract(uTime * 7.3) * 37.0);
    vec3 fog = vec3(0.0);
    const int N_FOG = 4;
    for (int i = 0; i < N_FOG; i++) {
      float z = uFlame.z * 1.7 * (float(i) + j) / float(N_FOG);
      vec3 Q = vec3(P, z);
      vec3 d = Q - uFlame;
      float rq = length(d);
      float m = textureLod(uMask, maskUv(d / rq), uMaskLod + 1.4).g;
      fog += m / (1.0 + rq * rq / (uR0 * uR0 * 0.2));
    }
    lit += uLightCol * fog * uFogGain * uPower * fogReach * (1.0 - zone * 0.8) / float(N_FOG);
  }

  // Air around the lamp holds a little of its light. This is what seats the lantern in the room rather than on the page.
  {
    vec2 dl = P - uFlame.xy;
    float d2 = dot(dl, dl) / (uHalo * uHalo);
    lit += vec3(1.0, 0.46, 0.13) * (0.075 / (1.0 + d2 * 1.6) + 0.2 * exp(-d2 * 1.9)) * uPower;
  }

  // A filmic shoulder that keeps warm highlights warm
  vec3 c = 1.0 - exp(-lit * uExposure);
  vec3 out_c = c;

  // The ceiling on brightness behind the text, measured in real luminance: a soft knee, never a hard edge.
  if (zone > 0.001) {
    float y = luma(c);
    float yc = uLumaCap * (1.0 - exp(-y / uLumaCap));
    vec3 capped = c * (yc / max(y, 1e-4));
    out_c = mix(c, capped, smoothstep(0.1, 0.95, zone));
  }

  vec3 srgb = toSrgb(out_c);
  // Triangular dither removes banding from these long dark gradients.
  float n1 = ign(gl_FragCoord.xy);
  float n2 = ign(gl_FragCoord.yx + 17.0);
  srgb += (n1 + n2 - 1.0) * (1.6 / 255.0);
  fragColor = vec4(srgb, 1.0);
}`,be=`#version 300 es
in vec2 aPos;
in vec4 iM;     // a b c d
in vec2 iT;     // translation
in vec4 iRect;  // local x, y, w, h
in vec4 iUv;    // u0 v0 u1 v1
in vec2 iCh;    // channel, density
uniform vec2 uOrg;
uniform vec2 uExt;
out vec2 vUv;
flat out vec4 vMask;
void main() {
  vec2 local = iRect.xy + aPos * iRect.zw;
  vec2 p = vec2(iM.x * local.x + iM.y * local.y, iM.z * local.x + iM.w * local.y) + iT;
  vec2 ndc = (p - uOrg) / uExt * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
  vUv = mix(iUv.xy, iUv.zw, aPos);
  int ch = int(iCh.x + 0.5);
  vMask = vec4(ch == 0, ch == 1, ch == 2, ch == 3) * iCh.y;
}`,xe=`#version 300 es
precision highp float;
in vec2 vUv;
flat in vec4 vMask;
uniform sampler2D uAtlas;
out vec4 fragColor;
void main() {
  fragColor = vMask * texture(uAtlas, vUv).a;
}`,Se=`#version 300 es
in vec2 aPos;
uniform vec2 uStage;
uniform float uCamY;
uniform vec2 uCentre;   // where the ring is, in wall px
uniform vec2 uSize;     // sprite size in px
uniform vec2 uPivot;    // the ring in the sprite, 0..1
uniform float uAngle;
uniform float uGrow;    // the quad's margin factor, for bloom
out vec2 vUv;
void main() {
  vec2 q = (aPos - 0.5) * uGrow + 0.5;
  vec2 local = (q - uPivot) * uSize;
  float c = cos(uAngle), s = sin(uAngle);
  vec2 p = vec2(c * local.x - s * local.y, s * local.x + c * local.y) + uCentre - vec2(0.0, uCamY);
  vec2 ndc = p / uStage * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  vUv = q;
}`,Y=`#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 vUv;
uniform sampler2DArray uFrames;
uniform vec3 uFrame;    // layer a, layer b, mix
uniform float uFlicker;
uniform float uLit;     // how far the flame has caught
uniform float uMode;    // 0 the lantern, 1 its bloom
out vec4 fragColor;
void main() {
  if (uMode < 0.5) {
    vec4 a = texture(uFrames, vec3(vUv, uFrame.x));
    vec4 b = texture(uFrames, vec3(vUv, uFrame.y));
    vec4 c = mix(a, b, uFrame.z);
    // The bright glass breathes with the flame, the brass doesn't.
    float y = max(c.r, max(c.g, c.b));
    float glow = smoothstep(0.55, 1.0, y / max(c.a, 0.01));
    c.rgb *= (1.0 + (uFlicker - 1.0) * glow * 2.2) * mix(1.0, uLit, glow * 0.9 + 0.1);
    fragColor = c;
  } else {
    float lod = 4.4;
    vec2 uv = vUv;
    vec4 c = textureLod(uFrames, vec3(uv, uFrame.x), lod);
    vec4 d = textureLod(uFrames, vec3(uv, uFrame.x), lod + 1.4);
    vec3 glow = c.rgb * 0.5 + d.rgb * 0.8;
    // Only what is truly bright blooms
    float y = max(glow.r, max(glow.g, glow.b));
    glow *= smoothstep(0.34, 0.85, y);
    float edge = smoothstep(0.0, 0.14, uv.x) * smoothstep(1.0, 0.86, uv.x) * smoothstep(0.0, 0.14, uv.y) * smoothstep(1.0, 0.86, uv.y);
    fragColor = vec4(glow * edge * 0.42 * uFlicker * uLit, 0.0);
  }
}`,Ce=`#version 300 es
in vec2 aPos;
in vec4 iA;  // x, y, angle, kind
in vec2 iB;  // scale, brightness
uniform vec2 uStage;
uniform float uCamY;
uniform vec2 uSize;
out vec2 vUv;
flat out float vKind;
out float vLight;
void main() {
  vec2 local = (aPos - 0.5) * uSize * iB.x;
  float c = cos(iA.z), s = sin(iA.z);
  vec2 p = vec2(c * local.x - s * local.y, s * local.x + c * local.y) + iA.xy - vec2(0.0, uCamY);
  vec2 ndc = p / uStage * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  vUv = aPos;
  vKind = iA.w;
  vLight = iB.y;
}`,we=`#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 vUv;
flat in float vKind;
in float vLight;
uniform sampler2DArray uLinks;
out vec4 fragColor;
void main() {
  vec4 c = texture(uLinks, vec3(vUv, vKind));
  c.rgb *= vLight;
  fragColor = c;
}`,Te=`#version 300 es
precision highp float;
uniform vec2 uStage;
uniform float uCamY;
uniform vec3 uFlame;
uniform mat3 uToLamp;
uniform vec2 uMaskRange;
uniform float uFlip;
uniform float uTime;
uniform float uPower;
uniform float uDpr;
uniform float uR0;
uniform vec4 uBox;     // x, y, w, h of the air the dust lives in
uniform vec4 uCopyBox;
uniform float uK;
uniform sampler2D uMask;
flat out float vGlow;
vec3 hash3(float n) {
  vec3 p = fract(vec3(n) * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yzx + 33.33);
  return fract((p.xxy + p.yzz) * p.zyx);
}
void main() {
  float id = float(gl_VertexID) + 1.0;
  vec3 h = hash3(id);
  vec3 h2 = hash3(id + 91.0);
  // Rising very slowly on the lamp's warmth, wandering as it goes, wrapped within the box.
  float t = uTime * (0.012 + h2.x * 0.014);
  vec2 q = vec2(h.x + sin(uTime * (0.05 + h2.y * 0.09) + h2.z * 6.28) * 0.018 + t * (h2.z - 0.5) * 0.4, h.y - t);
  q = fract(q);
  float edge = smoothstep(0.0, 0.08, q.x) * smoothstep(1.0, 0.92, q.x) * smoothstep(0.0, 0.08, q.y) * smoothstep(1.0, 0.92, q.y);
  vec3 P = vec3(uBox.xy + q * uBox.zw, uFlame.z * (0.25 + 1.5 * h.z));
  vec3 d = P - uFlame;
  float r = length(d);
  vec3 l = uToLamp * (d / r);
  float lon = atan(l.x, -l.z) * (uFlip > 0.5 ? -1.0 : 1.0);
  float lat = asin(clamp(l.y, -1.0, 1.0));
  vec2 uv = vec2(0.5 + lon / (2.0 * uMaskRange.x), 0.5 - lat / (2.0 * uMaskRange.y));
  float m = textureLod(uMask, uv, 2.5).g;
  float zone = step(uCopyBox.x - 40.0, P.x) * step(P.x, uCopyBox.z + 40.0) * step(uCopyBox.y - 40.0, P.y) * step(P.y, uCopyBox.w + 40.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + h2.y * 1.7) + h2.x * 40.0);
  vGlow = m * edge * twinkle * uPower * (1.0 - zone) / (1.0 + r * r / (uR0 * uR0));
  vec2 ndc = (P.xy - vec2(0.0, uCamY)) / uStage * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  gl_PointSize = (1.4 + h2.z * 2.2) * uK * uDpr;
}`,Ee=`#version 300 es
precision highp float;
flat in float vGlow;
out vec4 fragColor;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float a = smoothstep(1.0, 0.1, dot(c, c));
  fragColor = vec4(vec3(1.0, 0.72, 0.42) * a * vGlow * 0.5, 0.0);
}`,De=(e,t,n)=>Math.max(t,Math.min(n,e)),Oe=8.5,ke=[110*Math.PI/180,82*Math.PI/180],Ae=27.7,je=2400,Me=.55,Ne=[.05,.2,.42,1.6],Pe=[.0024,.0605,.0705],Fe=[3.3,1.42,.33],Ie=[6,.1,.7],Le=[.86,.78,.66],Re=.01,ze=.115,Be=.03;function Ve(e,t,n){let r=(t,n)=>{let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(`lantern shader: ${e.getShaderInfoLog(r)}`);return r},i=e.createProgram(),a=r(e.VERTEX_SHADER,t),o=r(e.FRAGMENT_SHADER,n);if(e.attachShader(i,a),e.attachShader(i,o),e.bindAttribLocation(i,0,`aPos`),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))throw Error(`lantern program: ${e.getProgramInfoLog(i)}`);return e.deleteShader(a),e.deleteShader(o),{p:i,u:new Proxy({},{get(t,n){return n in t||(t[n]=e.getUniformLocation(i,n)),t[n]}})}}var He=async(e,t,n)=>{let r=await fetch(e,{signal:t});if(!r.ok)throw Error(`${r.status} ${e}`);return createImageBitmap(await r.blob(),{colorSpaceConversion:`none`,...n})},Ue=(e,t)=>new Promise(n=>{if(t.aborted)return n();let r=new IntersectionObserver(([e])=>{e.isIntersecting&&(r.disconnect(),n())},{rootMargin:`160% 0px`});r.observe(e),t.addEventListener(`abort`,()=>{r.disconnect(),n()})});async function We(e){let{stage:t,copy:n,section:i,signal:a,base:o,rtl:s,reduce:c,touch:l}=e,u=`${o}about/lantern/`,d=document.createElement(`div`);d.className=`ln-sticky`,d.setAttribute(`aria-hidden`,`true`);let p=document.createElement(`div`);p.className=`ln-poster`;let m=document.createElement(`canvas`);m.className=`ln-canvas`,d.append(p,m),t.append(d),n.classList.add(`ln-copy`),t.append(n);let g=matchMedia(`(max-width: 760px), (max-aspect-ratio: 20/21), (max-height: 559px)`),_=()=>g.matches,v=!1,y=()=>{let n=!_();n&&!v&&e.pin(Me),!n&&v&&(t.classList.remove(`is-pinned`),i.style.removeProperty(`height`)),v=n};y();let b=!1,x=()=>{b=!0;let e=_();p.style.backgroundImage=`url(${u}${e&&S<=600?`still-phone`:`still`}.webp)`,s&&(p.style.transform=`scaleX(-1)`),d.classList.toggle(`is-still`,e),p.classList.add(`is-on`),m.classList.remove(`is-on`)},S=1,C=1,w=1,T=1,E=200,D=300,O=100,ee=-900,k=1e3,A=430,j=!1,M=Oe,te={w:1,h:1,k:1,sea:700,dhowX:500,dhowY:700,dhowK:1,islandAX:0,islandAY:0,islandAK:1,islandBX:0,islandBY:0,islandBK:1,islandCX:0,islandCY:0,farX:0,farY:0,hoopSky:300,hoopY:500,hoopY2:500,hoopK:1,bottom:900,phone:!1},N={x0:0,y0:0,x1:0,y1:0},P={x0:0,y0:0,x1:0,y1:0},ne={x:0,y:0},F=new f(2.5,.17),I=new h,re=null,L=()=>{y(),S=t.clientWidth,j=_(),C=j?d.clientHeight:t.clientHeight,T=j?De(S/560,.56,1.1):De(Math.min(S/1440,C/900),.62,1.6),M=j?De(Math.min(S,C)/62,5.4,9):Oe*T;let n=48*M;j?(D=S*(s?.36:.64),O=52,i.style.setProperty(`--ln-lamp-room`,`${Math.round(O+n*1.4)}px`),i.style.setProperty(`--ln-sea-room`,`230px`)):(i.style.removeProperty(`--ln-lamp-room`),i.style.removeProperty(`--ln-sea-room`),D=S*(s?.765:.235),O=C*.105),w=j?t.clientHeight:C;let r=j?O+n*1.1:C*.705;A=j?30*M:Math.max(160*T,r+52*T-(O+Ae*M)),k=1e3*T,ee=O-k,F.w0=Math.sqrt(9.8/((k+12*M)/(Oe*T*100))),Object.assign(te,{w:S,h:w,k:T,sea:r,phone:j,bottom:w,dhowX:j?S*.235:S*.168,dhowY:r+(j?0:-2*T),dhowK:j?.5:T*.88,islandAX:j?S*.92:S*.37,islandAY:r-(j?2:4*T),islandAK:j?.44:T*.82,islandBX:j?S*.6:S*.88,islandBY:r-2*T,islandBK:j?.42:T*.72,islandCX:j?-100:S*.7,islandCY:r+1*T,farX:j?S*.44:S*.56,farY:r+1,hoopSky:j?O+n*.45:C*.33,hoopY:j?O+n*.86:C*.54,hoopY2:j?O+n*1:C*.69,hoopK:j?.46:T*.72}),E=Math.round(S*.22+60);let a=[e.headline,e.body,e.mark.el].map(e=>e.getBoundingClientRect()),o=t.getBoundingClientRect(),c=e.cta.getBoundingClientRect();if(ne.x=a[0].left-o.left,ne.y=a[0].top-o.top,N.x0=Math.min(...a.map(e=>e.left))-o.left-12,N.x1=Math.max(...a.map(e=>e.right))-o.left+12,N.y0=Math.min(...a.map(e=>e.top))-o.top-10,N.y1=Math.max(...a.map(e=>e.bottom))-o.top+10,P.x0=c.left-o.left-10,P.x1=c.right-o.left+10,P.y0=c.top-o.top-10,P.y1=c.bottom-o.top+10,j||(te.hoopY2=Math.min(r-8*T,P.y1+34*T)),j)F.limit=.17;else{let e=(s?D-N.x1:N.x0-D)-8.6*M-19*T;F.limit=De(e/(k+36*M)-.021,.06,.17)}re?.(),b&&x()};L();let R=new ResizeObserver(()=>L());R.observe(t),a.addEventListener(`abort`,()=>R.disconnect()),document.fonts?.ready.then(()=>{a.aborted||L()});let z=null;try{z=m.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`high-performance`})}catch{z=null}let B=null,V=()=>{R.disconnect(),B?.(),B=null,d.remove(),delete window.__lantern};if(!z)return x(),V;if(await Ue(i,a),a.aborted)return V;B=()=>z?.getExtension(`WEBGL_lose_context`)?.loseContext();try{await H(z)}catch(e){if(a.aborted)return V;console.warn(`[lantern] falling back to the still`,e),x()}return V;async function H(n){let i=Ve(n,ve,ye),o=Ve(n,be,xe),d=Ve(n,Se,Y),f=Ve(n,Ce,we),p=Ve(n,Te,Ee),h=n.createBuffer(),g=n.createVertexArray();n.bindVertexArray(g),n.bindBuffer(n.ARRAY_BUFFER,h),n.bufferData(n.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),n.STATIC_DRAW),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0);let _=(e,t,r,i,a)=>{let o=n.getAttribLocation(i,e);o<0||(n.enableVertexAttribArray(o),n.vertexAttribPointer(o,t,n.FLOAT,!1,a*4,r*4),n.vertexAttribDivisor(o,1))},v=new Float32Array(14400),y=n.createBuffer(),b=n.createVertexArray();n.bindVertexArray(b),n.bindBuffer(n.ARRAY_BUFFER,h),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0),n.bindBuffer(n.ARRAY_BUFFER,y),n.bufferData(n.ARRAY_BUFFER,v.byteLength,n.DYNAMIC_DRAW),_(`iM`,4,0,o.p,16),_(`iT`,2,4,o.p,16),_(`iRect`,4,6,o.p,16),_(`iUv`,4,10,o.p,16),_(`iCh`,2,14,o.p,16);let L=new Float32Array(540),R=n.createBuffer(),z=n.createVertexArray();n.bindVertexArray(z),n.bindBuffer(n.ARRAY_BUFFER,h),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0),n.bindBuffer(n.ARRAY_BUFFER,R),n.bufferData(n.ARRAY_BUFFER,L.byteLength,n.DYNAMIC_DRAW),_(`iA`,4,0,f.p,6),_(`iB`,2,4,f.p,6);let V=n.createVertexArray();n.bindVertexArray(null);let H={premultiplyAlpha:`none`},[U,ie,ae]=await Promise.all([fetch(`${u}lantern.json`,{signal:a}).then(e=>e.json()),He(`${u}mask.webp`,a,H),He(`${u}plaster.webp`,a,H)]),oe=await Promise.all(Array.from({length:U.frames},(e,t)=>He(`${u}f${t}.webp`,a,{premultiplyAlpha:`premultiply`}))),se=await Promise.all([0,1].map(e=>He(`${u}link${e}.webp`,a,{premultiplyAlpha:`premultiply`})));if(a.aborted)throw new DOMException(`aborted`,`AbortError`);n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.NONE);let ce=(e,t)=>{let r=n.createTexture();return n.bindTexture(n.TEXTURE_2D,r),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,n.RGBA,n.UNSIGNED_BYTE,e),n.generateMipmap(n.TEXTURE_2D),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR_MIPMAP_LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,t),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,t),r},W=ce(ie,n.CLAMP_TO_EDGE),le=[1/ie.width,1/ie.height],ue=ce(ae,n.REPEAT);ie.close(),ae.close();let G=e=>{let t=n.createTexture();n.bindTexture(n.TEXTURE_2D_ARRAY,t);let r=e[0].width,i=e[0].height;return n.texStorage3D(n.TEXTURE_2D_ARRAY,Math.floor(Math.log2(Math.max(r,i)))+1,n.RGBA8,r,i,e.length),e.forEach((e,t)=>{n.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,t,r,i,1,n.RGBA,n.UNSIGNED_BYTE,e),e.close()}),n.generateMipmap(n.TEXTURE_2D_ARRAY),n.texParameteri(n.TEXTURE_2D_ARRAY,n.TEXTURE_MIN_FILTER,n.LINEAR_MIPMAP_LINEAR),n.texParameteri(n.TEXTURE_2D_ARRAY,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D_ARRAY,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D_ARRAY,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),{t,w:r,h:i}},de=G(oe),fe=G(se),K=await r(pe(),l?2048:4096,l?.72:1.12);if(a.aborted)throw new DOMException(`aborted`,`AbortError`);let q=ce(K.canvas,n.CLAMP_TO_EDGE);K.canvas.width=K.canvas.height=1;let me=n.createTexture(),he=n.createFramebuffer(),J=0,_e=0;B=()=>{for(let e of[W,ue,q,me,de.t,fe.t])n.deleteTexture(e);n.deleteFramebuffer(he);for(let e of[h,y,R])n.deleteBuffer(e);for(let e of[g,b,z,V])n.deleteVertexArray(e);for(let e of[i.p,o.p,d.p,f.p,p.p])n.deleteProgram(e);n.getExtension(`WEBGL_lose_context`)?.loseContext()};let Me=Math.min(devicePixelRatio||1,l?1.75:2),Ue=1,We=()=>{Ue=Math.max(1,Math.min(Me,Math.sqrt((l?156e4:884e4)/Math.max(1,S*C))));let e=Math.round(S*Ue),t=Math.round(C*Ue);(m.width!==e||m.height!==t)&&(m.width=e,m.height=t);let r=Math.min(l?1.3:1.35,Ue),i=Math.min(4096,n.getParameter(n.MAX_TEXTURE_SIZE)),o=Math.min(i,Math.round((S+2*E)*r)),s=Math.min(i,Math.round((w+2*E)*r));(o!==J||s!==_e)&&(J=o,_e=s,n.bindTexture(n.TEXTURE_2D,me),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,o,s,0,n.RGBA,n.UNSIGNED_BYTE,null),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR_MIPMAP_LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.generateMipmap(n.TEXTURE_2D),n.bindFramebuffer(n.FRAMEBUFFER,he),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,me,0),n.bindFramebuffer(n.FRAMEBUFFER,null)),c&&!a.aborted&&_t(0,.3)},Ge=!1,Ke=0,qe=0,X=0,Z=0,Je=0,Ye=0,Xe=-1,Q=0,Ze=e=>{let n=t.getBoundingClientRect(),r=e.clientX-n.left,i=e.clientY-n.top,a=i>=0&&i<=n.height&&r>=0&&r<=n.width;if(e.pointerType===`mouse`){if(!a){Ge=!1;return}Ge&&(Je+=(r-X)/S*.34,Ye+=(i-Z)/C*.14,Q=Math.min(1,Q+Math.hypot(r-X,i-Z)/280)),Ge=!0,X=r,Z=i,Ke=r,qe=i}else e.pointerId===Xe&&(Je+=(r-X)/S*1.25,Ye+=(i-Z)/C*.12,Q=Math.min(1,Q+Math.hypot(r-X,i-Z)/200),X=r,Z=i,Ke=r,qe=i)},$={signal:a,passive:!0};addEventListener(`pointermove`,Ze,$),t.addEventListener(`pointerdown`,e=>{if(e.pointerType===`mouse`)return;Xe=e.pointerId;let n=t.getBoundingClientRect();X=e.clientX-n.left,Z=e.clientY-n.top,Ke=X,qe=Z},$);let Qe=e=>{e.pointerId===Xe&&(Xe=-1)};addEventListener(`pointerup`,Qe,$),addEventListener(`pointercancel`,Qe,$),document.documentElement.addEventListener(`mouseleave`,()=>Ge=!1,$);let $e=scrollY;addEventListener(`scroll`,()=>{let e=scrollY-$e;$e=scrollY;let t=De(e/Math.max(C,1),-.25,.25);Ye+=t*.36,Je+=t*.22*(F.vx>=0?1:-1),Q=Math.min(1,Q+Math.abs(t))},$),m.addEventListener(`webglcontextlost`,e=>{a.aborted||(e.preventDefault(),et=!0,x())},{signal:a});let et=!1,tt=0,nt=0,rt=(e,t,n,r=1)=>{if(nt>=900)return;let i=nt++*16;v.set(n,i),v[i+6]=e.x,v[i+7]=e.y,v[i+8]=e.w,v[i+9]=e.h;let a=e.uv;v[i+10]=a[0],v[i+11]=a[1],v[i+12]=a[2],v[i+13]=a[3],v[i+14]=t,v[i+15]=r},it=new Float32Array(9),at=new Float32Array(16),ot=l?36:90,st=+!!c,ct=0,lt=0,ut=0,dt=0,ft=!l,pt=1e6,mt=1e6,ht=1,gt=0;function _t(r,a){if(et)return;r>0&&(lt+=r,ut++,lt>=1.5&&(dt=ut/lt<54?dt+1:0,lt=0,ut=0,dt>=2&&(dt=0,ft?ft=!1:ht===1?ht=2:Me>1.25&&(Me=Math.max(1.25,Me*.85),We())))),st<1&&r>0&&t.getBoundingClientRect().top<innerHeight*.55&&(ct+=r,st=Math.min(1,ct/1.7));let l=st>=1?1:st*st*(3-2*st)*(1+(1-st)*.5*Math.sin(ct*31)*Math.sin(ct*13));if(!c){let e=null,t=null;(Ge||Xe!==-1)&&(e=F.limit*.8*Math.tanh((Ke-D)/(S*.34)),t=.045*Math.tanh((qe-C*.5)/(C*.5))),F.step(r,{aimX:e,aimZ:t,kickX:Je,kickZ:Ye,breeze:1}),Je=0,Ye=0,Q=Math.max(0,Q-r*1.2),I.step(r,Q+Math.abs(F.vx)*.6),tt+=r}let u=tt,h=Math.sin(F.ax),_=Math.cos(F.ax),x=Math.sin(F.az),re=Math.cos(F.az),B={x:D+h*k,y:ee+_*re*k,z:A+x*_*k},H=F.ax+F.tx,ie=F.az+F.tz,ae=Math.sin(H),oe=Math.cos(H),se=Math.sin(ie),ce=Math.cos(ie),G=Ae*M,pe=B.x+ae*G+I.jx*.9*T,K=B.y+oe*ce*G+I.jy*.9*T,ve=B.z+se*oe*G;{let e=Math.cos(-F.tw),t=Math.sin(-F.tw),n=(e,t)=>{let n=[0,0,0,0,0,0,0,0,0];for(let r=0;r<3;r++)for(let i=0;i<3;i++)for(let a=0;a<3;a++)n[r*3+i]+=e[r*3+a]*t[a*3+i];return n},r=n([e,0,t,0,1,0,-t,0,e],n([1,0,0,0,ce,-se,0,se,ce],n([oe,ae,0,-ae,oe,0,0,0,1],[1,0,0,0,-1,0,0,0,1])));it.set([r[0],r[3],r[6],r[1],r[4],r[7],r[2],r[5],r[8]])}let ye=5*T*I.size,be={x:D,y:ee+k+G,z:A},xe=J/(S+2*E);for(let e=0;e<4;e++){let t=Ne[e],n=be.z*t/(1+t),r=1+t,i=n/ve,a=(1-i)*r;at[e*4]=a,at[e*4+1]=be.x*(1-r)+pe*i*r,at[e*4+2]=be.y*(1-r)+K*i*r;let o=2*ye*(n/Math.max(1,ve-n))**1.4;at[e*4+3]=Math.max(0,Math.log2(Math.max(.001,o*xe*a))+.4)}gt++,(r===0||gt%ht===0)&&(nt=0,ge(rt,te,u+19,a,E),n.bindBuffer(n.ARRAY_BUFFER,y),n.bufferSubData(n.ARRAY_BUFFER,0,v.subarray(0,nt*16)),n.bindFramebuffer(n.FRAMEBUFFER,he),n.viewport(0,0,J,_e),n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),n.useProgram(o.p),n.uniform2f(o.u.uOrg,-E,-E),n.uniform2f(o.u.uExt,S+2*E,w+2*E),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,q),n.uniform1i(o.u.uAtlas,0),n.enable(n.BLEND),n.blendFunc(n.ONE,n.ONE_MINUS_SRC_COLOR),n.bindVertexArray(b),n.drawArraysInstanced(n.TRIANGLE_STRIP,0,4,nt),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindTexture(n.TEXTURE_2D,me),n.generateMipmap(n.TEXTURE_2D));let Se=j?De(-t.getBoundingClientRect().top,0,Math.max(0,w-C)):0;n.viewport(0,0,m.width,m.height),n.disable(n.BLEND),n.useProgram(i.p),n.bindVertexArray(g),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,W),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,me),n.activeTexture(n.TEXTURE2),n.bindTexture(n.TEXTURE_2D,ue);let Y=i.u,Ce=I.power*l;if(n.uniform1i(Y.uMask,0),n.uniform1i(Y.uShadow,1),n.uniform1i(Y.uPlaster,2),n.uniform2f(Y.uStage,S,C),n.uniform1f(Y.uCamY,Se),n.uniform3f(Y.uFlame,pe,K,ve),n.uniformMatrix3fv(Y.uToLamp,!1,it),n.uniform2f(Y.uMaskRange,ke[0],ke[1]),n.uniform2f(Y.uMaskTexel,le[0],le[1]),n.uniform1f(Y.uMaskLod,2.3+Math.log2(Math.max(.5,I.size))),n.uniform1f(Y.uPower,Ce),n.uniform1f(Y.uR0,j?48*M:A*1.57),n.uniform4fv(Y[`uLayer[0]`],at),n.uniform2f(Y.uOrg,-E,-E),n.uniform2f(Y.uExt,S+2*E,w+2*E),n.uniform1f(Y.uFlip,+!!s),n.uniform4f(Y.uCopyBox,N.x0,N.y0,N.x1,N.y1),n.uniform4f(Y.uCtaBox,P.x0,P.y0,P.x1,P.y1),n.uniform1f(Y.uCalmWob,34*T),j)n.uniform4f(Y.uCopyFeather,40,56,40,90),n.uniform4f(Y.uCtaFeather,40,40,40,90);else{let e=60*T;n.uniform4f(Y.uCopyFeather,s?500:150,300,s?150:500,e),n.uniform4f(Y.uCtaFeather,s?110*T:150,60*T,s?150:110*T,34*T)}if(n.uniform1f(Y.uLumaCap,ze),n.uniform1f(Y.uSeaY,j?w:1e6),n.uniform1f(Y.uExposure,1),n.uniform3fv(Y.uAmbient,Pe),n.uniform3fv(Y.uLightCol,Fe),n.uniform3fv(Y.uPinkCol,Ie),n.uniform3fv(Y.uAlbedo,Le),n.uniform1f(Y.uLeak,Re),n.uniform1f(Y.uFogGain,ft?Be:0),n.uniform1f(Y.uHalo,150*(j?M/Oe:T)),n.uniform1f(Y.uTime,c?0:u),n.drawArrays(n.TRIANGLE_STRIP,0,4),!c){n.enable(n.BLEND),n.blendFunc(n.ONE,n.ONE),n.useProgram(p.p),n.bindVertexArray(V),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,W);let e=p.u;n.uniform1i(e.uMask,0),n.uniform2f(e.uStage,S,C),n.uniform1f(e.uCamY,Se),n.uniform3f(e.uFlame,pe,K,ve),n.uniformMatrix3fv(e.uToLamp,!1,it),n.uniform2f(e.uMaskRange,ke[0],ke[1]),n.uniform1f(e.uFlip,+!!s),n.uniform1f(e.uTime,u),n.uniform1f(e.uPower,Ce),n.uniform1f(e.uDpr,Ue),n.uniform1f(e.uR0,(j?48*M:A*1.57)*.8),n.uniform4f(e.uBox,D-460*T,O-40,920*T,Math.min(w,760*T)),n.uniform4f(e.uCopyBox,N.x0,N.y0,N.x1,N.y1),n.uniform1f(e.uK,T),n.drawArrays(n.POINTS,0,ot)}n.enable(n.BLEND),n.blendFunc(n.ONE,n.ONE_MINUS_SRC_ALPHA);let we=1+(B.z-A)/je,Te=2.62*M*we,Ee=0;{let e=B.x-D,t=B.y-ee,n=Math.hypot(e,t,B.z-A),r=F.bx*k*.5,i=t/n,a=-e/n,o=1.05*M*we;for(;Ee<90;){let s=1-o/n;if(s<0)break;let c=r*Math.sin(Math.PI*s),l=D+e*s+i*c,u=ee+t*s+a*c;if(u<Se-30)break;let d=r*Math.sin(Math.PI*(s+.01)),f=Math.atan2(-(e*.01+i*(d-c)),t*.01+a*(d-c)),p=Ee*6;L[p]=l,L[p+1]=u,L[p+2]=f,L[p+3]=(Ee+1)%2,L[p+4]=1,L[p+5]=De(1.05-o/(k*.34)*.78,.26,1.05)*(.96+.32*(Ce-1)),Ee++,o+=Te}}n.useProgram(f.p),n.bindVertexArray(z),n.bindBuffer(n.ARRAY_BUFFER,R),n.bufferSubData(n.ARRAY_BUFFER,0,L.subarray(0,Ee*6)),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D_ARRAY,fe.t),n.uniform1i(f.u.uLinks,0),n.uniform2f(f.u.uStage,S,C),n.uniform1f(f.u.uCamY,Se);let Ve=M*4.4*we;n.uniform2f(f.u.uSize,Ve*(fe.w/fe.h),Ve),n.drawArraysInstanced(n.TRIANGLE_STRIP,0,4,Ee),n.useProgram(d.p),n.bindVertexArray(g),n.bindTexture(n.TEXTURE_2D_ARRAY,de.t),n.uniform1i(d.u.uFrames,0),n.uniform2f(d.u.uStage,S,C),n.uniform1f(d.u.uCamY,Se),n.uniform2f(d.u.uCentre,B.x,B.y);let He=U.h*M*we/U.pxPerCm,X=U.w*M*we/U.pxPerCm;n.uniform2f(d.u.uSize,X,He*(.985+.015*Math.cos(ie*3))),n.uniform2f(d.u.uPivot,U.ring[0]/U.w,U.ring[1]/U.h),n.uniform1f(d.u.uAngle,-H);let Z=De((F.tw*180/Math.PI/U.range+1)*.5,0,1)*(U.frames-1),Ze=Math.floor(Z);n.uniform3f(d.u.uFrame,Ze,Math.min(U.frames-1,Ze+1),Z-Ze),n.uniform1f(d.u.uFlicker,I.power),n.uniform1f(d.u.uLit,.18+.82*l),n.uniform1f(d.u.uMode,0),n.uniform1f(d.u.uGrow,1),n.drawArrays(n.TRIANGLE_STRIP,0,4),n.blendFunc(n.ONE,n.ONE),n.uniform1f(d.u.uMode,1),n.drawArrays(n.TRIANGLE_STRIP,0,4),n.disable(n.BLEND);let $=pe-ne.x,Qe=K-Se-ne.y;Math.abs($-pt)+Math.abs(Qe-mt)>4&&(pt=$,mt=Qe,e.headline.style.setProperty(`--ln-lx`,`${$.toFixed(0)}px`),e.headline.style.setProperty(`--ln-ly`,`${Qe.toFixed(0)}px`))}if(re=We,c&&(I.power=1,I.size=1,Object.assign(F,{ax:.012,az:0,tw:.03,vx:0,vz:0}),tt=4.5),We(),_t(0,c?.3:0),m.classList.add(`is-on`),!c)e.frame((e,t)=>_t(t,e));else{let n=NaN;e.frame(()=>{let e=t.getBoundingClientRect().top;j&&e!==n&&_t(0,.3),n=e})}}}export{We as default};