# Arbor Student Points Visualisation

This project runs a local kiosk-style visualisation of Arbor student points using `p5.js` on the front end and a Node/Express server on the back end.

The current version is set up to avoid sharing live Arbor credentials in source control:

- Arbor secrets are read from a local `.env` file
- `.env` is ignored by git
- a safe template is provided in `.env.example`
- student data is scrubbed on the server before being sent to the browser

## What It Does

The browser displays animated student bubbles and supporting UI based on points data pulled from Arbor.

The server:

- fetches the Arbor export feed using credentials from environment variables
- caches the data for 60 seconds
- reduces student data before sending it onward
- serves the app locally from the `public/` directory
- runs over local HTTPS on `127.0.0.1`

The browser visual:

- requests `/data` from the local server
- shows moving student circles
- uses initials for most on-screen identities
- highlights top achievers and rotating focus messages

## Project Structure

- `server.js` runs the secure local server and Arbor fetch
- `public/index.html` loads the visual
- `public/sketch.js` contains the main visualisation logic
- `public/sketch2.js` contains an alternate or older sketch version
- `public/style.css` contains the page styling
- `.env.example` shows the required secrets and local configuration

## Security Model

The main credential risk in this kind of project is accidentally sharing:

- the Arbor export URL
- the Arbor authorization token
- TLS key and certificate files

This repository now expects those values to stay outside version control.

Sensitive files already excluded by git:

- `.env`
- `*.pem`
- `node_modules`

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your secrets file

Copy `.env.example` to `.env` and replace the placeholder values with your own:

```bash
cp .env.example .env
```

Required values:

- `ARBOR_API_URL`
- `ARBOR_AUTH_TOKEN`
- `PORT`
- `SSL_KEY_PATH`
- `SSL_CERT_PATH`

Example `.env` shape:

```env
PORT=3443
ARBOR_API_URL=https://your-school.uk.arbor.sc/data-export/export/id/000/h/replace-me/format/json/v/2/
ARBOR_AUTH_TOKEN=Basic replace-this-with-your-base64-token
SSL_KEY_PATH=key.pem
SSL_CERT_PATH=cert.pem
```

### 3. Add local TLS files

Place your certificate and key at the paths defined in `.env`.

By default the app expects:

- `key.pem`
- `cert.pem`

These files are ignored by git and should not be shared in the repository.

### 4. Start the server

```bash
node server.js
```

The server runs locally at:

```text
https://127.0.0.1:3443
```

Because it is intended as a kiosk/local-only service, it binds to `127.0.0.1` rather than exposing itself on the network.

## Data Handling

The server fetches Arbor data, then scrubs it before returning it to the browser.

Current fields returned to the front end:

- `Arbor Student ID`
- `Initials`
- `Points`

This reduces the chance of sharing full student names in the browser payload.

Note that [`public/sketch.js`](/Users/chris/Documents/arb-data/public/sketch.js) still supports optional full-name fields if they are present, but [`server.js`](/Users/chris/Documents/arb-data/server.js) currently does not send them.

## Sharing With Another School

To share this project safely:

1. Share the repository without your local `.env` file.
2. Do not include any real Arbor token in documentation, screenshots, commits, or messages.
3. Do not include `key.pem`, `cert.pem`, or any other private certificate material.
4. Ask the receiving school to create its own `.env` using `.env.example`.
5. Ask the receiving school to generate or install its own certificate files.

What the receiving school must provide themselves:

- their own Arbor export URL
- their own Arbor auth token
- their own local TLS certificate and private key

## Running Checks Before Sharing

Before sending the project on, confirm:

- `.env` is not tracked by git
- no real credential appears in [`server.js`](/Users/chris/Documents/arb-data/server.js)
- no real credential appears in [`README.md`](/Users/chris/Documents/arb-data/README.md)
- no `.pem` file is tracked by git

Useful commands:

```bash
git status
git ls-files .env
git ls-files '*.pem'
```

## Troubleshooting

### Server exits immediately

The server now fails fast if required secrets are missing. Check that `.env` contains:

- `ARBOR_API_URL`
- `ARBOR_AUTH_TOKEN`

Also check that the TLS files named by `SSL_KEY_PATH` and `SSL_CERT_PATH` exist.

### Browser shows no data

Check:

- the server is running
- Arbor credentials are valid
- the Arbor export URL returns data
- the local browser can open `https://127.0.0.1:3443`

### Certificate warnings in the browser

That is expected if you are using a self-signed local certificate. For a kiosk deployment, install a certificate trusted by that device or accept the local certificate as appropriate for your environment.

## Recommended Next Steps

If this will be reused across multiple schools, the next sensible improvements are:

- add an npm `start` script
- add a deployment checklist for certificate creation and Arbor setup
- add a sample anonymised JSON mode for demos without live Arbor access
- rotate any credentials that were previously committed to git history

## Summary

The project now uses local secrets instead of hard-coded Arbor credentials. That removes the main sharing risk from the codebase itself, but if real credentials were ever committed in the past, they should still be rotated because git history may already contain them.
