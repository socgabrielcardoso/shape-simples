import test from "node:test";
import assert from "node:assert/strict";
import {
  averagePoint, boundsOf, classifyOneHandShape, classifyQuadrilateral,
  classifyShape, classifyTwoHandShape, createEllipseShape, distance,
  resetHandSmoothing, smoothDetectedHands, vertexAngle, visualPoint
} from "../js/recognition-core.js";

const p=(x,y,z=0)=>({x,y,z});
const square=[p(.2,.2),p(.8,.2),p(.8,.8),p(.2,.8)];
const rotated=(points,degrees)=>{
  const t=degrees*Math.PI/180;
  return points.map(({x,y})=>p(.5+(x-.5)*Math.cos(t)-(y-.5)*Math.sin(t),
    .5+(x-.5)*Math.sin(t)+(y-.5)*Math.cos(t)));
};
const makeHand=(cx=.5)=>{
  const hand=Array.from({length:21},()=>p(cx,.5));
  hand[5]=p(cx-.08,.5);
  hand[17]=p(cx+.08,.5);
  hand[8]=p(cx+.02,.3);
  hand[4]=p(cx+.03,.3);
  hand[7]=p(cx+.11,.35);
  hand[6]=p(cx+.13,.5);
  hand[2]=p(cx-.12,.55);
  hand[3]=p(cx-.09,.34);
  return hand;
};
const makeRectangleHands=()=>{
  const a=makeHand(.2),b=makeHand(.8);
  a[8]=p(.2,.28);a[4]=p(.2,.72);
  b[8]=p(.8,.28);b[4]=p(.8,.72);
  return [a,b];
};
test("Euclidean landmark distances preserve geometry", () => {
  assert.equal(distance(p(0,0),p(3,4)),5);
});

