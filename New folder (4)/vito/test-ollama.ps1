# Test Ollama API directly
Write-Host "Testing Ollama with deepseek-r1..."

$body = @{
    model = "deepseek-r1:latest"
    prompt = "Say 'Ollama working' in exactly 3 words"
    stream = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 60
    Write-Host "SUCCESS: $($response.response)"
} catch {
    Write-Host "FAILED: $_"
}
