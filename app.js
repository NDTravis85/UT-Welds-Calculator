function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  document.getElementById(screenId).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  const activeNav = document.getElementById("nav-" + screenId);
  if (activeNav) {
    activeNav.classList.add("active");
  }
}

function formatError(message) {
  return `<span class="error">${message}</span>`;
}

function formatSecondsToClock(totalSeconds) {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes} min ${seconds} sec`;
}

function clearFields(fieldIds, resultId) {
  fieldIds.forEach(id => {
    const field = document.getElementById(id);
    if (field) {
      field.value = "";
    }
  });

  const result = document.getElementById(resultId);
  if (result) {
    result.innerHTML = "";
  }
}

function clearScanDistance() {
  clearFields(["thickness", "weldWidth", "angle"], "scanResult");
}

function clearPercentDAC() {
  clearFields(["dbFromDAC"], "dacResult");
}

function clearNearField() {
  clearFields(["diameter", "frequency", "velocity", "wedgeThickness"], "nearFieldResult");
}

function clearTrajectory() {
  clearFields(["trajAngle", "trajDepth", "trajThickness", "trajExitPoint"], "trajectoryResult");
}

function clearWeldProgress() {
  clearFields(["weldDiameterProgress", "transducerWidthProgress", "scannedLengthProgress"], "weldProgressResult");
}


/* -------------------- SCAN DISTANCE -------------------- */

function validateScanDistanceInputs(thickness, weldWidth, angle) {
  if (isNaN(thickness) || isNaN(weldWidth) || isNaN(angle)) {
    return "Please enter valid values in all fields.";
  }

  if (thickness <= 0 || weldWidth < 0 || angle <= 0 || angle >= 90) {
    return "Enter a valid thickness, weld width, and refracted angle between 0 and 90 degrees.";
  }

  return null;
}

function getScanDistance(thickness, weldWidth, angleDeg) {
  const angleRad = angleDeg * Math.PI / 180;
  const targetWidth = weldWidth + 1.0;
  const scanDistance = (thickness * Math.tan(angleRad)) + (targetWidth / 2);
  const fullScanSpan = scanDistance * 2;

  return {
    targetWidth,
    scanDistance,
    fullScanSpan
  };
}

function handleScanDistance() {
  const thickness = parseFloat(document.getElementById("thickness").value);
  const weldWidth = parseFloat(document.getElementById("weldWidth").value);
  const angle = parseFloat(document.getElementById("angle").value);
  const result = document.getElementById("scanResult");

  const error = validateScanDistanceInputs(thickness, weldWidth, angle);
  if (error) {
    result.innerHTML = formatError(error);
    return;
  }

  const data = getScanDistance(thickness, weldWidth, angle);

  result.innerHTML = `
    <strong>Minimum Scan Distance from Weld Centerline:</strong> ${data.scanDistance.toFixed(3)} in<br><br>
    <strong>Total Target Width (Weld + HAZ):</strong> ${data.targetWidth.toFixed(3)} in<br>
    <strong>Full Scan Span:</strong> ${data.fullScanSpan.toFixed(3)} in
  `;
}

/* -------------------- % DAC -------------------- */

function validatePercentDACInput(dbFromDAC) {
  if (isNaN(dbFromDAC)) {
    return "Please enter a valid dB value.";
  }

  return null;
}

function getPercentDAC(dbFromDAC) {
  return {
    percentDAC: Math.pow(10, (-dbFromDAC / 20)) * 100
  };
}

function handlePercentDAC() {
  const dbFromDAC = parseFloat(document.getElementById("dbFromDAC").value);
  const result = document.getElementById("dacResult");

  const error = validatePercentDACInput(dbFromDAC);
  if (error) {
    result.innerHTML = formatError(error);
    return;
  }

  const data = getPercentDAC(dbFromDAC);

  result.innerHTML = `
    <strong>Response:</strong> ${data.percentDAC.toFixed(1)}% DAC
  `;
}

/* -------------------- NEAR FIELD -------------------- */

function validateNearFieldInputs(diameter, frequency, velocity, wedgeThickness) {
  if (isNaN(diameter) || isNaN(frequency) || isNaN(velocity) || isNaN(wedgeThickness)) {
    return "Please enter valid values in all fields.";
  }

  if (diameter <= 0 || frequency <= 0 || velocity <= 0 || wedgeThickness < 0) {
    return "Diameter, frequency, and velocity must be greater than 0. Wedge thickness cannot be negative.";
  }

  return null;
}

function getNearField(diameter, frequency, velocity, wedgeThickness) {
  const nearField = (Math.pow(diameter, 2) * frequency) / (4 * velocity);
  const focalDistance = nearField - wedgeThickness;

  return {
    nearField,
    focalDistance
  };
}

function handleNearField() {
  const diameter = parseFloat(document.getElementById("diameter").value);
  const frequency = parseFloat(document.getElementById("frequency").value);
  const velocity = parseFloat(document.getElementById("velocity").value);
  const wedgeThickness = parseFloat(document.getElementById("wedgeThickness").value);
  const result = document.getElementById("nearFieldResult");

  const error = validateNearFieldInputs(diameter, frequency, velocity, wedgeThickness);
  if (error) {
    result.innerHTML = formatError(error);
    return;
  }

  const data = getNearField(diameter, frequency, velocity, wedgeThickness);

  result.innerHTML = `
    <strong>Near Field Length:</strong> ${data.nearField.toFixed(3)} in<br>
    <strong>Approx. Focal Distance Beyond Wedge:</strong> ${data.focalDistance.toFixed(3)} in
  `;
}

/* -------------------- TRAJECTORY -------------------- */

function validateTrajectoryInputs(angleDeg, depth, thickness, exitPoint) {
  if (isNaN(angleDeg) || isNaN(depth) || isNaN(thickness) || isNaN(exitPoint)) {
    return "Please enter valid values in all fields.";
  }

  if (angleDeg <= 0 || angleDeg >= 90) {
    return "Refracted angle must be between 0 and 90 degrees.";
  }

  if (depth < 0 || thickness <= 0 || exitPoint < 0) {
    return "Depth and exit point cannot be negative, and thickness must be greater than 0.";
  }

  return null;
}

function getTrajectory(angleDeg, depth, thickness, exitPoint) {
  const angleRad = angleDeg * Math.PI / 180;
  const tanAngle = Math.tan(angleRad);

  const halfSkip = thickness * tanAngle;
  const fullSkip = 2 * halfSkip;

  const legIndex = Math.floor(depth / thickness) + 1;
  const depthIntoLeg = depth % thickness;

  let horizontalFromExit;
  let legDirection;
  let effectiveDepthInCurrentLeg;

  if (depthIntoLeg === 0 && depth !== 0) {
    effectiveDepthInCurrentLeg = thickness;
  } else {
    effectiveDepthInCurrentLeg = depthIntoLeg;
  }

  const isOddLeg = legIndex % 2 === 1;

  if (depth === 0) {
    horizontalFromExit = 0;
    legDirection = "Surface";
    effectiveDepthInCurrentLeg = 0;
  } else if (isOddLeg) {
    horizontalFromExit = ((legIndex - 1) * halfSkip) + (effectiveDepthInCurrentLeg / tanAngle);
    legDirection = "Downward";
  } else {
    horizontalFromExit = ((legIndex - 1) * halfSkip) + ((thickness - effectiveDepthInCurrentLeg) / tanAngle);
    legDirection = "Upward";
  }

  const surfaceLocation = exitPoint + horizontalFromExit;

  const previousSkip = Math.floor(horizontalFromExit / fullSkip) * fullSkip;
  const nextSkip = previousSkip + fullSkip;

  return {
    halfSkip,
    fullSkip,
    legIndex,
    legDirection,
    horizontalFromExit,
    surfaceLocation,
    previousSkip,
    nextSkip
  };
}

function handleTrajectory() {
  const angleDeg = parseFloat(document.getElementById("trajAngle").value);
  const depth = parseFloat(document.getElementById("trajDepth").value);
  const thickness = parseFloat(document.getElementById("trajThickness").value);
  const exitPoint = parseFloat(document.getElementById("trajExitPoint").value);
  const result = document.getElementById("trajectoryResult");

  const error = validateTrajectoryInputs(angleDeg, depth, thickness, exitPoint);
  if (error) {
    result.innerHTML = formatError(error);
    return;
  }

  const data = getTrajectory(angleDeg, depth, thickness, exitPoint);

  result.innerHTML = `
    <strong>Surface Location from End of Wedge:</strong> ${data.surfaceLocation.toFixed(3)} in<br>
    <strong>Beam Distance from Exit Point:</strong> ${data.horizontalFromExit.toFixed(3)} in<br><br>

    <strong>Leg:</strong> ${data.legIndex}<br>
    <strong>Leg Direction:</strong> ${data.legDirection}<br><br>

    <strong>Half Skip:</strong> ${data.halfSkip.toFixed(3)} in<br>
    <strong>Full Skip:</strong> ${data.fullSkip.toFixed(3)} in<br>
    <strong>Previous Skip Position from Exit Point:</strong> ${data.previousSkip.toFixed(3)} in<br>
    <strong>Next Skip Position from Exit Point:</strong> ${data.nextSkip.toFixed(3)} in
  `;
}

/* -------------------- WELD PROGRESS -------------------- */

function validateWeldProgressInputs(weldDiameter, transducerWidth, completedLength) {
  if (isNaN(weldDiameter) || isNaN(transducerWidth) || isNaN(completedLength)) {
    return "Please enter valid values in all fields.";
  }

  if (weldDiameter <= 0 || transducerWidth <= 0 || completedLength < 0) {
    return "Weld diameter and transducer width must be greater than 0, and completed scan length cannot be negative.";
  }

  return null;
}

function getWeldProgress(weldDiameter, transducerWidth, completedLength) {
  const maxTravelSpeed = 6;
  const circumference = Math.PI * weldDiameter;
  const maxIndexStep = transducerWidth * 0.5;
  const indexedPositions = Math.ceil(circumference / maxIndexStep);
  const idealScanTimeSeconds = circumference / maxTravelSpeed;

  const clampedCompletedLength = Math.min(completedLength, circumference);
  const remainingLength = Math.max(circumference - clampedCompletedLength, 0);
  const completedPercent = (clampedCompletedLength / circumference) * 100;
  const remainingPercent = 100 - completedPercent;
  const remainingTimeSeconds = remainingLength / maxTravelSpeed;

  return {
    maxTravelSpeed,
    circumference,
    maxIndexStep,
    indexedPositions,
    idealScanTimeSeconds,
    clampedCompletedLength,
    remainingLength,
    completedPercent,
    remainingPercent,
    remainingTimeSeconds
  };
}

function handleWeldProgress() {
  const weldDiameter = parseFloat(document.getElementById("weldDiameterProgress").value);
  const transducerWidth = parseFloat(document.getElementById("transducerWidthProgress").value);
  const completedLength = parseFloat(document.getElementById("scannedLengthProgress").value);
  const result = document.getElementById("weldProgressResult");

  const error = validateWeldProgressInputs(weldDiameter, transducerWidth, completedLength);
  if (error) {
    result.innerHTML = formatError(error);
    return;
  }

  const data = getWeldProgress(weldDiameter, transducerWidth, completedLength);

  result.innerHTML = `
    <strong>Weld Circumference:</strong> ${data.circumference.toFixed(3)} in<br>
    <strong>Max Index Step at 50% Overlap:</strong> ${data.maxIndexStep.toFixed(3)} in<br>
    <strong>Minimum Indexed Positions:</strong> ${data.indexedPositions}<br>
    <strong>Ideal Scan Time at 6 in/s:</strong> ${formatSecondsToClock(data.idealScanTimeSeconds)}<br><br>

    <strong>Completed Scan Length:</strong> ${data.clampedCompletedLength.toFixed(3)} in<br>
    <strong>Completed:</strong> ${data.completedPercent.toFixed(1)}%<br>
    <strong>Remaining Length:</strong> ${data.remainingLength.toFixed(3)} in<br>
    <strong>Remaining:</strong> ${data.remainingPercent.toFixed(1)}%<br>
    <strong>Estimated Remaining Time at 6 in/s:</strong> ${formatSecondsToClock(data.remainingTimeSeconds)}
  `;
}
