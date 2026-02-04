# Script to identify and remove empty directories with more control

# Function to get all empty directories
function Get-EmptyDirectories {
    param (
        [string]$RootPath = "."
    )
    
    Write-Host "Scanning for empty directories in $RootPath..." -ForegroundColor Cyan
    
    # Get all directories recursively, exclude .git and node_modules
    $allDirs = Get-ChildItem -Path $RootPath -Recurse -Directory -Force | 
        Where-Object { 
            $_.FullName -notmatch '\\.git' -and 
            $_.FullName -notmatch '\\node_modules' -and
            (Get-ChildItem -Path $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue).Count -eq 0
        } | 
        Select-Object -ExpandProperty FullName |
        Sort-Object -Property Length -Descending
    
    return $allDirs
}

# Get empty directories
$emptyDirs = Get-EmptyDirectories -RootPath ".\"

if ($emptyDirs.Count -eq 0) {
    Write-Host "No empty directories found!" -ForegroundColor Green
    exit 0
}

# Display empty directories with numbers
Write-Host "`nFound the following empty directories:" -ForegroundColor Yellow
$i = 1
$dirMap = @{}

foreach ($dir in $emptyDirs) {
    $dirMap[$i] = $dir
    Write-Host "$i. $dir"
    $i++
}

# Ask user which directories to keep
Write-Host "`nEnter the numbers of directories you want to KEEP (comma-separated, or 'a' to keep all, 'n' to delete all):" -ForegroundColor Yellow
$keepInput = Read-Host "Your choice"

$dirsToKeep = @()

if ($keepInput -eq 'a') {
    Write-Host "Keeping all directories." -ForegroundColor Green
    exit 0
}
elseif ($keepInput -eq 'n') {
    $dirsToRemove = $emptyDirs
}
else {
    $keepIndices = $keepInput -split ',' | ForEach-Object { $_.Trim() -as [int] }
    $dirsToKeep = $keepIndices | ForEach-Object { $dirMap[$_] } | Where-Object { $_ }
    $dirsToRemove = $emptyDirs | Where-Object { $dirsToKeep -notcontains $_ }
}

# Show what will be removed
if ($dirsToRemove.Count -gt 0) {
    Write-Host "`nThe following directories will be removed:" -ForegroundColor Red
    $dirsToRemove | ForEach-Object { Write-Host "- $_" }
    
    $confirm = Read-Host "`nAre you sure you want to delete these directories? (y/n)"
    
    if ($confirm -eq 'y') {
        $dirsToRemove | ForEach-Object {
            try {
                Write-Host "Removing: $_" -ForegroundColor DarkGray
                Remove-Item -Path $_ -Force -Recurse -ErrorAction Stop
            }
            catch {
                Write-Warning "Failed to remove $_ : $_"
            }
        }
        Write-Host "`nCleanup completed! Removed $($dirsToRemove.Count) directories." -ForegroundColor Green
    }
    else {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
    }
}
else {
    Write-Host "No directories to remove." -ForegroundColor Green
}
