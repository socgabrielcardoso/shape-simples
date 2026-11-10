/** Pure recognition algorithms. No DOM, network or camera side effects. */
let smoothedHands = [];
export function resetHandSmoothing() { smoothedHands = []; }

export function visualPoint(point) {
  return {
    x: 1 - point.x,
    y: point.y,
    z: point.z || 0
  };
}


export function distance(a, b) {
  if (![a?.x,a?.y,b?.x,b?.y].every(Number.isFinite)) return Infinity;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function averagePoint(points) {
  if (!Array.isArray(points) || !points.length) return { x: NaN, y: NaN };
  const total = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length
  };
}

export function palmCenter(hand) {
  return averagePoint([0, 5, 9, 13, 17].map(index => visualPoint(hand[index])));
}

export function smoothDetectedHands(landmarks) {
  const orderedHands = (Array.isArray(landmarks) ? landmarks : [])
    .filter(hand => Array.isArray(hand) && hand.length === 21)
    .map(hand => hand.map(point => ({ x: point?.x, y: point?.y, z: point?.z ?? 0 })))
    .filter(hand => hand.every(point => [point.x,point.y,point.z].every(Number.isFinite)))
    .filter(hand => hand.every(point => point.x >= -0.25 && point.x <= 1.25 && point.y >= -0.25 && point.y <= 1.25))
    .sort((first, second) => palmCenter(first).x - palmCenter(second).x)
    .slice(0,2);

  if (orderedHands.length !== smoothedHands.length || orderedHands.some((hand,i) => smoothedHands[i] && distance(palmCenter(hand),palmCenter(smoothedHands[i])) > 0.27)) {
    smoothedHands = orderedHands;
    return smoothedHands;
  }

  if (orderedHands.length === 2 && Math.abs(palmCenter(orderedHands[0]).x - palmCenter(orderedHands[1]).x) < 0.03) {
    smoothedHands = orderedHands;
    return smoothedHands;
  }
  smoothedHands = orderedHands.map((hand, handIndex) =>
    hand.map((point, pointIndex) => {
      const previous = smoothedHands[handIndex][pointIndex];
      const motion = Math.hypot(point.x - previous.x, point.y - previous.y);
      const weight = Math.min(0.88, Math.max(0.38, 0.42 + motion * 3));

      return {
        x: previous.x + (point.x - previous.x) * weight,
        y: previous.y + (point.y - previous.y) * weight,
        z: previous.z + (point.z - previous.z) * weight
      };
    })
  );

  return smoothedHands;
}

export function describeHand(hand) {
  const index = visualPoint(hand[8]);
  const thumb = visualPoint(hand[4]);
  const topIsIndex = index.y <= thumb.y;

  return {
    hand,
    index,
    thumb,
    top: topIsIndex ? index : thumb,
    bottom: topIsIndex ? thumb : index,
    center: palmCenter(hand),
    palmWidth: distance(visualPoint(hand[5]), visualPoint(hand[17])),
    fingerSpan: distance(index, thumb)
  };
}

export function boundsOf(points) {
  if (!Array.isArray(points) || !points.length) return { left:0,right:0,top:0,bottom:0,width:0,height:0,center:{x:0,y:0} };
  const xValues = points.map(point => point.x);
  const yValues = points.map(point => point.y);
  const left = Math.min(...xValues);
  const right = Math.max(...xValues);
  const top = Math.min(...yValues);
  const bottom = Math.max(...yValues);

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    center: {
      x: (left + right) / 2,
      y: (top + bottom) / 2
    }
  };
}

export function sortClockwise(points) {
  const center = averagePoint(points);

  return [...points].sort(
    (first, second) =>
      Math.atan2(first.y - center.y, first.x - center.x) -
      Math.atan2(second.y - center.y, second.x - center.x)
  );
}

export function vertexAngle(previous, current, next) {
  const first = {
    x: previous.x - current.x,
    y: previous.y - current.y
  };
  const second = {
    x: next.x - current.x,
    y: next.y - current.y
  };
  const dot = first.x * second.x + first.y * second.y;
  const magnitude = Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y);
  if (!Number.isFinite(magnitude) || magnitude < 1e-9) return 0;
  const cosine = Math.max(-1, Math.min(1, dot / magnitude));

  return Math.acos(cosine) * 180 / Math.PI;
}

function lineDirection(first, second) {
  return Math.atan2(second.y - first.y, second.x - first.x);
}

function parallelDifference(first, second) {
  if (![first,second].every(Number.isFinite)) return 180;
  let difference = Math.abs(first - second) % Math.PI;

  if (difference > Math.PI / 2) {
    difference = Math.PI - difference;
  }

  return difference * 180 / Math.PI;
}

export function classifyQuadrilateral(points) {
  if (!Array.isArray(points) || points.length !== 4) return null;
  const ordered = sortClockwise(points);
  const sides = ordered.map((point, index) =>
    distance(point, ordered[(index + 1) % ordered.length])
  );
  const angles = ordered.map((point, index) =>
    vertexAngle(
      ordered[(index + ordered.length - 1) % ordered.length],
      point,
      ordered[(index + 1) % ordered.length]
    )
  );
  const longestSide = Math.max(...sides);
  const shortestSide = Math.max(Math.min(...sides), 0.0001);
  const sideRatio = longestSide / shortestSide;
  const averageAngleError = angles.reduce((sum, angle) => sum + Math.abs(90 - angle), 0) / 4;
  const oppositeBalance = Math.max(
    sides[0] / Math.max(sides[2], 0.0001),
    sides[2] / Math.max(sides[0], 0.0001),
    sides[1] / Math.max(sides[3], 0.0001),
    sides[3] / Math.max(sides[1], 0.0001)
  );
  const firstParallel = parallelDifference(
    lineDirection(ordered[0], ordered[1]),
    lineDirection(ordered[2], ordered[3])
  );
  const secondParallel = parallelDifference(
    lineDirection(ordered[1], ordered[2]),
    lineDirection(ordered[3], ordered[0])
  );

  if (averageAngleError < 18 && sideRatio < 1.28) {
    return { label: "QUADRADO", points: ordered };
  }

  if (averageAngleError < 22 && oppositeBalance < 1.38) {
    return { label: "RETÂNGULO", points: ordered };
  }

  if (sideRatio < 1.34) {
    return { label: "LOSANGO", points: ordered };
  }

  if ((firstParallel < 18) !== (secondParallel < 18)) {
    return { label: "TRAPÉZIO", points: ordered };
  }

  return { label: "QUADRILÁTERO", points: ordered };
}

export function createEllipseShape(hands) {
  const arcIndexes = [8, 7, 6, 5, 2, 3, 4];
  const arcPoints = hands.flatMap(hand => arcIndexes.map(index => visualPoint(hand[index])));
  const bounds = boundsOf(arcPoints);
  const width = bounds.width * 1.06;
  const height = bounds.height * 1.08;
  const aspect = width / Math.max(height, 0.0001);
  const label = aspect >= 0.78 && aspect <= 1.28 ? "CÍRCULO" : "OVAL";

  return {
    label,
    kind: "ellipse",
    center: bounds.center,
    radiusX: width / 2,
    radiusY: height / 2
  };
}

export function classifyOneHandShape(hand) {
  const description = describeHand(hand);
  const pinchRatio = distance(description.index, description.thumb) / Math.max(description.palmWidth, 0.0001);

  if (pinchRatio > 0.38) {
    return null;
  }

  return createEllipseShape([hand]);
}

export function classifyTwoHandShape(hands) {
  const descriptions = hands.map(describeHand).sort((first, second) => first.center.x - second.center.x);
  const left = descriptions[0];
  const right = descriptions[1];
  const bridge = distance(left.center, right.center);
  const palmScale = Math.max(left.palmWidth, right.palmWidth, 0.0001);

  if (bridge < Math.max(0.11, palmScale * 1.05)) {
    return null;
  }

  if (left.fingerSpan < left.palmWidth * 0.62 || right.fingerSpan < right.palmWidth * 0.62) {
    return null;
  }

  const topRatio = distance(left.top, right.top) / bridge;
  const bottomRatio = distance(left.bottom, right.bottom) / bridge;
  const topNear = topRatio < 0.48;
  const bottomNear = bottomRatio < 0.48;
  const topFar = topRatio > 0.66;
  const bottomFar = bottomRatio > 0.66;

  if (topNear && bottomNear) {
    return createEllipseShape(hands);
  }

  if (bottomNear && topFar) {
    return {
      label: "TRIÂNGULO",
      kind: "polygon",
      points: sortClockwise([
        left.top,
        right.top,
        averagePoint([left.bottom, right.bottom])
      ])
    };
  }

  if (topNear && bottomFar) {
    return {
      label: "TRIÂNGULO",
      kind: "polygon",
      points: sortClockwise([
        averagePoint([left.top, right.top]),
        right.bottom,
        left.bottom
      ])
    };
  }

  const quadrilateral = classifyQuadrilateral([
    left.top,
    right.top,
    right.bottom,
    left.bottom
  ]);

  return {
    ...quadrilateral,
    kind: "polygon"
  };
}

export function classifyShape(hands) {
  if (hands.length === 1) {
    return classifyOneHandShape(hands[0]);
  }

  if (hands.length >= 2) {
    return classifyTwoHandShape(hands.slice(0, 2));
  }

  return null;
}

