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
  boxPos: null 
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

  let arborData = data.sort((a, b) => (b.Points || 0) - (a.Points || 0));
  
  let pointsArray = arborData.map(d => d.Points || 0);
  maxPointsInSchool = Math.max(...pointsArray);
  let sortedPoints = [...pointsArray].sort((a, b) => a - b);
  let index = Math.floor(sortedPoints.length * 0.75);
  pointThreshold = sortedPoints[index];

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

  if (!focus.targetStudent && students.length > 0) {
    pickNewFocus();
  }
}

function draw() {
  background(15, 15, 25);

  for (let s of students) {
    s.update();
    s.display();
    s.checkEdges();
  }

  if (millis() - focus.startTime > focus.duration || !focus.targetStudent) {
    pickNewFocus();
  }

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
  let lbWidth = 280; // Slightly wider for better readability
  fill(20, 20, 40, 220);
  noStroke();
  rect(0, 0, lbWidth, height);
  
  fill(255);
  textSize(22);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("TOP ACHIEVERS", 25, 30);
  
  stroke(255, 50);
  line(20, 65, lbWidth - 20, 65);
  noStroke();

  let topList = [...students].sort((a, b) => b.points - a.points).slice(0, 15);
  
  textSize(18);
  textStyle(NORMAL);
  for (let i = 0; i < topList.length; i++) {
    let s = topList[i];
    let yPos = 90 + (i * 45); // Increased spacing
    
    fill(255, 150);
    text(`${i + 1}.`, 20, yPos);
    
    fill(s.color);
    circle(50, yPos + 10, 12);
    
    fill(255);
    let nameText = s.fullName ? s.fullName.split(' ')[0] : s.initials;
    text(nameText, 70, yPos);
    
    textAlign(RIGHT);
    fill(255, 200);
    text(s.points, lbWidth - 20, yPos);
    textAlign(LEFT);
  }
  pop();
}

function drawFloatingDataBox() {
  let s = focus.targetStudent;
  
  // SCALED SIZES (approx 3x original)
  let boxW = 750; 
  let boxH = 320;
  
  // Smooth follow
  focus.boxPos.x = lerp(focus.boxPos.x, s.pos.x, 0.1);
  focus.boxPos.y = lerp(focus.boxPos.y, s.pos.y, 0.1);

  // Offset logic to prevent box going off screen
  let x = focus.boxPos.x + 80;
  let y = focus.boxPos.y - boxH / 2;
  
  if (x + boxW > width) x = focus.boxPos.x - boxW - 80;
  y = constrain(y, 40, height - boxH - 40);

  push();
  translate(x, y);

  // Connection Line
  stroke(s.color);
  strokeWeight(3);
  line(x > s.pos.x ? 0 : boxW, boxH / 2, s.pos.x - x, s.pos.y - y);

  // Large Box
  fill(25, 25, 45, 250);
  stroke(s.color);
  strokeWeight(6); // Thicker border for scale
  rect(0, 0, boxW, boxH, 20);

  // Text Logic
  noStroke();
  fill(255);
  
  // Name (Title Size)
  textStyle(BOLD);
  textSize(48); // 3x of 16
  let displayName = s.fullName || s.initials;
  text(displayName, 30, 40);

  // Achievement (Body Size)
  textStyle(NORMAL);
  textSize(36); // 3x of 12
  textLeading(45);
  text(`${displayName} ${focus.message}`, 30, 110, boxW - 60, boxH - 120);

  // Timer Bar
  let elapsed = millis() - focus.startTime;
  let progress = map(elapsed, 0, focus.duration, boxW - 40, 0);
  fill(s.color);
  rect(20, boxH - 25, progress, 10, 5);
  pop();
}

class Student {
  constructor(data) {
    this.arborId = data["Arbor Student ID"];
    this.initials = data["Initials"] || "?";
    this.fullName = data["Student Full Name"] || data["Full Name"] || null;
    this.pos = createVector(random(300, width - 50), random(50, height - 50));
    this.vel = p5.Vector.random2D().mult(random(0.5, 1.5));
    this.color = color(random(100, 255), random(150, 255), 255);
    this.updateStats(data);
    this.radius = this.targetRadius;
  }

  updateStats(data) {
    this.points = data.Points || 0;
    this.fullName = data["Student Full Name"] || data["Full Name"] || this.fullName;
    this.targetRadius = map(this.points, 0, maxPointsInSchool || 1, 12, 60, true);
  }

  update() {
    this.pos.add(this.vel);
    if (abs(this.radius - this.targetRadius) > 0.1) {
      this.radius = lerp(this.radius, this.targetRadius, 0.05);
    }
  }

  checkEdges() {
    let leftBound = 300; // Adjusted for leaderboard width
    if (this.pos.x < leftBound + this.radius || this.pos.x > width - this.radius) this.vel.x *= -1;
    if (this.pos.y < this.radius || this.pos.y > height - this.radius) this.vel.y *= -1;
    this.pos.x = constrain(this.pos.x, leftBound + this.radius, width - this.radius);
    this.pos.y = constrain(this.pos.y, this.radius, height - this.radius);
  }

  display() {
    noStroke();
    if (focus.targetStudent === this) {
      fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], 50);
      circle(this.pos.x, this.pos.y, this.radius * 2.8 + sin(frameCount * 0.1) * 15);
    }

    fill(this.color);
    circle(this.pos.x, this.pos.y, this.radius * 2);

    if (this.points >= pointThreshold && this.points > 0) {
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(constrain(this.radius * 0.7, 12, 35));
      text(this.initials, this.pos.x, this.pos.y);
      textAlign(LEFT, TOP);
    }
  }
}

function drawStatusUI() {
  push();
  fill(255, 60);
  textSize(14);
  textAlign(RIGHT, BOTTOM);
  text(`Updated: ${lastUpdated}`, width - 20, height - 15);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}