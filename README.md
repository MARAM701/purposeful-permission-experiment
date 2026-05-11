# Purposeful Permission Experiment

This repository contains the main code files for the QuickTaxi web permission experiment. The experiment studies how users respond to a browser-style location permission request and how their decisions connect to the follow-up survey in Qualtrics.

## Files in this repository

### `combinedscript.js`

This file contains the main front-end logic for the QuickTaxi experiment. It controls the user flow, including:

- showing the consent and instruction screens
- handling the QuickTaxi booking interaction
- showing the location permission dialog
- recording whether the participant clicks Allow, Block, or closes the dialog
- enabling manual pickup address entry when location access is not allowed
- assigning the participant to the correct survey group
- sending tracking events to the server
- building the Qualtrics survey link with embedded values such as:
  - `session_id`
  - `user_id`
  - `experiment_run_id`
  - `survey_group`
  - `permission_decision`
  - `dialog_variant`

The main survey groups are:

- **Group A:** participant clicked Allow
- **Group B:** participant clicked Block or closed the dialog, then manually entered the address
- **Group C:** participant manually entered the address without interacting with the permission dialog

### `server.js`

This file contains the tracking server logic. It receives experiment events from the front-end and stores them in the database.

The server is responsible for:

- receiving tracking requests from the website
- validating the event data
- saving user interaction events
- supporting the experiment tracking structure
- connecting the front-end experiment with the backend database

The tracked events may include actions such as:

- consent decision
- instruction screen progress
- location button click
- permission dialog shown
- permission decision
- manual address entry
- survey link click

## Purpose of the code

The purpose of these files is to support the data collection process for the QuickTaxi experiment. The code helps connect user behavior on the experiment website with the post-experiment Qualtrics survey.

This allows the study to compare what participants did during the task with what they later report in the survey.
