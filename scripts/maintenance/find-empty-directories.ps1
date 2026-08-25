[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter()]
    [string]$RootPath = (Get-Location).Path,

    [Parameter()]
    [switch]$Apply
)

$resolvedRoot = (Resolve-Path -LiteralPath $RootPath).Path
$excludedNames = @('.git', '.local', 'node_modules', 'dist', 'coverage', 'playwright-report', 'test-results')

$emptyDirectories = Get-ChildItem -LiteralPath $resolvedRoot -Recurse -Directory -Force |
    Where-Object {
        $relativeParts = $_.FullName.Substring($resolvedRoot.Length).TrimStart('\') -split '\\'
        -not ($relativeParts | Where-Object { $excludedNames -contains $_ }) -and
        (Get-ChildItem -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0
    } |
    Sort-Object { $_.FullName.Length } -Descending

if (-not $emptyDirectories) {
    Write-Output 'No empty directories found.'
    exit 0
}

Write-Output 'Empty directories:'
$emptyDirectories.FullName | ForEach-Object { Write-Output "- $_" }

if (-not $Apply) {
    Write-Output 'Dry run only. Re-run with -Apply to remove exactly the directories listed above.'
    exit 0
}

foreach ($directory in $emptyDirectories) {
    $resolvedTarget = (Resolve-Path -LiteralPath $directory.FullName).Path
    if (-not $resolvedTarget.StartsWith($resolvedRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing target outside root: $resolvedTarget"
    }
    if ($PSCmdlet.ShouldProcess($resolvedTarget, 'Remove empty directory')) {
        Remove-Item -LiteralPath $resolvedTarget
    }
}
