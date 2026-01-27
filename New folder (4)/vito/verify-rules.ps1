# Verify all agent rules
$agents = @('pixel', 'datum', 'engine', 'notify', 'blocks')

foreach ($agent in $agents) {
    $body = @{agentId=$agent; prompt='test'} | ConvertTo-Json
    try {
        $result = Invoke-RestMethod -Uri 'http://localhost:3001/api/debug/test-agent' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 10
        Write-Host "[$agent] hasCriticalRules: $($result.hasCriticalRules)"
        Write-Host "  Preview: $($result.systemPromptPreview.Substring(0, [Math]::Min(200, $result.systemPromptPreview.Length)))..."
        Write-Host ""
    } catch {
        Write-Host "[$agent] Error: $_"
    }
}
