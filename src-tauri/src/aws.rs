use std::process::Stdio;
use tauri::command;
use tokio::process::Command;

use crate::models::*;

/// Get AWS binary path - uses awscli package from system PATH
fn get_aws_command() -> Result<String, String> {
    // Use aws from PATH (awscli package)
    Ok("aws".to_string())
}

#[command]
pub async fn check_aws_credentials() -> Result<bool, String> {
    let aws_cmd = get_aws_command()?;
    let output = Command::new(aws_cmd)
        .args(&["sts", "get-caller-identity"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute AWS CLI: {}", e))?;

    Ok(output.status.success())
}

#[command]
pub async fn configure_aws_credentials(
    accessKeyId: String,
    secretAccessKey: String,
    region: String,
    profileName: Option<String>
) -> Result<String, String> {
    let profile = profileName.unwrap_or_else(|| "default".to_string());
    
    // Configure AWS CLI with access keys
    let output_format = "json".to_string();
    let commands = vec![
        ("aws_access_key_id", &accessKeyId),
        ("aws_secret_access_key", &secretAccessKey),
        ("region", &region),
        ("output", &output_format),
    ];

    for (key, value) in commands {
        let cmd_args = vec![
            "configure".to_string(), 
            "set".to_string(),
            format!("profile.{}.{}", profile, key),
            value.to_string()
        ];
        let aws_cmd = get_aws_command()?;
        let output = Command::new(aws_cmd)
            .args(&cmd_args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| format!("Failed to configure AWS CLI: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("AWS CLI configuration failed for {}: {}", key, stderr));
        }
    }

    // Test the credentials
    let aws_cmd = get_aws_command()?;
    let test_output = Command::new(aws_cmd)
        .args(&["sts", "get-caller-identity", "--profile", &profile])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to test AWS credentials: {}", e))?;

    if !test_output.status.success() {
        let stderr_str = String::from_utf8_lossy(&test_output.stderr);
        return Err(format!("AWS credentials test failed: {}", stderr_str));
    }

    let success_message = format!("AWS credentials configured and validated successfully! Profile: {}, Region: {}", profile, region);
    Ok(success_message)
}

#[command]
pub async fn validate_aws_permissions(profile_name: Option<String>) -> Result<String, String> {
    let profile = profile_name.unwrap_or_else(|| "default".to_string());
    
    // Get caller identity to check if credentials work
    let aws_cmd = get_aws_command()?;
    let output = Command::new(aws_cmd)
        .args(&["sts", "get-caller-identity", "--profile", &profile])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to validate AWS permissions: {}", e))?;

    if !output.status.success() {
        return Err(format!("AWS permission validation failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    Ok(output_str.to_string())
}

#[command]
pub async fn setup_aws_infrastructure(
    bucket_name: String,
    region: String,
    admin_username: String,
    lifecycle_config: LifecycleConfig,
    employees: Vec<String>,
    profileName: Option<String>
) -> Result<AwsConfig, String> {
    let profile = profileName.unwrap_or_else(|| "default".to_string());
    // Create the setup script content based on the backup-test script
    let script_content = generate_setup_script(
        &bucket_name,
        &region,
        &admin_username,
        &lifecycle_config,
        &employees,
        &profile
    );

    // Write the script to a temporary file
    let script_path = "/tmp/setup-bucket.sh";
    tokio::fs::write(script_path, script_content)
        .await
        .map_err(|e| format!("Failed to write setup script: {}", e))?;

    // Make the script executable
    Command::new("chmod")
        .args(&["+x", script_path])
        .output()
        .await
        .map_err(|e| format!("Failed to make script executable: {}", e))?;

    // Execute the setup script
    let output = Command::new("bash")
        .arg(script_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute setup script: {}", e))?;

    if !output.status.success() {
        return Err(format!("Setup script failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    // Parse the output to get credentials
    let output_str = String::from_utf8_lossy(&output.stdout);
    parse_setup_output(&output_str, bucket_name, region, admin_username, lifecycle_config, employees)
}

fn generate_setup_script(
    bucket_name: &str,
    region: &str,
    admin_username: &str,
    lifecycle_config: &LifecycleConfig,
    employees: &[String],
    profile: &str
) -> String {
    let employees_str = employees.join(" ");
    
    format!(r#"#!/bin/bash
set -euo pipefail

# Configuration
BUCKET="{bucket_name}"
REGION="{region}"
ADMIN_USER="{admin_username}"
EMPLOYEES="{employees_str}"
PROFILE="{profile}"

ENABLE_LIFECYCLE="{lifecycle_enabled}"
DAYS_TO_IA="{days_to_ia}"
DAYS_TO_GLACIER="{days_to_glacier}"

# Create output directory
mkdir -p /tmp/aws-output/creds

echo "Setting up shared bucket: $BUCKET with profile: $PROFILE"

# 1. Create bucket if it doesn't exist
aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" --profile "$PROFILE" 2>/dev/null || {{
    aws s3 mb s3://"$BUCKET" --region "$REGION" --profile "$PROFILE"
}}

# 2. Enable Versioning
echo "Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET" \
    --versioning-configuration Status=Enabled \
    --profile "$PROFILE"

# 3. Enable default encryption (SSE-S3)
echo "Enabling SSE-S3 encryption..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET" \
    --server-side-encryption-configuration '{{
        "Rules": [
            {{
                "ApplyServerSideEncryptionByDefault": {{
                    "SSEAlgorithm": "AES256"
                }},
                "BucketKeyEnabled": true
            }}
        ]
    }}' \
    --profile "$PROFILE"

# 4. Block public access
echo "Blocking public access..."
aws s3api put-public-access-block \
    --bucket "$BUCKET" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
    --profile "$PROFILE"

# 5. Apply bucket policy to deny non-TLS
echo "Applying TLS-only bucket policy..."
cat > /tmp/bucket-policy.json << 'EOF'
{{
    "Version": "2012-10-17",
    "Statement": [
        {{
            "Sid": "DenyInsecureConnections",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::{bucket_name}",
                "arn:aws:s3:::{bucket_name}/*"
            ],
            "Condition": {{
                "Bool": {{
                    "aws:SecureTransport": "false"
                }}
            }}
        }}
    ]
}}
EOF

aws s3api put-bucket-policy \
    --bucket "$BUCKET" \
    --policy file:///tmp/bucket-policy.json \
    --profile "$PROFILE"

rm /tmp/bucket-policy.json

# 6. Optional Lifecycle (optimization without deletion)
if [ "$ENABLE_LIFECYCLE" = "true" ]; then
    echo "Setting up lifecycle policy..."
    
    # Check if Glacier transition should be included (999999 means never)
    if [ "$DAYS_TO_GLACIER" -eq 999999 ]; then
        # Only Standard-IA transition, no Glacier
        cat > /tmp/lifecycle.json << EOF
{{
    "Rules": [
        {{
            "ID": "OptimizeStorage",
            "Status": "Enabled",
            "Filter": {{}},
            "Transitions": [
                {{
                    "Days": $DAYS_TO_IA,
                    "StorageClass": "STANDARD_IA"
                }}
            ]
        }}
    ]
}}
EOF
    else
        # Include both Standard-IA and Glacier transitions
        cat > /tmp/lifecycle.json << EOF
{{
    "Rules": [
        {{
            "ID": "OptimizeStorage",
            "Status": "Enabled",
            "Filter": {{}},
            "Transitions": [
                {{
                    "Days": $DAYS_TO_IA,
                    "StorageClass": "STANDARD_IA"
                }},
                {{
                    "Days": $DAYS_TO_GLACIER,
                    "StorageClass": "GLACIER"
                }}
            ]
        }}
    ]
}}
EOF
    fi

    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$BUCKET" \
        --lifecycle-configuration file:///tmp/lifecycle.json \
        --profile "$PROFILE"

    rm /tmp/lifecycle.json
fi

# 7. Create IAM users and get credentials
echo "=== CREDENTIALS START ==="

# Create admin user if not exists
if ! aws iam get-user --user-name "$ADMIN_USER" --profile "$PROFILE" >/dev/null 2>&1; then
    echo "Creating admin user: $ADMIN_USER"
    aws iam create-user --user-name "$ADMIN_USER" --profile "$PROFILE"
fi

# Create admin policy
cat > /tmp/admin-policy.json << 'EOF'
{{
    "Version": "2012-10-17",
    "Statement": [
        {{
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:ListBucketVersions",
                "s3:GetBucketLocation"
            ],
            "Resource": "arn:aws:s3:::{bucket_name}"
        }},
        {{
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion",
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:DeleteObject",
                "s3:DeleteObjectVersion",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": "arn:aws:s3:::{bucket_name}/*"
        }}
    ]
}}
EOF

# Attach admin policy
aws iam put-user-policy \
    --user-name "$ADMIN_USER" \
    --policy-name "BackupAdminPolicy" \
    --policy-document file:///tmp/admin-policy.json \
    --profile "$PROFILE"

# Create access key for admin
echo "Creating access key for $ADMIN_USER..."
ADMIN_CREDS=$(aws iam create-access-key --user-name "$ADMIN_USER" --output json --profile "$PROFILE")
ADMIN_KEY=$(echo "$ADMIN_CREDS" | jq -r '.AccessKey.AccessKeyId')
ADMIN_SECRET=$(echo "$ADMIN_CREDS" | jq -r '.AccessKey.SecretAccessKey')

echo "ADMIN_CREDENTIALS:$ADMIN_KEY:$ADMIN_SECRET"

# Create employee users
for employee in $EMPLOYEES; do
    echo "Setting up user: $employee"
    
    # Create employee user if not exists
    if ! aws iam get-user --user-name "$employee" --profile "$PROFILE" >/dev/null 2>&1; then
        aws iam create-user --user-name "$employee" --profile "$PROFILE"
    fi

    # Employee-specific policy
    cat > /tmp/employee-policy.json << EOF
{{
    "Version": "2012-10-17",
    "Statement": [
        {{
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::{bucket_name}",
            "Condition": {{
                "StringLike": {{
                    "s3:prefix": [
                        "$employee/*",
                        "$employee"
                    ]
                }}
            }}
        }},
        {{
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion",
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:DeleteObject",
                "s3:DeleteObjectVersion",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": [
                "arn:aws:s3:::{bucket_name}/$employee/*",
                "arn:aws:s3:::{bucket_name}/$employee"
            ]
        }}
    ]
}}
EOF

    # Attach employee policy
    aws iam put-user-policy \
        --user-name "$employee" \
        --policy-name "BackupEmployeePolicy" \
        --policy-document file:///tmp/employee-policy.json \
        --profile "$PROFILE"

    # Create access key for employee
    EMPLOYEE_CREDS=$(aws iam create-access-key --user-name "$employee" --output json --profile "$PROFILE")
    EMPLOYEE_KEY=$(echo "$EMPLOYEE_CREDS" | jq -r '.AccessKey.AccessKeyId')
    EMPLOYEE_SECRET=$(echo "$EMPLOYEE_CREDS" | jq -r '.AccessKey.SecretAccessKey')

    echo "EMPLOYEE_CREDENTIALS:$employee:$EMPLOYEE_KEY:$EMPLOYEE_SECRET"
done

echo "=== CREDENTIALS END ==="

# Cleanup
rm -f /tmp/admin-policy.json /tmp/employee-policy.json

echo "Setup completed successfully!"
"#,
        bucket_name = bucket_name,
        region = region,
        admin_username = admin_username,
        employees_str = employees_str,
        profile = profile,
        lifecycle_enabled = lifecycle_config.enabled,
        days_to_ia = lifecycle_config.days_to_ia,
        days_to_glacier = lifecycle_config.days_to_glacier
    )
}

fn parse_setup_output(
    output: &str,
    bucket_name: String,
    region: String,
    _admin_username: String,
    lifecycle_config: LifecycleConfig,
    _employee_names: Vec<String>
) -> Result<AwsConfig, String> {
    let mut admin_key = String::new();
    let mut admin_secret = String::new();
    let mut employees = Vec::new();

    let lines: Vec<&str> = output.lines().collect();
    let mut in_credentials = false;

    for line in lines {
        if line == "=== CREDENTIALS START ===" {
            in_credentials = true;
            continue;
        }
        if line == "=== CREDENTIALS END ===" {
            break;
        }
        
        if in_credentials {
            if line.starts_with("ADMIN_CREDENTIALS:") {
                let parts: Vec<&str> = line.split(':').collect();
                if parts.len() >= 3 {
                    admin_key = parts[1].to_string();
                    admin_secret = parts[2].to_string();
                }
            } else if line.starts_with("EMPLOYEE_CREDENTIALS:") {
                let parts: Vec<&str> = line.split(':').collect();
                if parts.len() >= 4 {
                    let name = parts[1].to_string();
                    let key = parts[2].to_string();
                    let secret = parts[3].to_string();
                    
                    employees.push(Employee {
                        id: uuid::Uuid::new_v4().to_string(),
                        name: name.clone(),
                        username: name,
                        access_key_id: key,
                        secret_access_key: secret,
                        rclone_config_generated: false,
                        created_at: chrono::Utc::now(),
                    });
                }
            }
        }
    }

    if admin_key.is_empty() || admin_secret.is_empty() {
        return Err("Failed to parse admin credentials from setup output".to_string());
    }

    Ok(AwsConfig {
        aws_access_key_id: admin_key,
        aws_secret_access_key: admin_secret,
        aws_region: region,
        aws_sso_configured: false, // Using traditional credentials, not SSO
        bucket_name,
        lifecycle_config,
        employees,
    })
}

#[command]
pub async fn generate_employee_rclone_config(
    employee: Employee,
    _bucket_name: String,
    region: String
) -> Result<String, String> {
    let config = format!(
        r#"[aws]
type = s3
provider = AWS
env_auth = false
access_key_id = {}
secret_access_key = {}
region = {}
acl = private
"#,
        employee.access_key_id,
        employee.secret_access_key,
        region
    );

    Ok(config)
}

#[command]
pub async fn get_employee_credentials(profile_id: String, employee_id: String) -> Result<Employee, String> {
    use crate::config::load_config;
    
    let config = load_config().await?;
    
    if let Some(profile) = config.profiles.iter().find(|p| p.id == profile_id) {
        if let Some(aws_config) = &profile.aws_config {
            if let Some(employee) = aws_config.employees.iter().find(|e| e.id == employee_id) {
                return Ok(employee.clone());
            }
        }
    }
    
    Err("Employee not found".to_string())
}