let students = [];
let updateInterval = 1000 * 60 * 10; // Check server every 10 mins
let lastUpdated = "Initializing...";

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
  let arborData = Array.isArray(data) ? data : data.data || [];
  
  // Update timestamp
  let now = new Date();
  lastUpdated = now.getHours() + ":" + nf(now.getMinutes(), 2);

  // Reconcile data: Update existing or add new
  arborData.forEach(newEntry => {
    let name = newEntry["Student"] || "Unknown";
    let existing = students.find(s => s.fullName === name);

    if (existing) {
      // Update points and radius for existing student
      existing.updateStats(newEntry);
    } else {
      // Add brand new student
      students.push(new Student(newEntry));
    }
  });

  // Optional: Remove students who are no longer in the Arbor list
  // students = students.filter(s => arborData.some(d => d["Student"] === s.fullName));
}

function draw() {
  background(15, 15, 25); 

  for (let s of students) {
    s.update();
    s.display();
    s.checkEdges();
  }

  drawStatusUI();
}

class Student {
  constructor(data) {
    this.pos = createVector(random(100, width - 100), random(100, height - 100));
    this.vel = p5.Vector.random2D().mult(random(0.5, 2));
    this.fullName = data["Student"] || "Unknown";
    
    // Set Initials once
    let nameParts = this.fullName.trim().split(/\s+/);
    this.initials = nameParts.length >= 2 
      ? nameParts[0][0] + nameParts[nameParts.length - 1][0] 
      : (nameParts[0] ? nameParts[0][0] : "?");

    this.updateStats(data);
    
    // Visual Style
    this.color = color(random(100, 255), 100, random(200, 255), 200);
  }

  // New method to handle updates without resetting position
  updateStats(data) {
    this.points = Number(data["Points"]) || 0;
    // Map Points to Size (min 20px radius, max 75px)
    this.targetRadius = map(this.points, 0, 50, 20, 75, true);
    // Smoothly grow/shrink (if it's the first time, set radius immediately)
    if (!this.radius) this.radius = this.targetRadius;
  }

  update() {
    this.pos.add(this.vel);
    // Smoothly transition radius to targetRadius
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
    fill(this.color);
    stroke(255, 150);
    strokeWeight(2);
    circle(0, 0, this.radius * 2);

    fill(255);
    noStroke();
    textSize(this.radius * 0.7);
    text(this.initials.toUpperCase(), 0, 0);
    pop();
  }
}

function drawStatusUI() {
  push();
  fill(255, 100);
  textAlign(LEFT, BOTTOM);
  textSize(14);
  text(`Arbor Live | Last Sync: ${lastUpdated} | IP: 100.126.185.85`, 20, height - 20);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}