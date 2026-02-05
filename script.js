// Ask AI — calls OpenAI API and displays response inline
(function () {
  const API_KEY_STORAGE = 'cpsourcing_openai_key';

  function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE);
  }

  function promptForApiKey() {
    const key = prompt(
      'Enter your OpenAI API key to use Ask AI.\n\n' +
      'Your key is stored in your browser only (localStorage) and never sent anywhere except OpenAI.\n\n' +
      'Get one at: https://platform.openai.com/api-keys'
    );
    if (key && key.trim().startsWith('sk-')) {
      localStorage.setItem(API_KEY_STORAGE, key.trim());
      return key.trim();
    }
    if (key !== null) {
      alert('Invalid API key. It should start with "sk-".');
    }
    return null;
  }

  // Ensure each .ai-dialogue has a response container
  function ensureResponseDiv(dialogue) {
    let responseDiv = dialogue.querySelector('.ai-response');
    if (!responseDiv) {
      responseDiv = document.createElement('div');
      responseDiv.className = 'ai-response';
      dialogue.appendChild(responseDiv);
    }
    return responseDiv;
  }

  // Build the prompt with section context
  function buildPrompt(dialogue, question) {
    const section = dialogue.closest('.section') || dialogue.parentElement;
    const sectionTitle = section.querySelector('h3');
    const sectionText = section.querySelector('p, ul, ol');
    const companyName = document.querySelector('.detail-header h1');

    let context = '';
    if (companyName) {
      context += `Company: ${companyName.textContent.trim()}\n`;
    }
    if (sectionTitle && sectionText) {
      context += `Section — ${sectionTitle.textContent.trim()}:\n${sectionText.textContent.trim().substring(0, 800)}\n`;
    }

    return [
      {
        role: 'system',
        content: 'You are a helpful startup research assistant. Answer concisely based on the context provided. Use markdown formatting for readability. Keep answers to 2-3 paragraphs unless asked for more detail.'
      },
      {
        role: 'user',
        content: context ? `${context}\nQuestion: ${question}` : question
      }
    ];
  }

  // Simple markdown to HTML (bold, italic, lists, line breaks)
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

  async function askAI(dialogue, question) {
    let apiKey = getApiKey();
    if (!apiKey) {
      apiKey = promptForApiKey();
      if (!apiKey) return;
    }

    const responseDiv = ensureResponseDiv(dialogue);
    const btn = dialogue.querySelector('button');
    const originalText = btn.textContent;

    // Show loading state
    btn.disabled = true;
    btn.textContent = 'Thinking...';
    responseDiv.classList.add('active');
    responseDiv.innerHTML = '<em>Loading...</em>';

    const messages = buildPrompt(dialogue, question);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          stream: true
        })
      });

      if (res.status === 401) {
        localStorage.removeItem(API_KEY_STORAGE);
        responseDiv.innerHTML = '<strong>Invalid API key.</strong> Click "Ask AI" again to re-enter your key.';
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      if (!res.ok) {
        const err = await res.text();
        responseDiv.innerHTML = `<strong>Error ${res.status}:</strong> ${err}`;
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      responseDiv.innerHTML = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              responseDiv.innerHTML = renderMarkdown(fullText);
            }
          } catch (e) {
            // skip malformed chunks
          }
        }
      }

      if (!fullText) {
        responseDiv.innerHTML = '<em>No response received.</em>';
      }
    } catch (err) {
      responseDiv.innerHTML = `<strong>Network error:</strong> ${err.message}`;
    }

    btn.disabled = false;
    btn.textContent = originalText;
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Handle Ask AI button clicks
    document.querySelectorAll('.ai-dialogue button').forEach(btn => {
      btn.addEventListener('click', () => {
        const dialogue = btn.closest('.ai-dialogue');
        const input = dialogue.querySelector('input[type="text"]');
        const question = input.value.trim();

        if (!question) {
          input.placeholder = 'Please type a question first...';
          input.focus();
          return;
        }

        askAI(dialogue, question);
      });
    });

    // Enter key support
    document.querySelectorAll('.ai-dialogue input[type="text"]').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const btn = input.closest('.ai-dialogue-input').querySelector('button');
          btn.click();
        }
      });
    });
  });
})();
