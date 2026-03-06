let students = [];
let updateInterval = 1000 * 60 * 10;
let lastUpdated = "Initializing...";
let maxPointsInSchool = 1;
let pointThreshold = 0;

// --- ANNOUNCEMENT / FOCUS SYSTEM ---
let focus = {
  active: false,
  startTime: 0,
  duration: 2 * 60 * 1000, // 2 Minutes
  targetStudent: null,
  message: "",
  boxPos: null // For smooth following
};

const achievementPhrases = [
  "demonstrated outstanding community spirit and helped a peer today.",
  "showed incredible resilience and focus during a challenging task.",
  "consistently went above and beyond the expected learning goals."
];

function setup() {
  pixelDensity(1);
  let cnv = createCanvas(windowWidth, windowHeight);
  if (cnv.elt && cnv.elt.getContext) {
    cnv.elt.getContext('2d', { alpha: false });
  }

  frameRate(30);
  focus.boxPos = createVector(width / 2, height / 2);

  fetchData();
  setInterval(fetchData, updateInterval);
}

function fetchData() {
  loadJSON('/data', updateStudentList, (err) => {
    console.error("Fetch failed. Retrying...");
    lastUpdated = "Waiting for Server...";
    setTimeout(fetchData, 5000);
  });
}

function updateStudentList(data) {
  if (!data || data.length === 0) return;

  let now = new Date();
  lastUpdated = now.getHours() + ":" + nf(now.getMinutes(), 2);

  // Sort by points descending
  let arborData = data.sort((a, b) => (b.Points || 0) - (a.Points || 0));
  
  // Update internal logic variables
  let pointsArray = arborData.map(d => d.Points || 0);
  maxPointsInSchool = Math.max(...pointsArray);
  let sortedPoints = [...pointsArray].sort((a, b) => a - b);
  let index = Math.floor(sortedPoints.length * 0.75);
  pointThreshold = sortedPoints[index];

  // Limit particles to top 150 for performance
  let particleData = arborData.slice(0, 150);
  let currentIds = particleData.map(d => d["Arbor Student ID"]);
  students = students.filter(s => currentIds.includes(s.arborId));

  particleData.forEach(newEntry => {
    let id = newEntry["Arbor Student ID"];
    let existing = students.find(s => s.arborId === id);
    if (existing) {
      existing.updateStats(newEntry);
    } else {
      students.push(new Student(newEntry));
    }
  });

  // If no one is being followed, pick someone immediately
  if (!focus.targetStudent && students.length > 0) {
    pickNewFocus();
  }
}

function draw() {
  background(15, 15, 25);

  // 1. Draw Students
  for (let s of students) {
    s.update();
    s.display();
    s.checkEdges();
  }

  // 2. Logic for Changing Focused Student (Every 2 mins)
  if (millis() - focus.startTime > focus.duration || !focus.targetStudent) {
    pickNewFocus();
  }

  // 3. Draw UI Layers
  drawLeaderboard();
  if (focus.targetStudent) {
    drawFloatingDataBox();
  }
  drawStatusUI();
}

function pickNewFocus() {
  if (students.length > 0) {
    focus.active = true;
    focus.startTime = millis();
    focus.targetStudent = random(students);
    focus.message = random(achievementPhrases);
  }
}

function drawLeaderboard() {
  push();
  let lbWidth = 220;
  // Glassmorphism effect for sidebar
  fill(20, 20, 40, 200);
  noStroke();
  rect(0, 0, lbWidth, height);
  
  // Header
  fill(255);
  textSize(18);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("TOP ACHIEVERS", 20, 25);
  
  stroke(255, 50);
  line(20, 50, lbWidth - 20, 50);
  noStroke();

  // Top 15 list
  let topList = [...students].sort((a, b) => b.points - a.points).slice(0, 15);
  
  textSize(14);
  textStyle(NORMAL);
  for (let i = 0; i < topList.length; i++) {
    let s = topList[i];
    let yPos = 70 + (i * 35);
    
    // Rank number
    fill(255, 150);
    text(`${i + 1}.`, 20, yPos);
    
    // Student Color Indicator
    fill(s.color);
    circle(45, yPos + 7, 10);
    
    // Name and Points
    fill(255);
    let nameText = s.fullName ? s.fullName.split(' ')[0] : s.initials;
    text(nameText, 60, yPos);
    
    textAlign(RIGHT);
    fill(255, 200);
    text(s.points, lbWidth - 20, yPos);
    textAlign(LEFT);
  }
  pop();
}

function drawFloatingDataBox() {
  let s = focus.targetStudent;
  let boxW = 260;
  let boxH = 110;
  
  // Lerp the box position for smooth following
  focus.boxPos.x = lerp(focus.boxPos.x, s.pos.x, 0.1);
  focus.boxPos.y = lerp(focus.boxPos.y, s.pos.y, 0.1);

  // Position logic (prevent box going off screen)
  let x = focus.boxPos.x + 40;
  let y = focus.boxPos.y - boxH / 2;
  if (x + boxW > width) x = focus.boxPos.x - boxW - 40;
  y = constrain(y, 20, height - boxH - 20);

  push();
  translate(x, y);

  // Connector line back to the actual particle
  stroke(s.color);
  strokeWeight(1);
  line(x > s.pos.x ? 0 : boxW, boxH / 2, s.pos.x - x, s.pos.y - y);

  // Box
  fill(25, 25, 45, 245);
  stroke(s.color);
  strokeWeight(3);
  rect(0, 0, boxW, boxH, 8);

  // Text
  noStroke();
  fill(255);
  textStyle(BOLD);
  textSize(16);
  let displayName = s.fullName || s.initials;
  text(displayName, 15, 20);

  textStyle(NORMAL);
  textSize(12);
  text(`${displayName} ${focus.message}`, 15, 42, boxW - 30, boxH - 50);

  // Timer Bar
  let elapsed = millis() - focus.startTime;
  let progress = map(elapsed, 0, focus.duration, boxW - 20, 0);
  fill(s.color);
  rect(10, boxH - 10, progress, 3);
  pop();
}

class Student {
  constructor(data) {
    this.arborId = data["Arbor Student ID"];
    this.initials = data["Initials"] || "?";
    this.fullName = data["Student Full Name"] || data["Full Name"] || null;
    this.pos = createVector(random(250, width - 50), random(50, height - 50));
    this.vel = p5.Vector.random2D().mult(random(0.5, 1.5));
    this.color = color(random(100, 255), random(150, 255), 255);
    this.updateStats(data);
    this.radius = this.targetRadius;
  }

  updateStats(data) {
    this.points = data.Points || 0;
    this.fullName = data["Student Full Name"] || data["Full Name"] || this.fullName;
    this.targetRadius = map(this.points, 0, maxPointsInSchool || 1, 8, 50, true);
  }

  update() {
    this.pos.add(this.vel);
    if (abs(this.radius - this.targetRadius) > 0.1) {
      this.radius = lerp(this.radius, this.targetRadius, 0.05);
    }
  }

  checkEdges() {
    // Offset left edge to account for Leaderboard
    let leftBound = 230; 
    if (this.pos.x < leftBound + this.radius || this.pos.x > width - this.radius) this.vel.x *= -1;
    if (this.pos.y < this.radius || this.pos.y > height - this.radius) this.vel.y *= -1;
    this.pos.x = constrain(this.pos.x, leftBound + this.radius, width - this.radius);
    this.pos.y = constrain(this.pos.y, this.radius, height - this.radius);
  }

  display() {
    noStroke();
    // Halo for the one being focused on
    if (focus.targetStudent === this) {
      fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], 50);
      circle(this.pos.x, this.pos.y, this.radius * 2.5 + sin(frameCount * 0.1) * 10);
    }

    fill(this.color);
    circle(this.pos.x, this.pos.y, this.radius * 2);

    if (this.points >= pointThreshold && this.points > 0) {
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(constrain(this.radius * 0.7, 10, 25));
      text(this.initials, this.pos.x, this.pos.y);
    }
  }
}

function drawStatusUI() {
  push();
  fill(255, 60);
  textSize(10);
  textAlign(RIGHT, BOTTOM);
  text(`Updated: ${lastUpdated}`, width - 10, height - 10);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
