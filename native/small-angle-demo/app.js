(() => {
  "use strict";

  const ARCSECONDS_PER_RADIAN = 206265;
  const DEFAULTS = Object.freeze({ distance: 40, diameter: 2 });
  const LIMITS = Object.freeze({
    distance: { min: 20, max: 60, step: 0.1 },
    diameter: { min: 1, max: 3, step: 0.1 }
  });

  const scene = document.querySelector("#scene");
  const objectGroup = document.querySelector("#objectGroup");
  const objectCircle = document.querySelector("#objectCircle");
  const objectHighlight = document.querySelector("#objectHighlight");
  const upperLine = document.querySelector("#upperLine");
  const lowerLine = document.querySelector("#lowerLine");
  const angleArc = document.querySelector("#angleArc");
  const alphaLabel = document.querySelector("#alphaLabel");
  const distanceLine = document.querySelector("#distanceLine");
  const distanceEndTick = document.querySelector("#distanceEndTick");
  const distanceSvgLabel = document.querySelector("#distanceSvgLabel");

  const distanceRange = document.querySelector("#distanceRange");
  const distanceNumber = document.querySelector("#distanceNumber");
  const diameterRange = document.querySelector("#diameterRange");
  const diameterNumber = document.querySelector("#diameterNumber");
  const resetButton = document.querySelector("#resetButton");

  const arcsecResult = document.querySelector("#arcsecResult");
  const friendlyAngle = document.querySelector("#friendlyAngle");
  const ratioResult = document.querySelector("#ratioResult");

  const geometry = Object.freeze({
    eyeX: 134,
    eyeY: 114,
    pixelsPerDistanceUnit: 12.4,
    pixelsPerDiameterUnit: 11,
    arcRadius: 72
  });

  const state = {
    distance: DEFAULTS.distance,
    diameter: DEFAULTS.diameter,
    dragging: false,
    pointerId: null
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundToStep(value, step) {
    const precision = Math.max(0, (String(step).split(".")[1] || "").length);
    const rounded = Math.round(value / step) * step;
    return Number(rounded.toFixed(precision));
  }

  function normalise(name, value) {
    const rules = LIMITS[name];
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return state[name];
    }
    return roundToStep(clamp(numeric, rules.min, rules.max), rules.step);
  }

  function objectXForDistance(distance) {
    return geometry.eyeX + distance * geometry.pixelsPerDistanceUnit;
  }

  function radiusForDiameter(diameter) {
    return diameter * geometry.pixelsPerDiameterUnit;
  }

  function formatArcseconds(totalArcseconds) {
    let remaining = Math.max(0, totalArcseconds);
    const degrees = Math.floor(remaining / 3600);
    remaining -= degrees * 3600;
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.round((remaining - minutes * 60) * 10) / 10;

    if (degrees > 0) {
      return `${degrees}° ${minutes}′ ${seconds.toFixed(seconds % 1 ? 1 : 0)}″`;
    }
    if (minutes > 0) {
      return `${minutes}′ ${seconds.toFixed(seconds % 1 ? 1 : 0)}″`;
    }
    return `${seconds.toFixed(1)}″`;
  }

  function pointOnArc(cx, cy, radius, angle) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  }

  function drawAngleArc(objectX, radius) {
    const horizontalDistance = objectX - geometry.eyeX;
    const theta = Math.atan2(radius, horizontalDistance);
    const start = pointOnArc(geometry.eyeX, geometry.eyeY, geometry.arcRadius, -theta);
    const end = pointOnArc(geometry.eyeX, geometry.eyeY, geometry.arcRadius, theta);

    angleArc.setAttribute(
      "d",
      `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${geometry.arcRadius} ${geometry.arcRadius} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
    );

    const labelPoint = pointOnArc(
      geometry.eyeX,
      geometry.eyeY,
      geometry.arcRadius + 24,
      0
    );
    alphaLabel.setAttribute("x", labelPoint.x.toFixed(2));
    alphaLabel.setAttribute("y", (labelPoint.y + 9).toFixed(2));
  }

  function render() {
    const objectX = objectXForDistance(state.distance);
    const radius = radiusForDiameter(state.diameter);
    const topY = geometry.eyeY - radius;
    const bottomY = geometry.eyeY + radius;

    objectCircle.setAttribute("cx", objectX.toFixed(2));
    objectCircle.setAttribute("cy", geometry.eyeY);
    objectCircle.setAttribute("r", radius.toFixed(2));

    const highlightOffset = radius * 0.34;
    objectHighlight.setAttribute("cx", (objectX - highlightOffset).toFixed(2));
    objectHighlight.setAttribute("cy", (geometry.eyeY - highlightOffset).toFixed(2));
    objectHighlight.setAttribute("r", Math.max(4, radius * 0.3).toFixed(2));

    upperLine.setAttribute("x2", objectX.toFixed(2));
    upperLine.setAttribute("y2", topY.toFixed(2));
    lowerLine.setAttribute("x2", objectX.toFixed(2));
    lowerLine.setAttribute("y2", bottomY.toFixed(2));
    drawAngleArc(objectX, radius);

    distanceLine.setAttribute("x2", objectX.toFixed(2));
    distanceEndTick.setAttribute("x1", objectX.toFixed(2));
    distanceEndTick.setAttribute("x2", objectX.toFixed(2));
    distanceSvgLabel.setAttribute("x", ((geometry.eyeX + objectX) / 2).toFixed(2));
    distanceSvgLabel.textContent = `${state.distance.toFixed(1).replace(/\.0$/, "")} units`;

    distanceRange.value = state.distance;
    distanceNumber.value = state.distance;
    diameterRange.value = state.diameter;
    diameterNumber.value = state.diameter;

    const ratio = state.diameter / state.distance;
    const arcseconds = ARCSECONDS_PER_RADIAN * ratio;
    arcsecResult.textContent = `${arcseconds.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} arcsec`;
    friendlyAngle.textContent = formatArcseconds(arcseconds);
    ratioResult.textContent = `${state.diameter} ÷ ${state.distance} = ${ratio.toFixed(4)}`;

    objectGroup.setAttribute("aria-valuenow", state.distance);
    objectGroup.setAttribute("aria-valuetext", `${state.distance} units`);
  }

  function setValue(name, value) {
    state[name] = normalise(name, value);
    render();
  }

  function bindRangeAndNumber(name, range, number) {
    range.addEventListener("input", () => setValue(name, range.value));

    number.addEventListener("input", () => {
      if (number.value === "" || !Number.isFinite(Number(number.value))) {
        return;
      }
      const rules = LIMITS[name];
      const numeric = Number(number.value);
      if (numeric >= rules.min && numeric <= rules.max) {
        setValue(name, numeric);
      }
    });

    number.addEventListener("change", () => {
      setValue(name, number.value);
    });
  }

  function svgPointFromPointer(event) {
    const point = scene.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = scene.getScreenCTM();
    return matrix ? point.matrixTransform(matrix.inverse()) : { x: geometry.eyeX, y: geometry.eyeY };
  }

  function updateDistanceFromPointer(event) {
    const point = svgPointFromPointer(event);
    const distance = (point.x - geometry.eyeX) / geometry.pixelsPerDistanceUnit;
    setValue("distance", distance);
  }

  objectGroup.addEventListener("pointerdown", event => {
    state.dragging = true;
    state.pointerId = event.pointerId;
    objectGroup.classList.add("is-dragging");
    objectGroup.setPointerCapture(event.pointerId);
    updateDistanceFromPointer(event);
    event.preventDefault();
  });

  objectGroup.addEventListener("pointermove", event => {
    if (!state.dragging || event.pointerId !== state.pointerId) {
      return;
    }
    updateDistanceFromPointer(event);
  });

  function stopDragging(event) {
    if (!state.dragging || event.pointerId !== state.pointerId) {
      return;
    }
    state.dragging = false;
    state.pointerId = null;
    objectGroup.classList.remove("is-dragging");
  }

  objectGroup.addEventListener("pointerup", stopDragging);
  objectGroup.addEventListener("pointercancel", stopDragging);

  objectGroup.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const increment = event.shiftKey ? 1 : LIMITS.distance.step;
    setValue("distance", state.distance + direction * increment);
    event.preventDefault();
  });

  resetButton.addEventListener("click", () => {
    state.distance = DEFAULTS.distance;
    state.diameter = DEFAULTS.diameter;
    render();
  });

  bindRangeAndNumber("distance", distanceRange, distanceNumber);
  bindRangeAndNumber("diameter", diameterRange, diameterNumber);
  render();
})();
