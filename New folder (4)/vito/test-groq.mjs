import 'dotenv/config';

const key = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY;
if (!key) { 
  console.log('No Groq key found'); 
  process.exit(1); 
}
console.log('Testing Groq API with key:', key.slice(0,15) + '...');

const response = await fetch('https://api.groq.com/openai/v1/models', {
  headers: { 'Authorization': 'Bearer ' + key }
});

const data = await response.json();

if (data.error) {
  console.log('ERROR:', data.error.message);
} else {
  console.log('SUCCESS: Found', data.data?.length || 0, 'models');
  console.log('Available models:', data.data?.map(m => m.id).join(', '));
}
