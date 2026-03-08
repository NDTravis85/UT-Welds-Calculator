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

function clearCalculator(inputIds, resultId) {
  inputIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.value = "";
    }
  });

  const result = document.getElementById(resultId);
  if (result) {
    result.innerHTML = "";
  }
}

function formatSecondsToClock(totalSeconds) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min ${seconds.toFixed(1)} sec`;
  }

  if (minutes > 0) {
    return `${minutes} min ${seconds.toFixed(1)} sec`;
  }

  return `${seconds.toFixed(1)} sec`;
}

function getOptionalNumberValue(id, defaultValue = 0) {
  const rawValue = document.getElementById(id).value.trim();
  if (rawValue === "") {
    return defaultValue;
  }

  return parseFloat(rawValue);
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

/* -------------------- WELD SCAN TIME -------------------- */

function validateWeldProgressInputs(weldDiameter, weldWidth, fullScanSpan, angleBeamWidth, straightBeamWidth, scanSpeed, percentCompleted) {
  if (isNaN(weldDiameter) || isNaN(weldWidth) || isNaN(fullScanSpan) || isNaN(angleBeamWidth) || isNaN(scanSpeed) || isNaN(percentCompleted)) {
    return "Please enter valid values in all required fields.";
  }

  if (weldDiameter <= 0 || weldWidth < 0 || fullScanSpan <= 0 || angleBeamWidth <= 0 || scanSpeed <= 0) {
    return "Diameter, full scan span, angle beam width, and scan speed must be greater than 0. Weld width cannot be negative.";
  }

  if (!isNaN(straightBeamWidth) && straightBeamWidth < 0) {
    return "Straight beam transducer width cannot be negative.";
  }

  if (percentCompleted < 0 || percentCompleted > 100) {
    return "Percent completed must be between 0 and 100.";
  }

  return null;
}

function getRasterScanData(passLength, indexedWidth, transducerWidth, scanSpeed) {
  const maxIndexStep = transducerWidth * 0.5;
  const indexedPositions = Math.ceil(indexedWidth / maxIndexStep);
  const totalDistance = indexedPositions * passLength;
  const totalTimeSeconds = totalDistance / scanSpeed;

  return {
    maxIndexStep,
    indexedPositions,
    totalDistance,
    totalTimeSeconds
  };
}

function getWeldProgress(weldDiameter, weldWidth, fullScanSpan, angleBeamWidth, straightBeamWidth, scanSpeed, percentCompleted) {
  const circumference = Math.PI * weldDiameter;
  const targetWidthWithHAZ = weldWidth + 1.0;
  const completedFraction = percentCompleted / 100;
  const remainingFraction = 1 - completedFraction;

  const perpendicularAngleBeam = getRasterScanData(fullScanSpan, circumference, angleBeamWidth, scanSpeed);

  let straightBeam = null;
  if (!isNaN(straightBeamWidth) && straightBeamWidth > 0) {
    straightBeam = getRasterScanData(fullScanSpan, circumference, straightBeamWidth, scanSpeed);
  }

  const parallelIndexStep = angleBeamWidth * 0.5;
  const parallelPassesEachDirection = Math.ceil(targetWidthWithHAZ / parallelIndexStep);
  const parallelPassesBothDirections = parallelPassesEachDirection * 2;
  const parallelDistance = parallelPassesBothDirections * circumference;
  const parallelTimeSeconds = parallelDistance / scanSpeed;

  const totalDistance = perpendicularAngleBeam.totalDistance
    + (straightBeam ? straightBeam.totalDistance : 0)
    + parallelDistance;

  const totalTimeSeconds = perpendicularAngleBeam.totalTimeSeconds
    + (straightBeam ? straightBeam.totalTimeSeconds : 0)
    + parallelTimeSeconds;

  return {
    circumference,
    targetWidthWithHAZ,
    scanSpeed,
    percentCompleted,
    remainingPercent: remainingFraction * 100,
    perpendicularAngleBeam,
    straightBeam,
    parallelAngleBeam: {
      maxIndexStep: parallelIndexStep,
      passesEachDirection: parallelPassesEachDirection,
      passesBothDirections: parallelPassesBothDirections,
      totalDistance: parallelDistance,
      totalTimeSeconds: parallelTimeSeconds
    },
    totals: {
      totalDistance,
      totalTimeSeconds,
      remainingDistance: totalDistance * remainingFraction,
      remainingTimeSeconds: totalTimeSeconds * remainingFraction
    }
  };
}

function handleWeldProgress() {
  const weldDiameter = parseFloat(document.getElementById("weldDiameterProgress").value);
  const weldWidth = parseFloat(document.getElementById("weldWidthProgress").value);
  const fullScanSpan = parseFloat(document.getElementById("fullScanSpanProgress").value);
  const angleBeamWidth = parseFloat(document.getElementById("transducerWidthProgress").value);
  const straightBeamWidth = getOptionalNumberValue("straightBeamWidthProgress", NaN);
  const scanSpeed = parseFloat(document.getElementById("scanSpeedProgress").value);
  const percentCompleted = getOptionalNumberValue("percentCompletedProgress", 0);
  const result = document.getElementById("weldProgressResult");

  const error = validateWeldProgressInputs(
    weldDiameter,
    weldWidth,
    fullScanSpan,
    angleBeamWidth,
    straightBeamWidth,
    scanSpeed,
    percentCompleted
  );

  if (error) {
    result.innerHTML = formatError(error);
    return;
  }

  const data = getWeldProgress(
    weldDiameter,
    weldWidth,
    fullScanSpan,
    angleBeamWidth,
    straightBeamWidth,
    scanSpeed,
    percentCompleted
  );

  const straightBeamHtml = data.straightBeam ? `
    <br><strong>Straight Beam Perpendicular Scan</strong><br>
    Index Step at 50% Overlap: ${data.straightBeam.maxIndexStep.toFixed(3)} in<br>
    Indexed Positions Around Circumference: ${data.straightBeam.indexedPositions}<br>
    Total Scan Distance: ${data.straightBeam.totalDistance.toFixed(3)} in<br>
    Total Scan Time: ${formatSecondsToClock(data.straightBeam.totalTimeSeconds)}<br>
  ` : `
    <br><strong>Straight Beam Perpendicular Scan</strong><br>
    Not included<br>
  `;

  result.innerHTML = `
    <strong>Weld Circumference:</strong> ${data.circumference.toFixed(3)} in<br>
    <strong>Target Width for Parallel Scan (Weld + HAZ):</strong> ${data.targetWidthWithHAZ.toFixed(3)} in<br>
    <strong>Scan Speed:</strong> ${data.scanSpeed.toFixed(3)} in/s<br>
    <strong>Completed:</strong> ${data.percentCompleted.toFixed(1)}%<br>
    <strong>Remaining:</strong> ${data.remainingPercent.toFixed(1)}%<br><br>

    <strong>Angle Beam Perpendicular Scan</strong><br>
    Index Step at 50% Overlap: ${data.perpendicularAngleBeam.maxIndexStep.toFixed(3)} in<br>
    Indexed Positions Around Circumference: ${data.perpendicularAngleBeam.indexedPositions}<br>
    Total Scan Distance: ${data.perpendicularAngleBeam.totalDistance.toFixed(3)} in<br>
    Total Scan Time: ${formatSecondsToClock(data.perpendicularAngleBeam.totalTimeSeconds)}<br>

    ${straightBeamHtml}

    <br><strong>Angle Beam Parallel Scan, Two Directions</strong><br>
    Index Step at 50% Overlap: ${data.parallelAngleBeam.maxIndexStep.toFixed(3)} in<br>
    Indexed Passes Each Direction Across Weld + HAZ: ${data.parallelAngleBeam.passesEachDirection}<br>
    Total Circumferential Passes, Both Directions: ${data.parallelAngleBeam.passesBothDirections}<br>
    Total Scan Distance: ${data.parallelAngleBeam.totalDistance.toFixed(3)} in<br>
    Total Scan Time: ${formatSecondsToClock(data.parallelAngleBeam.totalTimeSeconds)}<br><br>

    <strong>Total Scan Distance, All Included Methods:</strong> ${data.totals.totalDistance.toFixed(3)} in<br>
    <strong>Total Scan Time, All Included Methods:</strong> ${formatSecondsToClock(data.totals.totalTimeSeconds)}<br>
    <strong>Remaining Scan Distance:</strong> ${data.totals.remainingDistance.toFixed(3)} in<br>
    <strong>Estimated Remaining Scan Time:</strong> ${formatSecondsToClock(data.totals.remainingTimeSeconds)}
  `;
}
