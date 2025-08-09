// animals.js - simple animal NPCs
class Animals {
  constructor({mapW, mapH, count=30}){
    this.mapW = mapW; this.mapH = mapH;
    this.arr = [];
    for(let i=0;i<count;i++){
      this.arr.push({
        id: 'a'+i,
        x: Math.random()*mapW,
        y: Math.random()*mapH,
        type: (Math.random()<0.1)?'bull':'moofie',
        vx:0, vy:0,
        hp: 30
      });
    }
  }

  list(){ return this.arr.map(a=>({id:a.id,x:a.x,y:a.y,type:a.type,hp:a.hp})); }

  update(dt, players){
    // very simple AI: wander; if player is nearby, move toward them
    for(const a of this.arr){
      // find nearest player
      let nearest = null; let nd = 1e9;
      for(const id in players){
        const p = players[id];
        const d = (p.x-a.x)*(p.x-a.x)+(p.y-a.y)*(p.y-a.y);
        if(d < nd){ nd = d; nearest = p; }
      }
      if(nearest && nd < (220*220)){
        // chase
        const dx = nearest.x - a.x, dy = nearest.y - a.y;
        const L = Math.hypot(dx,dy) || 1;
        const speed = (a.type==='bull')?120:80;
        a.vx = (dx / L) * speed;
        a.vy = (dy / L) * speed;
      } else {
        // wander
        if(Math.random() < 0.02){ a.vx = (Math.random()*2-1)*50; a.vy = (Math.random()*2-1)*50; }
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      // clamp
      a.x = Math.max(0, Math.min(this.mapW, a.x));
      a.y = Math.max(0, Math.min(this.mapH, a.y));
    }
  }
}

module.exports = Animals;
