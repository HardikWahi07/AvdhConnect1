
$path = "c:\Users\LENOVO\Desktop\final\css\style.css"
$content = [System.IO.File]::ReadAllText($path)

# Define the block to find (Light Mode)
$lightBlockRegex = "(?s)/\*\s*Light mode variables \(default\)\s*\*/\s*\[data-theme=""light""\],\s*:root\s*\{.*?\}"

# Find all matches
$matches = [regex]::Matches($content, $lightBlockRegex)

if ($matches.Count -ge 2) {
    # We found at least two Light Mode blocks. We want to replace the SECOND one.
    $secondMatch = $matches[1]
    
    # Define the replacement block (Dark Mode)
    $darkBlock = @"
/* Dark mode variables */
[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-tertiary: #94a3b8;
  --border-color: #334155;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.3);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.3);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.3);
}
"@

    # Replace the second match
    $content = $content.Remove($secondMatch.Index, $secondMatch.Length).Insert($secondMatch.Index, $darkBlock)
    
    [System.IO.File]::WriteAllText($path, $content)
    Write-Host "Successfully replaced second Light block with Dark block."
} else {
    Write-Host "Did not find two Light blocks. Found $($matches.Count)."
}
