export function buildPrompt(msg: { text: string; images?: { data: string; mimeType: string }[]; files?: { name: string; content: string }[] }): any[] {
  const prompt: any[] = [];
  if (msg.images?.length) for (const img of msg.images) prompt.push({ type: 'image', data: img.data, mimeType: img.mimeType });
  if (msg.files?.length) for (const f of msg.files) prompt.push({ type: 'resource', resource: { uri: `file:///${f.name}`, text: f.content, mimeType: 'text/plain' } });
  prompt.push({ type: 'text', text: msg.text });
  return prompt;
}
