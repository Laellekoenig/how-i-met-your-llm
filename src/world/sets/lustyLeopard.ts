import * as THREE from 'three';
import { box, cyl, glow, mesh, toon } from '../../engine/materials';
import { speckle } from '../../engine/textures';
import { bottles, keyLight, mark, nodes, plant, type StageSet, v3 } from './common';
import { label } from './furnishings';
import { interior } from './interior';
import { beer, rod, roundSeat, roundTable, sconce, venuePattern } from './venueDetails';

/** Karma: burgundy carpet, chrome café chairs, leopard inlays and a brass-railed stage. */
export function buildLustyLeopard(): StageSet {
  const g=new THREE.Group();g.name='lusty_leopard';
  const black=toon('#272126'),brass=toon('#ab8950');
  const leopard=toon('#ffffff',{map:venuePattern('leopard',[1,4])});
  interior(g,14,10,3.7,toon('#ffffff',{map:speckle('#762b37',[7,7],55,.14)}),toon('#803b44'),'#332831');
  for(const y of [.14,1.4,3.3]) g.add(mesh(box(14,.12,.1),black,0,y,-4.87));
  for(const x of [-6.4,-3.3,1.8,4.4,6.4]) {
    g.add(mesh(box(.54,3.35,.19),black,x,1.67,-4.82));
    g.add(mesh(new THREE.PlaneGeometry(.28,2.85),leopard,x,1.68,-4.714));
    // Warm cylindrical lattice lamps on top of the leopard-print columns.
    g.add(mesh(cyl(.22,.22,.42,12),glow('#d19d68',.8),x,3.29,-4.58));
    for(let i=0;i<8;i++) g.add(mesh(cyl(.011,.011,.44,5),black,x+.225*Math.cos(i*Math.PI/4),3.29,-4.58+.225*Math.sin(i*Math.PI/4)));
  }
  // Green-backed bottle shelves and sunburst mirror from the reverse shot in Karma.
  g.add(mesh(box(3.65,1.05,.65),black,-.65,.525,-3.85));
  g.add(mesh(box(3.85,.09,.87),toon('#594d43'),-.65,1.09,-3.85));
  g.add(mesh(box(3.9,1.65,.1),toon('#416149',{emissive:'#428454',emissiveIntensity:.25}),-.65,2.08,-4.74));
  for(const y of [1.28,1.97,2.73]) { g.add(mesh(box(3.95,.07,.28),black,-.65,y,-4.56)); bottles(g,-2.4,y+.04,-4.52,11,.33,0,Math.round(y*10)); }
  const mirror=mesh(new THREE.CircleGeometry(.4,20),toon('#939690'),-.65,2.27,-4.42);g.add(mirror);
  for(let i=0;i<24;i++){const a=i*Math.PI/12; rod(g,v3(-.65+Math.sin(a)*.44,2.27+Math.cos(a)*.44,-4.4),v3(-.65+Math.sin(a)*.68,2.27+Math.cos(a)*.68,-4.4),.014,brass);}
  // The small side stage is unoccupied: this set is also where Barney talks to Quinn.
  g.add(mesh(cyl(1.65,1.65,.3,32),black,-4.9,.15,-2.65));
  for(let i=0;i<26;i++){
    const a=i*Math.PI*2/26;g.add(mesh(cyl(.055,.055,.27,6),toon(i%2?'#34272e':'#211f28'),-4.9+Math.sin(a)*1.62,.135,-2.65+Math.cos(a)*1.62));
  }
  g.add(mesh(cyl(.035,.035,3.3,12),toon('#b9b2a0'),-5.1,1.95,-2.9));
  // Rail around the back and sides, leaving the audience-facing stage edge open.
  for(let i=0;i<13;i++){
    const a=Math.PI/2+i*Math.PI/12,x=-4.9+Math.sin(a)*1.72,z=-2.65+Math.cos(a)*1.72;
    g.add(mesh(cyl(.025,.025,.78,6),brass,x,.68,z));
    if(i<12){const b=a+Math.PI/12;rod(g,v3(x,1.08,z),v3(-4.9+Math.sin(b)*1.72,1.08,-2.65+Math.cos(b)*1.72),.025,brass);}
  }
  // Round green neon sign in the wide, with the three staggered words.
  g.add(mesh(new THREE.TorusGeometry(.68,.019,6,32),glow('#65b58a'),-5.0,2.35,-4.66));
  for(const [i,x]of [-.14,0,.14].entries()) label(g,'Girls',-5+x,2.65-i*.28,-4.62,.83,.23,i%2?'#6ab1cf':'#d9d8c9','#63343c','italic bold 50px Georgia');
  // Bead-curtain entrance, lifted clear of the dialogue mark.
  g.add(mesh(box(1.32,2.43,.1),black,5.3,1.215,-4.75));
  for(let x=4.72;x<5.94;x+=.095) for(let y=.12;y<2.3;y+=.12) g.add(mesh(new THREE.SphereGeometry(.027,5,4),toon('#ad8b78'),x,y,-4.65,false));
  label(g,'THE LUSTY LEOPARD',5.3,2.77,-4.64,2.2,.3,'#e7b681','#603039','italic bold 39px Georgia');
  // Stylized wall neon figure, matching the tall outlined sign beside the entrance.
  const neon=glow('#c37596',.9), base=v3(3.4,1.7,-4.7);
  g.add(mesh(new THREE.TorusGeometry(.105,.012,4,12),neon,base.x,base.y+.62,base.z));
  const points=[[-.03,.5],[-.14,.23],[-.26,.05],[-.08,-.14],[-.22,-.56],[-.07,-.61],[.08,-.15],[.24,-.4],[.34,-.37],[.23,.06],[.13,.26],[.2,.5]];
  for(let i=1;i<points.length;i++)rod(g,base.clone().add(v3(points[i-1][0],points[i-1][1],0)),base.clone().add(v3(points[i][0],points[i][1],0)),.013,neon);
  for(const [x,z]of [[-.6,.0],[3.55,-1.65]] as const){
    roundTable(g,x,z,.62); roundSeat(g,x-.98,z,Math.PI/2,.49,true,true);roundSeat(g,x+.98,z,-Math.PI/2,.49,true,true);
    beer(g,x-.23,.77,z+.1);beer(g,x+.25,.77,z-.16);
  }
  for(const x of [-3.7,3.6]) {
    roundTable(g,x,3.4,.53);roundSeat(g,x-.8,3.4,Math.PI/2,.49,true,true);roundSeat(g,x+.8,3.4,-Math.PI/2,.49,true,true);beer(g,x,.77,3.4);
  }
  for(const side of [-1,1])for(const z of [-2,1.5,4.7]){
    const p=mesh(new THREE.PlaneGeometry(.32,3.35),leopard,side*6.95,1.67,z).rotateY(side<0?Math.PI/2:-Math.PI/2);g.add(p);
    const ornament=new THREE.Group();ornament.position.set(side*6.88,0,z);ornament.rotation.y=side<0?Math.PI/2:-Math.PI/2;sconce(ornament,0,2.3,0);g.add(ornament);
  }
  plant(g,6.1,-.05,2.7);
  for(const x of [-2.9,2.2])sconce(g,x,2.4,-4.69);
  // Decorated fourth wall preserves the red-and-leopard palette in reverse coverage.
  for(const x of [-5,-1.8,1.8,5]){
    const p=mesh(new THREE.PlaneGeometry(.3,3.3),leopard,x,1.65,6.76).rotateY(Math.PI);p.userData.cameraBackdrop=true;g.add(p);
  }
  const sign=label(g,'LOUNGE',0,2.2,6.74,2.1,.55,'#d3a88b','#572b36','italic 48px Georgia').rotateY(Math.PI);sign.userData.cameraBackdrop=true;
  g.add(new THREE.HemisphereLight('#e8b6b8','#492a40',1.35));
  keyLight(g,'#ffd2b4',2.0,[-2,5,5],[0,1,-1]);
  const pink=new THREE.PointLight('#d05987',2.3,8);pink.position.set(-4,2.8,-1);g.add(pink);
  return{
    id:'lusty_leopard',name:'The Lusty Leopard',group:g,
    nodes:nodes({door:[5.3,-3.35],back:[2.3,-2.75],bar:[-.7,-2.7],left:[-2.55,-2.3],front_left:[-2.55,1.7],front:[0,1.7],right:[5.0,1.1],stage:[-4.9,-.4]}),
    edges:[['door','back'],['back','bar'],['bar','left'],['left','front_left'],['front_left','front'],['front','right'],['right','door'],['front_left','stage']],door:'door',
    floorAt(x,z){return Math.hypot(x+4.9,z+2.65)<1.64?.3:0;},
    marks:{
      table_left:mark(-1.58,0,Math.PI/2,'front_left','Barney’s chrome café chair',{seat:.49,approach:[-1.58,1.1]}),
      table_right:mark(.38,0,-Math.PI/2,'front','talking to Barney across the small table',{seat:.49,approach:[.38,1.1]}),
      friend:mark(1.2,1.55,-1.3,'front','a friend interrupting Barney'),
      bar:mark(-.7,-2.7,Math.PI,'bar','at the back bar'),
      patron_left:mark(2.57,-1.65,Math.PI/2,'back','second café table',{seat:.49,approach:[2.57,-2.65]}),
      patron_right:mark(4.53,-1.65,-Math.PI/2,'right','second table opposite',{seat:.49,approach:[4.53,-.6]}),
      stage_edge:mark(-4.9,-.75,0,'stage','beside the brass-railed stage'),
      door:mark(5.3,-3.35,0,'door','inside the beaded entrance curtain'),
    },
    wides:[{pos:v3(.3,2.35,6.2),target:v3(-.4,1.25,-1.7),fov:58},{pos:v3(-.5,1.95,4.0),target:v3(-.6,1.1,-.6),fov:56},{pos:v3(-.5,2,-2.55),target:v3(0,1.15,1.4),fov:58}],
    ambience:'bar',background:[],maxTwoShotDistance:5,setTime(){},
  };
}
