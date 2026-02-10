let students = [];
let updateInterval = 1000 * 60 * 10; 
let lastUpdated = "Initializing...";
let maxPointsInSchool = 1; 
let pointThreshold = 0; 

function setup() {
  pixelDensity(1);
  let cnv = createCanvas(windowWidth, windowHeight);
  
  if (cnv.elt && cnv.elt.getContext) {
    cnv.elt.getContext('2d', { alpha: false });
  }
  
  frameRate(30); 
  textAlign(CENTER, CENTER);
  
  fetchData();
  setInterval(fetchData, updateInterval);
}

function fetchData() {
  loadJSON('/data', updateStudentList, (err) => {
    lastUpdated = "Waiting for Server...";
    setTimeout(fetchData, 5000); 
  });
}

function updateStudentList(data) {
  let arborData = Array.isArray(data) ? data : data.data || [];
  if (arborData.length === 0) return;

  let now = new Date();
  lastUpdated = now.getHours() + ":" + nf(now.getMinutes(), 2);

  arborData.sort((a, b) => (Number(b.Points) || 0) - (Number(a.Points) || 0));
  if (arborData.length > 200) arborData = arborData.slice(0, 200);

  let pointsArray = arborData.map(d => Number(d.Points) || 0);
  maxPointsInSchool = Math.max(...pointsArray);

  let sortedPoints = [...pointsArray].sort((a, b) => a - b);
  let index = Math.floor(sortedPoints.length * 0.75);
  pointThreshold = sortedPoints[index];

  let currentIds = arborData.map(d => d["Arbor Student ID"]);
  students = students.filter(s => currentIds.includes(s.arborId));

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

    this.color = color(random(50, 200), random(100, 255), 255);
    this.updateStats(data);
    this.radius = this.targetRadius;
  }

  updateStats(data) {
    this.points = Number(data["Points"]) || 0;
    this.targetRadius = map(this.points, 0, maxPointsInSchool || 1, 5, 50, true);
    this.cachedTxtSize = constrain(this.targetRadius * 0.75, 10, 40);
  }

  update() {
    this.pos.add(this.vel);
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
    
    if (this.points > 0 && this.points === maxPointsInSchool) {
      fill(255, 255, 150); 
      circle(this.pos.x, this.pos.y, this.radius * 2 + 6); 
    }

    fill(this.color);
    circle(this.pos.x, this.pos.y, this.radius * 2);

    if (this.points >= pointThreshold && this.points > 0) {
      fill(255);
      textSize(this.cachedTxtSize);
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