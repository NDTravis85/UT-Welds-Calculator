function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeNav = document.getElementById('nav-' + screenId);
  if (activeNav) activeNav.classList.add('active');
}

function formatError(message) {
  return `<span class="error">${message}</span>`;
}

function formatSecondsToClock(totalSeconds) {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min ${seconds} sec`;
  }

  return `${minutes} min ${seconds} sec`;
}

function clearCalculator(screenId) {
  const screen = document.getElementById(screenId);
  if (!screen) return;

  screen.querySelectorAll('input').forEach(input => {
    input.value = '';
  });

  const result = screen.querySelector('.result');
  if (result) result.innerHTML = '';
}

/* -------------------- SCAN DISTANCE -------------------- */

function validateScanDistanceInputs(thickness, weldWidth, angle) {
  if (isNaN(thickness) || isNaN(weldWidth) || isNaN(angle)) {
    return 'Please enter valid values in all fields.';
  }

  if (thickness <= 0 || weldWidth < 0 || angle <= 0 || angle >= 90) {
    return 'Enter a valid thickness, weld width, and refracted angle between 0 and 90 degrees.';
  }

  return null;
}

function getScanDistance(thickness, weldWidth, angleDeg) {
  const angleRad = angleDeg * Math.PI / 180;
  const targetWidth = weldWidth + 1.0;
  const scanDistance = (thickness * Math.tan(angleRad)) + (targetWidth / 2);
  const fullScanSpan = scanDistance * 2;

  return { targetWidth, scanDistance, fullScanSpan };
}

function handleScanDistance() {
  const thickness = parseFloat(document.getElementById('thickness').value);
  const weldWidth = parseFloat(document.getElementById('weldWidth').value);
  const angle = parseFloat(document.getElementById('angle').value);
  const result = document.getElementById('scanResult');

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

function handlePercentDAC() {
  const dbFromDAC = parseFloat(document.getElementById('dbFromDAC').value);
  const result = document.getElementById('dacResult');

  if (isNaN(dbFromDAC)) {
    result.innerHTML = formatError('Please enter a valid dB value.');
    return;
  }

  const percentDAC = Math.pow(10, (-dbFromDAC / 20)) * 100;
  result.innerHTML = `<strong>Response:</strong> ${percentDAC.toFixed(1)}% DAC`;
}

/* -------------------- NEAR FIELD -------------------- */

function handleNearField() {
  const diameter = parseFloat(document.getElementById('diameter').value);
  const frequency = parseFloat(document.getElementById('frequency').value);
  const velocity = parseFloat(document.getElementById('velocity').value);
  const wedgeThickness = parseFloat(document.getElementById('wedgeThickness').value);
  const result = document.getElementById('nearFieldResult');

  if ([diameter, frequency, velocity, wedgeThickness].some(value => isNaN(value))) {
    result.innerHTML = formatError('Please enter valid values in all fields.');
    return;
  }

  if (diameter <= 0 || frequency <= 0 || velocity <= 0 || wedgeThickness < 0) {
    result.innerHTML = formatError('Diameter, frequency, and velocity must be greater than 0. Wedge thickness cannot be negative.');
    return;
  }

  const nearField = (Math.pow(diameter, 2) * frequency) / (4 * velocity);
  const focalDistance = nearField - wedgeThickness;

  result.innerHTML = `
    <strong>Near Field Length:</strong> ${nearField.toFixed(3)} in<br>
    <strong>Approx. Focal Distance Beyond Wedge:</strong> ${focalDistance.toFixed(3)} in
  `;
}

/* -------------------- TRAJECTORY -------------------- */

function handleTrajectory() {
  const angleDeg = parseFloat(document.getElementById('trajAngle').value);
  const depth = parseFloat(document.getElementById('trajDepth').value);
  const thickness = parseFloat(document.getElementById('trajThickness').value);
  const exitPoint = parseFloat(document.getElementById('trajExitPoint').value);
  const result = document.getElementById('trajectoryResult');

  if ([angleDeg, depth, thickness, exitPoint].some(value => isNaN(value))) {
    result.innerHTML = formatError('Please enter valid values in all fields.');
    return;
  }

  if (angleDeg <= 0 || angleDeg >= 90) {
    result.innerHTML = formatError('Refracted angle must be between 0 and 90 degrees.');
    return;
  }

  if (depth < 0 || thickness <= 0 || exitPoint < 0) {
    result.innerHTML = formatError('Depth and exit point cannot be negative, and thickness must be greater than 0.');
    return;
  }

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
    legDirection = 'Surface';
    effectiveDepthInCurrentLeg = 0;
  } else if (isOddLeg) {
    horizontalFromExit = ((legIndex - 1) * halfSkip) + (effectiveDepthInCurrentLeg / tanAngle);
    legDirection = 'Downward';
  } else {
    horizontalFromExit = ((legIndex - 1) * halfSkip) + ((thickness - effectiveDepthInCurrentLeg) / tanAngle);
    legDirection = 'Upward';
  }

  const surfaceLocation = exitPoint + horizontalFromExit;
  const previousSkip = Math.floor(horizontalFromExit / fullSkip) * fullSkip;
  const nextSkip = previousSkip + fullSkip;

  result.innerHTML = `
    <strong>Surface Location from End of Wedge:</strong> ${surfaceLocation.toFixed(3)} in<br>
    <strong>Beam Distance from Exit Point:</strong> ${horizontalFromExit.toFixed(3)} in<br><br>
    <strong>Leg:</strong> ${legIndex}<br>
    <strong>Leg Direction:</strong> ${legDirection}<br><br>
    <strong>Half Skip:</strong> ${halfSkip.toFixed(3)} in<br>
    <strong>Full Skip:</strong> ${fullSkip.toFixed(3)} in<br>
    <strong>Previous Skip Position from Exit Point:</strong> ${previousSkip.toFixed(3)} in<br>
    <strong>Next Skip Position from Exit Point:</strong> ${nextSkip.toFixed(3)} in
  `;
}

/* -------------------- WELD PROGRESS -------------------- */

function handleWeldProgress() {
  const weldDiameter = parseFloat(document.getElementById('weldDiameterCalc').value);
  const weldWidth = parseFloat(document.getElementById('weldWidthCalc').value);
  const fullScanSpan = parseFloat(document.getElementById('fullScanSpanCalc').value);
  const angleBeamWidth = parseFloat(document.getElementById('angleBeamWidthCalc').value);
  const straightBeamWidthRaw = document.getElementById('straightBeamWidthCalc').value.trim();
  const scanSpeed = parseFloat(document.getElementById('scanSpeedCalc').value);
  const completedWeldDistanceRaw = document.getElementById('completedWeldDistanceCalc').value.trim();
  const result = document.getElementById('weldProgressResult');

  const straightBeamWidth = straightBeamWidthRaw === '' ? 0 : parseFloat(straightBeamWidthRaw);
  const completedWeldDistance = completedWeldDistanceRaw === '' ? 0 : parseFloat(completedWeldDistanceRaw);

  if ([weldDiameter, weldWidth, fullScanSpan, angleBeamWidth, scanSpeed].some(value => isNaN(value))) {
    result.innerHTML = formatError('Please enter valid values for diameter, weld width, full scan span, angle beam width, and scan speed.');
    return;
  }

  if (weldDiameter <= 0 || weldWidth < 0 || fullScanSpan <= 0 || angleBeamWidth <= 0 || scanSpeed <= 0) {
    result.innerHTML = formatError('Diameter, full scan span, angle beam width, and scan speed must be greater than 0. Weld width cannot be negative.');
    return;
  }

  if (straightBeamWidthRaw !== '' && (isNaN(straightBeamWidth) || straightBeamWidth <= 0)) {
    result.innerHTML = formatError('Straight beam width must be greater than 0 if entered.');
    return;
  }

  if (isNaN(completedWeldDistance) || completedWeldDistance < 0) {
    result.innerHTML = formatError('Completed linear weld distance cannot be negative.');
    return;
  }

  const circumference = Math.PI * weldDiameter;
  const targetWidth = weldWidth + 1.0;
  const boundedCompletedDistance = Math.min(completedWeldDistance, circumference);
  const completedPercent = (boundedCompletedDistance / circumference) * 100;
  const remainingPercent = 100 - completedPercent;
  const remainingWeldDistance = circumference - boundedCompletedDistance;

  const angleIndexStep = angleBeamWidth * 0.5;
  const angleIndexPositions = circumference / angleIndexStep;
  const anglePerpendicularDistance = angleIndexPositions * fullScanSpan;
  const anglePerpendicularTime = anglePerpendicularDistance / scanSpeed;

  let straightHtml = '<strong>Straight Beam:</strong> Not included<br><br>';
  let straightPerpendicularDistance = 0;
  let straightPerpendicularTime = 0;

  if (straightBeamWidth > 0) {
    const straightIndexStep = straightBeamWidth * 0.5;
    const straightIndexPositions = circumference / straightIndexStep;
    straightPerpendicularDistance = straightIndexPositions * targetWidth;
    straightPerpendicularTime = straightPerpendicularDistance / scanSpeed;

    straightHtml = `
      <strong>Straight Beam Perpendicular Scan</strong><br>
      50% Index Step: ${straightIndexStep.toFixed(3)} in<br>
      Indexed Positions Around Circumference: ${straightIndexPositions.toFixed(1)}<br>
      Perpendicular Scan Distance Each Position (Weld + HAZ): ${targetWidth.toFixed(3)} in<br>
      Total Distance: ${straightPerpendicularDistance.toFixed(1)} in<br>
      Time: ${formatSecondsToClock(straightPerpendicularTime)}<br><br>
    `;
  }

  const parallelPassesOneDirection = targetWidth / angleIndexStep;
  const totalParallelCircumferencePasses = parallelPassesOneDirection * 2;
  const angleParallelDistance = totalParallelCircumferencePasses * circumference;
  const angleParallelTime = angleParallelDistance / scanSpeed;

  const totalDistance = anglePerpendicularDistance + straightPerpendicularDistance + angleParallelDistance;
  const totalTime = anglePerpendicularTime + straightPerpendicularTime + angleParallelTime;
  const remainingDistanceEstimate = totalDistance * (remainingPercent / 100);
  const remainingTimeEstimate = totalTime * (remainingPercent / 100);

  result.innerHTML = `
    <strong>Weld Circumference:</strong> ${circumference.toFixed(3)} in<br>
    <strong>Completed Linear Weld Distance:</strong> ${boundedCompletedDistance.toFixed(3)} in<br>
    <strong>Remaining Linear Weld Distance:</strong> ${remainingWeldDistance.toFixed(3)} in<br>
    <strong>Completed Percentage:</strong> ${completedPercent.toFixed(1)}%<br>
    <strong>Remaining Percentage:</strong> ${remainingPercent.toFixed(1)}%<br><br>

    <strong>Angle Beam Perpendicular Scan</strong><br>
    50% Index Step: ${angleIndexStep.toFixed(3)} in<br>
    Indexed Positions Around Circumference: ${angleIndexPositions.toFixed(1)}<br>
    Full Scan Span Each Position: ${fullScanSpan.toFixed(3)} in<br>
    Total Distance: ${anglePerpendicularDistance.toFixed(1)} in<br>
    Time: ${formatSecondsToClock(anglePerpendicularTime)}<br><br>

    ${straightHtml}

    <strong>Angle Beam Parallel Scan</strong><br>
    Target Width (Weld + 1 in HAZ): ${targetWidth.toFixed(3)} in<br>
    50% Index Step: ${angleIndexStep.toFixed(3)} in<br>
    Passes in One Direction: ${parallelPassesOneDirection.toFixed(1)}<br>
    Total Circumferential Passes (2 Directions): ${totalParallelCircumferencePasses.toFixed(1)}<br>
    Total Distance: ${angleParallelDistance.toFixed(1)} in<br>
    Time: ${formatSecondsToClock(angleParallelTime)}<br><br>

    <strong>Grand Total Distance:</strong> ${totalDistance.toFixed(1)} in<br>
    <strong>Grand Total Time:</strong> ${formatSecondsToClock(totalTime)}<br>
    <strong>Estimated Remaining Distance:</strong> ${remainingDistanceEstimate.toFixed(1)} in<br>
    <strong>Estimated Remaining Time:</strong> ${formatSecondsToClock(remainingTimeEstimate)}
  `;
}
