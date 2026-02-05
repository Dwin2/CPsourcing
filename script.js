// Ask AI — calls Google Gemini API (free tier) and displays response inline
(function () {
  var API_KEY_STORAGE = 'cpsourcing_gemini_key';

  function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE);
  }

  function promptForApiKey() {
    var key = window.prompt(
      'Enter your Google Gemini API key to use Ask AI.\n\n' +
      'It is 100% FREE — no credit card needed.\n\n' +
      'Get one in 10 seconds at:\nhttps://aistudio.google.com/apikey\n\n' +
      'Your key stays in your browser only.'
    );
    if (key && key.trim().length > 10) {
      localStorage.setItem(API_KEY_STORAGE, key.trim());
      return key.trim();
    }
    if (key !== null) {
      window.alert('That doesn\'t look like a valid key. Please try again.');
    }
    return null;
  }

  function ensureResponseDiv(dialogue) {
    var responseDiv = dialogue.querySelector('.ai-response');
    if (!responseDiv) {
      responseDiv = document.createElement('div');
      responseDiv.className = 'ai-response';
      dialogue.appendChild(responseDiv);
    }
    return responseDiv;
  }

  function buildPrompt(dialogue, question) {
    var section = dialogue.closest('.section') || dialogue.parentElement;
    var sectionTitle = section.querySelector('h3');
    var sectionText = section.querySelector('p, ul, ol');
    var companyName = document.querySelector('.detail-header h1');

    var context = '';
    if (companyName) {
      context += 'Company: ' + companyName.textContent.trim() + '\n';
    }
    if (sectionTitle && sectionText) {
      context += 'Section — ' + sectionTitle.textContent.trim() + ':\n' +
        sectionText.textContent.trim().substring(0, 800) + '\n';
    }

    var userMsg = context ? context + '\nQuestion: ' + question : question;

    return {
      system_instruction: {
        parts: [{ text: 'You are a helpful startup research assistant. Answer concisely based on the context provided. Keep answers to 2-3 paragraphs unless asked for more detail.' }]
      },
      contents: [
        { role: 'user', parts: [{ text: userMsg }] }
      ]
    };
  }

  function renderMarkdown(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function askAI(dialogue, question) {
    var apiKey = getApiKey();
    if (!apiKey) {
      apiKey = promptForApiKey();
      if (!apiKey) return;
    }

    var responseDiv = ensureResponseDiv(dialogue);
    var btn = dialogue.querySelector('button');
    var originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Thinking...';
    responseDiv.className = 'ai-response active';
    responseDiv.innerHTML = '<em>Loading...</em>';

    var body = buildPrompt(dialogue, question);
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(apiKey);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function (res) {
      if (res.status === 400 || res.status === 403) {
        localStorage.removeItem(API_KEY_STORAGE);
        responseDiv.innerHTML = '<strong>Invalid API key.</strong> Click "Ask AI" again to re-enter your key.';
        btn.disabled = false;
        btn.textContent = originalText;
        return null;
      }
      if (!res.ok) {
        return res.text().then(function (errText) {
          responseDiv.innerHTML = '<strong>Error ' + res.status + ':</strong> ' + errText;
          btn.disabled = false;
          btn.textContent = originalText;
          return null;
        });
      }
      return res.json();
    })
    .then(function (data) {
      if (!data) return;

      var text = '';
      try {
        text = data.candidates[0].content.parts[0].text;
      } catch (e) {
        text = 'No response received.';
      }

      responseDiv.innerHTML = renderMarkdown(text);
      btn.disabled = false;
      btn.textContent = originalText;
    })
    .catch(function (err) {
      responseDiv.innerHTML = '<strong>Network error:</strong> ' + err.message;
      btn.disabled = false;
      btn.textContent = originalText;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('.ai-dialogue button');
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var dialogue = btn.closest('.ai-dialogue');
          var input = dialogue.querySelector('input[type="text"]');
          var question = input.value.trim();

          if (!question) {
            input.placeholder = 'Please type a question first...';
            input.focus();
            return;
          }

          askAI(dialogue, question);
        });
      })(buttons[i]);
    }

    var inputs = document.querySelectorAll('.ai-dialogue input[type="text"]');
    for (var j = 0; j < inputs.length; j++) {
      (function (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var btn = input.closest('.ai-dialogue-input').querySelector('button');
            btn.click();
          }
        });
      })(inputs[j]);
    }
  });
})();
