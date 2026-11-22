"use client";
import {useRef,useState} from "react";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
gsap.registerPlugin(ScrollTrigger,useGSAP);
const steps=["Warm the flatbread","Layer the filling","Drizzle the sauce","Fold and roll"];
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
function draw(ctx:CanvasRenderingContext2D,p:number){
  let seed=90;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const oval=(x:number,y:number,a:number,b:number,angle:number,fill:string)=>{ctx.beginPath();ctx.ellipse(x,y,a,b,angle,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()};
  const fill=clamp((p-.16)/.24),sauce=clamp((p-.45)/.25),fold=clamp((p-.71)/.24);
  ctx.clearRect(0,0,640,560);ctx.save();ctx.translate(320,280);ctx.rotate(-.16);
  ctx.shadowColor="#24150e55";ctx.shadowBlur=20;ctx.shadowOffsetY=11;
  oval(0,0,219,210,0,"#cbc7a9");ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  oval(0,-2,215,206,0,"#ebe7cb");oval(0,-2,195,186,0,"#d6d1b4");
  const bread=ctx.createRadialGradient(-45,-56,10,0,0,169);bread.addColorStop(0,"#f9deae");bread.addColorStop(.78,"#ebc78e");bread.addColorStop(1,"#c49560");
  ctx.beginPath();ctx.ellipse(0,0,164,155,0,0,2*Math.PI);ctx.fillStyle=bread;ctx.fill();
  for(let i=0;i<920;i++){const angle=random()*6.28,r=Math.sqrt(random());oval(Math.cos(angle)*r*157,Math.sin(angle)*r*147,1+random()*4,1+random()*2,random()*3,"rgba(127,72,34,"+(random()*.35)+")")}
  ctx.save();ctx.globalAlpha=fill;ctx.translate(0,-42*(1-fill));
  for(let i=0;i<94;i++){const x=(random()-.5)*69,y=(random()-.5)*210;oval(x,y,6+random()*12,3+random()*5,random()*3,["#507039","#8aa152","#803a24","#c97142","#b39641","#65361f"][i%6])}
  ctx.restore();ctx.save();ctx.strokeStyle="#fff1ce";ctx.lineWidth=7;ctx.lineCap="round";ctx.beginPath();for(let i=0;i<=Math.floor(160*sauce);i++){const x=26*Math.sin(i*.118),y=-100+i*1.25;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();ctx.restore();
  if(fold){for(const side of [-1,1]){ctx.save();ctx.scale(side,1);ctx.beginPath();ctx.moveTo(162,-10);ctx.quadraticCurveTo(159,-102,78,-137);ctx.bezierCurveTo(83-108*fold,-80,84-104*fold,83,76,136);ctx.quadraticCurveTo(160,95,162,-10);ctx.fillStyle="rgba(221,178,120,"+fold+")";ctx.fill();ctx.restore()}}
  ctx.restore();
}
export default function Shawarma({browse}:{browse:()=>void}){
 const root=useRef<HTMLElement>(null),canvas=useRef<HTMLCanvasElement>(null),photo=useRef<HTMLImageElement>(null);
 const [step,setStep]=useState(3);
 useGSAP(()=>{const ctx=canvas.current?.getContext("2d");if(!ctx||!root.current)return;
 const media=gsap.matchMedia();media.add("(prefers-reduced-motion: no-preference)",()=>{
 const state={p:0};const paint=()=>{draw(ctx,state.p);setStep(state.p<.2?0:state.p<.45?1:state.p<.71?2:3);gsap.set(photo.current,{opacity:clamp((state.p-.84)/.14),scale:1.045-.045*state.p})};
 root.current!.classList.add("scroll-recipe");paint();
 gsap.to(state,{p:1,ease:"none",onUpdate:paint,scrollTrigger:{trigger:root.current,start:"top top",end:"bottom bottom",scrub:.55,invalidateOnRefresh:true}});
 return()=>{root.current?.classList.remove("scroll-recipe");setStep(3);gsap.set(photo.current,{clearProps:"all"})};
 });return()=>media.revert()},{scope:root});
 return <section className="shawarma" ref={root} aria-label="Making a shawarma"><div className="recipe-stage"><div className="recipe-copy"><h2>Inside the<br/><em>shawarma.</em></h2><ol>{steps.map((name,i)=><li key={name} className={step===i?"current":""}>{name}</li>)}</ol><button className="primary" onClick={browse}>Explore shawarma</button></div><div className="recipe-art"><canvas ref={canvas} width="640" height="560" aria-hidden="true"/><img ref={photo} src="/img/shawarma.webp" loading="lazy" alt="Finished shawarma with a drizzle of sauce"/></div></div></section>
}
