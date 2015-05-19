'use strict';

var timeoutHandle,
  BPromise = require('bluebird'),
  request = require('request-promise'),
  _ = require('underscore'),
  moment = require('moment'),
  phoneFormatter = require('phone-formatter');


function updateSlack(onCallUserData) {
  function checkSlackResponse(response) {
    response = JSON.parse(response);
    if (!response || !response.ok) {
      throw 'response from slack: ' + JSON.stringify(response);
    }
    return response;
  }

  var topic = 'Engineer on-call: ' + onCallUserData.name;
  if (onCallUserData.phoneNumbers && onCallUserData.phoneNumbers.length) {
    topic += ' ' + onCallUserData.phoneNumbers.sort().join(', ');
  }

  function updateChannel(channelId) {
    return request('https://slack.com/api/channels.info?token=' + process.env.SLACK_API_KEY + '&channel=' + channelId)
      .then(checkSlackResponse)
      .then(function (response) {
        if (response.channel.topic && response.channel.topic.value === topic) {
          console.log('topic is already set.  Channel id: ' + channelId + ',  topic: ', topic);
          return;
        }
        return request('https://slack.com/api/channels.setTopic?token=' + process.env.SLACK_API_KEY + '&channel=' + channelId + '&topic=' + topic)
          .then(checkSlackResponse)
          .then(function () {
            console.log('topic has been updated.  Channel id: ' + channelId + ',  topic: ', topic);
          });
      });
  }

  return BPromise.resolve()
    .then(function () {
      return request('https://slack.com/api/channels.list?token=' + process.env.SLACK_API_KEY + '&exclude_archived=1')
        .then(checkSlackResponse)
        .then(function (response) {
          if (!process.env.SLACK_CHANNELS) {
            throw 'Missing slack channels name';
          }
          var channelNames = process.env.SLACK_CHANNELS.toLowerCase().split(',');
          return _.chain(response.channels).filter(function (channel) {
            return _.contains(channelNames, channel.name);
          }).pluck('id').value();
        });
    })
    .map(updateChannel);
}

function checkPagerDuty() {
  return BPromise.resolve()
    .then(function () {
      return request({
        method: 'GET',
        uri: 'https://' + process.env.COMPANY_NAME + '.pagerduty.com/api/v1/escalation_policies/on_call',
        headers: {
          'Content-type': 'application/json',
          'Authorization': 'Token token=' + process.env.PAGERDUTY_API_KEY
        }
      });
    })
    .then(function (response) {
      response = JSON.parse(response);
      var escalationPolicies = response.escalation_policies,
        escalationPolicy,
        onCalls,
        onCallLevel1;
      if (!escalationPolicies || !escalationPolicies.length) {
        throw 'Escalation policies cannot be found.';
      }
      if (process.env.ESCALATION_POLICY_NAME) {
        escalationPolicy = _.findWhere(escalationPolicies, {name: process.env.ESCALATION_POLICY_NAME});
        if (!escalationPolicy) {
          throw 'Escalation policy could not be found.  Name: ' + process.env.ESCALATION_POLICY_NAME + ', escalationPolicies: ' + JSON.stringify(escalationPolicies);
        }
      } else {
        escalationPolicy = escalationPolicies[0];
      }
      onCalls = escalationPolicy.on_call;
      if (!onCalls) {
        throw 'ERROR: Escalation policy found without on-call property.';
      }
      onCallLevel1 = _.findWhere(onCalls, {level: 1});
      if (!onCallLevel1) {
        return console.error('ERROR: Could not find on-call level 1.');
      }
      var endsAt = moment(onCallLevel1.end),
        name = onCallLevel1.user.name,
        email = onCallLevel1.user.email;

      return {
        id: onCallLevel1.user.id,
        endsAt: endsAt,
        name: name,
        email: email
      };
    })
    .tap(function (onCallUserData) {
      return request({
        method: 'GET',
        uri: 'https://' + process.env.COMPANY_NAME + '.pagerduty.com/api/v1/users/' + onCallUserData.id + '/contact_methods',
        headers: {
          'Content-type': 'application/json',
          'Authorization': 'Token token=' + process.env.PAGERDUTY_API_KEY
        }
      }).then(function (response) {
        response = JSON.parse(response);
        onCallUserData.phoneNumbers = _.chain(response.contact_methods).filter(function (contactMethod) {
          return _.has(contactMethod, 'phone_number');
        })
          .map(function (contactMethod) {
            return phoneFormatter.format(contactMethod.phone_number, '(NNN) NNN-NNNN');
          }).unique().value();
      });
    });
}

module.exports = function checkPagerdutyStatusAndUpdateSlack() {
  checkPagerDuty()
    .tap(updateSlack)
    .then(function (data) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (data && data.endsAt) {
        var diff = data.endsAt.diff(moment()) + 10 * 1000; // give it 10 more seconds to make sure clocks are syncs between local machine and PD server.
        timeoutHandle = setTimeout(checkPagerdutyStatusAndUpdateSlack, diff);
        console.log('User is going off-call in ', moment.duration(diff).humanize());
      }
    })
    .catch(function (err) {
      console.error('ERROR: ', err);
    });
};
