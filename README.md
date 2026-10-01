# Faith Salon

A browser-based salon booking prototype. Customers can browse hairstyle offerings and submit appointment requests; salonists can publish styles and respond to requests.

## Features

- Register and sign in as a customer or salonist
- Reset a password using the recovery answer set during registration
- Post hairstyles with a description, price in KSh, duration, and optional image
- Browse styles and request an appointment with a preferred date, notes, and optional inspiration image
- Accept or reject pending customer requests

## Run locally

There are no packages to install or build steps. From the project directory, start a local static server:

```powershell
py -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in a browser. Stop the server with `Ctrl+C`.

You can also open `index.html` directly, but a local server provides a consistent browser origin for saved data and browser APIs.

## Use the app

1. Select **Register** on the sign-in screen.
2. Follow the prompts to choose a username, password, recovery answer, and role (`customer` or `salonist`). Registration signs you in immediately.
3. Salonists can post styles; customers can browse styles and submit requests.
4. Sign in with the other role in the same browser to try that dashboard. Salonists can accept or reject requests.

## Data and security

This prototype has no server or database. Accounts, styles, requests, and the current session are saved in the browser's `localStorage`. They are not shared between browsers, devices, or browser profiles; clearing site data removes them.

Passwords and recovery answers are hashed in the browser, but this is not production authentication. Do not use real credentials or sensitive personal information. A production service needs a secure backend, proper credential handling, access controls, and shared persistent storage.

## Project files

- `index.html` — page structure and forms
- `styles.css` — layout and visual styles
- `script.js` — registration, sign-in, booking, and browser storage behavior
