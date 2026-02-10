let students = [];
let updateInterval = 1000 * 60 * 10; // Check server every 10 mins
let lastUpdated = "Initializing...";
let maxPointsInSchool = 200; // Adjust this if students have more than 200 points

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  
  // 1. Initial Fetch
  fetchData();
  
  // 2. Setup the "Heartbeat" to check for new data
  setInterval(fetchData, updateInterval);
}

function fetchData() {
  console.log("Checking for fresh Arbor data...");
  loadJSON('/data', updateStudentList, (err) => {
    console.error("Fetch failed, will retry in 10 mins", err);
  });
}

function updateStudentList(data) {
  // Handle the specific Arbor array format you provided
  let arborData = Array.isArray(data) ? data : data.data || [];
  
  // Update timestamp
  let now = new Date();
  lastUpdated = now.getHours() + ":" + nf(now.getMinutes(), 2);

  // Dynamically find the highest point score to keep scaling perfect
  if (arborData.length > 0) {
    maxPointsInSchool = Math.max(...arborData.map(d => Number(d.Points) || 0));
  }

  // Reconcile data: Update existing or add new
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
  background(15, 15, 25); // Deep midnight blue

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
    this.pos = createVector(random(100, width - 100), random(100, height - 100));
    this.vel = p5.Vector.random2D().mult(random(0.5, 1.5));
    this.fullName = data["Student"] || "Unknown";
    
    // Generate Initials
    let nameParts = this.fullName.trim().split(/\s+/);
    this.initials = nameParts.length >= 2 
      ? nameParts[0][0] + nameParts[nameParts.length - 1][0] 
      : (nameParts[0] ? nameParts[0][0] : "?");

    this.updateStats(data);
    
    // Visual Style: Random pleasing colors
    this.color = color(random(100, 255), random(150, 255), 255, 180);
  }

  updateStats(data) {
    this.points = Number(data["Points"]) || 0;

    // MAP LOGIC: 
    // Points 0 to Max -> Diameter 10 to 100 (Radius 5 to 50)
    this.targetRadius = map(this.points, 0, maxPointsInSchool, 5, 50, true);
    
    if (!this.radius) this.radius = this.targetRadius;
  }

  update() {
    this.pos.add(this.vel);
    // Smooth growth animation
    this.radius = lerp(this.radius, this.targetRadius, 0.05);
  }

  checkEdges() {
    if (this.pos.x < this.radius || this.pos.x > width - this.radius) {
      this.vel.x *= -1;
      this.pos.x = constrain(this.pos.x, this.radius, width - this.radius);
    }
    if (this.pos.y < this.radius || this.pos.y > height - this.radius) {
      this.vel.y *= -1;
      this.pos.y = constrain(this.pos.y, this.radius, height - this.radius);
    }
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Outer Glow if they have high points
    if (this.points === maxPointsInSchool && this.points > 0) {
      noFill();
      stroke(255, 255, 255, 100);
      strokeWeight(4);
      circle(0, 0, (this.radius * 2) + 10);
    }

    // Main Circle
    fill(this.color);
    stroke(255, 200);
    strokeWeight(2);
    circle(0, 0, this.radius * 2);

    // Initials Text
    fill(255);
    noStroke();
    // Scale text size based on circle size (min 8px)
    let dynamicTextSize = max(this.radius * 0.8, 8);
    textSize(dynamicTextSize);
    text(this.initials.toUpperCase(), 0, 0);
    
    pop();
  }
}

function drawStatusUI() {
  push();
  fill(255, 80);
  textAlign(LEFT, BOTTOM);
  textSize(12);
  text(`ARBOR LIVE SYNC | Last Update: ${lastUpdated} | Mac Remote: 100.73.61.65`, 20, height - 20);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}