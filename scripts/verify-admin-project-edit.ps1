$ErrorActionPreference = 'Stop'
$baseUrl = 'http://127.0.0.1:8790'
$testId = [guid]::NewGuid().ToString('N')
$token = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$digest = $sha256.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($token))
$sha256.Dispose()
$tokenHash = [Convert]::ToBase64String($digest).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$sessionId = [guid]::NewGuid().ToString('N')
$delegateId = [guid]::NewGuid().ToString('N')
$delegateToken = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$delegateSessionId = [guid]::NewGuid().ToString('N')
$delegateSha256 = [System.Security.Cryptography.SHA256]::Create()
$delegateDigest = $delegateSha256.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($delegateToken))
$delegateSha256.Dispose()
$delegateTokenHash = [Convert]::ToBase64String($delegateDigest).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$projectId = $null
$mutationOrigin = 'http://localhost:8790'

function Run-LocalSql([string] $query) {
  $result = & node node_modules/wrangler/bin/wrangler.js d1 execute pimx-eltex-db --local --command $query
  if ($LASTEXITCODE -ne 0) { throw "Local D1 command failed: $result" }
  return $result
}

function Call-LocalApi([string] $method, [string] $path, [string] $body = '') {
  $arguments = @('-sS', '-H', "Cookie: pimx_session=$token", '-H', "Origin: $mutationOrigin", '-H', 'Content-Type: application/json', '-X', $method)
  $payloadFile = $null
  try {
    if ($body) {
      $payloadFile = [System.IO.Path]::GetTempFileName()
      [System.IO.File]::WriteAllText($payloadFile, $body, (New-Object System.Text.UTF8Encoding($false)))
      $arguments += @('--data-binary', "@$payloadFile")
    }
    $result = & curl.exe @arguments "$baseUrl$path"
    if ($LASTEXITCODE -ne 0) { throw "Local API request failed: $method $path" }
    return ($result | ConvertFrom-Json)
  }
  finally { if ($payloadFile) { Remove-Item -LiteralPath $payloadFile -Force } }
}

try {
  Run-LocalSql "INSERT INTO users (id, name, username, email, password_hash, role, status, email_verified_at) VALUES ('$testId', 'Integration admin', 'test_$testId', 'test-$testId@example.invalid', 'disabled', 'admin', 'active', unixepoch()); INSERT INTO sessions (id, user_id, token_hash, expires_at, last_seen_at) VALUES ('$sessionId', '$testId', '$tokenHash', unixepoch() + 3600, unixepoch());" | Out-Null
  $probe = Run-LocalSql "SELECT id FROM users WHERE id = '$testId'; SELECT id FROM sessions WHERE id = '$sessionId';"
  if (-not (($probe -join "`n").Contains($sessionId))) { throw 'The local D1 fixture was not inserted.' }

  $who = Call-LocalApi 'GET' '/api/auth/me'
  if ($who.user.id -ne $testId) { throw 'The temporary local admin session was not recognized.' }
  $payload = @{ title = 'Project edit integration'; slug = "test-project-$testId"; description = 'A temporary local project for the admin integration check.'; tech = @('TypeScript', 'HTML'); previewUrl = '/demos/flappy-legends/'; downloadUrl = '/downloads/flappy-legends.zip'; coverUrl = ''; status = 'draft' }
  $created = Call-LocalApi 'POST' '/api/admin/projects' ($payload | ConvertTo-Json -Compress -Depth 5)
  if (-not $created.id) { throw "Project creation did not return an ID: $($created.message)" }
  $projectId = $created.id

  $loaded = Call-LocalApi 'GET' "/api/admin/projects/$projectId"
  if ($loaded.project.title -ne $payload.title) { throw 'The project editor did not load the saved fields.' }

  $payload.title = 'Project edit integration updated'
  $payload.status = 'published'
  $payload.coverUrl = '/project-previews/flappy-legends.webp'
  $updated = Call-LocalApi 'PATCH' "/api/admin/projects/$projectId" ($payload | ConvertTo-Json -Compress -Depth 5)
  if ($updated.project.title -ne $payload.title -or $updated.project.status -ne 'published' -or $updated.project.coverUrl -ne $payload.coverUrl) { throw 'Project changes were not saved.' }

  $homePage = & curl.exe -sS "$baseUrl/"
  if (-not (($homePage -join "`n").Contains($payload.title))) { throw 'The edited project is missing from the home page.' }
  $publicPage = & curl.exe -sS "$baseUrl/code"
  if (-not (($publicPage -join "`n").Contains($payload.title))) { throw 'The published project is missing from the public Projects page.' }

  Run-LocalSql "INSERT INTO users (id, name, username, email, password_hash, role, status, email_verified_at) VALUES ('$delegateId', 'Integration delegate', 'test_$delegateId', 'test-$delegateId@example.invalid', 'disabled', 'user', 'active', unixepoch());" | Out-Null
  $rolePayload = @{ role = 'admin'; permissions = @('projects.edit') } | ConvertTo-Json -Compress
  $roleResult = Call-LocalApi 'PATCH' "/api/admin/users/$delegateId/permissions" $rolePayload
  if ($roleResult.role -ne 'admin' -or @($roleResult.adminPermissions).Count -ne 1) { throw 'Delegated administrator permissions were not saved.' }
  Run-LocalSql "INSERT INTO sessions (id, user_id, token_hash, expires_at, last_seen_at) VALUES ('$delegateSessionId', '$delegateId', '$delegateTokenHash', unixepoch() + 3600, unixepoch());" | Out-Null
  $forbiddenDelete = & curl.exe -sS -o NUL -w '%{http_code}' -X DELETE -H "Cookie: pimx_session=$delegateToken" -H "Origin: $mutationOrigin" "$baseUrl/api/admin/projects/$projectId"
  if ($forbiddenDelete -ne '403') { throw 'A restricted administrator was allowed to delete a project.' }
  $forbiddenRoles = & curl.exe -sS -o NUL -w '%{http_code}' -X PATCH -H "Cookie: pimx_session=$delegateToken" -H "Origin: $mutationOrigin" -H 'Content-Type: application/json' --data-binary '{}' "$baseUrl/api/admin/users/$testId/permissions"
  if ($forbiddenRoles -ne '403') { throw 'A restricted administrator was allowed to manage roles.' }
  $delegateLoaded = & curl.exe -sS -o NUL -w '%{http_code}' -H "Cookie: pimx_session=$delegateToken" "$baseUrl/api/admin/projects/$projectId"
  if ($delegateLoaded -ne '200') { throw 'The delegated project edit permission was not granted.' }

  $revoked = Call-LocalApi 'DELETE' "/api/admin/users/$testId/sessions"
  if ($revoked.revoked -ne 1) { throw 'The test login session was not revoked.' }
  $afterRevoke = & curl.exe -sS -o NUL -w '%{http_code}' -H "Cookie: pimx_session=$token" "$baseUrl/api/admin/projects"
  if ($afterRevoke -ne '403') { throw 'The revoked session still has administrator access.' }

  Write-Output 'Project editing, restricted administrator permissions, public display, and session revocation checks passed.'
}
finally {
  $cleanup = "DELETE FROM audit_logs WHERE actor_id = '$testId'"
  $cleanup += " OR actor_id = '$delegateId' OR target_id = '$delegateId'"
  if ($projectId) { $cleanup += " OR target_id = '$projectId'" }
  $cleanup += ';'
  if ($projectId) { $cleanup += " DELETE FROM projects WHERE id = '$projectId';" }
  $cleanup += " DELETE FROM users WHERE id IN ('$testId', '$delegateId');"
  Run-LocalSql $cleanup | Out-Null
}
