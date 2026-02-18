use std::process::Stdio;
use tauri::command;
use tokio::process::Command;

use crate::models::*;

/// Get AWS binary path - uses awscli package from system PATH
fn get_aws_command() -> Result<String, String> {
    Ok("aws".to_string())
}

/// Run an AWS CLI command, returning stdout on success or an error.
async fn run_aws(args: &[&str], profile: &str) -> Result<String, String> {
    let aws_cmd = get_aws_command()?;
    let mut cmd_args: Vec<&str> = args.to_vec();
    cmd_args.push("--profile");
    cmd_args.push(profile);

    let output = Command::new(&aws_cmd)
        .args(&cmd_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute AWS CLI: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("AWS CLI failed: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Run an AWS CLI command, returning None on failure instead of Err.
async fn run_aws_allow_failure(args: &[&str], profile: &str) -> Option<String> {
    run_aws(args, profile).await.ok()
}

async fn ensure_bucket_exists(bucket: &str, region: &str, profile: &str) -> Result<(), String> {
    // Check if bucket exists
    let exists = run_aws_allow_failure(
        &["s3api", "head-bucket", "--bucket", bucket, "--region", region],
        profile,
    ).await;

    if exists.is_none() {
        let s3_url = format!("s3://{}", bucket);
        run_aws(&["s3", "mb", &s3_url, "--region", region], profile).await?;
    }

    Ok(())
}

async fn enable_versioning(bucket: &str, profile: &str) -> Result<(), String> {
    run_aws(
        &[
            "s3api", "put-bucket-versioning",
            "--bucket", bucket,
            "--versioning-configuration", "Status=Enabled",
        ],
        profile,
    ).await?;
    Ok(())
}

async fn enable_encryption(bucket: &str, profile: &str) -> Result<(), String> {
    let config = serde_json::json!({
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": true
        }]
    }).to_string();

    run_aws(
        &[
            "s3api", "put-bucket-encryption",
            "--bucket", bucket,
            "--server-side-encryption-configuration", &config,
        ],
        profile,
    ).await?;
    Ok(())
}

async fn block_public_access(bucket: &str, profile: &str) -> Result<(), String> {
    run_aws(
        &[
            "s3api", "put-public-access-block",
            "--bucket", bucket,
            "--public-access-block-configuration",
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true",
        ],
        profile,
    ).await?;
    Ok(())
}

async fn apply_tls_policy(bucket: &str, profile: &str) -> Result<(), String> {
    let policy = serde_json::json!({
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "DenyInsecureConnections",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                format!("arn:aws:s3:::{}", bucket),
                format!("arn:aws:s3:::{}/*", bucket)
            ],
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        }]
    }).to_string();

    run_aws(
        &[
            "s3api", "put-bucket-policy",
            "--bucket", bucket,
            "--policy", &policy,
        ],
        profile,
    ).await?;
    Ok(())
}

async fn apply_lifecycle(bucket: &str, config: &LifecycleConfig, profile: &str) -> Result<(), String> {
    if !config.enabled {
        return Ok(());
    }

    let mut transitions = vec![
        serde_json::json!({
            "Days": config.days_to_ia,
            "StorageClass": "STANDARD_IA"
        })
    ];

    // 999999 means "never transition to Glacier"
    if config.days_to_glacier != 999999 {
        transitions.push(serde_json::json!({
            "Days": config.days_to_glacier,
            "StorageClass": "GLACIER"
        }));
    }

    let lifecycle = serde_json::json!({
        "Rules": [{
            "ID": "OptimizeStorage",
            "Status": "Enabled",
            "Filter": {},
            "Transitions": transitions
        }]
    }).to_string();

    run_aws(
        &[
            "s3api", "put-bucket-lifecycle-configuration",
            "--bucket", bucket,
            "--lifecycle-configuration", &lifecycle,
        ],
        profile,
    ).await?;
    Ok(())
}

fn build_admin_policy(bucket: &str) -> String {
    serde_json::json!({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket",
                    "s3:ListBucketVersions",
                    "s3:GetBucketLocation"
                ],
                "Resource": format!("arn:aws:s3:::{}", bucket)
            },
            {
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
                "Resource": format!("arn:aws:s3:::{}/*", bucket)
            }
        ]
    }).to_string()
}

fn build_employee_policy(bucket: &str, employee: &str) -> String {
    serde_json::json!({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["s3:ListBucket"],
                "Resource": format!("arn:aws:s3:::{}", bucket),
                "Condition": {
                    "StringLike": {
                        "s3:prefix": [
                            format!("{}/*", employee),
                            employee.to_string()
                        ]
                    }
                }
            },
            {
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
                    format!("arn:aws:s3:::{}/{}/*", bucket, employee),
                    format!("arn:aws:s3:::{}/{}", bucket, employee)
                ]
            }
        ]
    }).to_string()
}

/// Creates an IAM user (if not exists), attaches an inline policy, creates an access key.
/// Returns (access_key_id, secret_access_key).
async fn create_iam_user_with_policy(
    username: &str,
    policy_json: &str,
    policy_name: &str,
    profile: &str,
) -> Result<(String, String), String> {
    // Create user if not exists
    let user_exists = run_aws_allow_failure(
        &["iam", "get-user", "--user-name", username],
        profile,
    ).await;

    if user_exists.is_none() {
        run_aws(&["iam", "create-user", "--user-name", username], profile).await?;
    }

    // Attach inline policy
    run_aws(
        &[
            "iam", "put-user-policy",
            "--user-name", username,
            "--policy-name", policy_name,
            "--policy-document", policy_json,
        ],
        profile,
    ).await?;

    // Create access key and parse JSON response
    let key_output = run_aws(
        &["iam", "create-access-key", "--user-name", username, "--output", "json"],
        profile,
    ).await?;

    let parsed: serde_json::Value = serde_json::from_str(&key_output)
        .map_err(|e| format!("Failed to parse access key response: {}", e))?;

    let access_key_id = parsed["AccessKey"]["AccessKeyId"]
        .as_str()
        .ok_or("Missing AccessKeyId in response")?
        .to_string();

    let secret_access_key = parsed["AccessKey"]["SecretAccessKey"]
        .as_str()
        .ok_or("Missing SecretAccessKey in response")?
        .to_string();

    Ok((access_key_id, secret_access_key))
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

    // 1. Create bucket if needed
    ensure_bucket_exists(&bucket_name, &region, &profile).await?;

    // 2. Enable versioning
    enable_versioning(&bucket_name, &profile).await?;

    // 3. Enable encryption
    enable_encryption(&bucket_name, &profile).await?;

    // 4. Block public access
    block_public_access(&bucket_name, &profile).await?;

    // 5. Apply TLS-only bucket policy
    apply_tls_policy(&bucket_name, &profile).await?;

    // 6. Apply lifecycle rules
    apply_lifecycle(&bucket_name, &lifecycle_config, &profile).await?;

    // 7. Create admin IAM user with policy
    let admin_policy = build_admin_policy(&bucket_name);
    let (admin_key, admin_secret) = create_iam_user_with_policy(
        &admin_username,
        &admin_policy,
        "BackupAdminPolicy",
        &profile,
    ).await?;

    // 8. Create employee IAM users with per-user policies
    let mut employee_list = Vec::new();
    for employee_name in &employees {
        let employee_policy = build_employee_policy(&bucket_name, employee_name);
        let (emp_key, emp_secret) = create_iam_user_with_policy(
            employee_name,
            &employee_policy,
            "BackupEmployeePolicy",
            &profile,
        ).await?;

        employee_list.push(Employee {
            id: uuid::Uuid::new_v4().to_string(),
            name: employee_name.clone(),
            username: employee_name.clone(),
            access_key_id: emp_key,
            secret_access_key: emp_secret,
            rclone_config_generated: false,
            created_at: chrono::Utc::now(),
        });
    }

    Ok(AwsConfig {
        aws_access_key_id: admin_key,
        aws_secret_access_key: admin_secret,
        aws_region: region,
        aws_sso_configured: false,
        bucket_name,
        lifecycle_config,
        employees: employee_list,
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
