let students = [];
let updateInterval = 1000 * 60 * 10; 
let lastUpdated = "Initializing...";
let maxPointsInSchool = 1; 

function setup() {
  // PERFORMANCE BOOST #1: Set pixel density to 1. 
  // By default, p5 uses 2 or 4 on high-res screens, which kills the Pi's GPU.
  pixelDensity(1);
  
  createCanvas(windowWidth, windowHeight);
  
  // PERFORMANCE BOOST #2: Set a fixed frame rate. 
  // 30fps looks smooth but is much easier for the Pi to maintain than 60fps.
  frameRate(30);
  
  textAlign(CENTER, CENTER);
  fetchData();
  setInterval(fetchData, updateInterval);
}

function fetchData() {
  loadJSON('/data', updateStudentList, (err) => {
    setTimeout(fetchData, 5000); 
  });
}

function updateStudentList(data) {
  let arborData = Array.isArray(data) ? data : data.data || [];
  if (arborData.length === 0) return;

  let now = new Date();
  lastUpdated = now.getHours() + ":" + nf(now.getMinutes(), 2);
  maxPointsInSchool = Math.max(...arborData.map(d => Number(d.Points) || 0));

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
  // PERFORMANCE BOOST #3: Avoid transparency in background
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
    this.fullName = data["Student"] || "Unknown";
    this.pos = createVector(random(50, width - 50), random(50, height - 50));
    this.vel = p5.Vector.random2D().mult(random(0.5, 1.5));

    let nameParts = this.fullName.trim().split(/\s+/);
    this.initials = nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : (nameParts[0] ? nameParts[0][0] : "?").toUpperCase();

    this.updateStats(data);
    
    // PERFORMANCE BOOST #4: Use solid colors (No Alpha)
    // Transparency requires the GPU to calculate colors of overlapping objects.
    this.color = color(random(50, 200), random(100, 255), 255);
  }

  updateStats(data) {
    this.points = Number(data["Points"]) || 0;
    this.targetRadius = map(this.points, 0, maxPointsInSchool || 1, 5, 50, true);
    if (!this.radius) this.radius = this.targetRadius;
  }

  update() {
    this.pos.add(this.vel);
    
    // Smooth growth - only calculate if sizes differ significantly
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
    // Simple clamping to prevent getting stuck
    this.pos.x = constrain(this.pos.x, this.radius, width - this.radius);
    this.pos.y = constrain(this.pos.y, this.radius, height - this.radius);
  }

  display() {
    // PERFORMANCE BOOST #5: Use 'noStroke()' 
    // Outlines are rendered as separate geometry and take 2x the power.
    noStroke();
    
    push();
    translate(this.pos.x, this.pos.y);
    
    // Highlighting top scorer without using heavy glow effects
    if (this.points > 0 && this.points === maxPointsInSchool) {
      fill(255, 255, 150); // Lighter highlight color
      circle(0, 0, this.radius * 2 + 4); 
    }

    fill(this.color);
    circle(0, 0, this.radius * 2);

    // PERFORMANCE BOOST #6: Only draw text if circle is large enough
    if (this.radius > 10) {
      fill(255);
      textSize(this.radius * 0.75);
      text(this.initials, 0, 0);
    }
    pop();
  }
}

function drawStatusUI() {
  // Draw UI once per frame at bottom
  fill(255, 150);
  textSize(12);
  textAlign(LEFT, BOTTOM);
  text(`SYNC: ${lastUpdated} | MAX: ${maxPointsInSchool}`, 10, height - 10);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}