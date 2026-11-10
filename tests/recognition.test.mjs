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

test("Reject missing point coordinates instead of inventing proximity", () => {
  assert.equal(distance(p(NaN,0),p(1,1)),Infinity);
});

test("Palm centroid averages valid landmarks", () => {
  assert.deepEqual(averagePoint([p(.2,.4),p(.6,.8)]),{x:.4,y:.6000000000000001});
});

test("Empty centroid never becomes a plausible hand position", () => {
  assert.equal(Number.isNaN(averagePoint([]).x),true);
});

test("Mirrored camera coordinates remain consistent", () => {
  assert.equal(visualPoint(p(.2,.3)).x,.8);
});

test("Landmark bounding boxes cover both extremes", () => {
  const b=boundsOf([p(.1,.2),p(.9,.7)]);assert.equal(b.width,.8);assert.equal(b.height,.49999999999999994);
});

test("Empty bounds stay finite and zero-sized", () => {
  const b=boundsOf([]);assert.equal(b.width,0);assert.equal(b.height,0);
});

test("Right angle detection is invariant to point orientation", () => {
  assert.equal(vertexAngle(p(0,1),p(0,0),p(1,0)),90);
});

test("Overlapping joints do not emit NaN angles", () => {
  assert.equal(vertexAngle(p(0,0),p(0,0),p(1,0)),0);
});

