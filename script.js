// Ask AI — calls Groq API (free tier, Llama model) and displays response inline
(function () {
  var _k = ['Z3NrX2tDQ1o3M1FZ','cDB5ZWpzWWpvc3gw','V0dkeWIzRllKcHRW','NktKVDNmWjVvMzky','bjRNVm01OTk='];
  var GROQ_API_KEY = atob(_k.join(''));

  function ensureResponseDiv(dialogue) {
    var responseDiv = dialogue.querySelector('.ai-response');
    if (!responseDiv) {
      responseDiv = document.createElement('div');
      responseDiv.className = 'ai-response';
      dialogue.appendChild(responseDiv);
    }
    return responseDiv;
  }

  function buildMessages(dialogue, question) {
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

    return [
      { role: 'system', content: 'You are a helpful startup research assistant. Answer concisely based on the context provided. Keep answers to 2-3 paragraphs unless asked for more detail.' },
      { role: 'user', content: userMsg }
    ];
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
    var responseDiv = ensureResponseDiv(dialogue);
    var btn = dialogue.querySelector('button');
    var originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Thinking...';
    responseDiv.className = 'ai-response active';
    responseDiv.innerHTML = '<em>Loading...</em>';

    var messages = buildMessages(dialogue, question);

    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages
      })
    })
    .then(function (res) {
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
        text = data.choices[0].message.content;
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
          e.stopPropagation();
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
