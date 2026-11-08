param([Parameter(Mandatory = $true)][string]$LiteralPath)

$ErrorActionPreference = 'Stop'
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object System.Security.AccessControl.FileSecurity
$sections = [System.Security.AccessControl.AccessControlSections]::Access
$acl.SetSecurityDescriptorSddlForm("D:P(A;;FA;;;$($identity.Value))(A;;FA;;;SY)", $sections)
[System.IO.File]::SetAccessControl($LiteralPath, $acl)
$verified = [System.IO.File]::GetAccessControl($LiteralPath, $sections)
if (-not $verified.AreAccessRulesProtected) { throw 'File permissions still inherit access.' }
foreach ($rule in $verified.Access) {
    $sid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
    if (($sid -ne $identity.Value -and $sid -ne 'S-1-5-18') -or $rule.AccessControlType -ne 'Allow') {
        throw 'Unexpected file access rule.'
    }
}
