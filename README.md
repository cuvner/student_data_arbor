# Arbor Data Visualisation

This project visualises Arbor student points as animated circles in a full-screen `p5.js` sketch.

Each student is represented by:

- their initials in the centre of the circle
- a circle size based on their `Points` value
- a random starting position, colour, and movement direction

The project is intended as a lightweight school-facing prototype that can be adapted for another Arbor-connected school with minimal code changes.

## What The Project Does

The visual runs in the browser and requests data from a local Node/Express server.

The server:

- fetches JSON from an Arbor data export URL
- sends the Arbor `Authorization` header
- caches the result for 60 seconds
- exposes the data locally at `http://localhost:3000/data`

The browser sketch:

- loads data from the local `/data` endpoint
- creates one moving circle per student
- uses the `Student` field for initials
- uses the `Points` field to scale bubble size

## Project Structure

- `index.html` loads the page and includes `p5.js`
- `sketch.js` contains the visualisation logic
- `style.css` removes default page margins so the canvas fills the window
- `server.js` fetches and caches Arbor data
- `package.json` defines the Node dependencies for the server

## Requirements

To run this project locally, you need:

- Node.js 18 or later recommended
- npm
- internet access to reach the Arbor export endpoint

## Install

If dependencies are not already installed:

```bash
npm install
```

## Run The Project

1. Start the local data server:

```bash
node server.js
```

2. Open `index.html` in a browser.

3. The sketch will request data from:

```text
http://localhost:3000/data
```

If the server is running and the Arbor fetch succeeds, the bubbles should appear automatically.

## How The Data Is Used

The sketch expects each record to include at least these fields:

- `Student`
- `Points`

Example expected record:

```json
{
  "Student": "Jane Smith",
  "Points": 34
}
```

Current behaviour:

- `Student` is converted into initials
- `Points` is converted to a bubble radius using `map(points, 0, 50, 20, 75, true)`

If another school exports different field names, update the field mapping in [`sketch.js`](/Users/chris/Documents/arb-data/sketch.js).

## Adapting This For Another School

Another school will almost certainly need to change the Arbor configuration in [`server.js`](/Users/chris/Documents/arb-data/server.js).

The current server contains:

- a hard-coded Arbor export URL
- a hard-coded `Authorization` header

To adapt it:

1. Replace `API_URL` with that school's Arbor export URL.
2. Replace `AUTH_STRING` with that school's Arbor credentials.
3. Confirm the exported JSON contains `Student` and `Points`, or update [`sketch.js`](/Users/chris/Documents/arb-data/sketch.js) to match the new field names.
4. If the school's points range is different, adjust the radius mapping in [`sketch.js`](/Users/chris/Documents/arb-data/sketch.js) so circle sizes remain readable.

## Important Security Note

This repository currently stores Arbor access details directly in [`server.js`](/Users/chris/Documents/arb-data/server.js).

That means:

- the project should not be shared publicly in its current form
- credentials should be removed or replaced before sending the code to another school
- a safer version would move the Arbor URL and auth header into environment variables

Recommended approach before external sharing:

- remove the live credentials from `server.js`
- replace them with placeholders
- provide setup instructions for the receiving school to add their own values

## Customisation Options

Common edits another school may want:

- change colour palette in [`sketch.js`](/Users/chris/Documents/arb-data/sketch.js)
- change point-to-size scaling in [`sketch.js`](/Users/chris/Documents/arb-data/sketch.js)
- display full names or point totals instead of initials
- filter the exported dataset before visualising it
- host the page and API together instead of opening `index.html` manually

## Troubleshooting

### No bubbles appear

Check:

- `node server.js` is running
- `http://localhost:3000/data` loads in the browser
- the Arbor endpoint is reachable
- the Arbor credentials are valid

### The page loads but data is missing

Possible causes:

- the cache has not filled yet
- the Arbor response is failing
- the exported JSON structure is different from expected

### The circles are too small or too large

Adjust this line in [`sketch.js`](/Users/chris/Documents/arb-data/sketch.js):

```js
this.radius = map(this.points, 0, 50, 20, 75, true);
```

## Suggested Next Improvements

If this is going to be reused by multiple schools, the next sensible improvements are:

- move secrets into environment variables
- add npm scripts such as `npm start`
- serve `index.html` from Express rather than opening it directly
- add a sample JSON file for demo mode
- document the exact Arbor export configuration used

## Summary

This project is a simple browser-based visualisation for Arbor student points data. It is easy to adapt, but before sharing it with another school, the hard-coded Arbor credentials should be removed and the receiving school should be given clear instructions for supplying their own export URL, authentication, and field mapping.
