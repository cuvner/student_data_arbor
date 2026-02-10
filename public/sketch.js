let students = [];
let updateInterval = 1000 * 60 * 10; 
let lastUpdated = "Initializing...";
let maxPointsInSchool = 1; 
let pointThreshold = 0; // Only students above this value get text

function setup() {
  // PERFORMANCE BOOST #1: Stop high-res rendering
  pixelDensity(1);
  
  // Create canvas and set lower frame rate for stability
  createCanvas(windowWidth, windowHeight);
  frameRate(30); 
  
  textAlign(CENTER, CENTER);
  
  // Start data sync
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
  let arborData = Array.isArray(data) ? data : data.data || [];
  if (arborData.length === 0) return;

  let now = new Date();
  lastUpdated = now.getHours() + ":" + nf(now.getMinutes(), 2);

  // 1. Calculate Max Points
  let pointsArray = arborData.map(d => Number(d.Points) || 0);
  maxPointsInSchool = Math.max(...pointsArray);

  // 2. Calculate Top 25% Threshold
  // Sort points to find the 75th percentile value
  pointsArray.sort((a, b) => a - b);
  let index = Math.floor(pointsArray.length * 0.75);
  pointThreshold = pointsArray[index];

  // 3. Reconcile Students
  arborData.forEach(newEntry => {
    let id = newEntry["Arbor Student ID"];
    let existing = students.find(s => s.arborId === id);
    if (existing) {
      existing.updateStats(newEntry);
    } else {
      students.push(new Student(newEntry));
    }
  });
}

function draw() {
  background(15, 15, 25); // Solid color (fastest)

  for (let s of students) {
    s.update();
    s.display();
    s.checkEdges();
  }

  drawStatusUI();
}

class Student {
  constructor(data) {
    this.arborId = data["Arbor Student ID"];
    this.fullName = data["Student"] || "Unknown";
    this.pos = createVector(random(50, width - 50), random(50, height - 50));
    this.vel = p5.Vector.random2D().mult(random(0.5, 1.5));

    // Initials logic
    let nameParts = this.fullName.trim().split(/\s+/);
    this.initials = nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : (nameParts[0] ? nameParts[0][0] : "?").toUpperCase();

    this.updateStats(data);
    
    // Solid colors only (transparency slows down the Pi)
    this.color = color(random(50, 200), random(100, 255), 255);
    this.radius = this.targetRadius;
  }

  updateStats(data) {
    this.points = Number(data["Points"]) || 0;
    // Map 0-Max Points to 10-100 Diameter (5-50 Radius)
    this.targetRadius = map(this.points, 0, maxPointsInSchool || 1, 5, 50, true);
  }

  update() {
    this.pos.add(this.vel);
    
    // Smooth size transition
    if (abs(this.radius - this.targetRadius) > 0.1) {
      this.radius = lerp(this.radius, this.targetRadius, 0.05);
    }
  }

  checkEdges() {
    if (this.pos.x < this.radius || this.pos.x > width - this.radius) {
      this.vel.x *= -1;
    }
    if (this.pos.y < this.radius || this.pos.y > height - this.radius) {
      this.vel.y *= -1;
    }
    this.pos.x = constrain(this.pos.x, this.radius, width - this.radius);
    this.pos.y = constrain(this.pos.y, this.radius, height - this.radius);
  }

  display() {
    noStroke(); // Performance boost: skip outlines
    push();
    translate(this.pos.x, this.pos.y);
    
    // Highlight top scorer
    if (this.points > 0 && this.points === maxPointsInSchool) {
      fill(255, 255, 150); 
      circle(0, 0, this.radius * 2 + 6); 
    }

    fill(this.color);
    circle(0, 0, this.radius * 2);

    // PERFORMANCE BOOST: Only render text for the top 25% of students
    if (this.points >= pointThreshold && this.points > 0) {
      fill(255);
      let txtSize = constrain(this.radius * 0.75, 10, 40);
      textSize(txtSize);
      text(this.initials, 0, 0);
    }
    pop();
  }
}

function drawStatusUI() {
  fill(255, 100);
  textSize(12);
  textAlign(LEFT, BOTTOM);
  text(`SYNC: ${lastUpdated} | SHOWING NAMES FOR TOP 25% (> ${pointThreshold} pts)`, 15, height - 15);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}