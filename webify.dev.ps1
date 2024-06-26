$configFiles = Get-ChildItem src *.html -rec
foreach ($file in $configFiles)
{
    (Get-Content $file.PSPath) |
    Foreach-Object { $_ -replace "./modules", "https://dev.fnde.gov.br/sete/src/renderer/modules" } |
    Set-Content $file.PSPath
}

$configFiles = Get-ChildItem src *.html -rec
foreach ($file in $configFiles)
{
    (Get-Content $file.PSPath) |
    Foreach-Object { $_ -replace "src=""./img", "src=""https://dev.fnde.gov.br/sete/src/renderer/img" } |
    Foreach-Object { $_ -replace "src=""img",   "src=""https://dev.fnde.gov.br/sete/src/renderer/img" } |
    Set-Content $file.PSPath
}


$configFiles = Get-ChildItem src *.html -rec
foreach ($file in $configFiles)
{
    (Get-Content $file.PSPath) |
    Foreach-Object { $_ -replace "href=""css", "href=""https://dev.fnde.gov.br/sete/src/renderer/css" } |
    Set-Content $file.PSPath
}

$configFiles = Get-ChildItem src *.html -rec
foreach ($file in $configFiles)
{
    (Get-Content $file.PSPath) |
    Foreach-Object { $_ -replace "src=""js", "src=""https://dev.fnde.gov.br/sete/src/renderer/js" } |
    Set-Content $file.PSPath
}

$configFiles = Get-ChildItem src/renderer/js/common.js
foreach ($file in $configFiles)
{
    (Get-Content $file.PSPath) |
    Foreach-Object { $_ -replace "remoteNavigation = false", "remoteNavigation = true" } |
    Set-Content $file.PSPath
}
