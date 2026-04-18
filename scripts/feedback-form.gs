function onFormSubmit(e) {
  var props = PropertiesService.getScriptProperties();
  var GITHUB_TOKEN = props.getProperty('GITHUB_TOKEN');
  var REPO_OWNER = props.getProperty('REPO_OWNER');
  var REPO_NAME = props.getProperty('REPO_NAME');

  var responses = e.response.getItemResponses();

  var type = responses[0] ? responses[0].getResponse() : 'General Feedback';
  var description = responses[1] ? responses[1].getResponse() : '(no description)';
  var steps = responses[2] ? responses[2].getResponse() : '';
  var a11y = responses[3] ? responses[3].getResponse() : [];
  var device = responses[4] ? responses[4].getResponse() : 'Not specified';
  var email = responses[5] ? responses[5].getResponse() : '';

  var labelMap = {
    'Bug Report': 'bug',
    'Feature Request': 'enhancement',
    'General Feedback': 'feedback'
  };

  var title;
  if (type === 'Bug Report') {
    title = 'Bug: ' + description.slice(0, 80);
  } else if (type === 'Feature Request') {
    title = 'Feature: ' + description.slice(0, 80);
  } else {
    title = 'Feedback: ' + description.slice(0, 80);
  }

  var a11yText = Array.isArray(a11y) ? a11y.join(', ') : a11y;

  var body = '## ' + type + '\n\n' + description;
  if (steps) {
    body += '\n\n## Steps to Reproduce\n' + steps;
  }
  body += '\n\n**Device:** ' + device;
  if (a11yText) {
    body += '\n**Accessibility features:** ' + a11yText;
  }
  if (email) {
    body += '\n**Contact:** ' + email;
  }
  body += '\n\n---\n*Submitted via in-app feedback form*';

  var payload = {
    'title': title,
    'body': body,
    'labels': [labelMap[type] || 'feedback']
  };

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'Authorization': 'Bearer ' + GITHUB_TOKEN,
      'Accept': 'application/vnd.github+v3+json'
    },
    'payload': JSON.stringify(payload)
  };

  UrlFetchApp.fetch(
    'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/issues',
    options
  );
}
