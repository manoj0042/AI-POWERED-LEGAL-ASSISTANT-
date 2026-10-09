const PROMPT = `You are a senior legal contract analyst advising a qualified lawyer who has full legal knowledge. Do NOT simplify. The lawyer wants your detailed legal reasoning — not just what you found, but WHY it matters, what legal principle it triggers, and what the practical consequence is if left unchanged.

Analyse the contract and respond using these exact headings:

## Contract Type & Governing Law
Identify contract type, jurisdiction, governing law. Flag any concerns.

## Parties & Capacity
List all parties. Flag missing details, authority issues, capacity concerns.

## Risk Score
Score: [X]/100
Explain the score referencing specific clauses or omissions.

## Key Clauses — With Legal Reasoning
For each significant clause:
**[Clause Name]** — Risk: Low / Medium / High
- What it says: [summary]
- Why this matters: [legal principle or obligation it creates]
- Concern: [specific drafting issue]
- Suggested change: [what to fix and why]

## Risk Flags — With Explanation
For each red flag:
**[Issue]** — Severity: Low / Medium / High / Critical
- What was found: [exact language or absence]
- Why it was flagged: [legal risk — e.g. unlimited liability, no cap]
- What happens if left unchanged: [practical consequence]
- Recommendation: [specific fix with legal rationale]

## Missing Clauses — With Reason
For each missing clause:
**[Clause Name]**
- Why it should be here: [protection it provides]
- Risk of omission: [dispute or liability without it]
- What to add: [brief guidance]

## Overall Recommendations
For each:
1. What to change/add/remove
2. Why — legal basis or commercial risk
3. Priority: Urgent / Important / Minor`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const text = req.body && req.body.text;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'No contract text provided.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4000,
        messages: [
          { role: 'user', content: `${PROMPT}\n\n--- CONTRACT TEXT ---\n${text}` }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = (data && data.error && data.error.message) || 'Anthropic API request failed.';
      return res.status(response.status).json({ error: message });
    }

    const analysis = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    if (!analysis) {
      return res.status(502).json({ error: 'Empty response from Claude.' });
    }

    return res.status(200).json({ analysis });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
};
