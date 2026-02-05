// Ask AI button handler
// Opens ChatGPT in a new tab with the user's question + section context
document.addEventListener('DOMContentLoaded', () => {
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

      // Get the section context surrounding this AI dialogue
      const section = dialogue.closest('.section') || dialogue.parentElement;
      const sectionTitle = section.querySelector('h3');
      const sectionText = section.querySelector('p, ul, ol');

      // Get the company name from the page
      const companyName = document.querySelector('.detail-header h1');

      let prompt = question;
      if (companyName) {
        prompt = `Regarding ${companyName.textContent.trim()}: ${question}`;
      }
      if (sectionTitle && sectionText) {
        prompt += `\n\nContext — ${sectionTitle.textContent.trim()}:\n${sectionText.textContent.trim().substring(0, 500)}`;
      }

      const url = 'https://chatgpt.com/?q=' + encodeURIComponent(prompt);
      window.open(url, '_blank');
    });
  });

  // Allow pressing Enter in input fields to trigger the button
  document.querySelectorAll('.ai-dialogue input[type="text"]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const btn = input.closest('.ai-dialogue-input').querySelector('button');
        btn.click();
      }
    });
  });
});
