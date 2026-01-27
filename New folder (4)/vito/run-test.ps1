$json = Get-Content 'C:\Users\SBS\Desktop\BOTROSS\test-request.json' -Raw
$result = Invoke-RestMethod -Uri 'http://localhost:3001/api/debug/test-agent' -Method POST -Body $json -ContentType 'application/json'
$result | ConvertTo-Json -Depth 10
