let students = [];
let arborData = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Using a relative path works regardless of the IP address
  loadJSON('/data', (data) => {
    arborData = Array.isArray(data) ? data : data.data || [];
    for (let i = 0; i < arborData.length; i++) {
      students.push(new Student(arborData[i]));
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
}

class Student {
  constructor(data) {
    this.pos = createVector(
      random(100, width - 100),
      random(100, height - 100),
    );
    this.vel = p5.Vector.random2D().mult(random(0.5, 2));

    // Using your specific keys: "Student" and "Points"
    this.fullName = data["Student"] || "Unknown";
    this.points = Number(data["Points"]) || 0;

    // Generate initials (handles "First Last" or "First Middle Last")
    let nameParts = this.fullName.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      this.initials = nameParts[0][0] + nameParts[nameParts.length - 1][0];
    } else {
      this.initials = nameParts[0] ? nameParts[0][0] : "?";
    }

    // Map Points to Size (min 20px radius, max 75px)
    // Adjust 0, 50 to your school's typical point range
    this.radius = map(this.points, 0, 50, 20, 75, true);

    // Visual Style
    this.color = color(random(100, 255), 100, random(200, 255), 200);
    this.strokeColor = color(255, 200);
  }

  update() {
    this.pos.add(this.vel);
  }

  checkEdges() {
    // Bounce off walls
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

    // OPTION A: High Performance (No Shadow)
    fill(this.color);
    stroke(255, 150); // Use a light stroke instead of a glow
    circle(0, 0, this.radius * 2);

    // OPTION B: Medium Performance (Two circles instead of shadowBlur)
    /*
  noStroke();
  fill(this.color, 50); // Faint outer circle for glow
  circle(0, 0, this.radius * 2.4);
  fill(this.color); // Solid inner circle
  circle(0, 0, this.radius * 2);
  */

    fill(255);
    noStroke();
    textSize(this.radius * 0.7);
    text(this.initials.toUpperCase(), 0, 0);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
