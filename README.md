# QuickTaxi Experiment Code

This repository contains the main technical files for the QuickTaxi web application and its backend tracking server.

## Files in this repository

### `combinedscript.js`

This file contains the main front-end logic for the QuickTaxi website. It manages the client-side interaction flow and connects the website interface with the backend server and survey link.

The file handles:

- displaying the main website screens
- managing user interactions in the booking interface
- controlling the location-access interaction flow
- updating the pickup and drop-off fields based on user actions
- enabling or disabling the booking button based on required inputs
- generating browser-side session and run identifiers
- sending interaction events to the backend server
- preparing the survey link with embedded technical values, such as:
  - `session_id`
  - `user_id`
  - `experiment_run_id`
  - `survey_group`
  - `permission_decision`
  - `dialog_variant`

### `server.js`

This file contains the backend tracking server logic. It receives event data from the front-end and stores it in the configured database.

The server handles:

- receiving tracking requests from the website
- validating incoming event data
- checking required identifiers and event types
- saving interaction events to the database
- returning success or error responses to the front-end
- supporting CORS configuration for the deployed website

## Technical purpose

The purpose of this code is to support a web-based interaction flow where frontend actions are logged by a backend server and connected to a follow-up survey through embedded URL parameters.

The frontend handles the participant-facing interaction flow, while the backend receives and stores structured event records for later review and analysis.

