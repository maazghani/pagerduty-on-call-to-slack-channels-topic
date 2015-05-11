Pagerduty on-call to Slack channels topic
======

[![Dependency Status](https://david-dm.org/OronNadiv/pagerduty-on-call-to-slack-channels-topic.svg?style=flat)](https://david-dm.org/OronNadiv/pagerduty-on-call-to-slack-channels-topic)
[![devDependency Status](https://david-dm.org/OronNadiv/pagerduty-on-call-to-slack-channels-topic/dev-status.svg?style=flat)](https://david-dm.org/OronNadiv/pagerduty-on-call-to-slack-channels-topic)

[**Pagerduty**](www.pagerduty.com) is an alarm aggregation and dispatching service for system administrators and support teams. It collects alerts from your monitoring tools, gives you an overall view of all of your monitoring alarms, and alerts an on duty engineer if there's a problem.

[**Slack**](www.slack.com) is a platform for team communication: everything in one place, instantly searchable, available wherever you go.

## Features

* Updates slack channels topic whenever a person is going on-call.
* It sets the topics for the Slack channels you specify.
* The topic will have the following format: "Engineer on-call: <Name> <Phones>".  ex: "Engineer on-call: Oron Nadiv (415) 234-1234".

## Configuration

### Required enviroment variables
* **COMPANY_NAME** The name of your company.  This is being used by Pagerduty.  This is the first part of the url you use to access your pagerduty data.  Ex: for https://lanetix.pagerduty.com use "lanetix".
* **PAGERDUTY_API_KEY** Pagerduty API key.  Click [here](https://support.pagerduty.com/hc/en-us/articles/202829310-Generating-an-API-Key) for more details.
* **SLACK_API_KEY** Slack API key.  Click [here](https://api.slack.com/tokens) for more details.
* **SLACK_CHANNELS** Slack channels to set topics.  Ex: "general,support,ops".

### Optional enviroment variables
* **CHECK_INTERVALIN_MINUTES** Specify how frequently it should check for changes for the current person on-call.  Default: every 30 minutes.
* **ESCALATION_POLICY_NAME** Escalation policy to use for the current on-call person.  Default: First item in the list of escalation policies.

## Usage

```bash
$ node index.js
```
