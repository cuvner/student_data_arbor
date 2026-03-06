let students = [];
let updateInterval = 1000 * 60 * 10; 
let lastUpdated = "Initializing...";
let maxPointsInSchool = 1; 
let pointThreshold = 0; 

function setup() {
  // PERFORMANCE BOOST: Disable high-DPI scaling
  pixelDensity(1);
  
  // Create canvas and grab the raw element to disable Alpha (transparency)
  let cnv = createCanvas(windowWidth, windowHeight);
  if (cnv.elt && cnv.elt.getContext) {
    cnv.elt.getContext('2d', { alpha: false });
  }
  
  // Set frameRate to 30 for consistent, jitter-free movement on Pi
  frameRate(30); 
  textAlign(CENTER, CENTER);
  
  // Initial data fetch and timer setup
  fetchData();
  setInterval(fetchData, updateInterval);
}

function fetchData() {
  // We use relative path because the server handles the routing
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

  // 1. LIMIT TO TOP 200 (Prevents lag as the year progresses)
  // Data is sorted by points descending on the server, but we'll double check
  let arborData = data.sort((a, b) => (b.Points || 0) - (a.Points || 0));
  if (arborData.length > 200) arborData = arborData.slice(0, 200);

  // 2. CALCULATE MAX & THRESHOLD
  let pointsArray = arborData.map(d => d.Points || 0);
  maxPointsInSchool = Math.max(...pointsArray);

  // Find the 75th percentile to determine who gets a text label
  let sortedPoints = [...pointsArray].sort((a, b) => a - b);
  let index = Math.floor(sortedPoints.length * 0.75);
  pointThreshold = sortedPoints[index];

  // 3. RECONCILE STUDENT LIST
  let currentIds = arborData.map(d => d["Arbor Student ID"]);
  // Remove students who dropped out of the top 200
  students = students.filter(s => currentIds.includes(s.arborId));

  // Add or Update remaining students
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
  // Solid background is the most efficient for Pi GPU
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
    this.arborId = data["Arbor Student ID"];
    // Using the 'Initials' pre-calculated by the server for GDPR safety
    this.initials = data["Initials"] || "?";
    
    this.pos = createVector(random(50, width - 50), random(50, height - 50));
    this.vel = p5.Vector.random2D().mult(random(0.5, 1.5));
    
    // Cache color to prevent object recreation every frame
    this.color = color(random(50, 200), random(100, 255), 255);
    
    this.updateStats(data);
    this.radius = this.targetRadius;
  }

  updateStats(data) {
    this.points = data.Points || 0;
    // Maps points to circle size (diameter 10 to 100)
    this.targetRadius = map(this.points, 0, maxPointsInSchool || 1, 5, 50, true);
    this.cachedTxtSize = constrain(this.targetRadius * 0.75, 10, 40);
  }

  update() {
    this.pos.add(this.vel);
    
    // Smooth transition if points change
    if (abs(this.radius - this.targetRadius) > 0.1) {
      this.radius = lerp(this.radius, this.targetRadius, 0.05);
      this.cachedTxtSize = constrain(this.radius * 0.75, 10, 40);
    }
  }

  checkEdges() {
    if (this.pos.x < this.radius || this.pos.x > width - this.radius) this.vel.x *= -1;
    if (this.pos.y < this.radius || this.pos.y > height - this.radius) this.vel.y *= -1;
    this.pos.x = constrain(this.pos.x, this.radius, width - this.radius);
    this.pos.y = constrain(this.pos.y, this.radius, height - this.radius);
  }

  display() {
    noStroke();
    
    // Halo for the current top scorer
    if (this.points > 0 && this.points === maxPointsInSchool) {
      fill(255, 255, 150, 150); 
      circle(this.pos.x, this.pos.y, this.radius * 2 + 8); 
    }

    fill(this.color);
    circle(this.pos.x, this.pos.y, this.radius * 2);

    // Label only for students above 75th percentile
    if (this.points >= pointThreshold && this.points > 0) {
      fill(255);
      textSize(this.cachedTxtSize);
      // Optical centering: nudge +5px right
      text(this.initials, this.pos.x + 5, this.pos.y);
    }
  }
}

function drawStatusUI() {
  push();
  fill(255, 100);
  textSize(14);
  textAlign(RIGHT, BOTTOM);
  text(`Last Updated: ${lastUpdated}`, width - 20, height - 15);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}